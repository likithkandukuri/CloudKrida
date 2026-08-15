// Timezone-correct time math for Pickleball tournament timing — pure
// functions only, no React, no I/O. Deliberately dependency-free: zone
// conversion uses the well-known "double conversion" trick against the
// built-in Intl.DateTimeFormat rather than pulling in a date/timezone
// library, since a single IANA zone per tournament is all this needs.
//
// Two directions, kept distinct on purpose:
//  - zonedTimeToUtcIso: a wall-clock time *stated in the document* (in the
//    tournament's own zone) -> the correct absolute instant to store.
//  - formatInZone: an already-absolute instant -> what a viewer should see,
//    displayed in the tournament's zone (falls back to the viewer's own
//    local zone when the tournament doesn't declare one — there's nothing
//    better to show, and this is a display choice, not invented data).

// ── Common IANA zone list + US abbreviation lookup ─────────────────────────
// Used by the parser (mapping "PST"/"ET" as printed in a document to a real
// IANA name) and by the review screen's <select> fallback when the running
// browser doesn't support Intl.supportedValuesOf('timeZone').
export const TIMEZONE_ABBREVIATIONS = {
  ET: 'America/New_York', EST: 'America/New_York', EDT: 'America/New_York',
  CT: 'America/Chicago', CST: 'America/Chicago', CDT: 'America/Chicago',
  MT: 'America/Denver', MST: 'America/Denver', MDT: 'America/Denver',
  PT: 'America/Los_Angeles', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
  AKT: 'America/Anchorage', AKST: 'America/Anchorage', AKDT: 'America/Anchorage',
  HT: 'Pacific/Honolulu', HST: 'Pacific/Honolulu',
}

export const COMMON_TIME_ZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'UTC',
]

export function supportedTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone')
  } catch { /* fall through to the curated list below */ }
  return COMMON_TIME_ZONES
}

// ── Loose time-string parsing ───────────────────────────────────────────────
// Accepts both what a PDF prints ("8am", "8:00 AM") and what a native
// <input type="time"> submits ("08:00", 24-hour, no am/pm).
export function parseLooseTime(timeStr) {
  if (!timeStr) return null
  const s = String(timeStr).trim()

  let m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (m) {
    let hour = Number(m[1])
    const minute = Number(m[2])
    const ampm = m[3]?.toLowerCase()
    if (ampm) { hour = hour % 12; if (ampm === 'pm') hour += 12 }
    if (hour > 23 || minute > 59) return null
    return { hour, minute }
  }

  m = s.match(/^(\d{1,2})\s*(am|pm)$/i)
  if (m) {
    let hour = Number(m[1]) % 12
    if (m[2].toLowerCase() === 'pm') hour += 12
    return { hour, minute: 0 }
  }

  return null
}

// Normalizes any loosely-formatted time (what the parser extracts, "8am",
// "8:00 AM") into the zero-padded 24-hour "HH:MM" a native
// <input type="time"> requires to actually display the value instead of
// showing blank. Returns '' when unparseable, which is exactly what an
// empty/unspecified time input should show.
export function toHHMM(timeStr) {
  const t = parseLooseTime(timeStr)
  if (!t) return ''
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

function getZonedComponents(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(utcMs).map(p => [p.type, p.value]))
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    // Some engines report midnight as "24" with hour12:false; normalize to 0.
    hour: Number(parts.hour) % 24, minute: Number(parts.minute),
  }
}

// Double-conversion: guess the instant as if the wall-clock values were UTC,
// measure how far that guess's *displayed* time in the target zone drifts
// from the intended wall-clock values, and correct. A second pass catches
// the rare case where the first correction crosses a DST transition.
function zonedComponentsToUtcMs(y, mo, d, hour, minute, timeZone) {
  const targetUtc = Date.UTC(y, mo - 1, d, hour, minute, 0, 0)
  let guess = targetUtc
  for (let i = 0; i < 2; i++) {
    const shown = getZonedComponents(guess, timeZone)
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0, 0)
    const diff = shownAsUtc - targetUtc
    if (diff === 0) break
    guess -= diff
  }
  return guess
}

// dateStr: "YYYY-MM-DD". timeStr: see parseLooseTime. timeZone: IANA name or
// null/undefined. Returns an ISO string, or null when either input is
// missing/unparseable — never guesses a time that wasn't given.
export function zonedTimeToUtcIso(dateStr, timeStr, timeZone) {
  if (!dateStr || !timeStr) return null
  const time = parseLooseTime(timeStr)
  if (!time) return null
  const [y, mo, d] = String(dateStr).split('-').map(Number)
  if (!y || !mo || !d) return null

  if (!timeZone) {
    // No declared zone: preserve the importer's original (pre-timezone)
    // behavior exactly — construct the instant in whatever zone this code
    // is running in. Never invent a zone the document didn't state.
    const naive = new Date(y, mo - 1, d, time.hour, time.minute, 0, 0)
    return Number.isNaN(naive.getTime()) ? null : naive.toISOString()
  }

  const ms = zonedComponentsToUtcMs(y, mo, d, time.hour, time.minute, timeZone)
  return new Date(ms).toISOString()
}

// ── Display formatting ──────────────────────────────────────────────────────
// mode: 'time' | 'date' | 'datetime'. timeZone null/undefined -> viewer's
// own local zone (today's formatDate/formatTime behavior in
// pickleballDisplay.js), since there's nothing more correct to show.
export function formatInZone(iso, timeZone, mode = 'time') {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const zoneOpt = timeZone ? { timeZone } : {}

  if (mode === 'date') {
    return date.toLocaleDateString(undefined, { ...zoneOpt, month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (mode === 'datetime') {
    return date.toLocaleString(undefined, {
      ...zoneOpt, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZoneName: timeZone ? 'short' : undefined,
    })
  }
  return date.toLocaleTimeString(undefined, {
    ...zoneOpt, hour: 'numeric', minute: '2-digit', timeZoneName: timeZone ? 'short' : undefined,
  })
}

// ── Derived tournament timing status ────────────────────────────────────────
// 'upcoming' | 'starting_soon' | 'live' | 'completed'. When the tournament
// has no start_at/end_at at all (every tournament created before this
// feature, and every manually-created one going forward), falls back to the
// existing administrative `status` column so nothing breaks or shows a
// fabricated countdown for tournaments with zero timing data.
const STARTING_SOON_WINDOW_MS = 60 * 60 * 1000

export function computeTimingStatus(tournament, nowMs = Date.now()) {
  const startAt = tournament?.startAt ?? null
  const endAt   = tournament?.endAt ?? null

  if (startAt == null && endAt == null) {
    if (tournament?.status === 'complete') return 'completed'
    if (tournament?.status === 'in_progress') return 'live'
    return 'upcoming'
  }

  if (endAt != null && nowMs >= endAt) return 'completed'
  if (startAt != null && nowMs >= startAt) return 'live'
  if (startAt != null && startAt - nowMs <= STARTING_SOON_WINDOW_MS) return 'starting_soon'
  return 'upcoming'
}

export const TIMING_STATUS_LABELS = {
  upcoming:      'Upcoming',
  starting_soon: 'Starting Soon',
  live:          'Live',
  completed:     'Completed',
}

// ── Current / next round (derived from match scheduling, no new schema) ────
// A "round" here is simply the set of matches sharing the same scheduledAt
// instant — exactly how the importer writes them in from a printed
// court x time-slot grid. currentRound is the most recent group at or
// before `nowMs`; nextRound is the soonest group after it.
export function computeCurrentAndNextRound(matches, nowMs = Date.now()) {
  const scheduled = (matches ?? []).filter(m => m.scheduledAt != null)
  if (!scheduled.length) return { currentRound: null, nextRound: null }

  const groups = new Map()
  for (const m of scheduled) {
    if (!groups.has(m.scheduledAt)) groups.set(m.scheduledAt, [])
    groups.get(m.scheduledAt).push(m)
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => a - b)
  const pastOrNow = sortedKeys.filter(k => k <= nowMs)
  const future    = sortedKeys.filter(k => k > nowMs)

  const currentKey = pastOrNow.length ? pastOrNow[pastOrNow.length - 1] : null
  const nextKey    = future.length ? future[0] : null

  return {
    currentRound: currentKey != null ? { scheduledAt: currentKey, matches: groups.get(currentKey) } : null,
    nextRound:    nextKey    != null ? { scheduledAt: nextKey,    matches: groups.get(nextKey) }    : null,
  }
}

// ── Countdown math ──────────────────────────────────────────────────────────
export function computeCountdownParts(targetMs, nowMs = Date.now()) {
  if (targetMs == null) return null
  const totalMs = targetMs - nowMs
  const isPast = totalMs <= 0
  const abs = Math.abs(totalMs)
  return {
    totalMs,
    isPast,
    days:    Math.floor(abs / 86400000),
    hours:   Math.floor((abs % 86400000) / 3600000),
    minutes: Math.floor((abs % 3600000) / 60000),
    seconds: Math.floor((abs % 60000) / 1000),
  }
}

export function formatCountdown(parts) {
  if (!parts) return ''
  const { isPast, days, hours, minutes, seconds } = parts
  if (isPast) return 'now'
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
