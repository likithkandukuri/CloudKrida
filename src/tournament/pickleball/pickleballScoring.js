// Pure scoring logic for Track B Phase 4 — no DB calls, fully unit-testable.
// Pickleball has no draws: a game is only "complete" once one side reaches
// the tournament's configured gamesTo (11/15/21) and, if winBy2 is set,
// leads by at least 2. A match is complete once one side has won a majority
// of its bestOf games (ceil(bestOf/2)).
//
// The computed {status, winnerSeat} from computeMatchOutcome is what gets
// passed to the record_pickleball_match_score RPC (see pickleballDb.js) —
// the RPC only applies the already-computed result and handles elimination
// advancement atomically; it doesn't re-derive win/loss itself.

export function computeGameOutcome(scoreA, scoreB, gamesTo, winBy2) {
  const a = Number(scoreA) || 0
  const b = Number(scoreB) || 0
  if (a === b) return { complete: false, winnerSeat: null }

  const leaderSeat  = a > b ? 1 : 2
  const leaderScore = Math.max(a, b)
  const lead        = Math.abs(a - b)

  if (leaderScore < gamesTo) return { complete: false, winnerSeat: null }
  if (winBy2 && lead < 2) return { complete: false, winnerSeat: null }

  return { complete: true, winnerSeat: leaderSeat }
}

// games: [{score_a, score_b}, ...] — only as many entries as have been typed
// in so far; missing/blank games are simply not in the array.
export function computeMatchOutcome(games, bestOf, gamesTo, winBy2) {
  const majority = Math.ceil(bestOf / 2)
  let wins1 = 0, wins2 = 0
  let anyEntered = false

  for (const g of games ?? []) {
    if ((g.score_a ?? 0) !== 0 || (g.score_b ?? 0) !== 0) anyEntered = true
    const { complete, winnerSeat } = computeGameOutcome(g.score_a, g.score_b, gamesTo, winBy2)
    if (complete) { if (winnerSeat === 1) wins1++; else wins2++ }
  }

  if (wins1 >= majority) return { status: 'complete', winnerSeat: 1 }
  if (wins2 >= majority) return { status: 'complete', winnerSeat: 2 }
  return { status: anyEntered ? 'live' : 'pending', winnerSeat: null }
}
