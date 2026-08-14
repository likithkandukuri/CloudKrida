// ── Upcoming Events — homepage "what's coming next" feed ───────────────────
// Two sources, combined:
//  1. Chess `events` that aren't fully complete yet (existing fetchEventList(),
//     unmodified, plus the existing read-only completion predicates from
//     engine/completion.js — no new query logic beyond what
//     completedTournaments.js already does for its own purposes).
//  2. `upcoming_events` rows — pure announcements for events that don't have
//     a tournament/event row yet (e.g. a Pickleball tournament nobody has
//     created in the app yet). An announcement can optionally be linked to
//     the real event/tournament once it exists (linkedEventId /
//     linkedPickleballTournamentId) — once that linked entity is fully
//     complete, the announcement stops appearing here on its own; no manual
//     deletion required.
import { supabase } from '../../shared/utilities/supabase.js'
import { fetchTournamentList, fetchEventList } from './db.js'
import { fetchPickleballTournamentList } from './pickleballDb.js'
import {
  isBracketComplete, isPointsTournamentComplete, isPickleballComplete, isEventComplete,
} from '../engine/completion.js'

const BUCKET = 'event-brochures'

function rowToObj(row) {
  return {
    id:                            row.id,
    sport:                         row.sport,
    name:                          row.name,
    date:                          row.date ?? null,
    location:                      row.location ?? '',
    description:                   row.description ?? '',
    brochurePath:                  row.brochure_path ?? null,
    brochureUrl:                   row.brochure_url ?? null,
    brochureUploadedAt:            row.brochure_uploaded_at ? new Date(row.brochure_uploaded_at).getTime() : null,
    linkedEventId:                 row.linked_event_id ?? null,
    linkedPickleballTournamentId:  row.linked_pickleball_tournament_id ?? null,
    createdAt:                     new Date(row.created_at).getTime(),
    updatedAt:                     new Date(row.updated_at).getTime(),
  }
}

export async function fetchUpcomingEvents() {
  const [chessTournaments, chessEvents, pickleballTournaments, { data: announceRows, error }] = await Promise.all([
    fetchTournamentList(),
    fetchEventList(),
    fetchPickleballTournamentList(),
    supabase.from('upcoming_events').select('*').order('date', { ascending: true, nullsFirst: false }),
  ])
  if (error) console.error('[Krida] fetchUpcomingEvents:', error)

  // Same "only fetch matches for sections not already explicitly complete"
  // shape as completedTournaments.js.
  const needsMatchCheck = chessTournaments.filter(t => t.status !== 'complete')
  const matchesByTournament = {}
  if (needsMatchCheck.length > 0) {
    const { data: rows, error: mErr } = await supabase
      .from('matches')
      .select('tournament_id, round, slot, status, winner_name')
      .in('tournament_id', needsMatchCheck.map(t => t.id))
    if (mErr) console.error('[Krida] fetchUpcomingEvents matches:', mErr)
    for (const row of (rows ?? [])) {
      const list = matchesByTournament[row.tournament_id] ?? (matchesByTournament[row.tournament_id] = [])
      list.push({ round: row.round, slot: row.slot, status: row.status, winner: row.winner_name })
    }
  }

  const isChessTournamentComplete = (t) => {
    if (t.status === 'complete') return true
    const matches = matchesByTournament[t.id] ?? []
    return t.format === 'points_tournament'
      ? isPointsTournamentComplete({ status: t.status, currentRound: t.currentRound, totalRounds: t.totalRounds, matches })
      : isBracketComplete(matches, t.totalRounds)
  }

  const sectionsByEvent = {}
  for (const t of chessTournaments) {
    if (!t.eventId) continue
    (sectionsByEvent[t.eventId] ?? (sectionsByEvent[t.eventId] = [])).push(t)
  }
  const eventCompleteById = Object.fromEntries(
    chessEvents.map(ev => [ev.id, isEventComplete(sectionsByEvent[ev.id] ?? [], isChessTournamentComplete)])
  )
  const pbCompleteById = Object.fromEntries(
    pickleballTournaments.map(t => [t.id, isPickleballComplete(t.status)])
  )

  const upcomingChessEvents = chessEvents
    .filter(ev => !eventCompleteById[ev.id])
    .map(ev => ({
      id:           `event-${ev.id}`,
      sport:        'chess',
      name:         ev.name,
      category:     null,
      date:         ev.date,
      location:     ev.location || '',
      brochureUrl:  ev.brochureUrl ?? null,
      detailPath:   null, // no brochure-less detail page yet — card just shows what's known
    }))

  const announcements = (announceRows ?? [])
    .map(rowToObj)
    .filter(a => {
      if (a.linkedEventId && eventCompleteById[a.linkedEventId]) return false
      if (a.linkedPickleballTournamentId && pbCompleteById[a.linkedPickleballTournamentId]) return false
      return true
    })
    .map(a => ({
      id:           `announcement-${a.id}`,
      sport:        a.sport,
      name:         a.name,
      category:     null,
      date:         a.date,
      location:     a.location,
      brochureUrl:  a.brochureUrl,
      detailPath:   null,
    }))

  return [...upcomingChessEvents, ...announcements].sort((a, b) => {
    if (a.date && b.date) return new Date(a.date) - new Date(b.date)
    if (a.date) return -1
    if (b.date) return 1
    return a.name.localeCompare(b.name)
  })
}

// ── Admin CRUD (superadmin only — enforced by RLS; UI also gates this) ─────

export async function createUpcomingEvent(data) {
  const { data: row, error } = await supabase
    .from('upcoming_events')
    .insert({
      sport:       data.sport,
      name:        data.name,
      date:        data.date || null,
      location:    data.location || '',
      description: data.description || '',
    })
    .select()
    .single()
  if (error) { console.error('[Krida] createUpcomingEvent:', error); throw error }
  return rowToObj(row)
}

export async function updateUpcomingEvent(id, partial) {
  const u = { updated_at: new Date().toISOString() }
  if (partial.sport                          !== undefined) u.sport                            = partial.sport
  if (partial.name                           !== undefined) u.name                              = partial.name
  if (partial.date                           !== undefined) u.date                              = partial.date || null
  if (partial.location                       !== undefined) u.location                          = partial.location
  if (partial.description                    !== undefined) u.description                       = partial.description
  if (partial.brochurePath                   !== undefined) u.brochure_path                     = partial.brochurePath
  if (partial.brochureUrl                    !== undefined) u.brochure_url                      = partial.brochureUrl
  if (partial.brochureUploadedAt             !== undefined) u.brochure_uploaded_at              = partial.brochureUploadedAt
  if (partial.linkedEventId                  !== undefined) u.linked_event_id                   = partial.linkedEventId
  if (partial.linkedPickleballTournamentId   !== undefined) u.linked_pickleball_tournament_id    = partial.linkedPickleballTournamentId
  const { data: row, error } = await supabase.from('upcoming_events').update(u).eq('id', id).select().single()
  if (error) { console.error('[Krida] updateUpcomingEvent:', error); throw error }
  return rowToObj(row)
}

export async function deleteUpcomingEvent(id) {
  const { error } = await supabase.from('upcoming_events').delete().eq('id', id)
  if (error) { console.error('[Krida] deleteUpcomingEvent:', error); throw error }
}

// Uploads a brochure file (image or PDF) and returns the fields to pass into
// updateUpcomingEvent()/updateEvent()/updateTournament() (pickleball) — the
// same {path, url}-then-persist pattern GalleryView.jsx uses.
export async function uploadBrochureFile(ownerId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${ownerId}/${Date.now()}-${safeName}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
  if (upErr) { console.error('[Krida] uploadBrochureFile:', upErr); throw upErr }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { brochurePath: path, brochureUrl: publicUrl, brochureUploadedAt: new Date().toISOString() }
}

export async function removeBrochureFile(path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[Krida] removeBrochureFile (file orphaned):', error.message)
}
