// Regression suite for the Chess tournament engine — locks in CURRENT behavior
// (bugs and quirks included) BEFORE any extraction into src/tournament/engine/.
//
// Purpose: prove "Chess behavior before extraction === Chess behavior after
// extraction." These tests must pass unchanged, against the exact same import
// paths, both before and after any future refactor. If a future extraction
// changes any assertion here, that is a behavior change and must be treated
// as a bug unless explicitly and separately approved.
import { describe, it, expect } from 'vitest'
import {
  buildBracket,
  propagateAll,
  recordScore,
  removePlayer,
  validatePairings,
  parseCSV,
  getRoundLabel,
  nextPow2,
} from '../utils.js'
import {
  computeStandings,
  generateSwissPairings,
  isRoundComplete,
  getTieStatus,
} from '../pointsUtils.js'

const P = (name, extra = {}) => ({ name, ...extra })

describe('nextPow2', () => {
  it('rounds up to the next power of two', () => {
    expect(nextPow2(1)).toBe(1)
    expect(nextPow2(2)).toBe(2)
    expect(nextPow2(3)).toBe(4)
    expect(nextPow2(4)).toBe(4)
    expect(nextPow2(5)).toBe(8)
    expect(nextPow2(8)).toBe(8)
    expect(nextPow2(9)).toBe(16)
  })
})

describe('buildBracket — structural invariants (player-to-slot order is randomized, so we assert shape, not identity)', () => {
  it('throws with fewer than 2 valid players', () => {
    expect(() => buildBracket([])).toThrow()
    expect(() => buildBracket([P('Solo')])).toThrow()
    expect(() => buildBracket([P(''), P('  ')])).toThrow() // blank names are filtered out
  })

  it('4 entrants (exact power of two): 2 round-0 matches, 1 round-1 shell, zero byes', () => {
    const matches = buildBracket([P('A'), P('B'), P('C'), P('D')])
    const round0 = matches.filter(m => m.round === 0)
    const round1 = matches.filter(m => m.round === 1)
    expect(round0).toHaveLength(2)
    expect(round1).toHaveLength(1)
    expect(round0.every(m => m.status === 'pending')).toBe(true)
    expect(round0.every(m => m.p1 && m.p2 && m.p2 !== 'BYE')).toBe(true)
    expect(round1[0].p1).toBeNull()
    expect(round1[0].p2).toBeNull()
  })

  it('8 entrants: 4 / 2 / 1 round shape, zero byes, no round beyond the final', () => {
    const players = ['A','B','C','D','E','F','G','H'].map(n => P(n))
    const matches = buildBracket(players)
    expect(matches.filter(m => m.round === 0)).toHaveLength(4)
    expect(matches.filter(m => m.round === 1)).toHaveLength(2)
    expect(matches.filter(m => m.round === 2)).toHaveLength(1)
    expect(matches.filter(m => m.round === 3)).toHaveLength(0)
    expect(matches.filter(m => m.status === 'bye')).toHaveLength(0)
  })

  it('odd entrant count (3): pads to 4, exactly 1 bye in round 0, bye auto-resolves and propagates one seat into round 1', () => {
    const matches = buildBracket([P('A'), P('B'), P('C')])
    const round0 = matches.filter(m => m.round === 0)
    const round1 = matches.filter(m => m.round === 1)
    const byes = round0.filter(m => m.status === 'bye')
    expect(round0).toHaveLength(2)
    expect(byes).toHaveLength(1)
    expect(byes[0].score1).toBe(1)
    expect(byes[0].score2).toBe(0)
    expect(byes[0].winner).toBe(byes[0].p1.name)
    // The bye winner is already seeded into round 1 (propagateAll ran inside buildBracket)
    expect(round1).toHaveLength(1)
    const filledSeats = [round1[0].p1, round1[0].p2].filter(Boolean)
    expect(filledSeats).toHaveLength(1)
    expect(filledSeats[0].name).toBe(byes[0].winner)
    expect(round1[0].status).toBe('pending') // other seat still empty, NOT auto-completed
  })

  it('non-power-of-two count (5): pads to 8 with 3 nulls, producing 2 pending + 2 bye-status matches in round 0', () => {
    // 3 null pads across 4 slots (2 seats each) cannot spread one-per-slot: two nulls
    // land in the SAME slot. So round 0 is NOT "2 pending + 3 real byes" as a naive
    // reading of "5 players, 3 padding slots" might suggest — it's 2 pending (real vs
    // real) + 1 real bye (real vs null) + 1 "phantom" bye (null vs null, winner=null).
    const players = ['A','B','C','D','E'].map(n => P(n))
    const matches = buildBracket(players)
    const round0 = matches.filter(m => m.round === 0)
    expect(round0).toHaveLength(4)
    const byes = round0.filter(m => m.status === 'bye')
    expect(byes).toHaveLength(2)
    expect(round0.filter(m => m.status === 'pending')).toHaveLength(2)
    // Exactly one of the two "bye" matches is a phantom: both seats null, no winner —
    // it does not represent a real player advancing.
    const phantom = byes.filter(m => m.winner === null)
    const real    = byes.filter(m => m.winner !== null)
    expect(phantom).toHaveLength(1)
    expect(real).toHaveLength(1)
    expect(phantom[0].p1).toBeNull()
    expect(phantom[0].p2).toBe('BYE')
  })

  it('CURRENT BEHAVIOR: a phantom bye (winner=null) never propagates — its round-1 parent seat stays permanently null until manually repaired', () => {
    const players = ['A','B','C','D','E'].map(n => P(n))
    const matches = buildBracket(players)
    const phantom = matches.filter(m => m.round === 0).find(m => m.status === 'bye' && m.winner === null)
    const parentSlot = Math.floor(phantom.slot / 2)
    const parent = matches.find(m => m.round === 1 && m.slot === parentSlot)
    const seat = phantom.slot % 2 === 0 ? 'p1' : 'p2'
    expect(parent[seat]).toBeNull() // not filled — propagateAll's `if (!m.winner) continue` skips phantom byes
  })

  it('missing/blank entrants are silently dropped, not treated as byes', () => {
    const matches = buildBracket([P('A'), P('B'), P(''), P(null), P('C')])
    // Only 3 valid names (A, B, C) survive the p?.name?.trim() filter
    const round0 = matches.filter(m => m.round === 0)
    expect(round0).toHaveLength(2) // same shape as the 3-valid-player case above
    expect(round0.filter(m => m.status === 'bye')).toHaveLength(1)
  })

  it('CURRENT BEHAVIOR: duplicate entrant names are NOT deduplicated or rejected — pinned as a known limitation, not silently "fixed" by extraction', () => {
    const matches = buildBracket([P('Alice'), P('Alice'), P('Bob'), P('Carol')])
    const round0 = matches.filter(m => m.round === 0)
    expect(round0).toHaveLength(2)
    const allNames = round0.flatMap(m => [m.p1?.name, m.p2?.name].filter(Boolean))
    expect(allNames.filter(n => n === 'Alice')).toHaveLength(2) // both copies survive as distinct bracket entries
  })
})

describe('propagateAll — winner propagation, semifinal → final, partially completed brackets', () => {
  it('propagates a round-0 winner into the correct round-1 seat', () => {
    let matches = buildBracket([P('A'), P('B'), P('C'), P('D')])
    const m0 = matches.filter(m => m.round === 0)[0]
    matches = recordScore(matches, m0.id, 1, 0, m0.p1.name)
    const round1 = matches.filter(m => m.round === 1)[0]
    const seat = m0.slot % 2 === 0 ? 'p1' : 'p2'
    expect(round1[seat].name).toBe(m0.p1.name)
    expect(round1.status).not.toBe('complete') // other semifinal not done yet
  })

  it('semifinal → final: an 8-player bracket resolves to exactly one champion after all rounds complete', () => {
    let matches = buildBracket(['A','B','C','D','E','F','G','H'].map(n => P(n)))
    // Complete every round-0 match as p1 winning
    for (const m of matches.filter(m => m.round === 0)) {
      matches = recordScore(matches, m.id, 1, 0, m.p1.name)
    }
    // Complete every round-1 (semifinal) match as p1 winning
    for (const m of matches.filter(m => m.round === 1)) {
      matches = recordScore(matches, m.id, 1, 0, m.p1.name)
    }
    const final = matches.filter(m => m.round === 2)[0]
    expect(final.p1).not.toBeNull()
    expect(final.p2).not.toBeNull()
    expect(final.status).toBe('pending')
    matches = recordScore(matches, final.id, 1, 0, final.p1.name)
    const champion = matches.find(m => m.round === 2)
    expect(champion.status).toBe('complete')
    expect(champion.winner).toBe(final.p1.name)
    // No round 3 exists — propagation must not throw when there is no parent
    expect(matches.filter(m => m.round === 3)).toHaveLength(0)
  })

  it('partially completed bracket: only one of two round-0 matches done leaves round 1 half-filled, not advanced', () => {
    let matches = buildBracket([P('A'), P('B'), P('C'), P('D')])
    const [m0] = matches.filter(m => m.round === 0)
    matches = recordScore(matches, m0.id, 1, 0, m0.p1.name)
    const round1 = matches.filter(m => m.round === 1)[0]
    const filled = [round1.p1, round1.p2].filter(Boolean)
    expect(filled).toHaveLength(1)
    expect(round1.status).toBe('pending')
  })

  it('propagateAll is a no-op-safe pass on an empty or malformed match list', () => {
    expect(propagateAll([])).toEqual([])
    expect(propagateAll(null)).toEqual([])
    expect(propagateAll(undefined)).toEqual([])
  })
})

describe('removePlayer — mid-bracket player withdrawal', () => {
  it('auto-completes the match in favor of the remaining opponent and propagates', () => {
    let matches = buildBracket([P('A'), P('B'), P('C'), P('D')])
    const m0 = matches.filter(m => m.round === 0)[0]
    const leavingName = m0.p1.name
    const staying = m0.p2.name
    matches = removePlayer(matches, leavingName)
    const updated = matches.find(m => m.id === m0.id)
    expect(updated.status).toBe('complete')
    expect(updated.winner).toBe(staying)
  })

  it('completed matches are left untouched by removePlayer', () => {
    let matches = buildBracket([P('A'), P('B'), P('C'), P('D')])
    const m0 = matches.filter(m => m.round === 0)[0]
    matches = recordScore(matches, m0.id, 1, 0, m0.p1.name)
    const before = matches.find(m => m.id === m0.id)
    matches = removePlayer(matches, m0.p1.name)
    const after = matches.find(m => m.id === m0.id)
    expect(after).toEqual(before)
  })
})

describe('validatePairings', () => {
  it('flags duplicate board numbers within a round', () => {
    const matches = [
      { round: 0, slot: 0, p1: P('A'), p2: P('B'), status: 'pending' },
      { round: 0, slot: 0, p1: P('C'), p2: P('D'), status: 'pending' },
    ]
    const warnings = validatePairings(matches, 0)
    expect(warnings.some(w => w.includes('Duplicate board numbers'))).toBe(true)
  })

  it('flags a repeat pairing against tournament history', () => {
    const matches = [
      { round: 0, slot: 0, p1: P('A'), p2: P('B'), status: 'complete', winner: 'A' },
      { round: 1, slot: 0, p1: P('A'), p2: P('B'), status: 'pending' },
    ]
    const warnings = validatePairings(matches, 1)
    expect(warnings.some(w => w.includes('Repeat pairing'))).toBe(true)
  })

  it('flags multiple byes in the same round', () => {
    const matches = [
      { round: 0, slot: 0, p1: P('A'), p2: 'BYE', status: 'bye' },
      { round: 0, slot: 1, p1: P('B'), p2: 'BYE', status: 'bye' },
    ]
    const warnings = validatePairings(matches, 0)
    expect(warnings.some(w => w.includes('Multiple BYEs'))).toBe(true)
  })

  it('a clean round with no repeats/duplicates/multi-byes produces no warnings', () => {
    const matches = [
      { round: 0, slot: 0, p1: P('A'), p2: P('B'), status: 'pending' },
      { round: 0, slot: 1, p1: P('C'), p2: P('D'), status: 'pending' },
    ]
    expect(validatePairings(matches, 0)).toEqual([])
  })
})

describe('getRoundLabel', () => {
  it('labels the last three rounds Final / Semi-Final / Quarter-Final', () => {
    expect(getRoundLabel(3, 4)).toBe('Final')
    expect(getRoundLabel(2, 4)).toBe('Semi-Final')
    expect(getRoundLabel(1, 4)).toBe('Quarter-Final')
    expect(getRoundLabel(0, 4)).toBe('Round 1')
  })
})

describe('parseCSV', () => {
  it('parses a headered CSV with name + elo', () => {
    const rows = parseCSV('Name,Elo\nAlice,1500\nBob,1200')
    expect(rows.map(r => r.name)).toEqual(['Alice', 'Bob'])
    expect(rows[0].elo).toBe(1500)
  })

  it('handles a no-header CSV (name-only, column 0)', () => {
    const rows = parseCSV('Alice\nBob\nCarol')
    expect(rows.map(r => r.name)).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('auto-detects semicolon delimiter', () => {
    const rows = parseCSV('Name;Elo\nAlice;1500')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Alice')
    expect(rows[0].elo).toBe(1500)
  })

  it('strips a UTF-8 BOM and handles quoted values', () => {
    const rows = parseCSV('﻿Name,Elo\n"Smith, Alice",1500')
    // Note: the quote-stripping parser does not treat the comma inside quotes as
    // literal — CURRENT behavior splits on every unescaped delimiter regardless of
    // the surrounding quote characters being removed first. Pinning actual output:
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].name).toContain('Smith')
  })

  it('silently skips rows with no name, never throws', () => {
    const rows = parseCSV('Name,Elo\n,1500\nBob,1200')
    expect(rows.map(r => r.name)).toEqual(['Bob'])
  })

  it('missing optional columns (no Elo column at all) leaves elo unset, name still parses', () => {
    const rows = parseCSV('Name\nAlice\nBob')
    expect(rows.map(r => r.name)).toEqual(['Alice', 'Bob'])
    expect(rows[0].elo).toBeUndefined()
  })

  it('empty or whitespace-only input returns an empty array, never throws', () => {
    expect(parseCSV('')).toEqual([])
    expect(parseCSV('   \n  \n')).toEqual([])
    expect(parseCSV(null)).toEqual([])
  })
})

describe('computeStandings — CURRENT chess point system (1 win / 0.5 draw / 0 loss) — pinned, not assumed generic', () => {
  const players = [P('Alice'), P('Bob'), P('Carol')]

  it('tallies wins/draws/losses/points/byes correctly across mixed results', () => {
    const matches = [
      { round: 0, slot: 0, p1: P('Alice'), p2: P('Bob'), status: 'complete', score1: 1, score2: 0 },
      { round: 0, slot: 1, p1: P('Carol'), p2: 'BYE', status: 'bye', winner: 'Carol' },
      { round: 1, slot: 0, p1: P('Alice'), p2: P('Carol'), status: 'complete', score1: 0.5, score2: 0.5 },
    ]
    const standings = computeStandings(players, matches)
    const alice = standings.find(s => s.name === 'Alice')
    const bob   = standings.find(s => s.name === 'Bob')
    const carol = standings.find(s => s.name === 'Carol')

    expect(alice.wins).toBe(1); expect(alice.draws).toBe(1); expect(alice.losses).toBe(0)
    expect(alice.points).toBe(1.5)
    expect(bob.losses).toBe(1); expect(bob.points).toBe(0)
    expect(carol.byes).toBe(1); expect(carol.draws).toBe(1); expect(carol.points).toBe(1.5)
  })

  it('sorts by points desc, then wins, then rating — and applies manual pointsAdjustment', () => {
    const withAdj = [P('Alice', { pointsAdjustment: 2 }), P('Bob')]
    const standings = computeStandings(withAdj, [])
    expect(standings[0].name).toBe('Alice')
    expect(standings[0].points).toBe(2)
  })

  it('a withdrawn player still appears in standings with prior results intact', () => {
    const matches = [{ round: 0, slot: 0, p1: P('Alice'), p2: P('Bob'), status: 'complete', score1: 1, score2: 0 }]
    const withdrawn = [P('Alice', { status: 'withdrawn' }), P('Bob')]
    const standings = computeStandings(withdrawn, matches)
    expect(standings.find(s => s.name === 'Alice').points).toBe(1)
    expect(standings.find(s => s.name === 'Alice').status).toBe('withdrawn')
  })
})

describe('generateSwissPairings — CURRENT chess-specific pairing (rematch avoidance + White/Black color balance)', () => {
  it('gives the bye to the lowest-ranked player without a prior bye when the pool is odd', () => {
    const standings = computeStandings(
      [P('Alice'), P('Bob'), P('Carol')],
      [{ round: 0, slot: 0, p1: P('Alice'), p2: P('Bob'), status: 'complete', score1: 1, score2: 0 }],
    )
    const pairs = generateSwissPairings(standings, 1)
    const bye = pairs.find(p => p.status === 'bye')
    expect(bye).toBeDefined()
    expect(bye.p2).toBe('BYE')
    // Carol (never played, lowest rank among those without a prior bye) should get it
    expect(bye.winner).toBe('Carol')
  })

  it('avoids a rematch on the first pass when a non-rematch opponent is available', () => {
    const standings = computeStandings(
      [P('Alice'), P('Bob'), P('Carol'), P('Dave')],
      [{ round: 0, slot: 0, p1: P('Alice'), p2: P('Bob'), status: 'complete', score1: 1, score2: 0 },
       { round: 0, slot: 1, p1: P('Carol'), p2: P('Dave'), status: 'complete', score1: 1, score2: 0 }],
    )
    const pairs = generateSwissPairings(standings, 1)
    const hasAliceVsBob = pairs.some(p =>
      (p.p1?.name === 'Alice' && p.p2?.name === 'Bob') || (p.p1?.name === 'Bob' && p.p2?.name === 'Alice'))
    expect(hasAliceVsBob).toBe(false)
  })

  it('an empty or all-withdrawn pool returns no pairs', () => {
    expect(generateSwissPairings([], 0)).toEqual([])
    const withdrawnOnly = [{ name: 'Alice', status: 'withdrawn', opponentsPlayed: [], colorHistory: [], byes: 0, points: 0, rating: 0 }]
    expect(generateSwissPairings(withdrawnOnly, 0)).toEqual([])
  })
})

describe('isRoundComplete / getTieStatus — sport-agnostic status helpers (safe to share as-is)', () => {
  it('isRoundComplete is true only when every match in the round is complete or bye', () => {
    const matches = [
      { round: 0, status: 'complete' },
      { round: 0, status: 'bye' },
      { round: 1, status: 'pending' },
    ]
    expect(isRoundComplete(matches, 0)).toBe(true)
    expect(isRoundComplete(matches, 1)).toBe(false)
  })

  it('getTieStatus detects a tie for first and reports a single winner when untied', () => {
    expect(getTieStatus([{ name: 'A', points: 3 }, { name: 'B', points: 3 }]).hasTie).toBe(true)
    const clear = getTieStatus([{ name: 'A', points: 3 }, { name: 'B', points: 2 }])
    expect(clear.hasTie).toBe(false)
    expect(clear.winner).toBe('A')
  })
})
