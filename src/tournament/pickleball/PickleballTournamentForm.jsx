import { useState } from 'react'
import {
  EVENT_TYPES, FORMATS, STATUSES, GAMES_TO_OPTIONS, BEST_OF_OPTIONS, validateTournamentConfig,
} from './pickleballValidation.js'
import { EVENT_TYPE_LABELS, FORMAT_LABELS, STATUS_LABELS } from './pickleballDisplay.js'

const BLANK = {
  name: '', date: '', location: '', description: '',
  eventType: 'singles', format: 'pool_to_single_elim', status: 'registration_open',
  skillDivision: '', ageBand: '', gamesTo: 11, winBy2: true, bestOf: 3,
  poolSize: 4, courtCount: 4,
}

export default function PickleballTournamentForm({ initial, onSubmit, onCancel }) {
  const [data, setData]   = useState(initial ? { ...BLANK, ...initial } : BLANK)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const isEdit = !!initial

  const set = (key, value) => setData(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validateTournamentConfig(data)
    if (validationErrors.length) { setErrors(validationErrors); return }
    setErrors([])
    setSaving(true)
    try {
      await onSubmit(data)
    } catch (err) {
      setErrors([err?.message ?? 'Something went wrong saving the tournament. Please try again.'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pb-form" onSubmit={handleSubmit}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
        {isEdit ? 'Edit Tournament' : 'Create Tournament'}
      </div>

      {errors.length > 0 && (
        <div className="pb-error-list">
          <strong>Please fix the following:</strong>
          <ul>{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="pb-form-grid">
        <div className="pb-field" style={{ gridColumn: '1 / -1' }}>
          <label className="pb-field-label">Tournament Name</label>
          <input className="pb-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="Spring Open" />
        </div>

        <div className="pb-field">
          <label className="pb-field-label">Date</label>
          <input className="pb-input" type="date" value={data.date ?? ''} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Location</label>
          <input className="pb-input" value={data.location} onChange={e => set('location', e.target.value)} placeholder="Riverside Park" />
        </div>

        <div className="pb-field" style={{ gridColumn: '1 / -1' }}>
          <label className="pb-field-label">Description</label>
          <textarea className="pb-textarea" value={data.description} onChange={e => set('description', e.target.value)} placeholder="Optional details for players and spectators" />
        </div>

        <div className="pb-field">
          <label className="pb-field-label">Event Type</label>
          <select className="pb-select" value={data.eventType} onChange={e => set('eventType', e.target.value)}>
            {EVENT_TYPES.map(v => <option key={v} value={v}>{EVENT_TYPE_LABELS[v]}</option>)}
          </select>
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Format</label>
          <select className="pb-select" value={data.format} onChange={e => set('format', e.target.value)}>
            {FORMATS.map(v => <option key={v} value={v}>{FORMAT_LABELS[v]}</option>)}
          </select>
        </div>
        {isEdit && (
          <div className="pb-field">
            <label className="pb-field-label">Status</label>
            <select className="pb-select" value={data.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(v => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
            </select>
          </div>
        )}

        <div className="pb-field">
          <label className="pb-field-label">Skill Division</label>
          <input className="pb-input" value={data.skillDivision ?? ''} onChange={e => set('skillDivision', e.target.value)} placeholder="3.5, Open, …" />
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Age Band</label>
          <input className="pb-input" value={data.ageBand ?? ''} onChange={e => set('ageBand', e.target.value)} placeholder="Open, 35+, …" />
        </div>

        <div className="pb-field">
          <label className="pb-field-label">Games To</label>
          <select className="pb-select" value={data.gamesTo} onChange={e => set('gamesTo', Number(e.target.value))}>
            {GAMES_TO_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Best Of</label>
          <select className="pb-select" value={data.bestOf} onChange={e => set('bestOf', Number(e.target.value))}>
            {BEST_OF_OPTIONS.map(v => <option key={v} value={v}>{v} game{v > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div className="pb-field" style={{ justifyContent: 'flex-end' }}>
          <label className="pb-checkbox-row">
            <input type="checkbox" checked={data.winBy2} onChange={e => set('winBy2', e.target.checked)} />
            Win by 2
          </label>
        </div>

        <div className="pb-field">
          <label className="pb-field-label">Pool Size</label>
          <input className="pb-input" type="number" min="2" value={data.poolSize ?? ''} onChange={e => set('poolSize', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div className="pb-field">
          <label className="pb-field-label">Court Count</label>
          <input className="pb-input" type="number" min="1" value={data.courtCount ?? ''} onChange={e => set('courtCount', e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>

      <div className="pb-form-actions">
        <button type="submit" className="pb-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tournament'}
        </button>
        <button type="button" className="pb-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  )
}
