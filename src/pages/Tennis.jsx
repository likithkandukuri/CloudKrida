import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'

const FEATURES = [
  { icon: '🏆', title: 'Tournament Brackets',   desc: 'Single elimination and round-robin formats with full bracket visualization.' },
  { icon: '📊', title: 'Set & Game Tracking',   desc: 'Track sets, games, and points per match with professional-style scoring.' },
  { icon: '📋', title: 'Live Court Pairings',   desc: 'Real-time pairings display with court assignments for large venues.' },
  { icon: '📈', title: 'Player Rankings',        desc: 'ELO-based ranking system with match history and performance trends.' },
  { icon: '🖨', title: 'Printable Draw Sheets', desc: 'Export clean bracket and schedule sheets for posting at the venue.' },
  { icon: '📺', title: 'Display Mode',           desc: 'Full-screen projector view for courts, reception areas, and streams.' },
]

export default function Tennis() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <GlobalNav />

      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', filter: 'blur(120px)',
                      background: 'radial-gradient(circle, rgba(74,222,128,0.14), transparent)', top: -200, right: -150 }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(100px)',
                      background: 'radial-gradient(circle, rgba(250,204,21,0.1), transparent)', bottom: -100, left: 100 }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(74,222,128,0.05) 1px, transparent 1px)',
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
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 80, marginBottom: 20, lineHeight: 1 }}
          >
            🎾
          </motion.div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--sport-tennis)', marginBottom: 14, textTransform: 'uppercase' }}>
            Sports
          </div>
          <h1 style={{ fontSize: 'clamp(44px, 8vw, 80px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 18, lineHeight: 1.05, color: 'var(--text-primary)' }}>
            Tennis
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
            Full tennis tournament management is on its way. Track sets, games, and points across professional-style brackets.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 100,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.28)',
              fontSize: 13, fontWeight: 600, color: 'var(--sport-tennis)', letterSpacing: '0.06em',
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--sport-tennis)', textTransform: 'uppercase', marginBottom: 10 }}>
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
                background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)',
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
