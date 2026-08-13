import { describe, it, expect } from 'vitest'
import {
  validateBracketSwap, validateBracketByeAssign, validateBracketByeRemove, validateBracketIntegrity,
} from '../pickleballBracketEdit.js'

const pendingMatch = (id, overrides = {}) => ({
  id, phase: 'elimination', round: 0, slot: 0, status: 'pending', locked: false,
  entrant1: { id: 'e1' }, entrant2: { id: 'e2' }, winnerEntrantId: null,
  ...overrides,
})

describe('validateBracketSwap', () => {
  it('accepts two pending, unlocked elimination matches', () => {
    expect(validateBracketSwap(pendingMatch('m1'), pendingMatch('m2'))).toEqual([])
  })

  it('rejects swapping a match with itself', () => {
    const m = pendingMatch('m1')
    expect(validateBracketSwap(m, m).some(e => e.includes('itself'))).toBe(true)
  })

  it('rejects a completed match', () => {
    const errors = validateBracketSwap(pendingMatch('m1', { status: 'complete' }), pendingMatch('m2'))
    expect(errors.some(e => e.includes('already has a result'))).toBe(true)
  })

  it('rejects a locked match', () => {
    const errors = validateBracketSwap(pendingMatch('m1', { locked: true }), pendingMatch('m2'))
    expect(errors.some(e => e.includes('locked'))).toBe(true)
  })

  it('rejects a pool-phase match', () => {
    const errors = validateBracketSwap(pendingMatch('m1', { phase: 'pool' }), pendingMatch('m2'))
    expect(errors.some(e => e.includes('bracket'))).toBe(true)
  })
})

describe('validateBracketByeAssign', () => {
  it('accepts assigning a bye to a seated entrant on a pending, unlocked match', () => {
    expect(validateBracketByeAssign(pendingMatch('m1'), 'e1')).toEqual([])
  })

  it('rejects a winner not seated in the match', () => {
    const errors = validateBracketByeAssign(pendingMatch('m1'), 'not-seated')
    expect(errors.some(e => e.includes('not seated'))).toBe(true)
  })

  it('rejects a match that already has a result', () => {
    const errors = validateBracketByeAssign(pendingMatch('m1', { status: 'complete' }), 'e1')
    expect(errors.some(e => e.includes('already has a result'))).toBe(true)
  })

  it('rejects a locked match', () => {
    const errors = validateBracketByeAssign(pendingMatch('m1', { locked: true }), 'e1')
    expect(errors.some(e => e.includes('locked'))).toBe(true)
  })
})

describe('validateBracketByeRemove', () => {
  it('accepts a match currently in bye status', () => {
    expect(validateBracketByeRemove(pendingMatch('m1', { status: 'bye' }))).toEqual([])
  })

  it('rejects a match not currently a bye', () => {
    const errors = validateBracketByeRemove(pendingMatch('m1'))
    expect(errors.some(e => e.includes('not currently a bye'))).toBe(true)
  })
})

describe('validateBracketIntegrity', () => {
  it('returns no warnings for a clean bracket', () => {
    expect(validateBracketIntegrity([pendingMatch('m1'), pendingMatch('m2', { slot: 1 })])).toEqual([])
  })

  it('flags a phantom bye (bye status with no recorded winner)', () => {
    const warnings = validateBracketIntegrity([pendingMatch('m1', { status: 'bye', winnerEntrantId: null })])
    expect(warnings.some(w => w.includes('no recorded winner'))).toBe(true)
  })

  it('flags the same entrant seated on both sides', () => {
    const warnings = validateBracketIntegrity([pendingMatch('m1', { entrant1: { id: 'e1' }, entrant2: { id: 'e1' } })])
    expect(warnings.some(w => w.includes('same entrant'))).toBe(true)
  })

  it('flags a locked match', () => {
    const warnings = validateBracketIntegrity([pendingMatch('m1', { locked: true })])
    expect(warnings.some(w => w.includes('locked'))).toBe(true)
  })
})
