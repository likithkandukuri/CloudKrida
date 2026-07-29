import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

// Placeholder slots only — no testimonials have been collected yet.
// Replace each card's content with a real parent/student quote once available.
const PLACEHOLDER_SLOTS = [
  { icon: '👨‍👩‍👧', label: 'Parent Testimonial' },
  { icon: '🧑‍🎓', label: 'Student Feedback' },
  { icon: '🏆', label: 'Success Story' },
]

export default function Testimonials() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Testimonials — Learning Programs — Cloud Krida',
    description: 'Parent and student feedback for Cloud Krida\'s Learning Programs — coming soon.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Testimonials' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Testimonials & Success Stories
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            What Families Are Saying
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            This program is just getting started — real parent and student stories will be
            featured here as they come in.
          </p>
        </motion.div>
      </div>

      {/* Placeholder slots */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {PLACEHOLDER_SLOTS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}
              style={{
                textAlign: 'center', padding: '32px 24px', borderRadius: 16,
                background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)',
              }}>
              <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.6 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Coming soon</div>
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
          Are you a current parent or student? We'd love to hear about your experience —
          reach out through the{' '}
          <button
            onClick={() => navigate('/summerclasses/enroll')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: 'var(--summer-accent)', fontWeight: 600, fontSize: 13 }}
          >
            contact form
          </button>
          {' '}to share one.
        </p>
      </div>

      <GlobalFooter />
    </div>
  )
}
