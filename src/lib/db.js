import { supabase } from './supabase.js'

// ── Row ↔ Domain converters ───────────────────────────────────────────────────

function playerRowToObj(row) {
  return { name: row.name, ...row.data }
}

function matchRowToObj(row, playerMap = {}) {
  const p1 = row.p1_name
    ? (playerMap[row.p1_name] ?? { name: row.p1_name })
    : null
  const p2 = row.p2_name === 'BYE'
    ? 'BYE'
    : row.p2_name
      ? (playerMap[row.p2_name] ?? { name: row.p2_name })
      : null

  return {
    id:          row.id,
    round:       row.round,
    slot:        row.slot,
    status:      row.status,
    p1,
    p2,
    winner:      row.winner_name ?? null,
    score1:      row.score1  !== null ? Number(row.score1)  : null,
    score2:      row.score2  !== null ? Number(row.score2)  : null,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
    record:      row.record_url ? { imageUrl: row.record_url, uploadedAt: Date.now() } : null,
  }
}

function tournamentRowToMeta(row) {
  return {
    id:           row.id,
    name:         row.name,
    format:       row.format,
    status:       row.status,
    totalRounds:  row.total_rounds,
    currentRound: row.current_round,
    playerFields: row.player_fields,
    eventId:      row.event_id    ?? null,
    eventOrder:   row.event_order ?? 0,
    createdAt:    new Date(row.created_at).getTime(),
    players:      [],
    matches:      [],
    gallery:      [],
  }
}

function eventRowToObj(row, sections = [], gallery = []) {
  return {
    id:          row.id,
    name:        row.name,
    date:        row.date         ?? null,
    location:    row.location     ?? '',
    description: row.description  ?? '',
    createdAt:   new Date(row.created_at).getTime(),
    sections, // lightweight tournament metadata (no players/matches)
    gallery,
  }
}

// ── Fetch full tournament (tournament + players + matches + gallery) ───────────

export async function fetchTournament(id) {
  const [
    { data: t,  error: tErr },
    { data: ps },
    { data: ms },
    { data: gs },
  ] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('seed_order'),
    supabase.from('matches').select('*').eq('tournament_id', id).order('round').order('slot'),
    supabase.from('gallery_photos').select('*').eq('tournament_id', id).order('uploaded_at'),
  ])

  if (tErr || !t) return null

  const players   = (ps ?? []).map(playerRowToObj)
  const playerMap = Object.fromEntries(players.map(p => [p.name, p]))

  return {
    ...tournamentRowToMeta(t),
    players,
    matches: (ms ?? []).map(m => matchRowToObj(m, playerMap)),
    gallery: (gs ?? []).map(g => ({
      id:          g.id,
      imageUrl:    g.public_url,
      name:        g.file_name,
      storagePath: g.storage_path,
      uploadedAt:  new Date(g.uploaded_at).getTime(),
    })),
  }
}

// ── Fetch tournament list (metadata only) ─────────────────────────────────────

export async function fetchTournamentList() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, format, status, total_rounds, current_round, player_fields, created_at, event_id, event_order')
    .order('created_at', { ascending: false })

  if (error) { console.error('[Krida] fetchTournamentList:', error); return [] }
  return (data ?? []).map(tournamentRowToMeta)
}

// ── Create tournament ─────────────────────────────────────────────────────────

export async function createTournamentInDB({
  name, format, players, matches,
  totalRounds, currentRound = 0, playerFields = ['name'],
  eventId = null, eventOrder = 0,
}) {
  console.log('[DB] createTournamentInDB:', { name, format, totalRounds, players: players.length, matches: matches.length, eventId })
  const { data: t, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      name, format, status: 'active',
      total_rounds: totalRounds, current_round: currentRound,
      player_fields: playerFields,
      event_id: eventId, event_order: eventOrder,
    })
    .select()
    .single()
  if (tErr) {
    console.error('[DB] createTournamentInDB — tournament insert failed:', tErr)
    throw tErr
  }
  console.log('[DB] Tournament row created, id:', t.id, '— inserting', players.length, 'players and', matches.length, 'matches')

  if (players.length > 0) {
    const rows = players.map((p, i) => {
      const { name: pName, id: _localId, ...rest } = p
      return { tournament_id: t.id, name: pName, data: rest, seed_order: i }
    })
    const { error: pErr } = await supabase.from('players').insert(rows)
    if (pErr) {
      console.error('[DB] createTournamentInDB — players insert failed:', pErr)
      throw pErr
    }
    console.log('[DB] Players inserted for', t.id)
  }

  let insertedMatches = []
  if (matches.length > 0) {
    const rows = matches.map(m => ({
      tournament_id: t.id,
      round:         m.round,
      slot:          m.slot,
      status:        m.status,
      p1_name:       m.p1?.name  ?? null,
      p2_name:       m.p2 === 'BYE' ? 'BYE' : (m.p2?.name ?? null),
      winner_name:   m.winner    ?? null,
      score1:        m.score1    ?? null,
      score2:        m.score2    ?? null,
    }))
    const { data: mRows, error: mErr } = await supabase.from('matches').insert(rows).select()
    if (mErr) {
      console.error('[DB] createTournamentInDB — matches insert failed:', mErr)
      throw mErr
    }
    insertedMatches = mRows ?? []
    console.log('[DB] Matches inserted for', t.id)
  }

  const playerMap = Object.fromEntries(players.map(p => [p.name, p]))
  return {
    ...tournamentRowToMeta(t),
    players,
    matches: insertedMatches
      .sort((a, b) => a.round !== b.round ? a.round - b.round : a.slot - b.slot)
      .map(m => matchRowToObj(m, playerMap)),
    gallery: [],
  }
}

// ── Delete tournament ─────────────────────────────────────────────────────────

export async function deleteTournamentFromDB(id) {
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) console.error('[Krida] deleteTournament:', error)
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEventList() {
  const { data: evs, error } = await supabase
    .from('events')
    .select('id, name, date, location, description, created_at')
    .order('created_at', { ascending: false })
  if (error) { console.error('[Krida] fetchEventList:', error); return [] }

  // Fetch section metadata for all events in one query
  const eventIds = (evs ?? []).map(e => e.id)
  let sectionMap = {}
  if (eventIds.length > 0) {
    const { data: ts } = await supabase
      .from('tournaments')
      .select('id, name, format, status, total_rounds, current_round, player_fields, created_at, event_id, event_order')
      .in('event_id', eventIds)
      .order('event_order')
    for (const t of ts ?? []) {
      if (!sectionMap[t.event_id]) sectionMap[t.event_id] = []
      sectionMap[t.event_id].push(tournamentRowToMeta(t))
    }
  }

  return (evs ?? []).map(ev => eventRowToObj(ev, sectionMap[ev.id] ?? []))
}

export async function fetchEvent(id) {
  const [{ data: ev, error }, { data: ts }, { data: gs }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('tournaments')
      .select('id, name, format, status, total_rounds, current_round, player_fields, created_at, event_id, event_order')
      .eq('event_id', id).order('event_order'),
    supabase.from('gallery_photos').select('*').eq('event_id', id).order('uploaded_at'),
  ])
  if (error || !ev) return null
  return eventRowToObj(
    ev,
    (ts ?? []).map(tournamentRowToMeta),
    (gs ?? []).map(g => ({
      id: g.id, imageUrl: g.public_url, name: g.file_name,
      storagePath: g.storage_path, uploadedAt: new Date(g.uploaded_at).getTime(),
    })),
  )
}

export async function createEventInDB({ name, date, location, description }) {
  console.log('[DB] createEventInDB:', { name, date, location })
  const { data: ev, error } = await supabase
    .from('events')
    .insert({ name, date: date || null, location: location || '', description: description || '' })
    .select()
    .single()
  if (error) {
    console.error('[DB] createEventInDB failed:', error)
    throw error
  }
  console.log('[DB] createEventInDB success, id:', ev.id)
  return eventRowToObj(ev)
}

export async function updateEventInDB(id, partial) {
  const u = {}
  if (partial.name        !== undefined) u.name        = partial.name
  if (partial.date        !== undefined) u.date        = partial.date || null
  if (partial.location    !== undefined) u.location    = partial.location
  if (partial.description !== undefined) u.description = partial.description
  if (!Object.keys(u).length) return
  u.updated_at = new Date().toISOString()
  const { error } = await supabase.from('events').update(u).eq('id', id)
  if (error) console.error('[Krida] updateEvent:', error)
}

export async function deleteEventInDB(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) console.error('[Krida] deleteEvent:', error)
}

// ── Persist partial tournament update ─────────────────────────────────────────

export async function persistTournamentUpdate(tournamentId, partial, currentTournament) {
  const ops = []

  const tUpdate = {}
  if (partial.currentRound !== undefined) tUpdate.current_round = partial.currentRound
  if (partial.totalRounds  !== undefined) tUpdate.total_rounds  = partial.totalRounds
  if (partial.status       !== undefined) tUpdate.status        = partial.status
  if (Object.keys(tUpdate).length > 0) {
    tUpdate.updated_at = new Date().toISOString()
    ops.push(supabase.from('tournaments').update(tUpdate).eq('id', tournamentId))
  }

  if (partial.matches !== undefined) {
    const oldMs = currentTournament?.matches ?? []
    const newMs = partial.matches

    const changed = newMs.filter(nm => {
      const old = oldMs.find(om => om.id === nm.id)
      if (!old) return false
      const oldP2 = old.p2 === 'BYE' ? 'BYE' : old.p2?.name
      const newP2 = nm.p2  === 'BYE' ? 'BYE' : nm.p2?.name
      return old.status    !== nm.status
          || old.winner    !== nm.winner
          || old.score1    !== nm.score1
          || old.score2    !== nm.score2
          || old.p1?.name  !== nm.p1?.name
          || oldP2         !== newP2
          || (old.record?.imageUrl ?? null) !== (nm.record?.imageUrl ?? null)
    })

    const added   = newMs.filter(nm => !oldMs.some(om => om.id === nm.id))
    const deleted = oldMs.filter(om => !newMs.some(nm => nm.id === om.id))

    for (const m of changed) {
      ops.push(
        supabase.from('matches').update({
          status:       m.status,
          p1_name:      m.p1?.name  ?? null,
          p2_name:      m.p2 === 'BYE' ? 'BYE' : (m.p2?.name ?? null),
          winner_name:  m.winner    ?? null,
          score1:       m.score1    ?? null,
          score2:       m.score2    ?? null,
          completed_at: m.completedAt ? new Date(m.completedAt).toISOString() : null,
          record_url:   m.record?.imageUrl ?? null,
          updated_at:   new Date().toISOString(),
        }).eq('id', m.id)
      )
    }

    if (added.length > 0) {
      const rows = added.map(m => ({
        tournament_id: tournamentId,
        round:         m.round,
        slot:          m.slot,
        status:        m.status,
        p1_name:       m.p1?.name  ?? null,
        p2_name:       m.p2 === 'BYE' ? 'BYE' : (m.p2?.name ?? null),
        winner_name:   m.winner    ?? null,
        score1:        m.score1    ?? null,
        score2:        m.score2    ?? null,
      }))
      ops.push(supabase.from('matches').insert(rows))
    }

    if (deleted.length > 0) {
      ops.push(supabase.from('matches').delete().in('id', deleted.map(m => m.id)))
    }
  }

  if (partial.players !== undefined) {
    const oldPs = currentTournament?.players ?? []
    const newPs = partial.players

    const removedNames = oldPs
      .filter(op => !newPs.some(np => np.name === op.name))
      .map(op => op.name)

    if (removedNames.length > 0) {
      ops.push(
        supabase.from('players').delete()
          .eq('tournament_id', tournamentId)
          .in('name', removedNames)
      )
    }

    const addedPs = newPs.filter(np => !oldPs.some(op => op.name === np.name))
    if (addedPs.length > 0) {
      const rows = addedPs.map((p, i) => {
        const { name, id: _id, ...rest } = p
        return { tournament_id: tournamentId, name, data: rest, seed_order: oldPs.length + i }
      })
      ops.push(supabase.from('players').insert(rows))
    }
  }

  if (ops.length > 0) {
    const results = await Promise.all(ops)
    results.forEach(r => { if (r?.error) console.error('[Krida] persistUpdate error:', r.error) })
  }
}

// ── Persist new Swiss round ───────────────────────────────────────────────────

export async function persistNewRound(tournamentId, newLocalMatches, nextRound, newTotalRounds) {
  const rows = newLocalMatches.map(m => ({
    tournament_id: tournamentId,
    round:         m.round,
    slot:          m.slot,
    status:        m.status,
    p1_name:       m.p1?.name  ?? null,
    p2_name:       m.p2 === 'BYE' ? 'BYE' : (m.p2?.name ?? null),
    winner_name:   m.winner    ?? null,
    score1:        m.score1    ?? null,
    score2:        m.score2    ?? null,
  }))

  const tUpdate = { current_round: nextRound, updated_at: new Date().toISOString() }
  if (newTotalRounds !== undefined) tUpdate.total_rounds = newTotalRounds

  const [{ data: insertedRows, error: mErr }] = await Promise.all([
    supabase.from('matches').insert(rows).select(),
    supabase.from('tournaments').update(tUpdate).eq('id', tournamentId),
  ])

  if (mErr) console.error('[Krida] persistNewRound:', mErr)
  return insertedRows ?? []
}

// ── Quick matches ─────────────────────────────────────────────────────────────

export async function fetchQuickMatches() {
  const { data } = await supabase
    .from('quick_matches')
    .select('id, data, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []).map(row => ({ ...row.data, id: row.id }))
}

export async function saveQuickMatch(match) {
  const { id: _localId, ...rest } = match
  const { error } = await supabase.from('quick_matches').insert({ data: rest })
  if (error) console.error('[Krida] saveQuickMatch:', error)
}
