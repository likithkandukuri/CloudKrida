import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIME_SLOTS = [
  { label: 'Weekday Afternoons', value: '3:00 PM – 6:00 PM' },
  { label: 'Weekday Evenings', value: '6:00 PM – 8:00 PM' },
  { label: 'Saturday Mornings', value: '9:00 AM – 1:00 PM' },
]

const FORMAT_RECAP = [
  { icon: '💻', title: 'Online', desc: 'Live video sessions with a shared digital whiteboard, available on any of the days and times above.' },
  { icon: '🏠', title: 'In-Person', desc: 'Face-to-face sessions by arrangement, subject to availability in your area.' },
]

const SAFETY_PRINCIPLES = [
  { icon: '🗺️', title: 'Location Is Agreed Together', desc: 'Where sessions happen is discussed and confirmed directly with you before the first in-person session — never decided unilaterally.' },
  { icon: '👀', title: 'First Session, a Public Setting', desc: 'For a new family, the first in-person meeting is recommended to take place somewhere public — a library or community center — until everyone\'s comfortable.' },
  { icon: '📞', title: 'Direct Line to the Parent', desc: 'Scheduling, updates, and contact always go directly to the parent or guardian on file — never routed through the student.' },
  { icon: '🚪', title: 'Either Side Can Pause It', desc: 'Either the family or the tutor can pause, reschedule, or end an in-person arrangement at any time, no explanation required.' },
  { icon: '🙋', title: 'No Unrelated Adults, Ever', desc: 'Sessions are never conducted with any other unrelated adult present without the parent\'s knowledge and agreement.' },
]

export default function SchedulePricing() {
  const navigate = useNavigate()
  const location = useLocation()

  usePageMeta({
    title: 'Schedule & Pricing — Learning Programs — Cloud Krida',
    description: 'Available days and times and online/in-person options for Cloud Krida\'s mathematics tutoring program. Pricing is discussed directly during enrollment.',
  })

  // Client-side routing doesn't auto-scroll to a URL hash the way a plain <a href="#..."> does,
  // so the "Read our in-person safety policy" cross-link from the Mathematics page needs this.
  useEffect(() => {
    if (location.hash === '#safety') {
      const el = document.getElementById('safety')
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [location.hash])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Schedule & Pricing' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🗓️</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Schedule & Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            The Details You're Probably Wondering About
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Availability and format options — everything you need before reaching out. Program
            recommendations and pricing are discussed directly during enrollment.
          </p>
        </motion.div>
      </div>

      {/* Availability */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            Availability
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Available Days & Times</h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
          style={{ padding: '24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Days</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DAYS.map(d => (
              <span key={d} style={{
                padding: '8px 16px', borderRadius: 100,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)',
                fontSize: 13, fontWeight: 600, color: 'var(--summer-accent)',
              }}>
                {d}
              </span>
            ))}
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {TIME_SLOTS.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              style={{ padding: '18px 18px', borderRadius: 14, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.16)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{t.value}</div>
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Exact time slots are confirmed based on current availability — reach out to check what's open.
        </p>
      </div>

      {/* Format recap */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 24px 64px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Online & In-Person Options</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FORMAT_RECAP.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{ padding: '22px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* In-person safety policy */}
      <div id="safety" style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 24px 64px', scrollMarginTop: 100 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            For In-Person Sessions
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em' }}>In-Person Safety Policy</h2>
        </motion.div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center', maxWidth: 600, margin: '0 auto 28px' }}>
          There's no single fixed location for in-person sessions — the specifics are worked out
          individually with each family. A few principles apply to every arrangement, regardless of the details:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {SAFETY_PRINCIPLES.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }}
              style={{ padding: '20px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '0 24px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', padding: '28px 26px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--summer-accent)', textTransform: 'uppercase', marginBottom: 10 }}>
            Pricing
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>Discussed During Enrollment</h2>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Program recommendations, scheduling, and pricing details are discussed during the
            enrollment process. Contact us to discuss your student's learning goals and find the
            best learning option.
          </p>
        </motion.div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '32px 24px 96px' }}>
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
