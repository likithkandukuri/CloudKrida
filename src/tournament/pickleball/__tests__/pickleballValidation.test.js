import { describe, it, expect } from 'vitest'
import { validateTournamentConfig, validateEntrantMembership, findDuplicateParticipants } from '../pickleballValidation.js'

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
