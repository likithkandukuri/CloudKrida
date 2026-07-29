import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

export default function Pickleball() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Pickleball — Tournament Management — Cloud Krida',
    description: 'Pickleball tournaments on Cloud Krida. Coming soon.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }]} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '180px 24px 96px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 560, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏓</div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Pickleball
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32 }}>
            Pickleball tournament management is coming soon.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
            padding: '9px 20px', borderRadius: 100,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.28)',
            fontSize: 13, fontWeight: 600, color: 'var(--brand-tournament)', letterSpacing: '0.06em',
          }}>
            🔨 In Development
          </div>
          <div>
            <button
              onClick={() => navigate('/tournaments')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 100, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
              }}
            >
              ← Back to Tournament Management
            </button>
          </div>
        </motion.div>
      </div>

      <GlobalFooter />
    </div>
  )
}
