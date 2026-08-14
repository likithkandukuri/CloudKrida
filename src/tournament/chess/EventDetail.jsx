import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChess } from './ChessContext.jsx'
import { computeStandings } from './pointsUtils.js'
import { removePlayerFromPairing } from './utils.js'
import { uploadBrochureFile, removeBrochureFile } from '../services/upcomingEvents.js'
import PointsTournament from './PointsTournament.jsx'
import BracketView from './BracketView.jsx'
import DisplayMode from './DisplayMode.jsx'
import EventDisplay from './EventDisplay.jsx'

const BROCHURE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

// Superadmin-only brochure attach/replace/remove for a Chess event — the one
// admin surface this feature needs on the existing event-management page.
// Storage upload uses the shared uploadBrochureFile()/removeBrochureFile()
// helpers (services/upcomingEvents.js); persisting the URL reuses the
// existing updateEvent() context method (already whitelist-extended for the
// new brochure_* columns in db.js) rather than adding a new write path.
function EventBrochureControl({ event, onUpdate }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!BROCHURE_TYPES.includes(file.type)) { setError('Use JPG, PNG, WEBP, or PDF.'); return }
    setUploading(true)
    setError(null)
    try {
      const brochure = await uploadBrochureFile(event.id, file)
      await onUpdate(event.id, brochure)
    } catch (err) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove this brochure?')) return
    await removeBrochureFile(event.brochurePath)
    await onUpdate(event.id, { brochurePath: null, brochureUrl: null, brochureUploadedAt: null })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
      <input
        ref={fileRef}
        type="file"
        accept={BROCHURE_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {event.brochureUrl ? (
        <>
          <a href={event.brochureUrl} target="_blank" rel="noopener noreferrer" className="topbar-btn" style={{ fontSize: 12 }}>
            📄 View Brochure
          </a>
          <button className="topbar-btn" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
          <button className="topbar-btn" style={{ fontSize: 12, color: 'var(--cc-warn)' }} onClick={handleRemove}>
            Remove
          </button>
        </>
      ) : (
        <button className="topbar-btn topbar-btn--gold" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '📄 Add Brochure'}
        </button>
      )}
      {error && <span style={{ fontSize: 12, color: 'var(--cc-warn)' }}>{error}</span>}
    </div>
  )
}

const SECTION_ORDER = [
  'Kindergarten - 2nd Grade',
  '3rd Grade - 5th Grade',
  '6th Grade - 12th Grade',
  'Adults',
]

function sectionSort(a, b) {
  const ai = SECTION_ORDER.indexOf(a.name)
  const bi = SECTION_ORDER.indexOf(b.name)
  if (ai >= 0 && bi >= 0) return ai - bi
  if (ai >= 0) return -1
  if (bi >= 0) return 1
  return (a.eventOrder ?? 0) - (b.eventOrder ?? 0)
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function EventDetail({ event, isSuperAdmin, canUploadPhotos, canDeletePhotos, canViewPrivate, currentUserId = null, currentUserRole = null }) {
  const {
    tournaments,
    activeTournamentId, setActiveTournamentId,
    activeTournament,
    updateTournament,
    updateEvent,
  } = useChess()

  const [sectionDisplayOpen, setSectionDisplayOpen] = useState(false)
  const [eventDisplayOpen,   setEventDisplayOpen]   = useState(false)

  const sections = tournaments
    .filter(t => t.eventId === event.id)
    .sort(sectionSort)

  // Auto-select first section when event opens or sections list changes
  useEffect(() => {
    if (sections.length === 0) return
    const alreadyInEvent = sections.some(s => s.id === activeTournamentId)
    if (!alreadyInEvent) {
      setActiveTournamentId(sections[0].id)
    }
  }, [event.id]) // only re-run when event changes, not on every section load

  const activeSectionMeta   = sections.find(s => s.id === activeTournamentId)
  const sectionFullyLoaded  = activeTournament?.id === activeTournamentId &&
                              activeTournament?.eventId === event.id &&
                              (activeTournament.players.length > 0 || activeTournament.matches.length > 0)

  const handleMatchesUpdate = (updatedMatches) => {
    if (activeTournamentId) updateTournament(activeTournamentId, { matches: updatedMatches })
  }

  const handleRemovePlayer = (playerName) => {
    if (!activeTournament) return
    const updatedMatches = removePlayerFromPairing(activeTournament.matches, playerName)
    const updatedPlayers = activeTournament.players.filter(p => p.name !== playerName)
    updateTournament(activeTournamentId, { matches: updatedMatches, players: updatedPlayers })
  }

  return (
    <div className="chess-section event-detail">

      {/* Event header */}
      <div className="event-detail-header">
        <div className="chess-eyebrow">Chess Event</div>
        <h2 className="chess-heading" style={{ marginBottom: 6 }}>{event.name}</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {event.date && (
            <span style={{ fontSize: 13, color: 'var(--cc-sub)' }}>📅 {fmtDate(event.date)}</span>
          )}
          {event.location && (
            <span style={{ fontSize: 13, color: 'var(--cc-sub)' }}>📍 {event.location}</span>
          )}
          <span style={{ fontSize: 13, color: 'var(--cc-muted)' }}>
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isSuperAdmin && (
          <EventBrochureControl event={event} onUpdate={(id, partial) => updateEvent(id, partial)} />
        )}
      </div>

      {/* Section tabs + Event Display button */}
      <div className="event-section-bar">
        <div className="event-section-tabs">
          {sections.map(s => (
            <button
              key={s.id}
              className={`event-section-tab${activeTournamentId === s.id ? ' active' : ''}`}
              onClick={() => setActiveTournamentId(s.id)}
            >
              ♟ {s.name}
            </button>
          ))}
        </div>

        <button
          className="topbar-btn topbar-btn--gold"
          onClick={() => setEventDisplayOpen(true)}
          style={{ flexShrink: 0, fontSize: 12 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          Event Display
        </button>
      </div>

      {/* No sections state */}
      {sections.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">♟</div>
          <div className="empty-state-title">No sections yet</div>
          <div className="empty-state-sub">Import a CSV to add sections to this event.</div>
        </div>
      )}

      {/* Section content */}
      <AnimatePresence mode="wait">
        {activeSectionMeta && sectionFullyLoaded && (
          <motion.div
            key={activeTournamentId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTournament.format === 'points_tournament' ? (
              <PointsTournament
                tournament={activeTournament}
                playerFields={activeTournament.playerFields}
                onUpdate={isSuperAdmin ? (partial) => updateTournament(activeTournamentId, partial) : null}
                tournamentId={activeTournamentId}
                canUpload={canUploadPhotos}
                canDelete={canDeletePhotos}
                canViewPrivate={canViewPrivate}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onDisplay={() => setSectionDisplayOpen(true)}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <BracketView
                matches={activeTournament.matches}
                players={activeTournament.players}
                totalRounds={activeTournament.totalRounds}
                meta={{ name: activeTournament.name, format: activeTournament.format }}
                playerFields={activeTournament.playerFields}
                gallery={activeTournament.gallery ?? []}
                onUpdate={isSuperAdmin ? handleMatchesUpdate : null}
                onRemovePlayer={isSuperAdmin ? handleRemovePlayer : null}
                tournamentId={activeTournamentId}
                canUpload={canUploadPhotos}
                canDelete={canDeletePhotos}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onDisplay={() => setSectionDisplayOpen(true)}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </motion.div>
        )}

        {/* Loading while section data is fetching */}
        {activeSectionMeta && !sectionFullyLoaded && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '80px 0' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⌛</div>
            <div style={{ fontSize: 15, color: 'var(--cc-sub)' }}>Loading section…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section-level DisplayMode */}
      <AnimatePresence>
        {sectionDisplayOpen && activeTournament && (
          <DisplayMode
            matches={activeTournament.matches}
            totalRounds={activeTournament.totalRounds}
            meta={{ name: activeTournament.name, format: activeTournament.format }}
            playerFields={activeTournament.playerFields}
            standings={
              activeTournament.format === 'points_tournament'
                ? computeStandings(activeTournament.players, activeTournament.matches)
                : null
            }
            onClose={() => setSectionDisplayOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Full-event EventDisplay */}
      <AnimatePresence>
        {eventDisplayOpen && (
          <EventDisplay event={event} onClose={() => setEventDisplayOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
