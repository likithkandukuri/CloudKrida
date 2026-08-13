// Track B Phase 5 — elimination bracket generation from pool standings.
// Pure logic, no DB calls, fully unit-testable.
import { propagateAll, nextPow2 } from '../engine/bracket.js'
import { computePickleballStandings } from './pickleballStandings.js'

// Cross-pool overall ranking (approved seeding method): reuse
// computePickleballStandings UNMODIFIED, called with every active entrant
// and every pool match at once (not scoped to one pool) — this naturally
// ranks entrants by win / game-diff / point-diff regardless of which pool
// they played in.
export function computeBracketSeeds(activeEntrants, poolMatches) {
  return computePickleballStandings(activeEntrants, poolMatches).map(s => s.id)
}

// Standard recursive tournament-bracket seed placement — for 8 seeds this
// produces [1,8,4,5,2,7,3,6], i.e. round-0 pairs (1v8),(4v5),(2v7),(3v6):
// seed 1 and seed 2 can only meet in the final, seeds 1-4 can't meet before
// the semifinal, and so on.
//
// This is intentionally NOT engine/bracket.js's buildBracket(), which
// randomly shuffles seed order for Chess's own "random draw" format —
// changing that function would risk altering Chess's live behavior (its
// regression suite pins the shuffle-and-pad approach, phantom-bye edge case
// included). This is a separate, deterministic placement written only for
// Pickleball's seeded brackets.
function seedPositions(n) {
  if (n === 1) return [1]
  const prev = seedPositions(n / 2)
  const out = []
  for (const s of prev) { out.push(s); out.push(n + 1 - s) }
  return out
}

// seedEntrantIds: ordered strongest -> weakest (index 0 = seed 1).
// Returns DB-row-shaped elimination matches:
//   {round, slot, entrant1Id, entrant2Id, status, winnerEntrantId}
//
// Byes (for a non-power-of-2 seed count) are resolved immediately, including
// any chained bye-vs-bye cascades in later rounds, via propagateAll() —
// reused unmodified from engine/bracket.js (it doesn't shuffle anything, so
// it's safe to share). Unlike buildBracket's shuffle-then-pad approach,
// seedPositions() guarantees the first seed of every round-0 pair is always
// a real entrant (proof: that seed is always <= size/2, and size/2 < count
// whenever byes exist) — so this can never produce the "phantom bye"
// (both seats null) edge case buildBracket has to account for.
export function generateBracketRows(seedEntrantIds) {
  const count = seedEntrantIds.length
  if (count < 2) throw new Error(`Need at least 2 entrants (got ${count})`)

  const size      = nextPow2(count)
  const rounds    = Math.log2(size)
  const positions = seedPositions(size) // virtual seed numbers 1..size, in bracket order

  const matches = []
  for (let slot = 0; slot < size / 2; slot++) {
    const v1 = positions[slot * 2]
    const v2 = positions[slot * 2 + 1]
    const p1 = { id: seedEntrantIds[v1 - 1], name: seedEntrantIds[v1 - 1] }
    const isBye = v2 > count
    const p2 = isBye ? 'BYE' : { id: seedEntrantIds[v2 - 1], name: seedEntrantIds[v2 - 1] }

    matches.push({
      round: 0, slot, p1, p2,
      winner: isBye ? p1.name : null,
      status: isBye ? 'bye' : 'pending',
    })
  }
  for (let r = 1; r < rounds; r++) {
    const c = size / Math.pow(2, r + 1)
    for (let slot = 0; slot < c; slot++) {
      matches.push({ round: r, slot, p1: null, p2: null, winner: null, status: 'pending' })
    }
  }

  const propagated = propagateAll(matches)

  return propagated.map(m => ({
    round: m.round,
    slot: m.slot,
    entrant1Id: m.p1 && m.p1 !== 'BYE' ? m.p1.id : null,
    entrant2Id: m.p2 && m.p2 !== 'BYE' ? m.p2.id : null,
    status: m.status,
    winnerEntrantId: m.winner ?? null,
  }))
}
