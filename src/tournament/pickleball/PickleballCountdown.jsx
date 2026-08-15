import { computeCountdownParts, formatCountdown } from './pickleballTime.js'
import { usePickleballClock } from './usePickleballClock.js'

// A single ticking countdown line: "{label} {2d 4h}". Renders nothing when
// there's no target — a tournament/round/match with no known time simply
// shows no countdown rather than a fabricated one.
// nowMs is optional — pass a shared value down when rendering several
// countdowns on one page (see PickleballTimingStatusBadge.jsx for the same
// pattern); omit it for a standalone countdown and this ticks on its own.
export default function PickleballCountdown({ label, targetMs, nowMs: nowMsProp, className = '' }) {
  const ownClock = usePickleballClock(nowMsProp == null ? 1000 : 3600000)
  const nowMs = nowMsProp ?? ownClock
  if (targetMs == null) return null
  const parts = computeCountdownParts(targetMs, nowMs)
  if (parts.isPast) return null
  return (
    <span className={`pb-countdown ${className}`}>
      {label} <strong>{formatCountdown(parts)}</strong>
    </span>
  )
}
