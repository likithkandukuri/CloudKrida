import { useState, useEffect } from 'react'
import {
  createUpcomingEvent, updateUpcomingEvent, uploadBrochureFile,
} from '../services/upcomingEvents.js'
import { fetchEventList } from '../services/db.js'
import { fetchPickleballTournamentList } from '../services/pickleballDb.js'

const SPORTS = ['chess', 'pickleball', 'tennis', 'darts']
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB — flyers are small images/PDFs, not video

// Superadmin-only creation form for an "upcoming_events" announcement — the
// one new admin surface this feature needs, since nothing else in the app
// can represent an event before its real tournament/event row exists.
export default function AddUpcomingEventModal({ onClose, onCreated }) {
  const [sport,       setSport]       = useState('chess')
  const [name,        setName]        = useState('')
  const [date,        setDate]        = useState('')
  const [location,    setLocation]    = useState('')
  const [description, setDescription] = useState('')
  const [file,         setFile]         = useState(null)
  const [linkedEventId, setLinkedEventId] = useState('')
  const [linkedPbId,    setLinkedPbId]    = useState('')
  const [chessEvents,   setChessEvents]   = useState([])
  const [pbTournaments, setPbTournaments] = useState([])
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEventList().then(setChessEvents).catch(() => {})
    fetchPickleballTournamentList().then(setPbTournaments).catch(() => {})
  }, [])

  const handleFile = (f) => {
    if (!f) { setFile(null); return }
    if (!ACCEPTED_TYPES.includes(f.type)) { setError('Unsupported file type. Use JPG, PNG, WEBP, or PDF.'); return }
    if (f.size > MAX_BYTES) { setError('File is too large (max 20 MB).'); return }
    setError(null)
    setFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Event name is required.'); return }
    setBusy(true)
    setError(null)
    try {
      const ev = await createUpcomingEvent({
        sport, name: name.trim(), date: date || null, location, description,
        linkedEventId:                sport === 'chess'      && linkedEventId ? linkedEventId : null,
        linkedPickleballTournamentId: sport === 'pickleball'  && linkedPbId    ? linkedPbId    : null,
      })
      if (file) {
        const brochure = await uploadBrochureFile(ev.id, file)
        await updateUpcomingEvent(ev.id, brochure)
      }
      onCreated()
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Failed to create event. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ue-modal-overlay" onClick={onClose}>
      <div className="ue-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add upcoming event">
        <div className="ue-modal-head">
          <h3>Add Upcoming Event</h3>
          <button className="ue-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="ue-modal-form">
          <div className="ue-field">
            <label className="ue-label">Sport</label>
            <select className="ue-input" value={sport} onChange={e => setSport(e.target.value)}>
              {SPORTS.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div className="ue-field">
            <label className="ue-label">Event Name</label>
            <input
              className="ue-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Albany Telugu Association Pickleball Tournament"
            />
          </div>

          <div className="ue-field-row">
            <div className="ue-field">
              <label className="ue-label">Date</label>
              <input className="ue-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="ue-field">
              <label className="ue-label">Location</label>
              <input
                className="ue-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Venue, City, State"
              />
            </div>
          </div>

          <div className="ue-field">
            <label className="ue-label">Description (optional)</label>
            <textarea
              className="ue-input ue-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra details worth surfacing"
            />
          </div>

          <div className="ue-field">
            <label className="ue-label">Brochure (image or PDF, optional)</label>
            <input
              className="ue-input"
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && <div className="ue-file-name">{file.name}</div>}
          </div>

          {sport === 'chess' && chessEvents.length > 0 && (
            <div className="ue-field">
              <label className="ue-label">Link to an existing Chess event (optional)</label>
              <select className="ue-input" value={linkedEventId} onChange={e => setLinkedEventId(e.target.value)}>
                <option value="">— Not linked —</option>
                {chessEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <div className="ue-hint">Once linked, this announcement disappears automatically when that event is fully complete.</div>
            </div>
          )}
          {sport === 'pickleball' && pbTournaments.length > 0 && (
            <div className="ue-field">
              <label className="ue-label">Link to an existing Pickleball tournament (optional)</label>
              <select className="ue-input" value={linkedPbId} onChange={e => setLinkedPbId(e.target.value)}>
                <option value="">— Not linked —</option>
                {pbTournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="ue-hint">Once linked, this announcement disappears automatically when that tournament is marked complete.</div>
            </div>
          )}

          {error && <div className="ue-error">{error}</div>}

          <div className="ue-modal-actions">
            <button type="button" className="ue-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="ue-btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
