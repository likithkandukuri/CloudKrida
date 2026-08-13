import { describe, it, expect } from 'vitest'
import { computeBracketSeeds, generateBracketRows } from '../pickleballBracket.js'

const seeds = (n) => Array.from({ length: n }, (_, i) => `seed${i + 1}`) // seed1 = strongest

describe('generateBracketRows — deterministic seed placement', () => {
  it('8 seeds, no byes: round 0 pairs are 1v8, 4v5, 2v7, 3v6 in slot order', () => {
    const rows = generateBracketRows(seeds(8))
    const r0 = rows.filter(r => r.round === 0).sort((a, b) => a.slot - b.slot)
    expect(r0.map(r => [r.entrant1Id, r.entrant2Id])).toEqual([
      ['seed1', 'seed8'],
      ['seed4', 'seed5'],
      ['seed2', 'seed7'],
      ['seed3', 'seed6'],
    ])
    expect(r0.every(r => r.status === 'pending')).toBe(true)
    expect(rows).toHaveLength(7) // 4 + 2 + 1
  })

  it('2 seeds: a single round-0 match, no byes', () => {
    const rows = generateBracketRows(seeds(2))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ round: 0, slot: 0, entrant1Id: 'seed1', entrant2Id: 'seed2', status: 'pending' })
  })

  it('5 seeds: top 3 seeds get byes in round 0, seed4 vs seed5 is the only real match', () => {
    const rows = generateBracketRows(seeds(5))
    const r0 = rows.filter(r => r.round === 0).sort((a, b) => a.slot - b.slot)
    expect(r0).toHaveLength(4) // nextPow2(5) = 8 -> 4 round-0 slots

    const byes = r0.filter(r => r.status === 'bye')
    const real = r0.filter(r => r.status === 'pending')
    expect(byes.map(r => r.entrant1Id).sort()).toEqual(['seed1', 'seed2', 'seed3'])
    expect(byes.every(r => r.entrant2Id === null)).toBe(true)
    expect(byes.every(r => r.winnerEntrantId === r.entrant1Id)).toBe(true)
    expect(real).toHaveLength(1)
    expect([real[0].entrant1Id, real[0].entrant2Id].sort()).toEqual(['seed4', 'seed5'])

    // No phantom byes anywhere (a bye match with winnerEntrantId null)
    expect(rows.every(r => !(r.status === 'bye' && r.winnerEntrantId === null))).toBe(true)

    // Round 1: the two bye winners that share a parent slot face off for real;
    // the other round-1 slot stays pending, waiting on the real round-0 match.
    const r1 = rows.filter(r => r.round === 1).sort((a, b) => a.slot - b.slot)
    expect(r1).toHaveLength(2)
    const decidedR1 = r1.filter(r => r.entrant1Id && r.entrant2Id)
    expect(decidedR1).toHaveLength(1)
    expect([decidedR1[0].entrant1Id, decidedR1[0].entrant2Id].sort()).toEqual(['seed2', 'seed3'])
  })

  it('throws for fewer than 2 seeds', () => {
    expect(() => generateBracketRows(['seed1'])).toThrow()
    expect(() => generateBracketRows([])).toThrow()
  })

  it('is deterministic — no randomness, unlike buildBracket', () => {
    const a = generateBracketRows(seeds(6))
    const b = generateBracketRows(seeds(6))
    expect(a).toEqual(b)
  })
})

describe('computeBracketSeeds — cross-pool overall ranking', () => {
  it('ranks entrants by wins regardless of which pool they were in (reuses computePickleballStandings)', () => {
    const entrants = [
      { id: 'e1', displayName: 'A', status: 'active' },
      { id: 'e2', displayName: 'B', status: 'active' },
      { id: 'e3', displayName: 'C', status: 'active' },
    ]
    // e3 (Pool B) beats e2 (Pool B); e1 (Pool A) has no matches at all yet.
    const poolMatches = [{
      status: 'complete', winnerEntrantId: 'e3', entrant1: { id: 'e3' }, entrant2: { id: 'e2' },
      games: [{ score_a: 11, score_b: 4 }],
    }]
    const seedOrder = computeBracketSeeds(entrants, poolMatches)
    expect(seedOrder[0]).toBe('e3') // 1 win, seeded first
    expect(seedOrder).toContain('e1')
    expect(seedOrder).toContain('e2')
    expect(seedOrder).toHaveLength(3)
  })
})
