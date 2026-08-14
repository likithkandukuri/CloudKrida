import { describe, it, expect } from 'vitest'
import {
  findBracketChampion, isBracketComplete,
  isPointsTournamentComplete, isPickleballComplete,
  coverPhotoByTournament, photoCountByTournament,
} from '../completion.js'

describe('findBracketChampion / isBracketComplete', () => {
  it('returns null when there are no matches', () => {
    expect(findBracketChampion([], 3)).toBeNull()
    expect(isBracketComplete([], 3)).toBe(false)
  })

  it('returns null when the final match is still pending', () => {
    const matches = [{ round: 2, slot: 0, status: 'pending', winner: null }]
    expect(findBracketChampion(matches, 3)).toBeNull()
    expect(isBracketComplete(matches, 3)).toBe(false)
  })

  it('returns the winner when the final match (last round, slot 0) is complete', () => {
    const matches = [
      { round: 1, slot: 0, status: 'complete', winner: 'Alice' },
      { round: 2, slot: 0, status: 'complete', winner: 'Bob' },
    ]
    expect(findBracketChampion(matches, 3)).toBe('Bob')
    expect(isBracketComplete(matches, 3)).toBe(true)
  })

  it('ignores a completed match in the final round at the wrong slot', () => {
    const matches = [{ round: 2, slot: 1, status: 'complete', winner: 'Carol' }]
    expect(findBracketChampion(matches, 3)).toBeNull()
    expect(isBracketComplete(matches, 3)).toBe(false)
  })
})

describe('isPointsTournamentComplete', () => {
  it('short-circuits true on an explicit status of complete, even with no matches', () => {
    expect(isPointsTournamentComplete({ status: 'complete', currentRound: 0, totalRounds: 4, matches: [] })).toBe(true)
  })

  it('returns false when not yet at the final round, even if that round is fully scored', () => {
    const matches = [{ round: 1, status: 'complete' }, { round: 1, status: 'complete' }]
    expect(isPointsTournamentComplete({ status: 'active', currentRound: 1, totalRounds: 4, matches })).toBe(false)
  })

  it('returns false at the final round when it is not fully scored', () => {
    const matches = [{ round: 3, status: 'complete' }, { round: 3, status: 'pending' }]
    expect(isPointsTournamentComplete({ status: 'active', currentRound: 3, totalRounds: 4, matches })).toBe(false)
  })

  it('returns true at the final round when every match is complete or bye', () => {
    const matches = [{ round: 3, status: 'complete' }, { round: 3, status: 'bye' }]
    expect(isPointsTournamentComplete({ status: 'active', currentRound: 3, totalRounds: 4, matches })).toBe(true)
  })
})

describe('isPickleballComplete', () => {
  it('is true only for an explicit complete status', () => {
    expect(isPickleballComplete('complete')).toBe(true)
    expect(isPickleballComplete('in_progress')).toBe(false)
    expect(isPickleballComplete(undefined)).toBe(false)
  })
})

describe('coverPhotoByTournament', () => {
  it('returns an empty object for no rows', () => {
    expect(coverPhotoByTournament([])).toEqual({})
    expect(coverPhotoByTournament(undefined)).toEqual({})
  })

  it('picks the earliest-uploaded row per tournament regardless of input order', () => {
    const rows = [
      { tournament_id: 't1', public_url: 'later',   uploaded_at: '2026-06-02T00:00:00Z' },
      { tournament_id: 't2', public_url: 'only',    uploaded_at: '2026-06-01T00:00:00Z' },
      { tournament_id: 't1', public_url: 'earliest', uploaded_at: '2026-06-01T00:00:00Z' },
    ]
    const result = coverPhotoByTournament(rows)
    expect(result.t1.public_url).toBe('earliest')
    expect(result.t2.public_url).toBe('only')
  })
})

describe('photoCountByTournament', () => {
  it('returns an empty object for no rows', () => {
    expect(photoCountByTournament([])).toEqual({})
  })

  it('counts rows per tournament', () => {
    const rows = [
      { tournament_id: 't1' }, { tournament_id: 't1' }, { tournament_id: 't2' },
    ]
    expect(photoCountByTournament(rows)).toEqual({ t1: 2, t2: 1 })
  })
})
