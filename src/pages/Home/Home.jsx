import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import './Home.css'

const SECTIONS = [
  {
    id: 'tournaments',
    icon: '🏆',
    name: 'Tournament Management',
    description: 'Manage tournaments, registrations, schedules, and results.',
    cta: 'Explore Tournaments',
    path: '/tournaments',
    accentVar: '--brand-tournament',
  },
  {
    id: 'learning-programs',
    icon: '📚',
    name: 'Learning Programs',
    description: 'Explore classes, tutoring, workshops, and educational programs.',
    cta: 'Explore Programs',
    path: '/summerclasses',
    accentVar: '--summer-accent',
  },
]

// ── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ section, index }) {
  const navigate = useNavigate()
  return (
    <motion.button
      className="section-card"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ '--accent': `var(${section.accentVar})` }}
      onClick={() => navigate(section.path)}
    >
      <div className="section-card-icon">{section.icon}</div>
      <h3 className="section-card-name">{section.name}</h3>
      <p className="section-card-desc">{section.description}</p>
      <span className="section-card-cta">
        {section.cta}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </span>
    </motion.button>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  usePageMeta({
    title:       'Cloud Krida',
    description: 'Cloud Krida is the home of Tournament Management (Chess, Tennis, Darts) and Learning Programs — one platform, one login.',
  })

  return (
    <div className="home">

      {/* ── Animated background ── */}
      <div className="bg-layer" aria-hidden="true">
        <div className="orb orb-purple" />
        <div className="orb orb-blue" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <GlobalNav />

      {/* ── Two primary blocks — the main focus of the page ── */}
      <section className="home-main">
        <div className="sections-grid">
          {SECTIONS.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <GlobalFooter />
    </div>
  )
}
