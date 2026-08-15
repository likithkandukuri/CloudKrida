import { describe, it, expect } from 'vitest'
import {
  parseLooseTime, toHHMM, zonedTimeToUtcIso, formatInZone,
  computeTimingStatus, computeCurrentAndNextRound,
  computeCountdownParts, formatCountdown,
  TIMEZONE_ABBREVIATIONS, supportedTimeZones,
} from '../pickleballTime.js'

describe('parseLooseTime', () => {
  it('parses 12-hour with am/pm and no colon ("8am")', () => {
    expect(parseLooseTime('8am')).toEqual({ hour: 8, minute: 0 })
    expect(parseLooseTime('8pm')).toEqual({ hour: 20, minute: 0 })
    expect(parseLooseTime('12am')).toEqual({ hour: 0, minute: 0 }) // midnight
    expect(parseLooseTime('12pm')).toEqual({ hour: 12, minute: 0 }) // noon
  })

  it('parses 12-hour with minutes ("8:30 AM")', () => {
    expect(parseLooseTime('8:30 AM')).toEqual({ hour: 8, minute: 30 })
    expect(parseLooseTime('8:30pm')).toEqual({ hour: 20, minute: 30 })
  })

  it('parses 24-hour "HH:MM" (what a native <input type="time"> submits)', () => {
    expect(parseLooseTime('08:00')).toEqual({ hour: 8, minute: 0 })
    expect(parseLooseTime('14:30')).toEqual({ hour: 14, minute: 30 })
    expect(parseLooseTime('00:00')).toEqual({ hour: 0, minute: 0 })
  })

  it('returns null for missing or unparseable input rather than guessing', () => {
    expect(parseLooseTime(null)).toBeNull()
    expect(parseLooseTime('')).toBeNull()
    expect(parseLooseTime('sometime in the afternoon')).toBeNull()
    expect(parseLooseTime('25:00')).toBeNull()
  })
})

describe('toHHMM', () => {
  it('normalizes a loose time to zero-padded 24-hour for native time inputs', () => {
    expect(toHHMM('8am')).toBe('08:00')
    expect(toHHMM('8:00 AM')).toBe('08:00')
    expect(toHHMM('11:45 PM')).toBe('23:45')
    expect(toHHMM('14:30')).toBe('14:30')
  })

  it('returns empty string for unspecified/unparseable values (so the input shows blank, not an error)', () => {
    expect(toHHMM(null)).toBe('')
    expect(toHHMM('not a time')).toBe('')
  })
})

describe('zonedTimeToUtcIso', () => {
  it('returns null when date or time is missing — never invents a time', () => {
    expect(zonedTimeToUtcIso(null, '8am', 'America/Los_Angeles')).toBeNull()
    expect(zonedTimeToUtcIso('2026-08-14', null, 'America/Los_Angeles')).toBeNull()
    expect(zonedTimeToUtcIso('2026-08-14', 'not a time', 'America/Los_Angeles')).toBeNull()
  })

  it('constructs the correct UTC instant for a stated IANA zone (PDT, UTC-7 in August)', () => {
    const iso = zonedTimeToUtcIso('2026-08-14', '8:00 AM', 'America/Los_Angeles')
    // 8:00 AM PDT (UTC-7 in August, DST active) == 15:00 UTC
    expect(iso).toBe('2026-08-14T15:00:00.000Z')
  })

  it('is correct across a DST boundary (winter -> PST, UTC-8)', () => {
    const iso = zonedTimeToUtcIso('2026-01-14', '8:00 AM', 'America/Los_Angeles')
    expect(iso).toBe('2026-01-14T16:00:00.000Z')
  })

  it('produces the same real-world instant for equivalent wall-clock times in two different zones', () => {
    const west = zonedTimeToUtcIso('2026-08-14', '8:00 AM', 'America/Los_Angeles') // UTC-7
    const east = zonedTimeToUtcIso('2026-08-14', '11:00 AM', 'America/New_York')   // UTC-4
    expect(west).toBe(east)
  })

  it('falls back to naive local construction when no time zone is stated (unchanged pre-timezone behavior)', () => {
    const iso = zonedTimeToUtcIso('2026-08-14', '8:00 AM', null)
    const expected = new Date(2026, 7, 14, 8, 0, 0, 0).toISOString()
    expect(iso).toBe(expected)
  })
})

describe('formatInZone', () => {
  it('returns null for a missing/invalid instant', () => {
    expect(formatInZone(null, 'America/Los_Angeles')).toBeNull()
    expect(formatInZone('not a date', 'America/Los_Angeles')).toBeNull()
  })

  it('formats a known instant in a stated zone', () => {
    const label = formatInZone('2026-08-14T15:00:00.000Z', 'America/Los_Angeles', 'time')
    expect(label).toMatch(/8:00\s*AM/i)
  })

  it('still formats (in the viewer local zone) when no zone is given', () => {
    const label = formatInZone('2026-08-14T15:00:00.000Z', null, 'time')
    expect(typeof label).toBe('string')
    expect(label.length).toBeGreaterThan(0)
  })
})

describe('TIMEZONE_ABBREVIATIONS / supportedTimeZones', () => {
  it('maps common US abbreviations to real IANA names', () => {
    expect(TIMEZONE_ABBREVIATIONS.PST).toBe('America/Los_Angeles')
    expect(TIMEZONE_ABBREVIATIONS.ET).toBe('America/New_York')
  })

  it('returns a non-empty list of zone names', () => {
    const zones = supportedTimeZones()
    expect(zones.length).toBeGreaterThan(0)
    expect(zones).toContain('America/New_York')
  })
})

describe('computeTimingStatus', () => {
  const HOUR = 3600000

  it('falls back to the administrative status when there is no timing data at all', () => {
    expect(computeTimingStatus({ status: 'registration_open' }, 1000)).toBe('upcoming')
    expect(computeTimingStatus({ status: 'registration_closed' }, 1000)).toBe('upcoming')
    expect(computeTimingStatus({ status: 'in_progress' }, 1000)).toBe('live')
    expect(computeTimingStatus({ status: 'complete' }, 1000)).toBe('completed')
  })

  it('is "upcoming" well before start', () => {
    const t = { startAt: 10 * HOUR, endAt: 12 * HOUR }
    expect(computeTimingStatus(t, 0)).toBe('upcoming')
  })

  it('is "starting_soon" within 60 minutes of start', () => {
    const t = { startAt: 10 * HOUR, endAt: 12 * HOUR }
    expect(computeTimingStatus(t, 10 * HOUR - 30 * 60000)).toBe('starting_soon')
  })

  it('is "live" between start and end', () => {
    const t = { startAt: 10 * HOUR, endAt: 12 * HOUR }
    expect(computeTimingStatus(t, 11 * HOUR)).toBe('live')
  })

  it('is "completed" at/after end', () => {
    const t = { startAt: 10 * HOUR, endAt: 12 * HOUR }
    expect(computeTimingStatus(t, 12 * HOUR)).toBe('completed')
    expect(computeTimingStatus(t, 13 * HOUR)).toBe('completed')
  })
})

describe('computeCurrentAndNextRound', () => {
  it('returns nulls when no match has a scheduledAt', () => {
    const result = computeCurrentAndNextRound([{ id: 'm1', scheduledAt: null }], 1000)
    expect(result).toEqual({ currentRound: null, nextRound: null })
  })

  it('groups matches by identical scheduledAt and picks current (latest past) and next (earliest future)', () => {
    const matches = [
      { id: 'm1', scheduledAt: 1000 },
      { id: 'm2', scheduledAt: 1000 },
      { id: 'm3', scheduledAt: 2000 },
      { id: 'm4', scheduledAt: 3000 },
    ]
    const { currentRound, nextRound } = computeCurrentAndNextRound(matches, 2500)
    expect(currentRound.scheduledAt).toBe(2000)
    expect(currentRound.matches).toHaveLength(1)
    expect(nextRound.scheduledAt).toBe(3000)
  })

  it('has no currentRound before the first scheduled round, and no nextRound after the last', () => {
    const matches = [{ id: 'm1', scheduledAt: 1000 }, { id: 'm2', scheduledAt: 2000 }]
    expect(computeCurrentAndNextRound(matches, 500).currentRound).toBeNull()
    expect(computeCurrentAndNextRound(matches, 500).nextRound.scheduledAt).toBe(1000)
    expect(computeCurrentAndNextRound(matches, 5000).nextRound).toBeNull()
    expect(computeCurrentAndNextRound(matches, 5000).currentRound.scheduledAt).toBe(2000)
  })
})

describe('computeCountdownParts / formatCountdown', () => {
  it('returns null parts for a missing target', () => {
    expect(computeCountdownParts(null, 0)).toBeNull()
  })

  it('breaks down a future target into days/hours/minutes/seconds', () => {
    const twoDays = 2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5000
    const parts = computeCountdownParts(twoDays, 0)
    expect(parts).toEqual({ totalMs: twoDays, isPast: false, days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('marks an exactly-zero or past target as isPast', () => {
    expect(computeCountdownParts(1000, 1000).isPast).toBe(true)
    expect(computeCountdownParts(1000, 2000).isPast).toBe(true)
  })

  it('formats with adaptive granularity', () => {
    expect(formatCountdown({ isPast: false, days: 2, hours: 3, minutes: 4, seconds: 5 })).toBe('2d 3h')
    expect(formatCountdown({ isPast: false, days: 0, hours: 1, minutes: 4, seconds: 5 })).toBe('1h 4m')
    expect(formatCountdown({ isPast: false, days: 0, hours: 0, minutes: 4, seconds: 5 })).toBe('4m 5s')
    expect(formatCountdown({ isPast: false, days: 0, hours: 0, minutes: 0, seconds: 5 })).toBe('5s')
    expect(formatCountdown({ isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0 })).toBe('now')
  })

  it('formats null gracefully', () => {
    expect(formatCountdown(null)).toBe('')
  })
})
