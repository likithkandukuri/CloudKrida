import { describe, it, expect } from 'vitest'
import { generatePoolAssignments, generatePoolMatches } from '../pickleballPools.js'

const E = (id, seedOrder, displayName = id) => ({ id, displayName, seedOrder, status: 'active' })

describe('generatePoolAssignments — exact snake-seeding membership', () => {
  it('3 pools / 9 entrants produces the exact A B C C B A A B C sequence', () => {
    const entrants = Array.from({ length: 9 }, (_, i) => E(`e${i + 1}`, i + 1))
    const { pools } = generatePoolAssignments(entrants, 3)
    expect(pools.map(p => p.label)).toEqual(['Pool A', 'Pool B', 'Pool C'])

    const labelOf = id => pools.find(p => p.entrantIds.includes(id))?.label
    const sequence = entrants.map(e => labelOf(e.id))
    expect(sequence).toEqual([
      'Pool A', 'Pool B', 'Pool C',
      'Pool C', 'Pool B', 'Pool A',
      'Pool A', 'Pool B', 'Pool C',
    ])
  })

  it('4 pools / 12 entrants produces the exact A B C D D C B A A B C D sequence', () => {
    const entrants = Array.from({ length: 12 }, (_, i) => E(`e${i + 1}`, i + 1))
    const { pools } = generatePoolAssignments(entrants, 3) // poolSize 3 -> ceil(12/3) = 4 pools
    expect(pools.map(p => p.label)).toEqual(['Pool A', 'Pool B', 'Pool C', 'Pool D'])

    const labelOf = id => pools.find(p => p.entrantIds.includes(id))?.label
    const sequence = entrants.map(e => labelOf(e.id))
    expect(sequence).toEqual([
      'Pool A', 'Pool B', 'Pool C', 'Pool D',
      'Pool D', 'Pool C', 'Pool B', 'Pool A',
      'Pool A', 'Pool B', 'Pool C', 'Pool D',
    ])
  })

  it('ties on seedOrder break by normalized name, then id, deterministically', () => {
    const entrants = [
      E('id-b', 1, 'Zeta'),
      E('id-a', 1, 'alpha'), // lowercase, should still sort before 'Zeta'
      E('id-c', 1, 'alpha'), // same name as id-a, tiebreaks on id
    ]
    // poolSize 1 -> ceil(3/1) = 3 pools, one entrant each, so pool membership
    // directly exposes the sort order (pass 0, no wraparound involved).
    const { pools } = generatePoolAssignments(entrants, 1)
    // All 3 tie on seedOrder=1, so order is name asc ('alpha','alpha','Zeta'), then id asc for the two 'alpha's
    // -> id-a, id-c, id-b, distributed forward across 3 pools: A, B, C
    expect(pools.find(p => p.label === 'Pool A').entrantIds).toEqual(['id-a'])
    expect(pools.find(p => p.label === 'Pool B').entrantIds).toEqual(['id-c'])
    expect(pools.find(p => p.label === 'Pool C').entrantIds).toEqual(['id-b'])
  })

  it('uneven entrant counts split into uneven pool sizes without dropping anyone', () => {
    const entrants = Array.from({ length: 10 }, (_, i) => E(`e${i + 1}`, i + 1))
    const { pools } = generatePoolAssignments(entrants, 3) // ceil(10/3) = 4 pools
    const total = pools.reduce((sum, p) => sum + p.entrantIds.length, 0)
    expect(total).toBe(10)
    expect(pools).toHaveLength(4)
    // Sizes should differ by at most 1 across pools
    const sizes = pools.map(p => p.entrantIds.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  it('is deterministic — identical input run twice produces identical output', () => {
    const entrants = Array.from({ length: 7 }, (_, i) => E(`e${i + 1}`, i + 1))
    const run1 = generatePoolAssignments(entrants, 3)
    const run2 = generatePoolAssignments(entrants, 3)
    expect(run1).toEqual(run2)
  })

  it('excludes withdrawn entrants entirely (caller is expected to pre-filter, but confirm the shape holds)', () => {
    const activeOnly = [E('e1', 1), E('e2', 2), E('e3', 3)] // withdrawn e4 never passed in
    const { pools } = generatePoolAssignments(activeOnly, 3)
    const allIds = pools.flatMap(p => p.entrantIds)
    expect(allIds).toEqual(['e1', 'e2', 'e3'])
    expect(allIds).not.toContain('e4')
  })
})

describe('generatePoolMatches — round-robin pairing', () => {
  it('generates exactly k*(k-1)/2 pairs for a pool of size k', () => {
    const pools = [{ label: 'Pool A', entrantIds: ['a', 'b', 'c', 'd', 'e'] }] // k=5 -> 10 pairs
    const matches = generatePoolMatches(pools)
    expect(matches).toHaveLength(10)
  })

  it('every pair is distinct and never pairs an entrant with itself', () => {
    const pools = [{ label: 'Pool A', entrantIds: ['a', 'b', 'c'] }]
    const matches = generatePoolMatches(pools)
    expect(matches).toEqual([
      { poolLabel: 'Pool A', entrant1Id: 'a', entrant2Id: 'b' },
      { poolLabel: 'Pool A', entrant1Id: 'a', entrant2Id: 'c' },
      { poolLabel: 'Pool A', entrant1Id: 'b', entrant2Id: 'c' },
    ])
    for (const m of matches) expect(m.entrant1Id).not.toBe(m.entrant2Id)
  })

  it('handles an odd-sized pool with no bye/padding needed', () => {
    const pools = [{ label: 'Pool A', entrantIds: ['a', 'b', 'c'] }] // k=3 -> 3 pairs, no bye concept
    const matches = generatePoolMatches(pools)
    expect(matches).toHaveLength(3)
  })

  it('a pool of size 1 produces no matches', () => {
    const pools = [{ label: 'Pool A', entrantIds: ['a'] }]
    expect(generatePoolMatches(pools)).toEqual([])
  })

  it('pairs are scoped correctly across multiple pools', () => {
    const pools = [
      { label: 'Pool A', entrantIds: ['a', 'b'] },
      { label: 'Pool B', entrantIds: ['c', 'd'] },
    ]
    const matches = generatePoolMatches(pools)
    expect(matches).toHaveLength(2)
    expect(matches.every(m => m.poolLabel === 'Pool A' || m.poolLabel === 'Pool B')).toBe(true)
    // No cross-pool pairing
    expect(matches.some(m => [m.entrant1Id, m.entrant2Id].includes('a') && [m.entrant1Id, m.entrant2Id].includes('c'))).toBe(false)
  })
})
