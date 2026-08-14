// ── Completion predicates for the Completed Tournaments archive ────────────
// Every function here only READS existing tournament/match/status fields —
// nothing here writes data, and nothing here changes how completion is
// decided anywhere else in the app. TournamentList.jsx's TournamentCard and
// PointsTournament.jsx's champion banner keep their own inline checks
// exactly as they already are; these are parallel, read-only mirrors of
// that same logic, built so the archive page can reuse it without touching
// either call site.
import { isRoundComplete } from './standings.js'

// ── Chess: single_elimination (bracket) format ─────────────────────────────
// Mirrors TournamentList.jsx's TournamentCard exactly: the champion is
// whoever won the final match (last round, slot 0).
export function findBracketChampion(matches, totalRounds) {
  const finalMatch = (matches ?? []).find(m => m.round === totalRounds - 1 && m.slot === 0)
  return finalMatch?.winner ?? null
}

export function isBracketComplete(matches, totalRounds) {
  return !!findBracketChampion(matches, totalRounds)
}

// ── Chess: points_tournament (Swiss) format ─────────────────────────────────
// Mirrors PointsTournament.jsx's `allDone` check (final round reached and
// fully scored). An explicit status of 'complete' always short-circuits to
// true first — this covers a tournament a director has explicitly marked
// done (e.g. via direct administration) even when its round/match data is
// incomplete, tied, or otherwise ambiguous for the round-based derivation.
export function isPointsTournamentComplete({ status, currentRound, totalRounds, matches }) {
  if (status === 'complete') return true
  const round = currentRound ?? 0
  const isFinalRound = round >= (totalRounds ?? 0) - 1
  if (!isFinalRound) return false
  return isRoundComplete(matches ?? [], round)
}

// ── Chess: event-level (all sections) ───────────────────────────────────────
// An event is complete only once every one of its sections is — mirrors
// TournamentList.jsx's EventCard `allComplete` check (`sections.every(s =>
// s.status === 'complete')`), generalized to accept any per-section
// completeness lookup (e.g. computed via isBracketComplete/
// isPointsTournamentComplete above) rather than only the raw status column,
// so it stays correct even for sections whose status was never explicitly
// set. An event with zero sections yet is never "complete" — nothing to be
// done, so it stays in Upcoming.
export function isEventComplete(sections, isTournamentComplete) {
  if (!sections?.length) return false
  return sections.every(s => isTournamentComplete(s))
}

// ── Pickleball ───────────────────────────────────────────────────────────────
// status is already the real, explicit, UI-driven mechanism (set via the
// "Mark Tournament Complete" action) — kept as a named predicate for
// symmetry/testability rather than inlining `=== 'complete'` at every call site.
export function isPickleballComplete(status) {
  return status === 'complete'
}

// ── Gallery grouping reducers ────────────────────────────────────────────────
// rows: [{ tournament_id, public_url, media_type, uploaded_at }, ...] — sorted
// defensively here rather than trusting caller order.
function sortedByUploadTime(rows) {
  return [...(rows ?? [])].sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at))
}

export function coverPhotoByTournament(rows) {
  const result = {}
  for (const row of sortedByUploadTime(rows)) {
    if (!result[row.tournament_id]) result[row.tournament_id] = row
  }
  return result
}

export function photoCountByTournament(rows) {
  const result = {}
  for (const row of (rows ?? [])) {
    result[row.tournament_id] = (result[row.tournament_id] ?? 0) + 1
  }
  return result
}
