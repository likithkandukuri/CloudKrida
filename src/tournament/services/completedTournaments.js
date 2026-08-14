// ── Completed Tournaments archive — read-only aggregation ──────────────────
// Composes EXISTING fetch functions (fetchTournamentList/fetchEventList from
// db.js, fetchPickleballTournamentList from pickleballDb.js — none modified)
// with a couple of small additive queries to build the showcase list. Never
// writes anything, never touches tournament status/results/scoring/pairings/
// standings/bracket data — it only reads what's already there and decides
// which existing rows belong in the archive.
import { supabase } from '../../shared/utilities/supabase.js'
import { fetchTournamentList, fetchEventList } from './db.js'
import { fetchPickleballTournamentList } from './pickleballDb.js'
import {
  isBracketComplete, isPointsTournamentComplete, isPickleballComplete,
  coverPhotoByTournament, photoCountByTournament,
} from '../engine/completion.js'

export async function fetchCompletedTournaments() {
  const [chessTournaments, chessEvents, pickleballTournaments] = await Promise.all([
    fetchTournamentList(),
    fetchEventList(),
    fetchPickleballTournamentList(),
  ])

  const eventById = Object.fromEntries(chessEvents.map(e => [e.id, e]))

  // fetchTournamentList() deliberately returns matches:[] (list-shaped, not
  // detail-shaped) — chess tournaments not already explicitly marked
  // complete need a small additive query to run the format-specific
  // completion derivation.
  const needsMatchCheck = chessTournaments.filter(t => t.status !== 'complete')
  const matchesByTournament = {}
  if (needsMatchCheck.length > 0) {
    const { data: rows, error } = await supabase
      .from('matches')
      .select('tournament_id, round, slot, status, winner_name')
      .in('tournament_id', needsMatchCheck.map(t => t.id))
    if (error) console.error('[Krida] fetchCompletedTournaments matches:', error)
    for (const row of (rows ?? [])) {
      const list = matchesByTournament[row.tournament_id] ?? (matchesByTournament[row.tournament_id] = [])
      list.push({ round: row.round, slot: row.slot, status: row.status, winner: row.winner_name })
    }
  }

  const completedChess = chessTournaments.filter(t => {
    if (t.status === 'complete') return true
    const matches = matchesByTournament[t.id] ?? []
    return t.format === 'points_tournament'
      ? isPointsTournamentComplete({ status: t.status, currentRound: t.currentRound, totalRounds: t.totalRounds, matches })
      : isBracketComplete(matches, t.totalRounds)
  })

  const completedPickleball = pickleballTournaments.filter(t => isPickleballComplete(t.status))

  // Cover photos + counts — scoped only to the now-known-complete ids, and
  // only images (never a video) so the static card thumbnail always renders.
  const [chessGalleryRows, pbGalleryRows] = await Promise.all([
    fetchGalleryCovers('gallery_photos', completedChess.map(t => t.id)),
    fetchGalleryCovers('pickleball_gallery_photos', completedPickleball.map(t => t.id)),
  ])

  const coverByChess = coverPhotoByTournament(chessGalleryRows)
  const countByChess = photoCountByTournament(chessGalleryRows)
  const coverByPb    = coverPhotoByTournament(pbGalleryRows)
  const countByPb    = photoCountByTournament(pbGalleryRows)

  const chessItems = completedChess.map(t => {
    const event = t.eventId ? eventById[t.eventId] : null
    return {
      id:           `chess-${t.id}`,
      sport:        'chess',
      tournamentId: t.id,
      title:        event ? `${event.name} — ${t.name}` : t.name,
      eventName:    event?.name ?? null,
      category:     event ? t.name : null,
      date:         event?.date ?? null,
      coverUrl:     coverByChess[t.id]?.public_url ?? null,
      photoCount:   countByChess[t.id] ?? 0,
      galleryPath:  `/tournaments/chess/gallery/${t.id}`,
      brochureUrl:  event?.brochureUrl ?? null,
    }
  })

  const pickleballItems = completedPickleball.map(t => ({
    id:           `pickleball-${t.id}`,
    sport:        'pickleball',
    tournamentId: t.id,
    title:        t.name,
    eventName:    null,
    category:     t.ageBand ?? t.skillDivision ?? null,
    date:         t.date ?? null,
    coverUrl:     coverByPb[t.id]?.public_url ?? null,
    photoCount:   countByPb[t.id] ?? 0,
    galleryPath:  `/tournaments/pickleball/gallery/${t.id}`,
    brochureUrl:  t.brochureUrl ?? null,
  }))

  return [...chessItems, ...pickleballItems].sort((a, b) => {
    if (a.date && b.date) return new Date(b.date) - new Date(a.date)
    if (a.date) return -1
    if (b.date) return 1
    return a.title.localeCompare(b.title)
  })
}

async function fetchGalleryCovers(table, tournamentIds) {
  if (!tournamentIds.length) return []
  const { data, error } = await supabase
    .from(table)
    .select('tournament_id, public_url, media_type, uploaded_at')
    .eq('media_type', 'image')
    .in('tournament_id', tournamentIds)
    .order('uploaded_at')
  if (error) { console.error(`[Krida] fetchCompletedTournaments ${table}:`, error); return [] }
  return data ?? []
}
