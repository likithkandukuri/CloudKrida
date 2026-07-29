import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

// Explains what's available only — no links yet. Each student's Google Drive
// folder is set up after enrollment; real links will be added once they exist.
const CATEGORIES = [
  { icon: '📄', title: 'Worksheets', desc: 'Topic-by-topic practice worksheets, organized by grade level and subject.' },
  { icon: '📘', title: 'Study Guides', desc: 'Condensed review guides covering key concepts before a quiz or test.' },
  {
    icon: '📐', title: 'Formula Sheets', desc: 'Quick-reference sheets for geometry, trigonometry, and calculus formulas.',
    // A real, viewable sample — not locked behind enrollment — so a parent can judge quality directly.
    sample: [
      'Pythagorean theorem: a² + b² = c²',
      'Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a',
      'Slope of a line: m = (y₂ − y₁) / (x₂ − x₁)',
      'Area of a circle: A = πr²',
    ],
  },
  { icon: '📝', title: 'Practice Tests', desc: 'Full-length practice tests, including SAT / ACT math sections.' },
]

export default function Materials() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Learning Materials — Learning Programs — Cloud Krida',
    description: 'Worksheets, study guides, formula sheets, and practice tests for Cloud Krida\'s Learning Programs students.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Learning Materials' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Learning Materials
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            Practice Doesn't Stop After the Session
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Every enrolled student gets access to a growing library of worksheets, guides, and
            practice tests — organized and shared through Google Drive.
          </p>
        </motion.div>
      </div>

      {/* Categories */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {CATEGORIES.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.55 }}
              style={{ padding: '26px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{c.title}</div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: c.sample ? 14 : 0 }}>{c.desc}</p>

              {c.sample ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--summer-accent)', marginBottom: 8 }}>
                    Sample Preview
                  </div>
                  <ul style={{ margin: '0 0 10px', padding: '12px 14px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.16)' }}>
                    {c.sample.map(s => (
                      <li key={s} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full library provided upon enrollment</div>
                </>
              ) : (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', marginTop: 14,
                  padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)',
                }}>
                  Access provided upon enrollment
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
