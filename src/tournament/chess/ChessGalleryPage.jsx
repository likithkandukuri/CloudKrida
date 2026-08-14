import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { fetchTournament, fetchEvent } from '../services/db.js'
import GalleryView from './GalleryView.jsx'
import './Chess.css'
import '../pages/CompletedTournaments.css'

function fmtDate(d) {
  if (!d) return null
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Bookmarkable, standalone gallery route for a single Chess tournament —
// reached from the Completed Tournaments archive. Deliberately NOT wrapped
// in ChessProvider/the Chess app shell: it only reads one tournament's
// existing data via the existing fetchTournament()/fetchEvent() functions
// and renders the existing GalleryView component unmodified, so it can't
// affect the in-app Chess experience (bracket, pairings, standings, admin).
export default function ChessGalleryPage() {
  const { tournamentId } = useParams()
  const { canUploadPhotos, canDeletePhotos, userId, role } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [event,      setEvent]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  usePageMeta({
    title:       'Tournament Gallery — Cloud Krida',
    description: 'Photos and videos from a completed Cloud Krida chess tournament.',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setEvent(null)

    fetchTournament(tournamentId)
      .then(async t => {
        if (cancelled) return
        if (!t) { setNotFound(true); setLoading(false); return }
        setTournament(t)
        if (t.eventId) {
          const ev = await fetchEvent(t.eventId)
          if (!cancelled) setEvent(ev)
        }
        if (!cancelled) setLoading(false)
      })
      .catch(err => {
        console.error('[Krida] ChessGalleryPage load:', err)
        if (!cancelled) { setNotFound(true); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [tournamentId])

  const title     = event ? `${event.name} — ${tournament?.name}` : tournament?.name
  const dateLabel = fmtDate(event?.date)

  return (
    <div className="ct-page">
      <GlobalNav />
      <Breadcrumb trail={[
        { label: 'Tournament Management', path: '/tournaments' },
        { label: 'Completed Tournaments', path: '/tournaments/completed' },
        { label: loading ? 'Gallery' : (title ?? 'Gallery') },
      ]} />

      <div className="ct-content" style={{ paddingTop: 150 }}>
        {loading ? (
          <div className="ct-state" role="status" aria-live="polite">
            <div className="ct-spinner" />
            <div className="ct-state-sub">Loading tournament gallery…</div>
          </div>
        ) : notFound ? (
          <div className="ct-state">
            <div className="ct-state-icon">🔍</div>
            <div className="ct-state-title">Tournament not found</div>
            <div className="ct-state-sub">This tournament may have been removed.</div>
            <Link to="/tournaments/completed" className="chess-btn-gold" style={{ marginTop: 20 }}>
              ← Back to Completed Tournaments
            </Link>
          </div>
        ) : (
          <>
            <div className="chess-section-head" style={{ marginBottom: 24 }}>
              <div className="chess-eyebrow">CHESS · COMPLETED</div>
              <h2 className="chess-heading">{title}</h2>
              {dateLabel && <p className="chess-subhead">📅 {dateLabel}</p>}
            </div>
            <div className="chess-section">
              <GalleryView
                gallery={tournament.gallery ?? []}
                tournamentId={tournament.id}
                canUpload={canUploadPhotos}
                canDelete={canDeletePhotos}
                currentUserId={userId}
                currentUserRole={role}
              />
            </div>
          </>
        )}
      </div>

      <GlobalFooter />
    </div>
  )
}
