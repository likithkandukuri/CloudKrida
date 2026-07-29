import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

// Explains the workflow only — no links yet. Google Classroom/Meet/Drive access
// is set up per student after enrollment; real links will be added once they exist.
const TOOLS = [
  {
    icon: '🌐',
    title: 'Website',
    role: 'Marketing & Enrollment',
    desc: 'This site — where parents learn about the program and submit an enrollment inquiry.',
    afterEnrollment: false,
  },
  {
    icon: '🏫',
    title: 'Google Classroom',
    role: 'Assignments & Materials',
    desc: 'Each enrolled student gets added to a Google Classroom for assignments, announcements, and materials specific to their course.',
    afterEnrollment: true,
  },
  {
    icon: '🎥',
    title: 'Google Meet',
    role: 'Live Classes',
    desc: 'Online sessions run over Google Meet — a link is shared with enrolled students before each session.',
    afterEnrollment: true,
  },
  {
    icon: '📁',
    title: 'Google Drive',
    role: 'Worksheets, PDFs & Notes',
    desc: 'Worksheets, session notes, and reference PDFs are shared through a Google Drive folder for each student.',
    afterEnrollment: true,
  },
]

export default function Tools() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'How Classes Work — Learning Programs — Cloud Krida',
    description: 'The tools Cloud Krida\'s Learning Programs uses to run classes — Google Classroom, Google Meet, and Google Drive.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'How Classes Work' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🧩</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            How Classes Work
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            A Simple, Familiar Workflow
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            No app to install and no account to figure out — classes run entirely on tools your
            family probably already uses.
          </p>
        </motion.div>
      </div>

      {/* Workflow */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {TOOLS.map((t, i) => (
            <motion.div key={t.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.55 }}
              style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '24px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>
                {t.icon}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{t.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--summer-accent)', textTransform: 'uppercase' }}>{t.role}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{t.desc}</p>
              </div>
              {t.afterEnrollment && (
                <div style={{
                  flexShrink: 0, alignSelf: 'center',
                  padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)',
                }}>
                  Provided after enrollment
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px 96px' }}>
        <button
          onClick={() => navigate('/summerclasses/enroll')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
            padding: '14px 30px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#241a00',
            fontSize: 15, fontWeight: 700,
            boxShadow: '0 0 26px rgba(251,191,36,0.35)',
          }}
        >
          Enroll Now
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <GlobalFooter />
    </div>
  )
}
