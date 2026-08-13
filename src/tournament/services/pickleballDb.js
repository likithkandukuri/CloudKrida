// ── Pickleball data layer ──────────────────────────────────────────────────
// Separate file from services/db.js on purpose: db.js is entirely Chess-shaped
// (tournaments/players/matches row converters assume Chess's schema) and this
// keeps Pickleball's own table shapes from leaking Chess-specific conditionals
// into either file.
//
// Every write function here is a thin wrapper around a Supabase call — RLS
// (is_superadmin(), migration 005) is the real enforcement layer. The UI also
// gates these behind isSuperAdmin so a non-superadmin never sees the controls,
// but that UI gate is a convenience, not the security boundary: an unauthorized
// call still gets rejected server-side even if someone bypasses the UI.
import { supabase } from '../../shared/utilities/supabase.js'

// ── Row → domain converters ───────────────────────────────────────────────────

export function tournamentRowToObj(row) {
  return {
    id:            row.id,
    name:          row.name,
    date:          row.date ?? null,
    location:      row.location ?? '',
    description:   row.description ?? '',
    eventType:     row.event_type,
    format:        row.format,
    status:        row.status,
    skillDivision: row.skill_division ?? null,
    ageBand:       row.age_band ?? null,
    gamesTo:       row.games_to,
    winBy2:        row.win_by_2,
    bestOf:        row.best_of,
    poolSize:      row.pool_size ?? null,
    courtCount:    row.court_count ?? null,
    createdAt:     new Date(row.created_at).getTime(),
    updatedAt:     new Date(row.updated_at).getTime(),
  }
}

export function playerRowToObj(row) {
  return {
    id:          row.id,
    name:        row.name,
    skillRating: row.skill_rating ?? null,
    duprId:      row.dupr_id ?? null,
    ageGroup:    row.age_group ?? null,
    createdAt:   row.created_at ? new Date(row.created_at).getTime() : null,
  }
}

export function memberRowToObj(row) {
  const p = row.player ?? {}
  return {
    playerId:    row.player_id,
    seat:        row.seat,
    name:        p.name ?? '(unknown player)',
    skillRating: p.skill_rating ?? null,
    duprId:      p.dupr_id ?? null,
    ageGroup:    p.age_group ?? null,
  }
}

export function entrantRowToObj(row) {
  return {
    id:               row.id,
    displayName:      row.display_name,
    status:           row.status,
    seedOrder:        row.seed_order ?? 0,
    pointsAdjustment: Number(row.points_adjustment ?? 0),
    poolId:           row.pool_id ?? null,
    members:          (row.members ?? []).map(memberRowToObj).sort((a, b) => a.seat - b.seat),
  }
}

export function poolRowToObj(row) {
  return { id: row.id, label: row.label }
}

export function courtRowToObj(row) {
  return { id: row.id, label: row.label, status: row.status }
}

export function matchRowToObj(row, entrantMap = {}) {
  return {
    id:              row.id,
    poolId:          row.pool_id,
    phase:           row.phase,
    round:           row.round,
    slot:            row.slot,
    entrant1:        row.entrant1_id ? (entrantMap[row.entrant1_id] ?? null) : null,
    entrant2:        row.entrant2_id ? (entrantMap[row.entrant2_id] ?? null) : null,
    status:          row.status,
    games:           row.games ?? [],
    winnerEntrantId: row.winner_entrant_id ?? null,
    courtId:         row.court_id ?? null,
    scheduledAt:     row.scheduled_at ? new Date(row.scheduled_at).getTime() : null,
    completedAt:     row.completed_at ? new Date(row.completed_at).getTime() : null,
    recordUrl:       row.record_url ?? null,
    locked:          !!row.locked,
  }
}

export function galleryRowToObj(row) {
  return {
    id:           row.id,
    imageUrl:     row.public_url,
    name:         row.file_name,
    storagePath:  row.storage_path,
    uploadedAt:   new Date(row.uploaded_at).getTime(),
    mediaType:    row.media_type ?? 'image',
    uploadedBy:   row.uploaded_by,
    uploaderRole: row.uploader_role,
  }
}

// ── Fetch tournament list (metadata only, for the dashboard/list view) ────────

export async function fetchPickleballTournamentList() {
  const { data, error } = await supabase
    .from('pickleball_tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('[Krida/Pickleball] fetchTournamentList:', error); return [] }
  return (data ?? []).map(tournamentRowToObj)
}

// ── Fetch one full tournament: entrants + members + pools + courts + matches + gallery ──

export async function fetchPickleballTournament(id) {
  const [
    { data: t,  error: tErr },
    { data: es },
    { data: ps },
    { data: cs },
    { data: ms },
    { data: gs },
  ] = await Promise.all([
    supabase.from('pickleball_tournaments').select('*').eq('id', id).single(),
    supabase.from('pickleball_entrants')
      .select('*, members:pickleball_entrant_members(*, player:pickleball_players(*))')
      .eq('tournament_id', id)
      .order('seed_order'),
    supabase.from('pickleball_pools').select('*').eq('tournament_id', id).order('label'),
    supabase.from('pickleball_courts').select('*').eq('tournament_id', id).order('label'),
    supabase.from('pickleball_matches').select('*').eq('tournament_id', id).order('round').order('slot'),
    supabase.from('pickleball_gallery_photos').select('*').eq('tournament_id', id).order('uploaded_at'),
  ])

  if (tErr || !t) return null

  const entrants   = (es ?? []).map(entrantRowToObj)
  const entrantMap = Object.fromEntries(entrants.map(e => [e.id, e]))

  return {
    ...tournamentRowToObj(t),
    entrants,
    pools:   (ps ?? []).map(poolRowToObj),
    courts:  (cs ?? []).map(courtRowToObj),
    matches: (ms ?? []).map(m => matchRowToObj(m, entrantMap)),
    gallery: (gs ?? []).map(galleryRowToObj),
  }
}

// ── Tournament administration ──────────────────────────────────────────────

export async function createPickleballTournament(data) {
  const { data: row, error } = await supabase
    .from('pickleball_tournaments')
    .insert({
      name:           data.name,
      date:           data.date || null,
      location:       data.location || '',
      description:    data.description || '',
      event_type:     data.eventType,
      format:         data.format,
      status:         data.status ?? 'registration_open',
      skill_division: data.skillDivision || null,
      age_band:       data.ageBand || null,
      games_to:       data.gamesTo,
      win_by_2:       data.winBy2,
      best_of:        data.bestOf,
      pool_size:      data.poolSize ?? null,
      court_count:    data.courtCount ?? null,
    })
    .select()
    .single()
  if (error) { console.error('[Krida/Pickleball] createTournament:', error); throw error }
  return tournamentRowToObj(row)
}

export async function updatePickleballTournament(id, data) {
  const u = { updated_at: new Date().toISOString() }
  if (data.name           !== undefined) u.name           = data.name
  if (data.date           !== undefined) u.date           = data.date || null
  if (data.location       !== undefined) u.location       = data.location || ''
  if (data.description    !== undefined) u.description    = data.description || ''
  if (data.eventType      !== undefined) u.event_type     = data.eventType
  if (data.format         !== undefined) u.format         = data.format
  if (data.status         !== undefined) u.status         = data.status
  if (data.skillDivision  !== undefined) u.skill_division = data.skillDivision || null
  if (data.ageBand        !== undefined) u.age_band       = data.ageBand || null
  if (data.gamesTo        !== undefined) u.games_to       = data.gamesTo
  if (data.winBy2         !== undefined) u.win_by_2       = data.winBy2
  if (data.bestOf         !== undefined) u.best_of        = data.bestOf
  if (data.poolSize       !== undefined) u.pool_size      = data.poolSize
  if (data.courtCount     !== undefined) u.court_count    = data.courtCount

  const { data: row, error } = await supabase
    .from('pickleball_tournaments').update(u).eq('id', id).select().single()
  if (error) { console.error('[Krida/Pickleball] updateTournament:', error); throw error }
  return tournamentRowToObj(row)
}

export async function deletePickleballTournament(id) {
  const { error } = await supabase.from('pickleball_tournaments').delete().eq('id', id)
  if (error) { console.error('[Krida/Pickleball] deleteTournament:', error); throw error }
}

// ── Players ─────────────────────────────────────────────────────────────────

export async function searchPickleballPlayers(query) {
  let q = supabase.from('pickleball_players').select('*').order('name').limit(20)
  if (query?.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q
  if (error) { console.error('[Krida/Pickleball] searchPlayers:', error); return [] }
  return (data ?? []).map(playerRowToObj)
}

// Exact (case-insensitive) name match — used to warn about likely duplicates
// before creating a new player record.
export async function findPlayersByExactName(name) {
  if (!name?.trim()) return []
  const { data, error } = await supabase
    .from('pickleball_players').select('*').ilike('name', name.trim())
  if (error) { console.error('[Krida/Pickleball] findPlayersByExactName:', error); return [] }
  return (data ?? []).map(playerRowToObj)
}

export async function createPickleballPlayer(data) {
  const { data: row, error } = await supabase
    .from('pickleball_players')
    .insert({
      name:         data.name,
      skill_rating: data.skillRating ?? null,
      dupr_id:      data.duprId || null,
      age_group:    data.ageGroup || null,
    })
    .select().single()
  if (error) { console.error('[Krida/Pickleball] createPlayer:', error); throw error }
  return playerRowToObj(row)
}

export async function updatePickleballPlayer(id, data) {
  const u = { updated_at: new Date().toISOString() }
  if (data.name        !== undefined) u.name         = data.name
  if (data.skillRating !== undefined) u.skill_rating  = data.skillRating
  if (data.duprId      !== undefined) u.dupr_id       = data.duprId || null
  if (data.ageGroup    !== undefined) u.age_group     = data.ageGroup || null

  const { data: row, error } = await supabase
    .from('pickleball_players').update(u).eq('id', id).select().single()
  if (error) { console.error('[Krida/Pickleball] updatePlayer:', error); throw error }
  return playerRowToObj(row)
}

// ── Entrants ────────────────────────────────────────────────────────────────

// memberPlayerIds is ordered — index 0 becomes seat 1, index 1 (if present)
// becomes seat 2. Caller is expected to have already run
// validateEntrantMembership()/findDuplicateParticipants() from
// pickleballValidation.js before calling this — RLS is the real backstop.
export async function createPickleballEntrant({ tournamentId, displayName, seedOrder = 0, memberPlayerIds }) {
  const { data: entrantRow, error: eErr } = await supabase
    .from('pickleball_entrants')
    .insert({ tournament_id: tournamentId, display_name: displayName, seed_order: seedOrder })
    .select().single()
  if (eErr) { console.error('[Krida/Pickleball] createEntrant:', eErr); throw eErr }

  const memberRows = memberPlayerIds.map((playerId, i) => ({
    entrant_id: entrantRow.id, player_id: playerId, seat: i + 1,
  }))
  const { error: mErr } = await supabase.from('pickleball_entrant_members').insert(memberRows)
  if (mErr) {
    console.error('[Krida/Pickleball] createEntrant — member insert failed, rolling back entrant:', mErr)
    await supabase.from('pickleball_entrants').delete().eq('id', entrantRow.id)
    throw mErr
  }

  return entrantRow.id
}

export async function updatePickleballEntrant(id, data) {
  const u = { updated_at: new Date().toISOString() }
  if (data.displayName      !== undefined) u.display_name      = data.displayName
  if (data.status           !== undefined) u.status            = data.status
  if (data.seedOrder        !== undefined) u.seed_order        = data.seedOrder
  if (data.pointsAdjustment !== undefined) u.points_adjustment = data.pointsAdjustment

  const { error } = await supabase.from('pickleball_entrants').update(u).eq('id', id)
  if (error) { console.error('[Krida/Pickleball] updateEntrant:', error); throw error }
}

export async function withdrawPickleballEntrant(id) {
  return updatePickleballEntrant(id, { status: 'withdrawn' })
}

export async function reinstatePickleballEntrant(id) {
  return updatePickleballEntrant(id, { status: 'active' })
}

export async function deletePickleballEntrant(id) {
  const { error } = await supabase.from('pickleball_entrants').delete().eq('id', id)
  if (error) { console.error('[Krida/Pickleball] deleteEntrant:', error); throw error }
}

// Replace an entrant's member roster entirely (used for "assign/change partner").
// memberPlayerIds ordered the same way as createPickleballEntrant.
export async function setPickleballEntrantMembers(entrantId, memberPlayerIds) {
  const { error: delErr } = await supabase.from('pickleball_entrant_members').delete().eq('entrant_id', entrantId)
  if (delErr) { console.error('[Krida/Pickleball] setEntrantMembers — delete failed:', delErr); throw delErr }

  const rows = memberPlayerIds.map((playerId, i) => ({ entrant_id: entrantId, player_id: playerId, seat: i + 1 }))
  const { error: insErr } = await supabase.from('pickleball_entrant_members').insert(rows)
  if (insErr) { console.error('[Krida/Pickleball] setEntrantMembers — insert failed:', insErr); throw insErr }
}

// ── Pools (Track B Phase 2) ─────────────────────────────────────────────────
// Both functions below are thin supabase.rpc() wrappers around the
// generate_pickleball_pools / reset_pickleball_pools Postgres functions
// (migration 009). No client-side rollback logic here on purpose — the
// database function runs as one transaction and rolls back everything on any
// RAISE EXCEPTION, so there is nothing left for the client to clean up.
// pools/matches are computed by the pure functions in pickleballPools.js
// (seeding, round-robin pairing); this file only serializes that plan into
// the RPC's params and surfaces whatever error Postgres raises (pool_size
// mismatch, already-scored block, missing force_regenerate flag, etc.) — the
// UI is expected to render that message the same way it renders any other
// validation error.
export async function generatePickleballPools(tournamentId, poolSize, poolAssignments, poolMatches, forceRegenerate = false) {
  const { data, error } = await supabase.rpc('generate_pickleball_pools', {
    p_tournament_id: tournamentId,
    p_pool_size: poolSize,
    p_pools: poolAssignments.pools.map(p => ({ label: p.label, entrant_ids: p.entrantIds })),
    p_matches: poolMatches.map(m => ({
      pool_label: m.poolLabel, entrant1_id: m.entrant1Id, entrant2_id: m.entrant2Id,
    })),
    p_force_regenerate: forceRegenerate,
  })
  if (error) { console.error('[Krida/Pickleball] generatePools:', error); throw error }
  return (data ?? []).map(poolRowToObj)
}

export async function resetPickleballPools(tournamentId) {
  const { error } = await supabase.rpc('reset_pickleball_pools', { p_tournament_id: tournamentId })
  if (error) { console.error('[Krida/Pickleball] resetPools:', error); throw error }
}

// ── Courts (Track B Phase 3) ────────────────────────────────────────────────
// Label-only assignment, no date/time — pickleball_courts/matches.court_id
// already existed from migration 005, so no new schema is needed here.
// Conflict detection (double-booked court/entrant) is deliberately out of
// scope without a time dimension to conflict over — this is informational
// grouping only ("which physical court is this match on"), matching how the
// existing read-only Schedule tab already groups matches by court.

export async function createPickleballCourt(tournamentId, label) {
  const { data: row, error } = await supabase
    .from('pickleball_courts')
    .insert({ tournament_id: tournamentId, label })
    .select().single()
  if (error) { console.error('[Krida/Pickleball] createCourt:', error); throw error }
  return courtRowToObj(row)
}

export async function deletePickleballCourt(id) {
  const { error } = await supabase.from('pickleball_courts').delete().eq('id', id)
  if (error) { console.error('[Krida/Pickleball] deleteCourt:', error); throw error }
}

export async function assignPickleballMatchCourt(matchId, courtId) {
  const { error } = await supabase.from('pickleball_matches').update({ court_id: courtId }).eq('id', matchId)
  if (error) { console.error('[Krida/Pickleball] assignMatchCourt:', error); throw error }
}

// ── Match scoring (Track B Phase 4 + Phase 5 advancement) ──────────────────
// Thin RPC wrapper — record_pickleball_match_score (migration 011) applies
// the already-computed {status, winnerEntrantId} atomically and, for
// elimination matches, advances the winner into the next round in the same
// transaction. games/status/winnerSeat are computed beforehand by
// pickleballScoring.js, not here.
export async function recordPickleballMatchScore(matchId, games, status, winnerEntrantId) {
  const { error } = await supabase.rpc('record_pickleball_match_score', {
    p_match_id: matchId, p_games: games, p_status: status, p_winner_entrant_id: winnerEntrantId,
  })
  if (error) { console.error('[Krida/Pickleball] recordMatchScore:', error); throw error }
}

// ── Bracket generation (Track B Phase 5) ────────────────────────────────────
// Thin RPC wrapper — generate_pickleball_bracket (migration 012) atomically
// clears any existing (unscored) elimination matches and inserts the new
// plan. rows are computed by pickleballBracket.js, not here.
export async function generatePickleballBracket(tournamentId, rows, forceRegenerate = false) {
  const { data, error } = await supabase.rpc('generate_pickleball_bracket', {
    p_tournament_id: tournamentId,
    p_rows: rows.map(r => ({
      round: r.round, slot: r.slot,
      entrant1_id: r.entrant1Id, entrant2_id: r.entrant2Id,
      status: r.status, winner_entrant_id: r.winnerEntrantId,
    })),
    p_force_regenerate: forceRegenerate,
  })
  if (error) { console.error('[Krida/Pickleball] generateBracket:', error); throw error }
  return data
}
