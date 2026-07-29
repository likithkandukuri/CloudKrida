import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../../auth/AuthContext.jsx'
import GlobalNav from '../../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../../shared/utilities/usePageMeta.js'

export default function SummerClassesAdmin() {
  const navigate = useNavigate()
  const { isSuperAdmin, isAdmin, loading } = useAuth()

  usePageMeta({
    title: 'Summer Classes Admin — Cloud Krida',
    description: 'Summer Classes administration for Cloud Krida.',
  })

  const authorized = isSuperAdmin || isAdmin

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Admin' }]} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '180px 24px 96px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 560, margin: '0 auto' }}
        >
          {loading ? (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</div>
          ) : authorized ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>☀</div>
              <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14 }}>
                Summer Classes Admin
              </h1>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32 }}>
                Summer Classes administration tools are coming soon.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 100,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)',
                fontSize: 13, fontWeight: 600, color: 'var(--summer-accent)', letterSpacing: '0.06em',
              }}>
                🔨 In Development
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14 }}>
                Access Denied
              </h1>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32 }}>
                You need admin or super admin access to view this page.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary"
                style={{ fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Sign In
              </button>
            </>
          )}
        </motion.div>
      </div>

      <GlobalFooter />
    </div>
  )
}
