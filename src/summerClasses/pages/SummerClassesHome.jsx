import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

const PAGES = [
  {
    icon: '🎓',
    title: 'About the Instructor',
    desc: 'Background, teaching experience, and philosophy behind the program.',
    path: '/summerclasses/instructor',
  },
  {
    icon: '🔢',
    title: 'Mathematics Program',
    desc: 'Subjects taught, online and in-person formats, one-on-one and group options.',
    path: '/summerclasses/mathematics',
  },
  {
    icon: '🗓️',
    title: 'Schedule & Pricing',
    desc: 'Available days and times and format options. Pricing is discussed during enrollment.',
    path: '/summerclasses/schedule-pricing',
  },
  {
    icon: '🧩',
    title: 'How Classes Work',
    desc: 'The tools sessions run on — Google Classroom, Meet, and Drive.',
    path: '/summerclasses/tools',
  },
  {
    icon: '📚',
    title: 'Learning Materials',
    desc: 'Worksheets, study guides, formula sheets, and practice tests.',
    path: '/summerclasses/materials',
  },
  {
    icon: '💬',
    title: 'Testimonials',
    desc: 'What parents and students are saying about the program.',
    path: '/summerclasses/testimonials',
  },
  {
    icon: '✉️',
    title: 'Contact & Enrollment',
    desc: 'How enrollment works and how to get in touch to get started.',
    path: '/summerclasses/enroll',
  },
]

const HIGHLIGHTS = ['Online & In-Person', 'One-on-One & Group', 'K–12 Mathematics']

const EXPANSION = ['Winter Classes', 'Special Workshops', 'Computer Science', 'Arts', 'Other Subjects']

export default function SummerClassesHome() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Learning Programs — Cloud Krida',
    description: 'Personalized mathematics tutoring on Cloud Krida — online or in-person, one-on-one or small group, for K-12 students.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs' }]} />

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', filter: 'blur(120px)',
                      background: 'radial-gradient(circle, rgba(251,191,36,0.14), transparent)', top: -200, right: -150 }} />
        <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', filter: 'blur(110px)',
                      background: 'radial-gradient(circle, rgba(217,119,6,0.12), transparent)', bottom: -140, left: -120 }} />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 680, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🔢</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Learning Programs
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.05 }}>
            Cloud Krida
          </h1>
          <p style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--summer-accent)', marginBottom: 18 }}>
            Personalized Mathematics Instruction
          </p>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32, maxWidth: 520, margin: '0 auto 32px' }}>
            One-on-one and small group math tutoring, available online or in person —
            built around how your child learns best.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <button
              onClick={() => navigate('/summerclasses/instructor')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
                padding: '13px 26px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#241a00',
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em',
                boxShadow: '0 0 26px rgba(251,191,36,0.35)',
              }}
            >
              Meet the Instructor
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button
              onClick={() => navigate('/summerclasses/enroll')}
              style={{
                padding: '13px 26px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              }}
            >
              Enroll Now
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {HIGHLIGHTS.map(h => (
              <span key={h} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 100,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)',
                fontSize: 12, fontWeight: 600, color: 'var(--summer-accent)',
              }}>
                {h}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Page cards */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '0 24px 100px' }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            Get To Know The Program
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Where to Start
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {PAGES.map((f, i) => (
            <motion.button
              key={f.title}
              onClick={() => navigate(f.path)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, borderColor: 'rgba(251,191,36,0.4)' }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                padding: '24px 22px', borderRadius: 14,
                background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.16)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{f.desc}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--summer-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Learn more
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Program expansion — coming soon */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto', padding: '0 24px 96px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>
          Looking Ahead
        </div>
        <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 18 }}>
          More Programs, Coming Soon
        </h2>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {EXPANSION.map(e => (
            <span key={e} style={{
              padding: '7px 16px', borderRadius: 100,
              background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)',
              fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)',
            }}>
              {e}
            </span>
          ))}
        </div>
      </div>

      <GlobalFooter />
    </div>
  )
}
