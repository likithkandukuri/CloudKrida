import { useState, useEffect } from 'react'
import PickleballPlayerField from './PickleballPlayerField.jsx'
import { validateEntrantMembership, findDuplicateParticipants } from './pickleballValidation.js'

export default function PickleballEntrantForm({ eventType, initial, existingEntrants, onSubmit, onCancel }) {
  const isDoublesLike = eventType === 'doubles' || eventType === 'mixed_doubles'
  const isEdit = !!initial

  const [member1, setMember1] = useState(
    initial?.members?.[0] ? { playerId: initial.members[0].playerId, name: initial.members[0].name } : { playerId: null, name: '' }
  )
  const [member2, setMember2] = useState(
    initial?.members?.[1] ? { playerId: initial.members[1].playerId, name: initial.members[1].name } : { playerId: null, name: '' }
  )
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '')
  const [nameEdited, setNameEdited]   = useState(!!initial)
  const [seedOrder, setSeedOrder]     = useState(initial?.seedOrder ?? 0)
  const [errors, setErrors]           = useState([])
  const [saving, setSaving]           = useState(false)

  // Auto-suggest a display name from the selected players until the admin edits it directly
  useEffect(() => {
    if (nameEdited) return
    const names = [member1.name, isDoublesLike ? member2.name : null].filter(Boolean)
    setDisplayName(names.join(' / '))
  }, [member1.name, member2.name, isDoublesLike, nameEdited])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const memberIds = [member1.playerId, isDoublesLike ? member2.playerId : null].filter(Boolean)

    const membershipErrors = validateEntrantMembership(eventType, memberIds)
    const dupes = findDuplicateParticipants(existingEntrants, memberIds, initial?.id ?? null)
    const dupErrors = dupes.length ? ['One or more selected players are already registered as a different entrant in this tournament.'] : []
    const nameErrors = displayName.trim() ? [] : ['Entrant display name is required.']

    const allErrors = [...membershipErrors, ...dupErrors, ...nameErrors]
    if (allErrors.length) { setErrors(allErrors); return }
    setErrors([])
    setSaving(true)
    try {
      await onSubmit({ displayName: displayName.trim(), seedOrder: Number(seedOrder) || 0, memberPlayerIds: memberIds })
    } catch (err) {
      setErrors([err?.message ?? 'Something went wrong saving the entrant. Please try again.'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pb-form" onSubmit={handleSubmit}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
        {isEdit ? 'Edit Entrant' : 'Add Entrant'}
      </div>

      {errors.length > 0 && (
        <div className="pb-error-list">
          <ul>{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <PickleballPlayerField label={isDoublesLike ? 'Player 1' : 'Player'} value={member1} onChange={setMember1} />
      {isDoublesLike && (
        <PickleballPlayerField label="Player 2" value={member2} onChange={setMember2} />
      )}

      <div className="pb-form-grid">
        <div className="pb-field">
          <label className="pb-field-label">Entrant Display Name</label>
          <input
            className="pb-input"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setNameEdited(true) }}
            placeholder="Auto-filled from selected players"
          />
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Seed</label>
          <input className="pb-input" type="number" value={seedOrder} onChange={e => setSeedOrder(e.target.value)} />
        </div>
      </div>

      <div className="pb-form-actions">
        <button type="submit" className="pb-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Entrant' : 'Add Entrant'}
        </button>
        <button type="button" className="pb-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  )
}
