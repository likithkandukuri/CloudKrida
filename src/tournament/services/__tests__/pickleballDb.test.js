import { describe, it, expect } from 'vitest'
import {
  tournamentRowToObj, memberRowToObj, entrantRowToObj,
  matchRowToObj, galleryRowToObj, poolRowToObj, courtRowToObj, playerRowToObj,
} from '../pickleballDb.js'

describe('tournamentRowToObj', () => {
  it('maps snake_case DB columns to camelCase domain fields', () => {
    const row = {
      id: 't1', name: 'Spring Open', date: '2026-06-01', location: 'Riverside Park', description: 'Annual open.',
      event_type: 'doubles', format: 'pool_to_single_elim',
      status: 'registration_open', skill_division: '3.5', age_band: 'Open',
      games_to: 11, win_by_2: true, best_of: 3, pool_size: 4, court_count: 6,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    }
    const obj = tournamentRowToObj(row)
    expect(obj).toMatchObject({
      id: 't1', name: 'Spring Open', date: '2026-06-01', location: 'Riverside Park', description: 'Annual open.',
      eventType: 'doubles', format: 'pool_to_single_elim',
      status: 'registration_open', skillDivision: '3.5', ageBand: 'Open',
      gamesTo: 11, winBy2: true, bestOf: 3, poolSize: 4, courtCount: 6,
    })
    expect(obj.createdAt).toBe(new Date(row.created_at).getTime())
  })

  it('defaults date to null and location/description to empty strings when absent', () => {
    const row = {
      id: 't3', name: 'x', event_type: 'singles', format: 'single_elimination', status: 'complete',
      games_to: 11, win_by_2: true, best_of: 1,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }
    const obj = tournamentRowToObj(row)
    expect(obj.date).toBeNull()
    expect(obj.location).toBe('')
    expect(obj.description).toBe('')
  })

  it('defaults skillDivision/ageBand/poolSize/courtCount to null when absent', () => {
    const row = {
      id: 't2', name: 'x', event_type: 'singles', format: 'single_elimination', status: 'complete',
      games_to: 11, win_by_2: true, best_of: 1,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }
    const obj = tournamentRowToObj(row)
    expect(obj.skillDivision).toBeNull()
    expect(obj.ageBand).toBeNull()
    expect(obj.poolSize).toBeNull()
    expect(obj.courtCount).toBeNull()
  })
})

describe('memberRowToObj', () => {
  it('flattens the joined player row onto the member', () => {
    const row = { player_id: 'p1', seat: 2, player: { name: 'Alice', skill_rating: 3.5, dupr_id: 'DX1', age_group: 'Open' } }
    expect(memberRowToObj(row)).toEqual({
      playerId: 'p1', seat: 2, name: 'Alice', skillRating: 3.5, duprId: 'DX1', ageGroup: 'Open',
    })
  })

  it('falls back gracefully when the joined player is missing (orphaned/deleted)', () => {
    const row = { player_id: 'p1', seat: 1, player: null }
    const obj = memberRowToObj(row)
    expect(obj.name).toBe('(unknown player)')
    expect(obj.skillRating).toBeNull()
  })
})

describe('entrantRowToObj', () => {
  it('sorts members by seat regardless of input order (doubles: seat 2 before seat 1 in the row)', () => {
    const row = {
      id: 'e1', display_name: 'Doe/Smith', status: 'active', seed_order: 3, points_adjustment: 0.5,
      members: [
        { player_id: 'p2', seat: 2, player: { name: 'Smith' } },
        { player_id: 'p1', seat: 1, player: { name: 'Doe' } },
      ],
    }
    const obj = entrantRowToObj(row)
    expect(obj.members.map(m => m.name)).toEqual(['Doe', 'Smith'])
    expect(obj.pointsAdjustment).toBe(0.5)
  })

  it('handles a singles entrant with exactly one member', () => {
    const row = {
      id: 'e2', display_name: 'Jane Doe', status: 'active', seed_order: 0, points_adjustment: 0,
      members: [{ player_id: 'p1', seat: 1, player: { name: 'Jane Doe' } }],
    }
    expect(entrantRowToObj(row).members).toHaveLength(1)
  })

  it('defaults to an empty members array if none were joined', () => {
    const row = { id: 'e3', display_name: 'x', status: 'withdrawn', seed_order: 0, points_adjustment: 0, members: null }
    expect(entrantRowToObj(row).members).toEqual([])
  })

  it('maps pool_id to poolId, and defaults to null when unassigned', () => {
    const assigned = { id: 'e4', display_name: 'x', status: 'active', seed_order: 0, points_adjustment: 0, pool_id: 'pool-a', members: [] }
    expect(entrantRowToObj(assigned).poolId).toBe('pool-a')

    const unassigned = { id: 'e5', display_name: 'x', status: 'active', seed_order: 0, points_adjustment: 0, members: [] }
    expect(entrantRowToObj(unassigned).poolId).toBeNull()
  })

  it('a withdrawn entrant keeps its historical poolId (withdrawal never clears it client-side)', () => {
    const row = { id: 'e6', display_name: 'x', status: 'withdrawn', seed_order: 0, points_adjustment: 0, pool_id: 'pool-a', members: [] }
    expect(entrantRowToObj(row).poolId).toBe('pool-a')
  })
})

describe('matchRowToObj', () => {
  const entrantMap = { e1: { id: 'e1', displayName: 'Doe/Smith' }, e2: { id: 'e2', displayName: 'Lee/Park' } }

  it('resolves entrant1_id/entrant2_id against the provided entrant map', () => {
    const row = {
      id: 'm1', pool_id: 'pool1', phase: 'pool', round: 0, slot: 0,
      entrant1_id: 'e1', entrant2_id: 'e2', status: 'complete',
      games: [{ game: 1, score_a: 11, score_b: 7 }], winner_entrant_id: 'e1',
      court_id: 'c1', scheduled_at: null, completed_at: '2026-01-01T00:00:00Z',
      record_url: null, locked: false,
    }
    const obj = matchRowToObj(row, entrantMap)
    expect(obj.entrant1.displayName).toBe('Doe/Smith')
    expect(obj.entrant2.displayName).toBe('Lee/Park')
    expect(obj.games).toEqual([{ game: 1, score_a: 11, score_b: 7 }])
  })

  it('a null entrant slot (bye/unfilled bracket shell) stays null, not an error', () => {
    const row = {
      id: 'm2', pool_id: null, phase: 'elimination', round: 1, slot: 0,
      entrant1_id: 'e1', entrant2_id: null, status: 'pending',
      games: [], winner_entrant_id: null, court_id: null,
      scheduled_at: null, completed_at: null, record_url: null, locked: false,
    }
    const obj = matchRowToObj(row, entrantMap)
    expect(obj.entrant1.displayName).toBe('Doe/Smith')
    expect(obj.entrant2).toBeNull()
  })

  it('an entrant id absent from the map (data integrity edge case) resolves to null rather than throwing', () => {
    const row = {
      id: 'm3', pool_id: null, phase: 'pool', round: 0, slot: 1,
      entrant1_id: 'unknown-id', entrant2_id: null, status: 'pending',
      games: [], winner_entrant_id: null, court_id: null,
      scheduled_at: null, completed_at: null, record_url: null, locked: false,
    }
    expect(() => matchRowToObj(row, entrantMap)).not.toThrow()
    expect(matchRowToObj(row, entrantMap).entrant1).toBeNull()
  })
})

describe('galleryRowToObj / poolRowToObj / courtRowToObj', () => {
  it('galleryRowToObj maps public_url to imageUrl and defaults media_type to image', () => {
    const row = { id: 'g1', public_url: 'https://x/y.jpg', file_name: 'y.jpg', storage_path: 't1/y.jpg', uploaded_at: '2026-01-01T00:00:00Z', uploaded_by: 'u1', uploader_role: 'admin' }
    const obj = galleryRowToObj(row)
    expect(obj.imageUrl).toBe('https://x/y.jpg')
    expect(obj.mediaType).toBe('image')
  })

  it('poolRowToObj and courtRowToObj pass through id/label(/status) only', () => {
    expect(poolRowToObj({ id: 'p1', label: 'Pool A', tournament_id: 't1' })).toEqual({ id: 'p1', label: 'Pool A' })
    expect(courtRowToObj({ id: 'c1', label: 'Court 3', status: 'open', tournament_id: 't1' }))
      .toEqual({ id: 'c1', label: 'Court 3', status: 'open' })
  })
})

describe('playerRowToObj', () => {
  it('maps a full player row', () => {
    const row = { id: 'pl1', name: 'Alice', skill_rating: 3.5, dupr_id: 'DX1', age_group: 'Open', created_at: '2026-01-01T00:00:00Z' }
    expect(playerRowToObj(row)).toEqual({
      id: 'pl1', name: 'Alice', skillRating: 3.5, duprId: 'DX1', ageGroup: 'Open', createdAt: new Date(row.created_at).getTime(),
    })
  })

  it('defaults optional fields to null', () => {
    const row = { id: 'pl2', name: 'Bob', created_at: '2026-01-01T00:00:00Z' }
    const obj = playerRowToObj(row)
    expect(obj.skillRating).toBeNull()
    expect(obj.duprId).toBeNull()
    expect(obj.ageGroup).toBeNull()
  })
})
