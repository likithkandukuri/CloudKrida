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
    accent: '#d4a336',
    accentSoft: 'rgba(212, 163, 54, 0.18)',
    glow: 'rgba(212, 163, 54, 0.28)',
    gradient: 'linear-gradient(160deg, #0d0800 0%, #201000 60%, #0d0800 100%)',
    stats: { tournaments: 8, players: 24 },
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    tag: 'NEW',
    description: 'Singles, doubles, and mixed doubles tournaments with pool play, brackets, and live standings.',
    path: '/tournaments/pickleball',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.28)',
    gradient: 'linear-gradient(160deg, #000a14 0%, #001c2e 60%, #000a14 100%)',
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

// ── ScrollIndicator ──────────────────────────────────────────────────────────
function ScrollIndicator() {
  return (
    <motion.div
      className="scroll-indicator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8, duration: 0.8 }}
    >
      <div className="scroll-mouse">
        <motion.div
          className="scroll-wheel"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <span>Scroll to explore</span>
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

// ── Events Section (homepage's "major secondary feature") ──────────────────
// One cohesive Events experience — Upcoming and Completed as tabs of the
// same section, rather than two separate lists. Completed reuses the exact
// CompletedTournamentCard + fetchCompletedTournaments() the full
// /tournaments/completed archive already uses (no second competing system);
// Upcoming is new (fetchUpcomingEvents()). A capped 3-card preview per tab —
// "View All" only exists for Completed today (Upcoming rarely has more than
// a couple of entries; easy to add a dedicated page later if that changes).
function EventsSection() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [tab,       setTab]       = useState('upcoming')
  const [upcoming,   setUpcoming]   = useState([])
  const [completed,  setCompleted]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [addOpen,    setAddOpen]    = useState(false)

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([fetchUpcomingEvents(), fetchCompletedTournaments()])
      .then(([u, c]) => { setUpcoming(u); setCompleted(c) })
      .catch(err => console.error('[Krida] EventsSection load:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const items   = tab === 'upcoming' ? upcoming : completed
  const preview = items.slice(0, 3)

  return (
    <motion.section
      className="events-section"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="events-head">
        <span className="events-eyebrow">EVENTS</span>
        <h2 className="events-title">Upcoming &amp; Completed Events</h2>
        <p className="events-sub">
          Discover what's coming next, and relive the tournaments we've already hosted.
        </p>
      </div>

      <div className="events-tabbar">
        <div className="events-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'upcoming'}
            className={`events-tab ${tab === 'upcoming' ? 'events-tab--active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            📅 Upcoming <span className="events-tab-count">{upcoming.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'completed'}
            className={`events-tab ${tab === 'completed' ? 'events-tab--active' : ''}`}
            onClick={() => setTab('completed')}
          >
            🏆 Completed <span className="events-tab-count">{completed.length}</span>
          </button>
        </div>

        {isSuperAdmin && tab === 'upcoming' && (
          <button className="events-add-btn" onClick={() => setAddOpen(true)}>
            + Add Upcoming Event
          </button>
        )}
      </div>

      {loading ? (
        <div className="events-loading">
          <div className="ct-spinner" />
        </div>
      ) : preview.length === 0 ? (
        <div className="events-empty">
          {tab === 'upcoming'
            ? 'No upcoming events announced yet.'
            : 'No completed tournaments yet — check back after the next event wraps up.'}
        </div>
      ) : (
        <div className="events-grid">
          {preview.map((item, i) => (
            tab === 'upcoming'
              ? <UpcomingEventCard key={item.id} item={item} index={i} />
              : <CompletedTournamentCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      {tab === 'completed' && completed.length > 0 && (
        <button className="events-viewall" onClick={() => navigate('/tournaments/completed')}>
          View All Completed Tournaments
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {addOpen && (
        <AddUpcomingEventModal onClose={() => setAddOpen(false)} onCreated={loadAll} />
      )}
    </motion.section>
  )
}

// ── StatBadge ────────────────────────────────────────────────────────────────
function StatBadge({ value, label, delay }) {
  return (
    <motion.div
      className="stat-badge"
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </motion.div>
  )
}

// ── TournamentsHub ───────────────────────────────────────────────────────────
export default function TournamentsHub() {
  const navigate = useNavigate()

  usePageMeta({
    title:       'Tournaments — Cloud Krida',
    description: 'Create and manage Chess, Pickleball, and Tennis tournaments with real-time scoring, live brackets, and pool play. Free to explore — no account required.',
  })

  const scrollToGames = () => {
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })
  }

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

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-glow" />

        <motion.div
          className="hero-content"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-badge" variants={fadeUp} custom={0}>
            <span className="badge-dot" />
            Tournament Platform
          </motion.div>

          <motion.h1 className="hero-title" variants={fadeUp} custom={1}>
            Cloud Krida
          </motion.h1>

          <motion.p className="hero-tagline" variants={fadeUp} custom={1.5}>
            <span className="gradient-text">Tournament Management</span>
          </motion.p>

          <motion.p className="hero-subtitle" variants={fadeUp} custom={2}>
            Create tournaments, track scores in real-time, and compete<br className="desktop-br" />
            across Chess, Pickleball, and Tennis on one platform.
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} custom={3}>
            <button className="btn-primary" onClick={scrollToGames}>
              Explore Games
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </button>
            <button className="btn-ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </motion.div>

          <motion.div className="hero-stats" variants={fadeUp} custom={4}>
            <StatBadge value="3" label="Games" delay={0} />
            <div className="stat-divider" />
            <StatBadge value="11" label="Tournaments" delay={1} />
            <div className="stat-divider" />
            <StatBadge value="40" label="Players" delay={2} />
          </motion.div>
        </motion.div>

        <ScrollIndicator />
      </section>

      {/* ── Games Section ── */}
      <section className="games-section" id="games">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-eyebrow">CHOOSE YOUR SPORT</span>
          <h2 className="section-title">Choose Your Game</h2>
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

      {/* ── Events (Upcoming + Completed) ── */}
      <EventsSection />

      {/* ── Footer ── */}
      <GlobalFooter />
    </div>
  )
}
