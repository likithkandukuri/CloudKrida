import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

const STATS = [
  { value: '6+', label: 'Years Teaching Experience' },
  { value: '200+', label: 'Students Taught' },
]

const CREDENTIALS = [
  'B.S. Computer Science', 'M.S. Mathematics', 'Bachelor of Education',
]

const SUBJECTS = [
  'Elementary Math', 'Pre-Algebra', 'Algebra I & II', 'Geometry', 'Pre-Calculus', 'Calculus', 'Test Prep (SAT / ACT Math)',
]

const VALUES = [
  { icon: '🧩', title: 'Meet the Student Where They Are', desc: 'Every lesson starts with the concept a student is actually stuck on — not a generic curriculum pace.' },
  { icon: '🗣', title: 'Explain, Don’t Just Answer', desc: 'The goal is understanding the "why" behind a method, so it transfers to the next problem and the next test.' },
  { icon: '📈', title: 'Track Real Progress', desc: 'Parents get honest, regular updates on what’s improving and what still needs work — no surprises.' },
]

function Card({ children, style }) {
  return (
    <div style={{
      padding: '24px 22px', borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(10px)', ...style,
    }}>
      {children}
    </div>
  )
}

export default function Instructor() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'About the Instructor — Learning Programs — Cloud Krida',
    description: 'Meet the instructor behind Cloud Krida’s Learning Programs — teaching experience, subjects taught, and teaching philosophy.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'About the Instructor' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎓</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            About the Instructor
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            Teaching Math So It Finally Makes Sense
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            I'm the instructor behind Cloud Krida's Learning Programs — a dedicated mathematics
            tutor helping students build confidence and skill, one concept at a time.
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
          style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16 }}
        >
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex: '1 1 160px', textAlign: 'center', padding: '22px 16px', borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--summer-accent)', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Education & credentials */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em', textAlign: 'center' }}>Education & Credentials</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {CREDENTIALS.map(c => (
              <span key={c} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 100,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
              }}>
                🎓 {c}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bio + experience */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.02em' }}>My Background</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
            I've spent over six years teaching mathematics in both classroom and one-on-one
            settings, working with students from elementary school through high school. That
            experience has taught me that most students aren't "bad at math" — they've just hit
            a gap somewhere along the way that nobody stopped to fill.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            My job is to find that gap, close it, and rebuild confidence from there. Whether
            we're working through fractions for the first time or preparing for a calculus
            final, every session is built around the individual student in front of me — not a
            one-size-fits-all lesson plan.
          </p>
        </motion.div>
      </div>

      {/* Subjects taught */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em', textAlign: 'center' }}>Subjects Taught</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {SUBJECTS.map(s => (
              <span key={s} style={{
                padding: '9px 18px', borderRadius: 100,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.24)',
                fontSize: 13, fontWeight: 600, color: 'var(--summer-accent)',
              }}>
                {s}
              </span>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => navigate('/summerclasses/mathematics')}
              style={{
                fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none',
                fontSize: 14, fontWeight: 700, color: 'var(--summer-accent)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              See the full Mathematics Program
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Teaching philosophy */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '0 24px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>How I Teach</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {VALUES.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}>
              <Card>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{v.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{v.desc}</div>
              </Card>
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
          Get Started
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <GlobalFooter />
    </div>
  )
}
