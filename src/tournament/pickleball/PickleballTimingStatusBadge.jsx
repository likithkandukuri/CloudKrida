import { computeTimingStatus, TIMING_STATUS_LABELS } from './pickleballTime.js'
import { usePickleballClock } from './usePickleballClock.js'

const ICONS = { upcoming: '🟢', starting_soon: '🟡', live: '🔴', completed: '⚪' }

// Additive alongside the existing administrative pb-status badge
// (STATUS_LABELS in pickleballDisplay.js) — never replaces it. That badge
// is director-set (registration_open/closed/in_progress/complete); this one
// is a live-computed fact derived from real timestamps when the tournament
// has them, falling back to the administrative status when it doesn't (see
// computeTimingStatus), so it always renders something sensible.
// nowMs is optional — pass it down from a single shared usePickleballClock
// call when rendering many badges at once (e.g. a tournament list) so the
// page runs one ticking interval, not one per card; omit it for a
// standalone badge and this runs its own.
export default function PickleballTimingStatusBadge({ tournament, nowMs: nowMsProp, className = '' }) {
  const ownClock = usePickleballClock(nowMsProp == null ? 30000 : 3600000)
  const nowMs = nowMsProp ?? ownClock
  const status = computeTimingStatus(tournament, nowMs)
  return (
    <span className={`pb-timing-badge pb-timing-badge--${status} ${className}`}>
      {ICONS[status]} {TIMING_STATUS_LABELS[status]}
    </span>
  )
}
