import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// Exported so the homepage Upcoming cards can share the same sport badge
// language.
export const SPORT_META = {
  chess:      { label: 'Chess',      glyph: '♛',  accent: 'var(--sport-chess)' },
  pickleball: { label: 'Pickleball', glyph: '🏓', accent: 'var(--sport-pickleball)' },
  tennis:     { label: 'Tennis',     glyph: '🎾', accent: 'var(--sport-tennis)' },
  darts:      { label: 'Darts',      glyph: '🎯', accent: 'var(--sport-darts)' },
}

export function fmtEventDate(d) {
  if (!d) return null
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Shared between the homepage Events preview and the full
// /tournaments/completed archive page — one implementation, reused, not a
// second competing card system. Root is a div (not a Link/anchor) because a
// real <a> (the brochure pill) needs to live inside it, and interactive
// content can't be validly nested inside an <a> — the div carries its own
// role="link"/keyboard handling instead, so the whole card stays clickable
// and accessible without nested-anchor routing/a11y problems.
export default function CompletedTournamentCard({ item, index = 0 }) {
  const navigate  = useNavigate()
  const meta      = SPORT_META[item.sport] ?? { label: item.sport, glyph: '🏆', accent: '#8892b0' }
  const dateLabel = fmtEventDate(item.date)

  const goToGallery = () => navigate(item.galleryPath)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToGallery() }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.42), ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="ct-card"
        style={{ '--ct-accent': meta.accent }}
        role="link"
        tabIndex={0}
        aria-label={`${item.title} — View Gallery`}
        onClick={goToGallery}
        onKeyDown={handleKeyDown}
      >
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
            <div className="ct-card-footer-actions">
              {item.brochureUrl && (
                <a
                  href={item.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ct-card-brochure-pill"
                  onClick={e => e.stopPropagation()}
                >
                  📄 Brochure
                </a>
              )}
              <span className="ct-card-cta">
                View Gallery
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
