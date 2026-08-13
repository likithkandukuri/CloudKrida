// ── Sport-agnostic standings helpers ───────────────────────────────────────
// Extracted from src/tournament/chess/pointsUtils.js — ONLY the three
// functions verified genuinely generic by direct inspection. computeStandings
// and generateSwissPairings were deliberately NOT extracted: computeStandings
// hardcodes chess's win(1)/draw(0.5)/loss(0) point system, and
// generateSwissPairings' color-balance step is White/Black-specific — neither
// applies to Pickleball, which has no draws and isn't using a Swiss format.
// Each sport should compute its own standings; only these generic status/
// display helpers are shared. See the Phase 1 audit for the full reasoning.

// ── Check if all matches in a round are done ──────────────────────────────────
export function isRoundComplete(matches, round) {
  if (!matches?.length || typeof round !== 'number') return false
  const rms = matches.filter(m => m.round === round)
  return rms.length > 0 && rms.every(m => m.status === 'complete' || m.status === 'bye')
}

// ── Tie detection after the final round ───────────────────────────────────────
// Expects a standings array of objects with a `.points` field (however the
// caller's own standings function computed it) sorted descending by points.
export function getTieStatus(standings) {
  if (!standings?.length) return { hasTie: false, tiedPlayers: [], winner: null }
  const top  = standings[0].points
  const tied = standings.filter(s => s.points === top)
  return {
    hasTie:      tied.length > 1,
    tiedPlayers: tied,
    winner:      tied.length === 1 ? standings[0].name : null,
  }
}

// ── Format points for display ─────────────────────────────────────────────────
export function fmtPts(n) {
  if (n === Math.floor(n)) return String(n)
  return n.toFixed(1)
}
