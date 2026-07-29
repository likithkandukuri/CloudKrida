import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

const GRADE_BANDS = [
  {
    icon: '🔢',
    title: 'Early & Elementary Mathematics',
    grades: 'Grades K–5',
    desc: 'Building number sense from the very first counting skills through solid command of the fundamentals.',
    topics: [
      'Counting, number recognition & early number sense', 'Addition & subtraction fluency', 'Multiplication & division facts', 'Fractions & decimals',
      'Place value & rounding', 'Word problems & reasoning', 'Basic geometry & measurement', 'Telling time & money',
    ],
    expectation: 'By the end of this level, most students can add, subtract, multiply, and divide multi-digit numbers confidently, work comfortably with fractions and decimals, and solve multi-step word problems without step-by-step prompting.',
    outcomes: [
      'Solve addition, subtraction, multiplication, and division problems without relying on a calculator',
      'Translate simple word problems into the correct operation, not just guess-and-check',
      'Explain a solution out loud, not just write down a final answer',
    ],
    sampleLessons: [
      'Multiplying fractions using visual models',
      'Solving multi-step word problems',
      'Rounding and estimating with multi-digit numbers',
    ],
    progression: 'This foundation is what middle school algebra depends on — students who leave this level fluent in fractions and multi-step problem solving have a much easier transition into pre-algebra.',
  },
  {
    icon: '➗',
    title: 'Middle School Mathematics',
    grades: 'Grades 6–8',
    desc: 'Bridging arithmetic into algebraic thinking.',
    topics: [
      'Ratios & proportional reasoning', 'Integers & rational numbers', 'Pre-algebra & expressions',
      'Linear equations & inequalities', 'Introductory geometry', 'Statistics & probability', 'Percent & financial math',
    ],
    expectation: 'By the end of this level, most students can solve multi-step equations and inequalities, work fluently with ratios, percents, and negative numbers, and describe relationships using basic geometry and data.',
    outcomes: [
      'Set up and solve multi-step equations and inequalities independently',
      'Move fluently between fractions, decimals, and percents',
      'Read and interpret basic graphs, ratios, and probability problems',
    ],
    sampleLessons: [
      'Solving two-step equations with variables on both sides',
      'Converting between fractions, decimals, and percents',
      'Solving systems of equations by substitution',
    ],
    progression: 'This is the bridge into high school math — the equation-solving and proportional-reasoning skills built here are assumed knowledge in Algebra I and Geometry.',
  },
  {
    icon: '∫',
    title: 'High School Mathematics',
    grades: 'Grades 9–12',
    desc: 'Preparing students for standardized tests and college-level math.',
    topics: [
      'Algebra I & II', 'Geometry & proofs', 'Trigonometry', 'Pre-Calculus',
      'Calculus (AB/BC level)', 'Statistics', 'SAT / ACT math prep',
    ],
    expectation: 'By the end of this level, most students can solve and graph algebraic and trigonometric functions, construct geometric proofs, and apply calculus concepts or standardized-test strategies depending on their track.',
    outcomes: [
      'Solve and graph algebraic, geometric, and trigonometric problems with the right method, not just a memorized formula',
      'Write a clear geometric proof or algebraic derivation',
      'Walk into standardized tests and finals prepared, not anxious',
    ],
    sampleLessons: [
      'Factoring quadratic expressions',
      'Proving triangle congruence',
      'Understanding the unit circle',
      'Finding limits graphically and algebraically',
      'SAT math: translating word problems into equations',
    ],
    progression: 'This level prepares students for whatever comes next — a standardized test this spring, a college math placement exam, or a STEM-focused degree.',
  },
]

const METHODOLOGY = [
  { icon: '🔍', title: 'Diagnose First', desc: 'Every new student starts with a quick assessment to find exactly where the gaps are — no wasted time re-teaching what they already know.' },
  { icon: '✍️', title: 'Worked Examples', desc: 'New concepts are introduced through fully worked examples before the student is asked to try one alone.' },
  { icon: '🔁', title: 'Guided Practice', desc: 'Practice happens with support in the room, so mistakes get caught and corrected immediately — not discovered on a test.' },
  { icon: '📊', title: 'Progress Check-Ins', desc: 'Parents get a short update after the free demo class, another after the first few regular sessions, and ongoing check-ins after that — always in plain language about what\'s improving and what still needs focus, not just a grade or a score.' },
]

const FORMATS = [
  {
    icon: '💻',
    title: 'Online Sessions',
    desc: 'Live, one-on-one video sessions with a shared digital whiteboard — from anywhere, on your schedule.',
    points: ['No commute required', 'Screen-shared worked examples', 'Recorded notes available after each session'],
  },
  {
    icon: '🏠',
    title: 'In-Person Sessions',
    desc: 'Face-to-face tutoring for students who focus best working through problems side-by-side.',
    points: ['Local sessions by arrangement', 'Physical worksheets and practice sets', 'Direct, hands-on explanation'],
  },
]

const CLASS_TYPES = [
  {
    icon: '🧑‍🏫',
    title: 'One-on-One Tutoring',
    desc: 'Fully personalized pacing and attention — the session goes exactly where the student needs it to.',
    points: ['Custom pace and curriculum focus', 'Direct feedback every session', 'Best for catching up or accelerating'],
  },
  {
    icon: '👥',
    title: 'Small Group Classes',
    desc: 'Learn alongside 2–4 other students at a similar level — a bit more affordable, still plenty of attention.',
    points: ['Peer discussion and shared practice', 'Grouped by grade level and topic', 'Great for consistent weekly practice'],
  },
]

function InfoCard({ icon, title, desc, points }) {
  return (
    <div style={{
      padding: '26px 24px', borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(10px)', height: '100%',
    }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 14 }}>{desc}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {points.map(p => (
          <li key={p} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--summer-accent)', flexShrink: 0 }}>✓</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Mathematics() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Mathematics Program — Learning Programs — Cloud Krida',
    description: 'Cloud Krida Mathematics Program — subjects taught from elementary math through calculus, online or in-person, one-on-one or small group.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Mathematics Program' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔢</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Mathematics Program
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            From First Fractions to Calculus
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            A structured math program covering every grade level, taught the way that fits your
            child best — online or in person, one-on-one or in a small group.
          </p>
        </motion.div>
      </div>

      {/* Grade bands & topics covered */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto', padding: '0 24px 72px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            What's Covered
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Subjects Taught by Grade Level</h2>
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GRADE_BANDS.map((band, i) => (
            <motion.div key={band.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}
              style={{ padding: '26px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 32 }}>{band.icon}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{band.title}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 100,
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', color: 'var(--summer-accent)',
                    }}>
                      {band.grades}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>{band.desc}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {band.topics.map(t => (
                  <span key={t} style={{
                    fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)',
                    padding: '6px 12px', borderRadius: 100,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--summer-accent)', marginBottom: 6 }}>
                  What to Expect
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{band.expectation}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Learning Outcomes
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {band.outcomes.map(o => (
                      <li key={o} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <span style={{ color: 'var(--summer-accent)', flexShrink: 0 }}>✓</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Sample Lessons
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {band.sampleLessons.map(l => (
                      <li key={l} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <span style={{ color: 'var(--summer-accent)', flexShrink: 0 }}>▸</span>{l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>➜</span>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{band.progression}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Teaching methodology */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto', padding: '0 24px 72px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            How It Works
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>The Cloud Krida Method</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Diagnose First → Worked Examples → Guided Practice → Progress Check-Ins</p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {METHODOLOGY.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              style={{ padding: '22px 20px', borderRadius: 14, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.16)' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{m.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Format options */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto', padding: '0 24px 72px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            Choose a Format
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Online or In-Person</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FORMATS.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}>
              <InfoCard {...f} />
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Considering in-person sessions?{' '}
          <button
            onClick={() => navigate('/summerclasses/schedule-pricing#safety')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: 'var(--summer-accent)', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
          >
            Read our in-person safety policy
          </button>
        </p>
      </div>

      {/* Class types */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto', padding: '0 24px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            Choose a Class Size
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em' }}>One-on-One or Group</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {CLASS_TYPES.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}>
              <InfoCard {...c} />
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
