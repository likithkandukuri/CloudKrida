import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'

const FEATURES = [
  { icon: '🎯', title: '501 / 301 / Cricket', desc: 'All major darts formats with automatic score calculation and checkout suggestions.' },
  { icon: '🏆', title: 'Tournament Brackets',  desc: 'Single elimination and points tournament formats with full bracket management.' },
  { icon: '📊', title: 'Live Scoreboards',     desc: 'Real-time score tracking per throw, per leg, and per set.' },
  { icon: '📋', title: 'Board Pairings',        desc: 'Board assignments and pairings display for multi-board venues.' },
  { icon: '📈', title: 'Player Statistics',     desc: 'Three-dart average, checkout %, and 180 count per player.' },
  { icon: '📺', title: 'Display Mode',           desc: 'Full-screen TV and projector view optimized for venues and streams.' },
]

export default function Darts() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <GlobalNav />

      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', filter: 'blur(120px)',
                      background: 'radial-gradient(circle, rgba(248,113,113,0.14), transparent)', top: -200, right: -150 }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(100px)',
                      background: 'radial-gradient(circle, rgba(251,146,60,0.1), transparent)', bottom: -100, left: 100 }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(248,113,113,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }} />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '168px 24px 72px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 680, margin: '0 auto' }}
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            style={{ fontSize: 80, marginBottom: 20, lineHeight: 1, display: 'inline-block' }}
          >
            🎯
          </motion.div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--sport-darts)', marginBottom: 14, textTransform: 'uppercase' }}>
            Precision
          </div>
          <h1 style={{ fontSize: 'clamp(44px, 8vw, 80px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 18, lineHeight: 1.05, color: 'var(--text-primary)' }}>
            Darts
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
            Full darts tournament management is coming soon. Support for 501, 301, Cricket with live scoring and automatic checkouts.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 100,
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)',
              fontSize: 13, fontWeight: 600, color: 'var(--sport-darts)', letterSpacing: '0.06em',
            }}>
              🔨 In Development
            </div>
            <button
              onClick={() => navigate('/chess')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 100, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              Try Chess instead →
            </button>
          </div>
        </motion.div>
      </div>

      {/* Feature grid */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '0 24px 40px' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--sport-darts)', textTransform: 'uppercase', marginBottom: 10 }}>
            Planned Features
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            What's Coming
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{
                padding: '22px 20px', borderRadius: 14,
                background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 7 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <GlobalFooter />
    </div>
  )
}
