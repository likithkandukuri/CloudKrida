import { describe, it, expect } from 'vitest'
import { toImportPayload } from '../pickleballImportMapping.js'
import { ataDraft } from '../__fixtures__/ataDraft.js'

describe('toImportPayload — ATA fixture', () => {
  const payload = toImportPayload(ataDraft)

  it('produces one player entry per roster seat (23 teams x 2 = 46)', () => {
    expect(payload.p_players).toHaveLength(46)
    expect(payload.p_players[0]).toEqual({ temp_id: 'player:A1:0', name: 'Haresh' })
  })

  it('produces one entrant per team (23), each referencing exactly 2 member temp_ids', () => {
    expect(payload.p_entrants).toHaveLength(23)
    expect(payload.p_entrants.every(e => e.member_temp_ids.length === 2)).toBe(true)
    const a1 = payload.p_entrants.find(e => e.temp_id === 'entrant:A1')
    expect(a1.display_name).toBe('Haresh & Patrick')
    expect(a1.member_temp_ids).toEqual(['player:A1:0', 'player:A1:1'])
  })

  it('produces 5 courts and 4 pools matching the group sizes', () => {
    expect(payload.p_courts).toHaveLength(5)
    expect(payload.p_pools).toHaveLength(4)
    const poolA = payload.p_pools.find(p => p.label === 'Pool A')
    expect(poolA.entrant_temp_ids).toHaveLength(6)
    const poolC = payload.p_pools.find(p => p.label === 'Pool C')
    expect(poolC.entrant_temp_ids).toHaveLength(5)
  })

  it('produces exactly the 46 league matches, none from the knockout stage', () => {
    expect(payload.p_matches).toHaveLength(46)
    expect(payload.p_matches.every(m => m.pool_temp_id && m.entrant1_temp_id && m.entrant2_temp_id && m.court_temp_id)).toBe(true)
  })

  it('infers doubles from the actual roster size, not a separately-stated rule', () => {
    expect(payload.p_tournament.event_type).toBe('doubles')
  })

  it('lifts winningPoints/leagueMatchesPerTeam-mapped fields onto real tournament columns; leaves games_to at its default since the ATA plan never states a winning score', () => {
    // The real ATA document never states "11 points" anywhere — ensure this
    // stays honest rather than assuming a default pickleball rule.
    expect(ataDraft.rules.structured.winningPoints.value).toBeNull()
    expect(payload.p_tournament.games_to).toBe(11) // engine default, not claimed as "extracted"
  })

  it('carries the knockout mapping and full rules record through untouched, for later bracket generation / display', () => {
    expect(payload.p_tournament.advancement_mapping.quarterfinals).toHaveLength(4)
    expect(payload.p_tournament.imported_rules.structured.leagueMatchesPerTeam.value).toBe(4)
    expect(payload.p_tournament.imported_rules.structured.minimumParticipantAge.value).toBeNull()
  })

  it('leaves every timing field null — the ATA fixture states no date, so nothing can be resolved to an absolute instant', () => {
    expect(payload.p_tournament.start_at).toBeNull()
    expect(payload.p_tournament.end_at).toBeNull()
    expect(payload.p_tournament.check_in_at).toBeNull()
    expect(payload.p_tournament.registration_deadline_at).toBeNull()
    expect(payload.p_tournament.time_zone).toBeNull()
    expect(payload.p_matches.every(m => m.scheduled_at === null)).toBe(true)
  })
})

describe('toImportPayload — tournament timing', () => {
  const f = (value, sourceText = null) => ({ value, sourceText })

  function timingDraft({ date, timeZone, startTime, endTime, checkInTime, registrationDeadline, timeSlot = '8:00 AM - 9:00 AM' } = {}) {
    return {
      tournamentInfo: {
        name: f('Timing Test'), organizer: f(null), date: f(date ?? null),
        location: f(null), courtCount: f(null), durationText: f(null),
        startTime: f(startTime ?? null), endTime: f(endTime ?? null),
        checkInTime: f(checkInTime ?? null), registrationDeadline: f(registrationDeadline ?? null),
        timeZone: f(timeZone ?? null),
      },
      rules: { structured: {}, rawText: '' },
      declaredTotals: { totalTeams: f(2), totalMatches: f(1), totalCourts: f(1) },
      groups: [{ label: 'A', teams: [{ code: 'A1', players: ['P1'] }, { code: 'A2', players: ['P2'] }] }],
      courts: [{ label: 'Court 1' }],
      schedule: [{
        stage: 'league', court: f('Court 1'), timeSlot: f(timeSlot), roundIndex: 0,
        team1: f('A1'), team2: f('A2'),
      }],
      knockout: { quarterfinals: [] },
    }
  }

  it('resolves start_at/end_at/check_in_at/registration_deadline_at using the stated date + time zone', () => {
    const payload = toImportPayload(timingDraft({
      date: '2026-08-14', timeZone: 'America/Los_Angeles',
      startTime: '8:00 AM', endTime: '5:00 PM', checkInTime: '7:30 AM', registrationDeadline: '7:00 AM',
    }))
    expect(payload.p_tournament.start_at).toBe('2026-08-14T15:00:00.000Z') // 8am PDT -> 15:00 UTC
    expect(payload.p_tournament.end_at).toBe('2026-08-15T00:00:00.000Z')  // 5pm PDT -> 00:00 UTC the *next* calendar day
    expect(payload.p_tournament.check_in_at).toBe('2026-08-14T14:30:00.000Z')
    expect(payload.p_tournament.registration_deadline_at).toBe('2026-08-14T14:00:00.000Z')
    expect(payload.p_tournament.time_zone).toBe('America/Los_Angeles')
  })

  it('resolves the per-match scheduled_at using the same date + time zone as the tournament-level fields', () => {
    const payload = toImportPayload(timingDraft({ date: '2026-08-14', timeZone: 'America/Los_Angeles' }))
    expect(payload.p_matches[0].scheduled_at).toBe('2026-08-14T15:00:00.000Z')
  })

  it('falls back to naive local construction when no time zone is stated (parity with pre-timezone behavior)', () => {
    const payload = toImportPayload(timingDraft({ date: '2026-08-14', startTime: '8:00 AM' }))
    const expected = new Date(2026, 7, 14, 8, 0, 0, 0).toISOString()
    expect(payload.p_tournament.start_at).toBe(expected)
  })

  it('stays null when the date is unknown, even if a time-of-day was stated', () => {
    const payload = toImportPayload(timingDraft({ startTime: '8:00 AM', timeZone: 'America/Los_Angeles' }))
    expect(payload.p_tournament.start_at).toBeNull()
    expect(payload.p_matches[0].scheduled_at).toBeNull()
  })
})
