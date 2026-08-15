import { useState } from 'react'
import { entrantLabel, buildMatchNumberMap } from './pickleballDisplay.js'
import { formatInZone } from './pickleballTime.js'
import PickleballMatchTimer from './PickleballMatchTimer.jsx'

// The "large timer for the match currently being managed" view — a
// director picks one match and gets a big, focused clock, useful on a
// desktop/tablet propped up at the court. This renders the exact same
// PickleballMatchTimer component the compact per-row widgets in the Pools/
// Bracket tabs use, just at size="large" — there is only ever one timer per
// match, this is just a bigger window onto the same state.
export default function PickleballMatchTimerPanel({ tournament, nowMs }) {
  const allMatches = tournament.matches ?? []
  const matchNumberById = buildMatchNumberMap(allMatches)
  const courtLabelById = Object.fromEntries((tournament.courts ?? []).map(c => [c.id, c.label]))
  const timerByMatchId = Object.fromEntries((tournament.matchTimers ?? []).map(t => [t.matchId, t]))

  // Byes and matches with a not-yet-known opponent have nothing to time.
  const timeableMatches = allMatches.filter(m => m.status !== 'bye' && m.entrant1 && m.entrant2)

  const [selectedId, setSelectedId] = useState(null)
  const selected = timeableMatches.find(m => m.id === selectedId) ?? timeableMatches[0] ?? null

  if (timeableMatches.length === 0) {
    return (
      <div className="pb-state">
        <div className="pb-state-icon">⏱️</div>
        <div className="pb-state-title">No matches to time yet</div>
        <div className="pb-state-sub">Once matches have both entrants assigned, they'll be selectable here.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="pb-field" style={{ maxWidth: 460 }}>
        <label className="pb-field-label" htmlFor="pb-timer-match-select">Active Match</label>
        <select
          id="pb-timer-match-select"
          className="pb-select"
          value={selected?.id ?? ''}
          onChange={e => setSelectedId(e.target.value)}
        >
          {timeableMatches.map(m => (
            <option key={m.id} value={m.id}>
              Match {matchNumberById.get(m.id)}{courtLabelById[m.courtId] ? ` — ${courtLabelById[m.courtId]}` : ''} — {entrantLabel(m.entrant1)} vs {entrantLabel(m.entrant2)}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="pb-match-timer-focus">
          <div className="pb-match-timer-focus-meta">
            <span className="pb-match-timer-focus-match">Match {matchNumberById.get(selected.id)}</span>
            {courtLabelById[selected.courtId] && <span>{courtLabelById[selected.courtId]}</span>}
            <span>{entrantLabel(selected.entrant1)} vs {entrantLabel(selected.entrant2)}</span>
            {selected.scheduledAt && (
              <span className="pb-match-timer-focus-scheduled">
                Scheduled {formatInZone(selected.scheduledAt, tournament.timeZone, 'time')}
              </span>
            )}
          </div>
          <PickleballMatchTimer
            matchId={selected.id}
            tournamentId={tournament.id}
            timer={timerByMatchId[selected.id]}
            nowMs={nowMs}
            size="large"
          />
        </div>
      )}
    </div>
  )
}
