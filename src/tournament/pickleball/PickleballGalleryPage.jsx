import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { fetchPickleballTournament } from '../services/pickleballDb.js'
import { formatDate } from './pickleballDisplay.js'
import PickleballGalleryView from './PickleballGalleryView.jsx'
import './Pickleball.css'
import '../pages/CompletedTournaments.css'

// Bookmarkable, standalone gallery route for a single Pickleball tournament
// — reached from the Completed Tournaments archive. Deliberately NOT
// wrapped in PickleballProvider/the Pickleball app shell: it only reads one
// tournament's existing data via fetchPickleballTournament() and renders
// the existing PickleballGalleryView component unmodified, so it can't
// affect the in-app Pickleball experience (pools, bracket, scoring, admin).
export default function PickleballGalleryPage() {
  const { tournamentId } = useParams()
  const { canUploadPhotos, canDeletePhotos, userId, role } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  usePageMeta({
    title:       'Tournament Gallery — Cloud Krida',
    description: 'Photos and videos from a completed Cloud Krida pickleball tournament.',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    fetchPickleballTournament(tournamentId)
      .then(t => {
        if (cancelled) return
        if (!t) { setNotFound(true); setLoading(false); return }
        setTournament(t)
        setLoading(false)
      })
      .catch(err => {
        console.error('[Krida/Pickleball] PickleballGalleryPage load:', err)
        if (!cancelled) { setNotFound(true); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [tournamentId])

  const dateLabel = tournament?.date ? formatDate(new Date(tournament.date).getTime()) : null

  return (
    <div className="ct-page">
      <GlobalNav />
      <Breadcrumb trail={[
        { label: 'Tournament Management', path: '/tournaments' },
        { label: 'Completed Tournaments', path: '/tournaments/completed' },
        { label: loading ? 'Gallery' : (tournament?.name ?? 'Gallery') },
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
            <Link to="/tournaments/completed" className="pb-btn-primary" style={{ marginTop: 20 }}>
              ← Back to Completed Tournaments
            </Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--sport-pickleball)', marginBottom: 6 }}>
                PICKLEBALL · COMPLETED
              </div>
              <div className="pb-detail-title">{tournament.name}</div>
              {dateLabel && <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>📅 {dateLabel}</p>}
            </div>
            <PickleballGalleryView
              tournament={tournament}
              canUpload={canUploadPhotos}
              canDelete={canDeletePhotos}
              currentUserId={userId}
              currentUserRole={role}
            />
          </>
        )}
      </div>

      <GlobalFooter />
    </div>
  )
}
