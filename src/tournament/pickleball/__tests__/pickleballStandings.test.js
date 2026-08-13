import { describe, it, expect } from 'vitest'
import { computePickleballStandings } from '../pickleballStandings.js'

const E = (id, displayName, status = 'active') => ({ id, displayName, status })

describe('computePickleballStandings', () => {
  it('returns an empty array for no entrants', () => {
    expect(computePickleballStandings([], [])).toEqual([])
  })

  it('tallies wins/losses/games/points from a completed 2-game match using winnerEntrantId', () => {
    const entrants = [E('e1', 'Doe/Smith'), E('e2', 'Lee/Park')]
    const matches = [{
      status: 'complete', winnerEntrantId: 'e1',
      entrant1: { id: 'e1' }, entrant2: { id: 'e2' },
      games: [{ game: 1, score_a: 11, score_b: 7 }, { game: 2, score_a: 9, score_b: 11 }, { game: 3, score_a: 11, score_b: 8 }],
    }]
    const standings = computePickleballStandings(entrants, matches)
    const e1 = standings.find(s => s.id === 'e1')
    const e2 = standings.find(s => s.id === 'e2')
    expect(e1.wins).toBe(1); expect(e1.losses).toBe(0)
    expect(e1.gamesWon).toBe(2); expect(e1.gamesLost).toBe(1)
    expect(e1.pointsFor).toBe(31); expect(e1.pointsAgainst).toBe(26)
    expect(e2.wins).toBe(0); expect(e2.losses).toBe(1)
    expect(e2.gamesWon).toBe(1); expect(e2.gamesLost).toBe(2)
  })

  it('a bye counts as a win with no games tallied', () => {
    const entrants = [E('e1', 'Solo')]
    const matches = [{ status: 'bye', entrant1: { id: 'e1' }, entrant2: null, games: [], winnerEntrantId: null }]
    const standings = computePickleballStandings(entrants, matches)
    expect(standings[0].wins).toBe(1)
    expect(standings[0].matchesPlayed).toBe(1)
    expect(standings[0].gamesWon).toBe(0)
  })

  it('pending/live matches are excluded from tallies entirely', () => {
    const entrants = [E('e1', 'A'), E('e2', 'B')]
    const matches = [{
      status: 'pending', entrant1: { id: 'e1' }, entrant2: { id: 'e2' }, games: [], winnerEntrantId: null,
    }]
    const standings = computePickleballStandings(entrants, matches)
    expect(standings.every(s => s.matchesPlayed === 0)).toBe(true)
  })

  it('sorts by wins desc, then game differential, then point differential', () => {
    const entrants = [E('e1', 'A'), E('e2', 'B'), E('e3', 'C')]
    const matches = [
      // A beats B 2-0 (big point diff)
      { status: 'complete', winnerEntrantId: 'e1', entrant1: { id: 'e1' }, entrant2: { id: 'e2' },
        games: [{ score_a: 11, score_b: 1 }, { score_a: 11, score_b: 1 }] },
      // C beats A 2-1 (A still has 1 win, but now a loss too)
      { status: 'complete', winnerEntrantId: 'e3', entrant1: { id: 'e1' }, entrant2: { id: 'e3' },
        games: [{ score_a: 11, score_b: 9 }, { score_a: 5, score_b: 11 }, { score_a: 6, score_b: 11 }] },
      // C beats B 2-0
      { status: 'complete', winnerEntrantId: 'e3', entrant1: { id: 'e3' }, entrant2: { id: 'e2' },
        games: [{ score_a: 11, score_b: 3 }, { score_a: 11, score_b: 4 }] },
    ]
    const standings = computePickleballStandings(entrants, matches)
    // C: 2 wins, A: 1 win 1 loss, B: 0 wins 2 losses
    expect(standings.map(s => s.id)).toEqual(['e3', 'e1', 'e2'])
  })

  it('a withdrawn entrant still appears with prior results intact', () => {
    const entrants = [E('e1', 'A', 'withdrawn'), E('e2', 'B')]
    const matches = [{
      status: 'complete', winnerEntrantId: 'e1', entrant1: { id: 'e1' }, entrant2: { id: 'e2' },
      games: [{ score_a: 11, score_b: 5 }],
    }]
    const standings = computePickleballStandings(entrants, matches)
    const a = standings.find(s => s.id === 'e1')
    expect(a.status).toBe('withdrawn')
    expect(a.wins).toBe(1)
  })

  it('a match referencing an entrant not in the roster (data edge case) does not throw', () => {
    const entrants = [E('e1', 'A')]
    const matches = [{
      status: 'complete', winnerEntrantId: 'ghost', entrant1: { id: 'e1' }, entrant2: { id: 'ghost' },
      games: [{ score_a: 5, score_b: 11 }],
    }]
    expect(() => computePickleballStandings(entrants, matches)).not.toThrow()
    const standings = computePickleballStandings(entrants, matches)
    expect(standings.find(s => s.id === 'e1').losses).toBe(1)
  })
})
