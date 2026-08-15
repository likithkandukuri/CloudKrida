// Manual per-match countdown timer — pure functions only, no React, no I/O.
// Deliberately separate from pickleballTime.js: that module is about the
// tournament's *scheduled* timing (when a match is expected to happen,
// start/end/round-derived from scheduled_at); this is the tournament
// director's actual hand-operated clock for the match being played right
// now. Nothing here reads scheduled_at, and nothing in pickleballTime.js
// reads a match timer — the two systems never influence each other.
//
// A timer's persisted shape (matchTimerRowToObj in pickleballDb.js):
//   { matchId, tournamentId, durationSeconds, status, startedAt, remainingSeconds }
// `status` is 'idle' | 'running' | 'paused' — never 'expired' in storage.
// "Time Expired" is a purely client-computed *display* state (remaining
// seconds has reached zero), not a fourth persisted status — this avoids
// any client having to race to be the one that writes "expired" the
// instant a countdown hits zero, and avoids ever needing a write on a
// timer, not a click.
//
// Only a Start/Pause/Resume/Reset click ever produces a new row to persist
// (see startOrResumeTimer/pauseTimer/resetTimer below) — the countdown
// itself is derived every render from `remainingSeconds` + `startedAt`
// against the current time, using the shared usePickleballClock tick
// rather than a per-timer setInterval or any per-second database write.

export const DEFAULT_TIMER_DURATION_SECONDS = 900 // 15:00

// The state a match with no timer row yet behaves as — "idle, full
// duration, never started". Every function below accepts `timer == null`
// and treats it exactly like this, so a match's timer doesn't need a row
// pre-created for every match up front; the first Start click creates it.
export function defaultTimerState(durationSeconds = DEFAULT_TIMER_DURATION_SECONDS) {
  return { durationSeconds, status: 'idle', startedAt: null, remainingSeconds: durationSeconds }
}

function withDefault(timer) {
  return timer ?? defaultTimerState()
}

// The number of seconds left right now — the one function every display
// surface (compact widget, large view) calls every clock tick. Never
// negative; never invents a value when the timer is idle/paused (returns
// exactly the banked remainingSeconds unchanged).
export function computeRemainingSeconds(timer, nowMs) {
  const t = withDefault(timer)
  if (t.status !== 'running' || t.startedAt == null) return t.remainingSeconds
  const elapsedSeconds = (nowMs - t.startedAt) / 1000
  return Math.max(0, t.remainingSeconds - elapsedSeconds)
}

// 'idle' | 'running' | 'paused' | 'expired'. Expired is derived (remaining
// has reached zero) and takes priority over whatever the stored status
// is — a timer paused at exactly 0:00, or one still marked "running" whose
// time has simply run out, both display as "Time Expired". Per spec: this
// never auto-resets or auto-restarts anything, it's purely what's shown.
export function computeTimerDisplayStatus(timer, nowMs) {
  const t = withDefault(timer)
  if (computeRemainingSeconds(t, nowMs) <= 0 && t.status !== 'idle') return 'expired'
  return t.status
}

// "15:00" / "9:05" / "1:02:03" for a duration over an hour (not needed for
// the 15-minute default, but the format shouldn't silently break if the
// configurable duration is ever set higher).
export function formatTimerClock(totalSeconds) {
  const secs = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ── Pure state transitions — each returns the next full row to persist.
// The caller (PickleballContext's setMatchTimer) is responsible for
// actually writing it; these never touch a database. Start and Resume are
// the same transition (idle/paused -> running, banked remaining
// unchanged) — the UI just labels the single primary button "Start" or
// "Resume" depending on the timer's current status.

export function startOrResumeTimer(timer, nowMs) {
  const t = withDefault(timer)
  if (t.status === 'running') return t // already running — no-op
  return { ...t, status: 'running', startedAt: nowMs }
}

export function pauseTimer(timer, nowMs) {
  const t = withDefault(timer)
  if (t.status !== 'running') return t // nothing to pause
  return { ...t, status: 'paused', startedAt: null, remainingSeconds: computeRemainingSeconds(t, nowMs) }
}

// Always returns to exactly the configured duration, regardless of
// whatever state the timer was in — this is the one operation that's
// unconditional, matching "Reset returns it to exactly 15:00".
export function resetTimer(timer) {
  const t = withDefault(timer)
  return { ...t, status: 'idle', startedAt: null, remainingSeconds: t.durationSeconds }
}
