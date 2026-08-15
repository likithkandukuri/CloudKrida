import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TIMER_DURATION_SECONDS, defaultTimerState,
  computeRemainingSeconds, computeTimerDisplayStatus, formatTimerClock,
  startOrResumeTimer, pauseTimer, resetTimer,
} from '../pickleballMatchTimer.js'

describe('defaultTimerState', () => {
  it('starts idle at exactly the configured duration (15:00 by default)', () => {
    expect(defaultTimerState()).toEqual({
      durationSeconds: 900, status: 'idle', startedAt: null, remainingSeconds: 900,
    })
  })

  it('supports a different configured duration without any redesign', () => {
    expect(defaultTimerState(600).remainingSeconds).toBe(600)
    expect(defaultTimerState(600).durationSeconds).toBe(600)
  })
})

describe('computeRemainingSeconds', () => {
  it('treats a missing timer (never started) as the default idle state', () => {
    expect(computeRemainingSeconds(null, 0)).toBe(DEFAULT_TIMER_DURATION_SECONDS)
  })

  it('returns the banked remaining time unchanged while idle or paused', () => {
    expect(computeRemainingSeconds({ status: 'idle', remainingSeconds: 900, startedAt: null }, 999999)).toBe(900)
    expect(computeRemainingSeconds({ status: 'paused', remainingSeconds: 542, startedAt: null }, 999999)).toBe(542)
  })

  it('counts down from remainingSeconds as elapsed time passes while running', () => {
    const timer = { status: 'running', remainingSeconds: 900, startedAt: 0 }
    expect(computeRemainingSeconds(timer, 0)).toBe(900)
    expect(computeRemainingSeconds(timer, 10000)).toBe(890) // 10s elapsed
    expect(computeRemainingSeconds(timer, 900000)).toBe(0) // exactly expired
  })

  it('never goes negative past zero', () => {
    const timer = { status: 'running', remainingSeconds: 900, startedAt: 0 }
    expect(computeRemainingSeconds(timer, 999999999)).toBe(0)
  })
})

describe('computeTimerDisplayStatus', () => {
  it('is "idle" for a never-started timer', () => {
    expect(computeTimerDisplayStatus(null, 0)).toBe('idle')
  })

  it('is "running" while counting down with time left', () => {
    const timer = { status: 'running', remainingSeconds: 900, startedAt: 0 }
    expect(computeTimerDisplayStatus(timer, 5000)).toBe('running')
  })

  it('is "paused" when stopped with time still remaining', () => {
    const timer = { status: 'paused', remainingSeconds: 300, startedAt: null }
    expect(computeTimerDisplayStatus(timer, 0)).toBe('paused')
  })

  it('is "expired" exactly at 00:00, whether it ran out while running or sits paused at zero', () => {
    const ranOut = { status: 'running', remainingSeconds: 900, startedAt: 0 }
    expect(computeTimerDisplayStatus(ranOut, 900000)).toBe('expired')
    const pausedAtZero = { status: 'paused', remainingSeconds: 0, startedAt: null }
    expect(computeTimerDisplayStatus(pausedAtZero, 0)).toBe('expired')
  })

  it('does not report "expired" for a freshly reset (idle) timer even though remaining could theoretically be 0 for a 0-length duration edge case', () => {
    const idle = { status: 'idle', remainingSeconds: 0, startedAt: null }
    expect(computeTimerDisplayStatus(idle, 0)).toBe('idle')
  })
})

describe('formatTimerClock', () => {
  it('formats minutes:seconds, zero-padded', () => {
    expect(formatTimerClock(900)).toBe('15:00')
    expect(formatTimerClock(65)).toBe('01:05')
    expect(formatTimerClock(5)).toBe('00:05')
    expect(formatTimerClock(0)).toBe('00:00')
  })

  it('formats hours:minutes:seconds once a configured duration exceeds an hour', () => {
    expect(formatTimerClock(3661)).toBe('1:01:01')
  })

  it('rounds and clamps rather than showing a negative or fractional time', () => {
    expect(formatTimerClock(-5)).toBe('00:00')
    expect(formatTimerClock(59.6)).toBe('01:00')
  })
})

describe('startOrResumeTimer / pauseTimer / resetTimer — the only functions that produce a row worth persisting', () => {
  it('Start begins the countdown from idle', () => {
    const next = startOrResumeTimer(defaultTimerState(), 1000)
    expect(next).toEqual({ durationSeconds: 900, status: 'running', startedAt: 1000, remainingSeconds: 900 })
  })

  it('Pause stops it and banks exactly the remaining time', () => {
    const running = { durationSeconds: 900, status: 'running', startedAt: 0, remainingSeconds: 900 }
    const next = pauseTimer(running, 10000) // 10s elapsed
    expect(next).toEqual({ durationSeconds: 900, status: 'paused', startedAt: null, remainingSeconds: 890 })
  })

  it('Resume continues counting down from exactly where it stopped (same transition as Start)', () => {
    const paused = { durationSeconds: 900, status: 'paused', startedAt: null, remainingSeconds: 542 }
    const resumed = startOrResumeTimer(paused, 5000)
    expect(resumed).toEqual({ durationSeconds: 900, status: 'running', startedAt: 5000, remainingSeconds: 542 })
    // and it keeps counting down from 542, not from the full duration
    expect(computeRemainingSeconds(resumed, 5000 + 100000)).toBe(442)
  })

  it('Reset returns to exactly the configured duration from any state', () => {
    const midRun = { durationSeconds: 900, status: 'running', startedAt: 0, remainingSeconds: 900 }
    expect(resetTimer(midRun)).toEqual({ durationSeconds: 900, status: 'idle', startedAt: null, remainingSeconds: 900 })

    const expired = { durationSeconds: 900, status: 'running', startedAt: 0, remainingSeconds: 900 }
    const afterReset = resetTimer(expired)
    expect(computeTimerDisplayStatus(afterReset, 99999999)).toBe('idle') // not stuck "expired"
  })

  it('does not automatically reset or restart at 00:00 — a fully-run-out timer stays exactly as is until a Superadmin acts', () => {
    const timer = { durationSeconds: 900, status: 'running', startedAt: 0, remainingSeconds: 900 }
    const wayPastZero = 10_000_000
    expect(computeRemainingSeconds(timer, wayPastZero)).toBe(0)
    expect(computeTimerDisplayStatus(timer, wayPastZero)).toBe('expired')
    // nothing here mutates `timer` or produces a different result on a later tick
    expect(computeTimerDisplayStatus(timer, wayPastZero * 10)).toBe('expired')
  })

  it('Start is a no-op when already running (does not reset startedAt)', () => {
    const running = { durationSeconds: 900, status: 'running', startedAt: 42, remainingSeconds: 900 }
    expect(startOrResumeTimer(running, 999)).toEqual(running)
  })

  it('Pause is a no-op when not running', () => {
    const idle = defaultTimerState()
    expect(pauseTimer(idle, 1000)).toEqual(idle)
  })
})

describe('multiple independent match timers never interfere with each other', () => {
  it('starting/pausing/resetting one timer object never mutates or is derived from another', () => {
    const match12 = defaultTimerState()
    const match13 = defaultTimerState()

    const match12Running = startOrResumeTimer(match12, 0)
    // match13 is untouched — still the original idle object, unaffected by match12's transition
    expect(match13).toEqual(defaultTimerState())
    expect(computeTimerDisplayStatus(match13, 500000)).toBe('idle')

    const match13Running = startOrResumeTimer(match13, 100000)
    const match12Paused = pauseTimer(match12Running, 10000) // match12 ran for 10s
    // match13 keeps counting from its own, later start time — unaffected by match12's pause
    expect(computeRemainingSeconds(match13Running, 110000)).toBe(890)
    expect(match12Paused.remainingSeconds).toBe(890)

    const match12Reset = resetTimer(match12Paused)
    expect(match12Reset.remainingSeconds).toBe(900)
    // match13, still running, is completely unaffected by match12's reset
    expect(computeTimerDisplayStatus(match13Running, 110000)).toBe('running')
    expect(computeRemainingSeconds(match13Running, 110000)).toBe(890)
  })
})
