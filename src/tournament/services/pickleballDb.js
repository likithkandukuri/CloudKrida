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
    brochurePath:       row.brochure_path ?? null,
    brochureUrl:        row.brochure_url  ?? null,
    brochureUploadedAt: row.brochure_uploaded_at ? new Date(row.brochure_uploaded_at).getTime() : null,
    // PDF importer (migration 017) — null for every organically-created tournament.
    advancementMapping: row.advancement_mapping ?? null,
    importedRules:      row.imported_rules ?? null,
    // Tournament timing (migration 019) — null unless the source PDF stated
    // it (or, for start/end, unless derived from the printed schedule).
    // Exposed as epoch ms, matching createdAt/updatedAt/brochureUploadedAt.
    startAt:                 row.start_at ? new Date(row.start_at).getTime() : null,
    endAt:                   row.end_at ? new Date(row.end_at).getTime() : null,
    checkInAt:               row.check_in_at ? new Date(row.check_in_at).getTime() : null,
    registrationDeadlineAt:  row.registration_deadline_at ? new Date(row.registration_deadline_at).getTime() : null,
    timeZone:                row.time_zone ?? null,
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
  if (data.brochurePath       !== undefined) u.brochure_path        = data.brochurePath
  if (data.brochureUrl        !== undefined) u.brochure_url         = data.brochureUrl
  if (data.brochureUploadedAt !== undefined) u.brochure_uploaded_at = data.brochureUploadedAt
  // Timing (migration 019) — pass-through only, same "!== undefined" partial-
  // patch convention as every other optional field above. There is no UI
  // input for these on the manual create/edit form yet (out of scope for
  // this change); this exists so editing an imported tournament's name,
  // status, etc. through that same form round-trips its timing data
  // unchanged rather than silently nulling it out.
  if (data.startAt                !== undefined) u.start_at                 = data.startAt ? new Date(data.startAt).toISOString() : null
  if (data.endAt                  !== undefined) u.end_at                   = data.endAt ? new Date(data.endAt).toISOString() : null
  if (data.checkInAt              !== undefined) u.check_in_at              = data.checkInAt ? new Date(data.checkInAt).toISOString() : null
  if (data.registrationDeadlineAt !== undefined) u.registration_deadline_at = data.registrationDeadlineAt ? new Date(data.registrationDeadlineAt).toISOString() : null
  if (data.timeZone               !== undefined) u.time_zone               = data.timeZone || null

  const { data: row, error } = await supabase
    .from('pickleball_tournaments').update(u).eq('id', id).select().single()
  if (error) { console.error('[Krida/Pickleball] updateTournament:', error); throw error }
  return tournamentRowToObj(row)
}

// Superadmin-only (pb_tournaments_delete RLS, migration 005) — enforced
// server-side, this call is rejected outright for any non-superadmin even if
// the UI gate were bypassed. entrants/entrant_members/pools/courts/matches/
// gallery rows all cascade automatically via their tournament_id ON DELETE
// CASCADE fk (migration 005); pickleball_players (the reusable, cross-
// tournament identity table) is intentionally never touched here. Gallery
// Storage objects have no DB-level cascade, so they're removed explicitly
// first — a failure there is logged (orphaned files) rather than blocking
// the actual deletion, since the row delete is the source of truth.
export async function deletePickleballTournament(id) {
  const { data: galleryRows } = await supabase
    .from('pickleball_gallery_photos')
    .select('storage_path')
    .eq('tournament_id', id)
  const paths = (galleryRows ?? []).map(r => r.storage_path).filter(Boolean)
  if (paths.length) {
    const { error: storErr } = await supabase.storage.from(PB_GALLERY_BUCKET).remove(paths)
    if (storErr) console.error('[Krida/Pickleball] deleteTournament gallery storage cleanup (files orphaned):', storErr.message)
  }

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

// ── Pool placement (new work) ───────────────────────────────────────────────
// Thin RPC wrapper — move_pickleball_entrant_to_pool (migration 013)
// atomically re-validates and moves one entrant into a different
// already-generated pool. No client-side logic beyond the call itself.
export async function movePickleballEntrantToPool(entrantId, targetPoolId) {
  const { error } = await supabase.rpc('move_pickleball_entrant_to_pool', {
    p_entrant_id: entrantId, p_target_pool_id: targetPoolId,
  })
  if (error) { console.error('[Krida/Pickleball] moveEntrantToPool:', error); throw error }
}

// ── Bracket granular editing (new work) ─────────────────────────────────────
// Lock toggle needs no RPC — `locked` is a plain boolean already covered by
// the existing pb_matches_update RLS policy. Swap/bye-assign/bye-remove are
// thin wrappers around migration 014's brand-new RPCs (none of which touch
// record_pickleball_match_score or any other Track B function).
export async function togglePickleballMatchLock(matchId, locked) {
  const { error } = await supabase.from('pickleball_matches').update({ locked }).eq('id', matchId)
  if (error) { console.error('[Krida/Pickleball] toggleMatchLock:', error); throw error }
}

export async function swapPickleballBracketEntrants(match1Id, seat1, match2Id, seat2) {
  const { error } = await supabase.rpc('swap_pickleball_bracket_entrants', {
    p_match1_id: match1Id, p_seat1: seat1, p_match2_id: match2Id, p_seat2: seat2,
  })
  if (error) { console.error('[Krida/Pickleball] swapBracketEntrants:', error); throw error }
}

export async function assignPickleballMatchBye(matchId, winnerEntrantId) {
  const { error } = await supabase.rpc('assign_pickleball_match_bye', {
    p_match_id: matchId, p_winner_entrant_id: winnerEntrantId,
  })
  if (error) { console.error('[Krida/Pickleball] assignMatchBye:', error); throw error }
}

export async function removePickleballMatchBye(matchId) {
  const { error } = await supabase.rpc('remove_pickleball_match_bye', { p_match_id: matchId })
  if (error) { console.error('[Krida/Pickleball] removeMatchBye:', error); throw error }
}

// ── Gallery (Phase B — media) ────────────────────────────────────────────────
// Mirrors Chess's GalleryView.jsx storage/DB pattern (bucket + path scheme +
// table shape are already generic media handling, not chess-specific) but
// factored into pickleballDb.js functions rather than inlined in the
// component, matching this file's own established convention. Table
// (pickleball_gallery_photos), bucket (pickleball-gallery), and RLS
// (is_admin_or_above() insert/delete) all already existed from migration 005 —
// this is the first code that actually writes to them.
const PB_GALLERY_BUCKET = 'pickleball-gallery'
export const PB_GALLERY_ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const PB_GALLERY_ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const PB_GALLERY_MAX_IMAGE_BYTES = 12 * 1024 * 1024   // 12 MB
export const PB_GALLERY_MAX_VIDEO_BYTES = 100 * 1024 * 1024  // 100 MB

export async function uploadPickleballGalleryFile(tournamentId, file, userId, userRole) {
  const isVideo   = file.type.startsWith('video/')
  const mediaType = isVideo ? 'video' : 'image'
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path      = `${tournamentId}/${Date.now()}-${safeName}`

  const { error: uploadErr } = await supabase.storage.from(PB_GALLERY_BUCKET).upload(path, file)
  if (uploadErr) { console.error('[Krida/Pickleball] gallery upload:', uploadErr); throw uploadErr }

  const { data: { publicUrl } } = supabase.storage.from(PB_GALLERY_BUCKET).getPublicUrl(path)

  const { data: row, error: dbErr } = await supabase.from('pickleball_gallery_photos').insert({
    tournament_id: tournamentId,
    storage_path:  path,
    public_url:    publicUrl,
    file_name:     file.name,
    uploaded_by:   userId,
    media_type:    mediaType,
    uploader_role: userRole,
  }).select().single()
  if (dbErr) {
    // Roll back the storage object if the DB insert failed, so an
    // unauthorized/failed upload never leaves an orphaned file behind.
    await supabase.storage.from(PB_GALLERY_BUCKET).remove([path])
    console.error('[Krida/Pickleball] gallery DB insert:', dbErr)
    throw dbErr
  }
  return galleryRowToObj(row)
}

export async function deletePickleballGalleryItem(item) {
  const { error: dbErr } = await supabase.from('pickleball_gallery_photos').delete().eq('id', item.id)
  if (dbErr) { console.error('[Krida/Pickleball] gallery delete:', dbErr); throw dbErr }
  if (item.storagePath) {
    const { error: storErr } = await supabase.storage.from(PB_GALLERY_BUCKET).remove([item.storagePath])
    if (storErr) console.error('[Krida/Pickleball] gallery storage delete (file orphaned):', storErr.message)
  }
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

// ── PDF Tournament Importer ──────────────────────────────────────────────────
// Thin wrapper around import_pickleball_tournament (migration 017) — the one
// write the import wizard's final "Create Tournament" step performs. The
// payload (already shaped as { p_tournament, p_players, p_entrants, p_courts,
// p_pools, p_matches } with temp_id cross-references) comes from
// pickleballImportMapping.js's toImportPayload(). The whole thing is one
// Postgres function call, so it either creates the complete tournament or
// creates nothing — see the migration's own header comment for why this is a
// dedicated RPC rather than a client-side sequence of the existing
// create/addEntrant/generatePools calls.
export async function importPickleballTournament(payload) {
  const { data, error } = await supabase.rpc('import_pickleball_tournament', payload)
  if (error) { console.error('[Krida/Pickleball] importTournament:', error); throw error }
  return data // new tournament id
}

// pickleball_matches.scheduled_at has existed since the original schema
// (005) but had no setter anywhere until the importer needed to preserve a
// document's printed match times — plain UPDATE, no RPC needed, exactly like
// the existing togglePickleballMatchLock.
export async function updatePickleballMatchSchedule(matchId, scheduledAt) {
  const { error } = await supabase.from('pickleball_matches').update({ scheduled_at: scheduledAt }).eq('id', matchId)
  if (error) { console.error('[Krida/Pickleball] updateMatchSchedule:', error); throw error }
}
