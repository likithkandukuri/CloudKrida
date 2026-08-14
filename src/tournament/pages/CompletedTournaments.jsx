import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { fetchCompletedTournaments } from '../services/completedTournaments.js'
import './CompletedTournaments.css'

// No shared --sport-chess token exists anywhere in the app (confirmed) —
// #d4a336 is the same literal TournamentsHub.jsx's own GAMES array already
// uses for Chess's accent, kept consistent here rather than inventing a
// second value.
const SPORT_META = {
  chess:      { label: 'Chess',      glyph: '♛',  accent: '#d4a336' },
  pickleball: { label: 'Pickleball', glyph: '🏓', accent: 'var(--sport-pickleball)' },
}

function fmtDate(d) {
  if (!d) return null
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CompletedTournamentCard({ item, index }) {
  const meta      = SPORT_META[item.sport] ?? { label: item.sport, glyph: '🏆', accent: '#8892b0' }
  const dateLabel = fmtDate(item.date)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.42), ease: [0.16, 1, 0.3, 1] }}
    >
      {/* The whole card is one Link — cover image, title, badges, and the
          "View Gallery" CTA are all visual content inside it, not separate
          interactive elements, so the entire surface is clickable. */}
      <Link to={item.galleryPath} className="ct-card" style={{ '--ct-accent': meta.accent }}>
        <div className="ct-card-cover">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt="" loading="lazy" />
          ) : (
            <div className="ct-card-cover-fallback"><span>{meta.glyph}</span></div>
          )}
          <div className="ct-card-cover-shade" />
          <span className="ct-card-sport-badge">{meta.glyph} {meta.label}</span>
          <span className="ct-card-status-pill">✓ Completed</span>
        </div>

        <div className="ct-card-body">
          <h3 className="ct-card-title">{item.title}</h3>

          {(item.category || dateLabel) && (
            <div className="ct-card-meta">
              {item.category && <span className="ct-card-chip">{item.category}</span>}
              {dateLabel && <span className="ct-card-date">📅 {dateLabel}</span>}
            </div>
          )}

          <div className="ct-card-footer">
            <span className="ct-card-photos">
              📸 {item.photoCount > 0 ? `${item.photoCount} photo${item.photoCount !== 1 ? 's' : ''}` : 'No photos yet'}
            </span>
            <span className="ct-card-cta">
              View Gallery
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function CompletedTournaments() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  usePageMeta({
    title: 'Completed Tournaments — Cloud Krida',
    description: 'Browse completed Chess and Pickleball tournaments on Cloud Krida and revisit their photo galleries.',
  })

  useEffect(() => {
    let cancelled = false
    fetchCompletedTournaments()
      .then(list => { if (!cancelled) setItems(list) })
      .catch(err => { if (!cancelled) { console.error('[Krida] fetchCompletedTournaments:', err); setError(err) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="ct-page">
      <div className="ct-bg-layer" aria-hidden="true">
        <div className="ct-orb ct-orb-a" />
        <div className="ct-orb ct-orb-b" />
        <div className="ct-vignette" />
      </div>

      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Completed Tournaments' }]} />

      <section className="ct-hero">
        <span className="ct-eyebrow">TOURNAMENT ARCHIVE</span>
        <h1 className="ct-title">Completed Tournaments</h1>
        <p className="ct-subtitle">
          Every finished Cloud Krida tournament, with its photos and memories, all in one place.
        </p>
      </section>

      <section className="ct-content">
        {loading ? (
          <div className="ct-state" role="status" aria-live="polite">
            <div className="ct-spinner" />
            <div className="ct-state-sub">Loading completed tournaments…</div>
          </div>
        ) : error ? (
          <div className="ct-state" role="alert">
            <div className="ct-state-icon">⚠</div>
            <div className="ct-state-title">Couldn't load completed tournaments</div>
            <div className="ct-state-sub">Check your connection and refresh the page.</div>
          </div>
        ) : items.length === 0 ? (
          <div className="ct-state">
            <div className="ct-state-icon">🏆</div>
            <div className="ct-state-title">No completed tournaments yet</div>
            <div className="ct-state-sub">Finished tournaments will be showcased here once they wrap up.</div>
          </div>
        ) : (
          <div className="ct-grid">
            {items.map((item, i) => <CompletedTournamentCard key={item.id} item={item} index={i} />)}
          </div>
        )}
      </section>

      <GlobalFooter />
    </div>
  )
}
