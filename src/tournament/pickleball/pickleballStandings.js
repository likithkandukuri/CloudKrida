// Pickleball's own standings math — deliberately NOT chess/pointsUtils.js's
// computeStandings and NOT moved into the shared engine. Per the Phase 1
// audit: chess's point system (1 win / 0.5 draw / 0 loss) doesn't apply —
// pickleball has no draws, and "standings" here means match win/loss plus
// game and point differential, computed straight from each match's `games`
// array and its already-authoritative `winnerEntrantId`.

export function computePickleballStandings(entrants, matches) {
  const map = {}
  for (const e of entrants ?? []) {
    if (!e?.id) continue
    map[e.id] = {
      id: e.id,
      displayName: e.displayName,
      status: e.status ?? 'active',
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    }
  }

  for (const m of matches ?? []) {
    if (m.status === 'bye') {
      const solo = m.entrant1 ?? m.entrant2
      const s = solo?.id ? map[solo.id] : null
      if (s) { s.matchesPlayed++; s.wins++ }
      continue
    }
    if (m.status !== 'complete') continue

    const s1 = m.entrant1?.id ? map[m.entrant1.id] : null
    const s2 = m.entrant2?.id ? map[m.entrant2.id] : null

    for (const g of m.games ?? []) {
      const a = Number(g.score_a ?? 0)
      const b = Number(g.score_b ?? 0)
      if (s1) {
        s1.pointsFor += a; s1.pointsAgainst += b
        if (a > b) s1.gamesWon++; else if (b > a) s1.gamesLost++
      }
      if (s2) {
        s2.pointsFor += b; s2.pointsAgainst += a
        if (b > a) s2.gamesWon++; else if (a > b) s2.gamesLost++
      }
    }

    if (s1) { s1.matchesPlayed++; if (m.winnerEntrantId === s1.id) s1.wins++; else s1.losses++ }
    if (s2) { s2.matchesPlayed++; if (m.winnerEntrantId === s2.id) s2.wins++; else s2.losses++ }
  }

  return Object.values(map).sort((a, b) =>
    (b.wins - a.wins)
    || ((b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost))
    || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  )
}
