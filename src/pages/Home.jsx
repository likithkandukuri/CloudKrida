import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import './Home.css'

// ── Game data ────────────────────────────────────────────────────────────────
const GAMES = [
  {
    id: 'chess',
    name: 'Chess',
    tag: 'STRATEGY',
    description: 'Outwit opponents in high-stakes chess tournaments with real-time match tracking and ELO rankings.',
    path: '/chess',
    accent: '#d4a336',
    accentSoft: 'rgba(212, 163, 54, 0.18)',
    glow: 'rgba(212, 163, 54, 0.28)',
    gradient: 'linear-gradient(160deg, #0d0800 0%, #201000 60%, #0d0800 100%)',
    stats: { tournaments: 8, players: 24 },
  },
  {
    id: 'tennis',
    name: 'Tennis',
    tag: 'SPORTS',
    description: 'Track sets, games, and points in professional-style tennis tournaments with live score feeds.',
    path: '/tennis',
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.15)',
    glow: 'rgba(74, 222, 128, 0.28)',
    gradient: 'linear-gradient(160deg, #00150a 0%, #002e14 60%, #00150a 100%)',
    stats: { tournaments: 3, players: 16 },
  },
  {
    id: 'darts',
    name: 'Darts',
    tag: 'PRECISION',
    description: 'Compete in 501, 301, or Cricket format with automatic score calculation and live leaderboards.',
    path: '/darts',
    accent: '#f87171',
    accentSoft: 'rgba(248, 113, 113, 0.15)',
    glow: 'rgba(248, 113, 113, 0.28)',
    gradient: 'linear-gradient(160deg, #140000 0%, #2d0505 60%, #140000 100%)',
    stats: { tournaments: 5, players: 20 },
  },
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

const ART = { chess: ChessArt, tennis: TennisArt, darts: DartsArt }

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

// ── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()

  usePageMeta({
    title:       'Cloud Krida — Tournament Platform',
    description: 'Create and manage Chess, Tennis, and Darts tournaments with real-time scoring, live brackets, and Swiss pairings. Free to explore — no account required.',
  })

  const scrollToGames = () => {
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="home">

      {/* ── Animated background ── */}
      <div className="bg-layer" aria-hidden="true">
        <div className="orb orb-purple" />
        <div className="orb orb-blue" />
        <div className="orb orb-cyan" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <GlobalNav />

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
            Championship Platform
          </motion.div>

          <motion.h1 className="hero-title" variants={fadeUp} custom={1}>
            Built For<br />
            <span className="gradient-text">Champions</span>
          </motion.h1>

          <motion.p className="hero-subtitle" variants={fadeUp} custom={2}>
            Create tournaments, track scores in real-time, and compete<br className="desktop-br" />
            across Chess, Tennis, and Darts on one platform.
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
            <StatBadge value="16" label="Tournaments" delay={1} />
            <div className="stat-divider" />
            <StatBadge value="60" label="Players" delay={2} />
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

      {/* ── Footer ── */}
      <GlobalFooter />
    </div>
  )
}
