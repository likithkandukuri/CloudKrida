import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import {
  computeRemainingSeconds, computeTimerDisplayStatus, formatTimerClock,
  startOrResumeTimer, pauseTimer, resetTimer,
} from './pickleballMatchTimer.js'

// The one manual-timer widget, used both compactly (beside a match row in
// the Pools/Bracket tabs) and large (the focused "match currently being
// managed" view in the Timer tab) — `size` only changes CSS, the logic and
// data are identical either way, which is what "each timer belongs to one
// specific match" actually means in practice: there's only ever one row of
// state per match, rendered at whatever size the caller needs.
//
// Guests get the exact same clock, read-only — the Start/Pause/Reset
// buttons are simply never rendered for a non-superadmin, matching every
// other admin-only control in this app (RLS is the real enforcement; this
// is the convenience gate).
export default function PickleballMatchTimer({ matchId, tournamentId, timer, nowMs, size = 'compact', className = '' }) {
  const { isSuperAdmin } = useAuth()
  const { setMatchTimer } = usePickleball()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const baseStatus = timer?.status ?? 'idle'
  const remaining = computeRemainingSeconds(timer, nowMs)
  const displayStatus = computeTimerDisplayStatus(timer, nowMs)
  const clock = formatTimerClock(remaining)

  const act = async (transitionFn) => {
    setBusy(true); setError(null)
    try {
      const next = transitionFn(timer, Date.now())
      await setMatchTimer(matchId, tournamentId, next)
    } catch (err) {
      setError(err?.message ?? 'Failed to update timer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`pb-match-timer pb-match-timer--${size} pb-match-timer--${displayStatus} ${className}`}>
      <div className="pb-match-timer-clock">{clock}</div>
      {displayStatus === 'expired' && <div className="pb-match-timer-badge pb-match-timer-badge--expired">Time Expired</div>}
      {displayStatus === 'paused' && <div className="pb-match-timer-badge pb-match-timer-badge--paused">Paused</div>}

      {isSuperAdmin && (
        <div className="pb-match-timer-controls">
          {baseStatus !== 'running' && (
            <button className="pb-btn-small pb-btn-small--ghost" disabled={busy} onClick={() => act(startOrResumeTimer)}>
              {baseStatus === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}
          {baseStatus === 'running' && (
            <button className="pb-btn-small pb-btn-small--ghost" disabled={busy} onClick={() => act(pauseTimer)}>Pause</button>
          )}
          <button className="pb-btn-small pb-btn-small--ghost" disabled={busy} onClick={() => act(resetTimer)}>Reset</button>
        </div>
      )}
      {error && <div className="pb-match-timer-error">{error}</div>}
    </div>
  )
}
