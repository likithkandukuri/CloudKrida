import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { fetchCompletedTournaments } from '../services/completedTournaments.js'
import { fetchUpcomingEvents } from '../services/upcomingEvents.js'
import CompletedTournamentCard, { SPORT_META, fmtEventDate } from '../components/CompletedTournamentCard.jsx'
import AddUpcomingEventModal from '../components/AddUpcomingEventModal.jsx'
import './CompletedTournaments.css'
import './TournamentsHub.css'

// ── Game data ────────────────────────────────────────────────────────────────
const GAMES = [
  {
    id: 'chess',
    name: 'Chess',
    tag: 'STRATEGY',
    description: 'Outwit opponents in high-stakes chess tournaments with real-time match tracking and ELO rankings.',
    path: '/tournaments/chess',
    accent: '#5b7cff',
    accentSoft: 'rgba(91, 124, 255, 0.18)',
    glow: 'rgba(91, 124, 255, 0.28)',
    gradient: 'linear-gradient(160deg, #05070f 0%, #10143a 60%, #05070f 100%)',
    stats: { tournaments: 8, players: 24 },
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    tag: 'NEW',
    description: 'Singles, doubles, and mixed doubles tournaments with pool play, brackets, and live standings.',
    path: '/tournaments/pickleball',
    accent: '#2dd4bf',
    accentSoft: 'rgba(45, 212, 191, 0.15)',
    glow: 'rgba(45, 212, 191, 0.28)',
    gradient: 'linear-gradient(160deg, #001411 0%, #002e28 60%, #001411 100%)',
    stats: { tournaments: 0, players: 0 },
  },
  {
    id: 'tennis',
    name: 'Tennis',
    tag: 'SPORTS',
    description: 'Track sets, games, and points in professional-style tennis tournaments with live score feeds.',
    path: '/tournaments/tennis',
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.15)',
    glow: 'rgba(74, 222, 128, 0.28)',
    gradient: 'linear-gradient(160deg, #00150a 0%, #002e14 60%, #00150a 100%)',
    stats: { tournaments: 3, players: 16 },
  },
  // Darts intentionally omitted from the sport-card grid (frontend stub,
  // zero backend data — nothing deleted, just not shown here). Its route,
  // stub page, and footer link are untouched.
]

// ── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ── Chess Art ────────────────────────────────────────────────────────────────
function ChessArt() {
  return (
    <div className="art chess-art">
      <div className="chess-board">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={`chess-cell ${(Math.floor(i / 4) + i) % 2 === 0 ? 'light' : 'dark'}`} />
        ))}
      </div>
      <div className="chess-piece-wrap">
        <span className="chess-piece">♛</span>
        <div className="chess-piece-glow" />
      </div>
    </div>
  )
}

// ── Tennis Art ───────────────────────────────────────────────────────────────
function TennisArt() {
  return (
    <div className="art tennis-art">
      <div className="court">
        <div className="court-line court-outer" />
        <div className="court-line court-mid" />
        <div className="court-line court-service-left" />
        <div className="court-line court-service-right" />
        <div className="court-net" />
      </div>
      <div className="tennis-ball-wrap">
        <div className="tennis-ball">
          <div className="ball-curve top" />
          <div className="ball-curve bottom" />
        </div>
        <div className="tennis-glow" />
      </div>
    </div>
  )
}

// ── Darts Art ────────────────────────────────────────────────────────────────
function DartsArt() {
  const rings = [
    { size: 200, color: '#1a0505' },
    { size: 166, color: '#8B1010' },
    { size: 132, color: '#1a0505' },
    { size: 100, color: '#8B1010' },
    { size: 68,  color: '#006400' },
    { size: 36,  color: '#8B1010' },
    { size: 16,  color: '#006400' },
  ]
  return (
    <div className="art darts-art">
      <div className="dartboard">
        {rings.map((r, i) => (
          <div
            key={i}
            className="ring"
            style={{ width: r.size, height: r.size, background: r.color }}
          />
        ))}
        <div className="bullseye-dot" />
      </div>
      <div className="dart-pin" />
      <div className="darts-glow" />
    </div>
  )
}

// ── Pickleball Art ───────────────────────────────────────────────────────────
function PickleballArt() {
  return (
    <div className="art pickleball-art">
      <div className="pb-hub-court">
        <div className="pb-hub-court-line pb-hub-court-outer" />
        <div className="pb-hub-court-line pb-hub-court-net" />
        <div className="pb-hub-court-line pb-hub-court-kitchen-top" />
        <div className="pb-hub-court-line pb-hub-court-kitchen-bottom" />
      </div>
      <div className="pb-hub-paddle-wrap">
        <div className="pb-hub-paddle">
          <div className="pb-hub-paddle-head" />
          <div className="pb-hub-paddle-handle" />
        </div>
        <div className="pb-hub-ball" />
        <div className="pb-hub-glow" />
      </div>
    </div>
  )
}

const ART = { chess: ChessArt, tennis: TennisArt, darts: DartsArt, pickleball: PickleballArt }

// ── GameCard ─────────────────────────────────────────────────────────────────
function GameCard({ game, index }) {
  const navigate = useNavigate()
  const cardRef  = useRef(null)
  const [tilt,    setTilt]    = useState({ x: 0, y: 0 })
  const [mouse,   setMouse]   = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)

  const onMouseMove = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    setTilt({
      x: -((y - r.height / 2) / (r.height / 2)) * 10,
      y:  ((x - r.width  / 2) / (r.width  / 2)) * 10,
    })
    setMouse({ x: (x / r.width) * 100, y: (y / r.height) * 100 })
  }, [])

  const onMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
    setMouse({ x: 50, y: 50 })
    setHovered(false)
  }, [])

  const Art = ART[game.id]

  return (
    <motion.div
      ref={cardRef}
      className={`game-card game-card--${game.id}`}
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.03 : 1})`,
        '--accent':      game.accent,
        '--glow':        game.glow,
        '--accent-soft': game.accentSoft,
        '--mouse-x':    `${mouse.x}%`,
        '--mouse-y':    `${mouse.y}%`,
      }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      onClick={() => navigate(game.path)}
    >
      <div className="card-shimmer" style={{ opacity: hovered ? 1 : 0 }} />

      <div className="card-visual" style={{ background: game.gradient }}>
        <Art />
      </div>

      <div className="card-info">
        <span className="card-tag" style={{ color: game.accent, borderColor: game.accentSoft, background: game.accentSoft }}>
          {game.tag}
        </span>
        <h3 className="card-name">{game.name}</h3>
        <p className="card-desc">{game.description}</p>

        <div className="card-footer">
          <div className="card-stats">
            <span>{game.stats.tournaments} tournaments</span>
            <span className="dot">·</span>
            <span>{game.stats.players} players</span>
          </div>
          <button className="card-btn">
            Play Now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="card-border-glow" style={{ opacity: hovered ? 1 : 0 }} />
    </motion.div>
  )
}

// ── Upcoming Event Card ──────────────────────────────────────────────────────
// Deliberately reuses the .ct-card* class family from CompletedTournamentCard
// (imported via CompletedTournaments.css above) for visual consistency
// between the two tabs — only the cover treatment and status pill differ.
// Root is a div with role="link" for the same nested-interactive-content
// reason as CompletedTournamentCard: the brochure is the card's one
// destination today, so the whole card opens it, but a future detail link
// could sit alongside without fighting the outer click target.
function UpcomingEventCard({ item, index = 0 }) {
  const meta      = SPORT_META[item.sport] ?? { label: item.sport, glyph: '🏆', accent: '#8892b0' }
  const dateLabel = fmtEventDate(item.date)
  const isPdf     = /\.pdf(\?|$)/i.test(item.brochureUrl ?? '')

  const openBrochure = () => { if (item.brochureUrl) window.open(item.brochureUrl, '_blank', 'noopener,noreferrer') }
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && item.brochureUrl) { e.preventDefault(); openBrochure() }
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
        role={item.brochureUrl ? 'link' : undefined}
        tabIndex={item.brochureUrl ? 0 : undefined}
        aria-label={item.brochureUrl ? `${item.name} — View Brochure` : item.name}
        onClick={item.brochureUrl ? openBrochure : undefined}
        onKeyDown={handleKeyDown}
      >
        <div className="ct-card-cover">
          {item.brochureUrl && !isPdf ? (
            <img src={item.brochureUrl} alt="" loading="lazy" />
          ) : item.brochureUrl && isPdf ? (
            <div className="ue-doc-cover">
              <span className="ue-doc-icon">📄</span>
              <span className="ue-doc-label">PDF Brochure</span>
            </div>
          ) : (
            <div className="ct-card-cover-fallback"><span>{meta.glyph}</span></div>
          )}
          <div className="ct-card-cover-shade" />
          <span className="ct-card-sport-badge">{meta.glyph} {meta.label}</span>
          <span className="ct-card-status-pill ct-card-status-pill--upcoming">📅 Upcoming</span>
        </div>

        <div className="ct-card-body">
          <h3 className="ct-card-title">{item.name}</h3>

          {(dateLabel || item.location) && (
            <div className="ct-card-meta">
              {dateLabel && <span className="ct-card-date">📅 {dateLabel}</span>}
              {item.location && <span className="ct-card-date">📍 {item.location}</span>}
            </div>
          )}

          <div className="ct-card-footer">
            <span className="ct-card-photos">
              {item.brochureUrl ? 'Brochure available' : 'Details coming soon'}
            </span>
            {item.brochureUrl && (
              <span className="ct-card-cta">
                View Brochure
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Small day/month split for the Upcoming Events header's calendar tile —
// same source date as fmtEventDate, just broken into two parts for that
// specific decorative treatment.
function calendarParts(d) {
  if (!d) return null
  const date = new Date(`${d}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day:   date.toLocaleDateString('en-US', { day: 'numeric' }),
  }
}

// ── Upcoming Events Section ──────────────────────────────────────────────────
// Its own major homepage section (not a tab) — sits directly after the hero,
// before Explore Games, per the requested visitor flow. Reuses
// UpcomingEventCard/fetchUpcomingEvents() unmodified; only larger, fewer-
// column card sizing (via the .events-section--upcoming modifier in CSS) to
// make the brochure feel like the section's main visual, not a small tile.
function UpcomingEventsSection() {
  const { isSuperAdmin } = useAuth()
  const [upcoming, setUpcoming] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [addOpen,  setAddOpen]  = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchUpcomingEvents()
      .then(setUpcoming)
      .catch(err => console.error('[Krida] UpcomingEventsSection load:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const preview = upcoming.slice(0, 3)
  const nextDate = calendarParts(preview[0]?.date)

  return (
    <motion.section
      className="events-section events-section--upcoming"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="events-head events-head--upcoming">
        <div className="events-head-text">
          <span className="events-eyebrow">
            <span className="events-eyebrow-dot" />
            UPCOMING EVENTS
          </span>
          <h2 className="events-title">What's Coming Next</h2>
          <p className="events-sub">
            Save the date — here's what Cloud Krida has planned.
          </p>
          {isSuperAdmin && (
            <button className="events-add-btn" onClick={() => setAddOpen(true)}>
              + Add Upcoming Event
            </button>
          )}
        </div>

        {nextDate && (
          <div className="events-calendar-tile" aria-hidden="true">
            <span className="events-calendar-month">{nextDate.month}</span>
            <span className="events-calendar-day">{nextDate.day}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="events-loading"><div className="ct-spinner" /></div>
      ) : preview.length === 0 ? (
        <div className="events-empty">
          No upcoming events announced yet — check back soon.
        </div>
      ) : (
        <div className="events-grid">
          {preview.map((item, i) => <UpcomingEventCard key={item.id} item={item} index={i} />)}
        </div>
      )}

      {addOpen && (
        <AddUpcomingEventModal onClose={() => setAddOpen(false)} onCreated={load} />
      )}
    </motion.section>
  )
}

// ── Completed Events Section ─────────────────────────────────────────────────
// Its own major homepage section, after Explore Games. Reuses the exact
// CompletedTournamentCard + fetchCompletedTournaments() that
// /tournaments/completed already uses — same component, same data, so
// there is no second completed-event system, just a second place it's shown.
function CompletedEventsSection() {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState([])
  const [loading,    setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCompletedTournaments()
      .then(list => { if (!cancelled) setCompleted(list) })
      .catch(err => console.error('[Krida] CompletedEventsSection load:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const preview = completed.slice(0, 3)

  return (
    <motion.section
      className="events-section events-section--completed"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="events-head">
        <div className="events-plaque">
          <span className="events-plaque-corner events-plaque-corner--tl" />
          <span className="events-plaque-corner events-plaque-corner--tr" />
          <span className="events-plaque-corner events-plaque-corner--bl" />
          <span className="events-plaque-corner events-plaque-corner--br" />
          <span className="events-eyebrow">🏆 COMPLETED EVENTS</span>
          <h2 className="events-title">Tournament Memories</h2>
          <p className="events-sub">
            Relive the events Cloud Krida has already hosted — photos and results included.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="events-loading"><div className="ct-spinner" /></div>
      ) : preview.length === 0 ? (
        <div className="events-empty">
          No completed tournaments yet — check back after the next event wraps up.
        </div>
      ) : (
        <div className="events-grid">
          {preview.map((item, i) => <CompletedTournamentCard key={item.id} item={item} index={i} />)}
        </div>
      )}

      {completed.length > 0 && (
        <button className="events-viewall" onClick={() => navigate('/tournaments/completed')}>
          View All Completed Tournaments
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </motion.section>
  )
}

// ── TournamentsHub ───────────────────────────────────────────────────────────
export default function TournamentsHub() {
  usePageMeta({
    title:       'Tournaments — Cloud Krida',
    description: 'Create and manage Chess, Pickleball, and Tennis tournaments with real-time scoring, live brackets, and pool play. Free to explore — no account required.',
  })

  return (
    <div className="home">

      {/* ── Animated background ── */}
      <div className="bg-layer" aria-hidden="true">
        <div className="orb orb-emerald" />
        <div className="orb orb-teal" />
        <div className="orb orb-lime" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Tournament Management' }]} />

      {/* ── Hero — short and sports/event-led, not a software pitch ── */}
      <section className="hero hero--compact">
        <div className="hero-glow" />

        <motion.div
          className="hero-content"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 className="hero-title" variants={fadeUp} custom={0}>
            <span className="hero-title-cloud">Cloud</span>{' '}
            <span className="hero-title-krida">Krida</span>
          </motion.h1>

          <motion.div className="hero-accent-rule" variants={fadeUp} custom={1} />

          <motion.p className="hero-tagline-short" variants={fadeUp} custom={2}>
            Where every game becomes a community moment.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Upcoming Events — first major section after the hero ── */}
      <UpcomingEventsSection />

      {/* ── Explore Games ── */}
      <section className="games-section" id="games">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-eyebrow">🎮 CHOOSE YOUR SPORT</span>
          <h2 className="section-title">Explore Games</h2>
          <p className="section-sub">
            Three disciplines. One unified platform. Infinite competition.
          </p>
        </motion.div>

        <div className="cards-grid">
          {GAMES.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      </section>

      {/* ── Completed Events — after Explore Games ── */}
      <CompletedEventsSection />

      {/* ── Footer ── */}
      <GlobalFooter />
    </div>
  )
}
