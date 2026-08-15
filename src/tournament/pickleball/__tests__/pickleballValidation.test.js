import { describe, it, expect } from 'vitest'
import {
  validateTournamentConfig, validateEntrantMembership, findDuplicateParticipants,
  validatePoolGeneration, getPoolGenerationState, validatePoolMove,
  validateDeleteConfirmation,
} from '../pickleballValidation.js'

const validConfig = () => ({
  name: 'Spring Open', eventType: 'doubles', format: 'pool_to_single_elim',
  status: 'registration_open', gamesTo: 11, bestOf: 3, winBy2: true,
  poolSize: 4, courtCount: 6,
})

describe('validateTournamentConfig', () => {
  it('accepts a fully valid configuration', () => {
    expect(validateTournamentConfig(validConfig())).toEqual([])
  })

  it('rejects a missing/blank name', () => {
    expect(validateTournamentConfig({ ...validConfig(), name: '' })).toContain('Tournament name is required.')
    expect(validateTournamentConfig({ ...validConfig(), name: '   ' })).toContain('Tournament name is required.')
  })

  it('rejects an invalid event type', () => {
    const errors = validateTournamentConfig({ ...validConfig(), eventType: 'triples' })
    expect(errors.some(e => e.includes('Event type'))).toBe(true)
  })

  it('rejects an invalid format', () => {
    const errors = validateTournamentConfig({ ...validConfig(), format: 'ladder' })
    expect(errors.some(e => e.includes('Format'))).toBe(true)
  })

  it('rejects an invalid games-to value (only 11/15/21 are legal)', () => {
    const errors = validateTournamentConfig({ ...validConfig(), gamesTo: 10 })
    expect(errors.some(e => e.includes('Games-to'))).toBe(true)
  })

  it('rejects an invalid best-of value (only 1/3/5 are legal)', () => {
    const errors = validateTournamentConfig({ ...validConfig(), bestOf: 2 })
    expect(errors.some(e => e.includes('Best-of'))).toBe(true)
  })

  it('rejects a non-boolean winBy2', () => {
    const errors = validateTournamentConfig({ ...validConfig(), winBy2: 'yes' })
    expect(errors.some(e => e.includes('Win-by-two'))).toBe(true)
  })

  it('rejects a pool size below 2, but allows null (unset)', () => {
    expect(validateTournamentConfig({ ...validConfig(), poolSize: 1 }).length).toBeGreaterThan(0)
    expect(validateTournamentConfig({ ...validConfig(), poolSize: null })).toEqual([])
  })

  it('rejects a court count below 1, but allows null (unset)', () => {
    expect(validateTournamentConfig({ ...validConfig(), courtCount: 0 }).length).toBeGreaterThan(0)
    expect(validateTournamentConfig({ ...validConfig(), courtCount: null })).toEqual([])
  })

  it('accumulates multiple errors at once rather than stopping at the first', () => {
    const errors = validateTournamentConfig({ name: '', eventType: 'x', format: 'y', gamesTo: 1, bestOf: 1, winBy2: true })
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})

describe('validateEntrantMembership', () => {
  it('singles requires exactly 1 member', () => {
    expect(validateEntrantMembership('singles', ['p1'])).toEqual([])
    expect(validateEntrantMembership('singles', ['p1', 'p2']).length).toBeGreaterThan(0)
    expect(validateEntrantMembership('singles', []).length).toBeGreaterThan(0)
  })

  it('doubles requires exactly 2 members', () => {
    expect(validateEntrantMembership('doubles', ['p1', 'p2'])).toEqual([])
    expect(validateEntrantMembership('doubles', ['p1']).length).toBeGreaterThan(0)
    expect(validateEntrantMembership('doubles', ['p1', 'p2', 'p3']).length).toBeGreaterThan(0)
  })

  it('mixed doubles requires exactly 2 members, no composition check (by decision)', () => {
    expect(validateEntrantMembership('mixed_doubles', ['p1', 'p2'])).toEqual([])
  })

  it('rejects a player paired with themselves', () => {
    const errors = validateEntrantMembership('doubles', ['p1', 'p1'])
    expect(errors.some(e => e.includes('cannot be paired'))).toBe(true)
  })

  it('rejects an unknown event type explicitly rather than silently passing', () => {
    const errors = validateEntrantMembership('triples', ['p1', 'p2', 'p3'])
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('validatePoolGeneration', () => {
  const activeEntrants = (n) => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, status: 'active' }))

  it('accepts a valid tournament config with enough active entrants', () => {
    expect(validatePoolGeneration({ poolSize: 4 }, activeEntrants(8))).toEqual([])
  })

  it('rejects generation when poolSize is unset', () => {
    const errors = validatePoolGeneration({ poolSize: null }, activeEntrants(8))
    expect(errors.some(e => e.includes('pool size'))).toBe(true)
  })

  it('rejects generation when poolSize is below 2', () => {
    const errors = validatePoolGeneration({ poolSize: 1 }, activeEntrants(8))
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects generation when fewer than 2 active entrants exist', () => {
    const errors = validatePoolGeneration({ poolSize: 4 }, activeEntrants(1))
    expect(errors.some(e => e.includes('At least 2'))).toBe(true)
  })

  it('rejects generation when poolSize exceeds the active entrant count', () => {
    const errors = validatePoolGeneration({ poolSize: 10 }, activeEntrants(4))
    expect(errors.some(e => e.includes('cannot exceed'))).toBe(true)
  })
})

describe('getPoolGenerationState', () => {
  it('returns "empty" when no pools exist', () => {
    expect(getPoolGenerationState([], [])).toBe('empty')
  })

  it('returns "unscored" when pools exist but no match has results', () => {
    const pools = [{ id: 'p1', label: 'Pool A' }]
    const matches = [{ status: 'pending', games: [] }]
    expect(getPoolGenerationState(pools, matches)).toBe('unscored')
  })

  it('returns "scored" when any match has a non-empty games array', () => {
    const pools = [{ id: 'p1', label: 'Pool A' }]
    const matches = [
      { status: 'pending', games: [] },
      { status: 'live', games: [{ game: 1, score_a: 5, score_b: 3 }] },
    ]
    expect(getPoolGenerationState(pools, matches)).toBe('scored')
  })

  it('returns "scored" when any match status is complete, even with an empty games array', () => {
    const pools = [{ id: 'p1', label: 'Pool A' }]
    const matches = [{ status: 'complete', games: [] }]
    expect(getPoolGenerationState(pools, matches)).toBe('scored')
  })
})

describe('validatePoolMove', () => {
  const e = (id, poolId) => ({ id, poolId })

  it('allows assigning an entrant with no current pool yet (a new team added after pools were generated)', () => {
    const errors = validatePoolMove({ id: 'e1', poolId: null }, 'poolB', [])
    expect(errors).toEqual([])
  })

  it('still blocks assigning a never-pooled entrant into a pool that already has scored matches', () => {
    const matches = [{ poolId: 'poolB', status: 'complete', games: [{ score_a: 11, score_b: 5 }], entrant1: { id: 'e3' }, entrant2: { id: 'e4' } }]
    const errors = validatePoolMove({ id: 'e1', poolId: null }, 'poolB', matches)
    expect(errors.some(x => x.includes('target pool'))).toBe(true)
  })

  it('rejects moving into the same pool', () => {
    const errors = validatePoolMove(e('e1', 'poolA'), 'poolA', [])
    expect(errors.some(x => x.includes('already in that pool'))).toBe(true)
  })

  it('allows a move when nothing is scored', () => {
    const matches = [{ poolId: 'poolA', status: 'pending', games: [], entrant1: { id: 'e1' }, entrant2: { id: 'e2' } }]
    expect(validatePoolMove(e('e1', 'poolA'), 'poolB', matches)).toEqual([])
  })

  it('rejects when the entrant has a scored match in their current pool', () => {
    const matches = [{ poolId: 'poolA', status: 'complete', games: [{ score_a: 11, score_b: 5 }], entrant1: { id: 'e1' }, entrant2: { id: 'e2' } }]
    const errors = validatePoolMove(e('e1', 'poolA'), 'poolB', matches)
    expect(errors.some(x => x.includes('current pool'))).toBe(true)
  })

  it('rejects when the target pool already has any scored match', () => {
    const matches = [{ poolId: 'poolB', status: 'complete', games: [{ score_a: 11, score_b: 5 }], entrant1: { id: 'e3' }, entrant2: { id: 'e4' } }]
    const errors = validatePoolMove(e('e1', 'poolA'), 'poolB', matches)
    expect(errors.some(x => x.includes('target pool'))).toBe(true)
  })

  it('a match with a non-empty games array but not yet marked complete still counts as scored', () => {
    const matches = [{ poolId: 'poolA', status: 'live', games: [{ score_a: 5, score_b: 3 }], entrant1: { id: 'e1' }, entrant2: { id: 'e2' } }]
    const errors = validatePoolMove(e('e1', 'poolA'), 'poolB', matches)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('validateDeleteConfirmation', () => {
  it('accepts an exact match', () => {
    expect(validateDeleteConfirmation('Spring Open', 'Spring Open')).toBe(true)
  })

  it('rejects a mismatch', () => {
    expect(validateDeleteConfirmation('Spring open', 'Spring Open')).toBe(false)
    expect(validateDeleteConfirmation('Spring', 'Spring Open')).toBe(false)
  })

  it('is case-sensitive — a lowercase guess does not accidentally pass', () => {
    expect(validateDeleteConfirmation('spring open', 'Spring Open')).toBe(false)
  })

  it('tolerates surrounding whitespace from the input field, but not internal differences', () => {
    expect(validateDeleteConfirmation('  Spring Open  ', 'Spring Open')).toBe(true)
    expect(validateDeleteConfirmation('Spring  Open', 'Spring Open')).toBe(false)
  })

  it('rejects an empty confirmation against a non-empty name', () => {
    expect(validateDeleteConfirmation('', 'Spring Open')).toBe(false)
  })

  it('handles null/undefined input defensively', () => {
    expect(validateDeleteConfirmation(null, 'Spring Open')).toBe(false)
    expect(validateDeleteConfirmation(undefined, 'Spring Open')).toBe(false)
  })
})

describe('findDuplicateParticipants', () => {
  const existing = [
    { id: 'e1', status: 'active', members: [{ playerId: 'p1' }, { playerId: 'p2' }] },
    { id: 'e2', status: 'active', members: [{ playerId: 'p3' }] },
    { id: 'e3', status: 'withdrawn', members: [{ playerId: 'p4' }] },
  ]

  it('flags a player already registered on another active entrant', () => {
    expect(findDuplicateParticipants(existing, ['p1', 'p5'])).toEqual(['p1'])
  })

  it('a withdrawn entrant does not block re-registration of its former players', () => {
    expect(findDuplicateParticipants(existing, ['p4'])).toEqual([])
  })

  it('excludes the entrant currently being edited from the duplicate check', () => {
    expect(findDuplicateParticipants(existing, ['p1', 'p2'], 'e1')).toEqual([])
  })

  it('returns an empty array when there is no overlap', () => {
    expect(findDuplicateParticipants(existing, ['p9'])).toEqual([])
  })
})
