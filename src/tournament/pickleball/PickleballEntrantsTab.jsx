import { useState } from 'react'
import { usePickleball } from './PickleballContext.jsx'
import PickleballEntrantForm from './PickleballEntrantForm.jsx'
import { validatePoolMove } from './pickleballValidation.js'

export default function PickleballEntrantsTab({ tournament }) {
  const {
    addEntrant, editEntrant, withdrawEntrant, reinstateEntrant, removeEntrant, setEntrantMembers,
    moveEntrantToPool,
  } = usePickleball()
  const [mode, setMode] = useState(null)          // null | 'add' | entrantId being edited
  const [busyId, setBusyId] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
  const [toast, setToast] = useState(null)
  const [moveError, setMoveError] = useState(null)

  const entrants = tournament.entrants ?? []
  const pools = tournament.pools ?? []
  const poolMatches = (tournament.matches ?? []).filter(m => m.phase === 'pool')
  const editingEntrant = mode && mode !== 'add' ? entrants.find(e => e.id === mode) : null
  const poolLabelById = Object.fromEntries(pools.map(p => [p.id, p.label]))

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleAdd = async (data) => {
    await addEntrant({ tournamentId: tournament.id, ...data })
    setMode(null)
    flash('Entrant added.')
  }

  const handleEdit = async (data) => {
    await editEntrant(editingEntrant.id, { displayName: data.displayName, seedOrder: data.seedOrder })
    const currentMemberIds = editingEntrant.members.map(m => m.playerId)
    const changed = JSON.stringify(currentMemberIds) !== JSON.stringify(data.memberPlayerIds)
    if (changed) await setEntrantMembers(editingEntrant.id, data.memberPlayerIds)
    setMode(null)
    flash('Entrant updated.')
  }

  const handleSeedChange = async (entrant, value) => {
    const n = Number(value)
    if (Number.isNaN(n)) return
    setBusyId(entrant.id)
    await editEntrant(entrant.id, { seedOrder: n })
    setBusyId(null)
  }

  const handleWithdrawToggle = async (entrant) => {
    setBusyId(entrant.id)
    if (entrant.status === 'withdrawn') await reinstateEntrant(entrant.id)
    else await withdrawEntrant(entrant.id)
    setBusyId(null)
  }

  const handleRemove = async (entrant) => {
    setBusyId(entrant.id)
    await removeEntrant(entrant.id)
    setBusyId(null)
    setConfirmRemoveId(null)
    flash('Entrant removed.')
  }

  const handleMovePool = async (entrant, targetPoolId) => {
    if (!targetPoolId) return
    setMoveError(null)
    const errors = validatePoolMove(entrant, targetPoolId, poolMatches)
    if (errors.length) { setMoveError(errors[0]); return }
    setBusyId(entrant.id)
    try {
      await moveEntrantToPool(entrant.id, targetPoolId)
      flash('Entrant moved.')
    } catch (err) {
      setMoveError(err?.message ?? 'Failed to move entrant.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {toast && <div className="pb-success-toast">{toast}</div>}
      {moveError && <div className="pb-error-list"><div>{moveError}</div></div>}

      {mode === 'add' && (
        <PickleballEntrantForm
          eventType={tournament.eventType}
          existingEntrants={entrants}
          onSubmit={handleAdd}
          onCancel={() => setMode(null)}
        />
      )}
      {editingEntrant && (
        <PickleballEntrantForm
          eventType={tournament.eventType}
          initial={editingEntrant}
          existingEntrants={entrants}
          onSubmit={handleEdit}
          onCancel={() => setMode(null)}
        />
      )}

      {!mode && (
        <div className="pb-admin-bar">
          <button className="pb-btn-primary" onClick={() => setMode('add')}>+ Add Entrant</button>
        </div>
      )}

      {entrants.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">👥</div>
          <div className="pb-state-title">No entrants yet</div>
          <div className="pb-state-sub">Add the first entrant using the button above.</div>
        </div>
      ) : (
        entrants.map(entrant => (
          <div className={`pb-entrant-row ${entrant.status === 'withdrawn' ? 'pb-entrant-row--withdrawn' : ''}`} key={entrant.id}>
            <div className="pb-entrant-info">
              <div className="pb-entrant-name">
                {entrant.displayName}{entrant.status === 'withdrawn' ? ' (withdrawn)' : ''}
                {entrant.poolId && poolLabelById[entrant.poolId] && (
                  <span className="pb-tag" style={{ marginLeft: 8 }}>{poolLabelById[entrant.poolId]}</span>
                )}
              </div>
              <div className="pb-entrant-sub">{entrant.members.map(m => m.name).join(' & ')}</div>
            </div>
            <div className="pb-entrant-actions">
              <input
                className="pb-seed-input"
                type="number"
                defaultValue={entrant.seedOrder}
                onBlur={e => handleSeedChange(entrant, e.target.value)}
                disabled={busyId === entrant.id}
                aria-label={`Seed for ${entrant.displayName}`}
              />
              {pools.length > 0 && (entrant.poolId ? pools.length > 1 : true) && (
                <select
                  className="pb-select"
                  style={{ fontSize: 12, padding: '4px 6px' }}
                  value=""
                  onChange={e => handleMovePool(entrant, e.target.value)}
                  disabled={busyId === entrant.id}
                  aria-label={entrant.poolId ? `Move ${entrant.displayName} to a different pool` : `Assign ${entrant.displayName} to a pool`}
                >
                  <option value="">{entrant.poolId ? 'Move to Pool…' : 'Assign to Pool…'}</option>
                  {pools.filter(p => p.id !== entrant.poolId).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              )}
              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setMode(entrant.id)} disabled={busyId === entrant.id}>Edit</button>
              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => handleWithdrawToggle(entrant)} disabled={busyId === entrant.id}>
                {entrant.status === 'withdrawn' ? 'Reinstate' : 'Withdraw'}
              </button>
              {confirmRemoveId === entrant.id ? (
                <>
                  <span style={{ fontSize: 12, color: '#f87171' }}>Remove permanently?</span>
                  <button className="pb-btn-danger" onClick={() => handleRemove(entrant)} disabled={busyId === entrant.id}>Yes, remove</button>
                  <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setConfirmRemoveId(null)}>Cancel</button>
                </>
              ) : (
                <button className="pb-btn-danger" onClick={() => setConfirmRemoveId(entrant.id)} disabled={busyId === entrant.id}>Remove</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
