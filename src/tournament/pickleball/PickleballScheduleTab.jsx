import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import { entrantLabel, formatDate, formatTime } from './pickleballDisplay.js'

// Track B Phase 3 — Courts, label-only (no date/time slots, no conflict
// detection — there's no time dimension to conflict over in this scope).
// Courts/matches.court_id already existed from migration 005; this is UI +
// thin DB wrappers only, no new schema.
export default function PickleballScheduleTab({ tournament }) {
  const { isSuperAdmin } = useAuth()
  const { addCourt, removeCourt, assignMatchCourt } = usePickleball()
  const [newLabel, setNewLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const courts  = tournament.courts ?? []
  const matches = tournament.matches ?? []

  const handleAddCourt = async (e) => {
    e.preventDefault()
    if (!newLabel.trim()) return
    setBusy(true); setError(null)
    try {
      await addCourt(tournament.id, newLabel.trim())
      setNewLabel('')
    } catch (err) {
      setError(err?.message ?? 'Failed to add court.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveCourt = async (id) => {
    setBusy(true); setError(null)
    try { await removeCourt(id) } catch (err) { setError(err?.message ?? 'Failed to remove court.') }
    finally { setBusy(false) }
  }

  const handleAssign = async (matchId, courtId) => {
    setBusy(true); setError(null)
    try { await assignMatchCourt(matchId, courtId || null) } catch (err) { setError(err?.message ?? 'Failed to assign court.') }
    finally { setBusy(false) }
  }

  return (
    <div>
      {isSuperAdmin && (
        <div className="pb-admin-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <form onSubmit={handleAddCourt} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="pb-input"
              placeholder="Court label (e.g. Court 3)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              disabled={busy}
              style={{ maxWidth: 220 }}
            />
            <button className="pb-btn-primary" type="submit" disabled={busy || !newLabel.trim()}>+ Add Court</button>
            {courts.map(c => (
              <span key={c.id} className="pb-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {c.label}
                <button
                  className="pb-btn-small pb-btn-small--ghost"
                  style={{ padding: '0 6px' }}
                  onClick={() => handleRemoveCourt(c.id)}
                  disabled={busy}
                  aria-label={`Remove ${c.label}`}
                >×</button>
              </span>
            ))}
          </form>
          {error && <div className="pb-error-list"><div>{error}</div></div>}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">📅</div>
          <div className="pb-state-title">No matches yet</div>
          <div className="pb-state-sub">Court assignments will appear here once matches exist.</div>
        </div>
      ) : (
        <>
          {courts.map(court => {
            const rows = matches.filter(m => m.courtId === court.id)
            if (!rows.length) return null
            return (
              <div className="pb-schedule-group" key={court.id}>
                <div className="pb-schedule-group-title">{court.label}</div>
                {rows.map(m => (
                  <div className="pb-schedule-row" key={m.id}>
                    <span>{entrantLabel(m.entrant1)} vs {entrantLabel(m.entrant2)}</span>
                    {isSuperAdmin ? (
                      <select
                        className="pb-select"
                        value={m.courtId ?? ''}
                        onChange={e => handleAssign(m.id, e.target.value)}
                        disabled={busy}
                        aria-label="Assign court"
                      >
                        <option value="">Unassigned</option>
                        {courts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {m.scheduledAt ? `${formatDate(m.scheduledAt)} · ${formatTime(m.scheduledAt)}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}

          {(() => {
            const unscheduled = matches.filter(m => !m.courtId)
            if (!unscheduled.length) return null
            return (
              <div className="pb-schedule-group">
                <div className="pb-schedule-group-title">Not Yet Assigned to a Court</div>
                {unscheduled.map(m => (
                  <div className="pb-schedule-row" key={m.id}>
                    <span>{entrantLabel(m.entrant1)} vs {entrantLabel(m.entrant2)}</span>
                    {isSuperAdmin ? (
                      <select
                        className="pb-select"
                        value=""
                        onChange={e => handleAssign(m.id, e.target.value)}
                        disabled={busy || courts.length === 0}
                        aria-label="Assign court"
                      >
                        <option value="">Unassigned</option>
                        {courts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Court TBD</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
