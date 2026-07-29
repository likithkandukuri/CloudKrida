import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import './About.css'

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
}

const PROGRAMS = [
  {
    icon: '🏆',
    title: 'Tournament Management',
    desc: 'Live Chess, Tennis, and Darts tournaments with Swiss pairings, brackets, real-time standings, and photo galleries — for organizers and players.',
    path: '/tournaments',
    accentVar: '--brand-tournament',
    cta: 'Explore Tournament Management',
  },
  {
    icon: '📚',
    title: 'Summer Programs',
    desc: 'Registration, student rosters, and class scheduling for summer programs — built for parents and students. In active development.',
    path: '/summerclasses',
    accentVar: '--summer-accent',
    cta: 'Explore Summer Programs',
  },
]

const AUDIENCES = [
  {
    icon: '🗂',
    title: 'Tournament Organizers',
    desc: 'Create events, generate pairings automatically, and track every round without a spreadsheet in sight.',
  },
  {
    icon: '♟',
    title: 'Players & Competitors',
    desc: 'Check live standings, pairings, and match history from any device, the moment results are posted.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parents',
    desc: 'Register your child for summer classes and keep track of schedules — all from one account.',
  },
  {
    icon: '🎓',
    title: 'Students',
    desc: 'See class schedules and stay on top of summer program sessions in one simple place.',
  },
]

const VALUES = [
  {
    icon: '⚡',
    title: 'Real-Time Performance',
    desc: 'Every score update, pairing change, and standings shift is reflected instantly — no refreshing, no lag, no missed moments.',
  },
  {
    icon: '🎯',
    title: 'Precision & Fairness',
    desc: 'Pairing algorithms, tiebreakers, and bracket logic follow established competitive standards, so the rules enforce themselves.',
  },
  {
    icon: '🔒',
    title: 'Reliability',
    desc: 'Cloud infrastructure means zero downtime during critical rounds. Your tournament keeps running even when the pressure peaks.',
  },
  {
    icon: '🤝',
    title: 'Simplicity First',
    desc: 'Powerful tools that don\'t require a manual. Tournament directors can get a bracket running in minutes, not hours.',
  },
]

const EXPERTISE = [
  {
    icon: '♟',
    title: 'Swiss Tournament Engine',
    desc: 'Full Swiss-system pairing logic with support for byes, tiebreakers, and multi-round scheduling across any player count.',
  },
  {
    icon: '🏆',
    title: 'Live Bracket Management',
    desc: 'Single-elimination brackets that update in real time as scores are entered — visible to players and spectators instantly.',
  },
  {
    icon: '🌐',
    title: 'Multi-Sport Architecture',
    desc: 'Chess, Tennis, and Darts are all first-class sports on one unified platform, with sport-specific scoring built in.',
  },
  {
    icon: '📸',
    title: 'Galleries & Records',
    desc: 'Every tournament produces a permanent photo gallery and full match history, building an archive your community can look back on.',
  },
]

const CAPABILITIES = [
  {
    icon: '📊',
    title: 'Real-Time Scoring',
    desc: 'Live score entry updates leaderboards and standings the moment results are submitted — no manual refresh needed.',
  },
  {
    icon: '📥',
    title: 'CSV Import & Export',
    desc: 'Bulk-register players from a spreadsheet or export complete tournament data for external analysis and record-keeping.',
  },
  {
    icon: '📺',
    title: 'Display Mode',
    desc: 'A venue-facing display screen shows current pairings and standings on any projector or large monitor with one click.',
  },
  {
    icon: '👥',
    title: 'Role-Based Access',
    desc: 'Superadmin, Admin, and Guest tiers let you control exactly who can create, edit, or simply view tournament data.',
  },
]

function SectionTag({ text }) {
  return <span className="about-eyebrow">{text}</span>
}

function ValueCard({ icon, title, desc, index }) {
  return (
    <motion.div
      className="about-value-card"
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="about-card-icon">{icon}</div>
      <h3 className="about-card-title">{title}</h3>
      <p className="about-card-desc">{desc}</p>
    </motion.div>
  )
}

function FeatureCard({ icon, title, desc, index }) {
  return (
    <motion.div
      className="about-feature-card"
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="about-feature-icon">{icon}</div>
      <div>
        <h3 className="about-feature-title">{title}</h3>
        <p className="about-feature-desc">{desc}</p>
      </div>
    </motion.div>
  )
}

function ProgramCard({ icon, title, desc, path, accentVar, cta, index, onNavigate }) {
  return (
    <motion.button
      className="about-feature-card about-feature-card--clickable"
      style={{ '--accent': `var(${accentVar})` }}
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      onClick={() => onNavigate(path)}
    >
      <div className="about-feature-icon">{icon}</div>
      <div>
        <h3 className="about-feature-title">{title}</h3>
        <p className="about-feature-desc">{desc}</p>
        <span className="about-program-cta">
          {cta}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </motion.button>
  )
}

export default function About() {
  const navigate = useNavigate()

  usePageMeta({
    title:       'About Cloud Krida — Tournament Management & Summer Programs',
    description: 'Cloud Krida is a unified platform connecting Tournament Management and Summer Programs — one login for organizers, players, parents, and students.',
  })

  return (
    <div className="about-page">

      {/* Animated background */}
      <div className="about-bg" aria-hidden="true">
        <div className="about-orb about-orb-1" />
        <div className="about-orb about-orb-2" />
        <div className="about-orb about-orb-3" />
        <div className="about-grid" />
        <div className="about-vignette" />
      </div>

      <GlobalNav />
      <Breadcrumb trail={[{ label: 'About' }]} />

      {/* ── Hero ── */}
      <section className="about-hero">
        <motion.div
          className="about-hero-content"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div className="about-hero-badge" variants={fadeUp} custom={0}>
            <span className="badge-dot" />
            About Cloud Krida
          </motion.div>

          <motion.h1 className="about-hero-title" variants={fadeUp} custom={1}>
            Meet<br />
            <span className="gradient-text">Cloud Krida</span>
          </motion.h1>

          <motion.p className="about-hero-subtitle" variants={fadeUp} custom={2}>
            One platform, two connected programs — Tournament Management and Summer
            Programs — built for organizers, players, parents, and students alike.
          </motion.p>

          <motion.div className="about-hero-actions" variants={fadeUp} custom={3}>
            <button className="btn-primary" onClick={() => navigate('/tournaments/chess')}>
              Explore the Platform
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn-ghost" onClick={() => navigate('/contact')}>
              Get in Touch
            </button>
          </motion.div>
        </motion.div>

        {/* Stat row */}
        <motion.div
          className="about-hero-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          {[
            { value: '3',  label: 'Sports' },
            { value: '∞',  label: 'Tournaments' },
            { value: '0',  label: 'Setup Friction' },
          ].map((s, i) => (
            <div key={s.label} className="about-stat">
              <span className="about-stat-value">{s.value}</span>
              <span className="about-stat-label">{s.label}</span>
              {i < 2 && <div className="about-stat-div" />}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── About Cloud Krida ── */}
      <section className="about-section">
        <div className="about-container about-two-col">
          <motion.div
            className="about-text-block"
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="WHO WE ARE" />
            <h2 className="about-section-title">What Is Cloud Krida?</h2>
            <p className="about-body-text">
              Cloud Krida is a unified platform connecting two programs under one login:
              <strong> Tournament Management</strong>, a real-time system for running
              chess, tennis, and darts competitions, and <strong>Summer Programs</strong>,
              built for registering students and organizing seasonal classes.
            </p>
            <p className="about-body-text">
              Whether you're a tournament director pairing your next round, a player checking
              live standings, a parent registering a child for summer classes, or a student
              checking the schedule — Cloud Krida is the one place to do it.
            </p>
          </motion.div>

          <motion.div
            className="about-highlight-box"
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="about-highlight-icon">☁</div>
            <blockquote className="about-highlight-quote">
              "Whether you're running a tournament or a summer program, the technology
              should disappear into the background."
            </blockquote>
            <div className="about-highlight-tag">Cloud Krida Philosophy</div>
          </motion.div>
        </div>
      </section>

      {/* ── Two Programs ── */}
      <section className="about-section">
        <div className="about-container">
          <motion.div
            className="about-centered"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="WHAT WE OFFER" />
            <h2 className="about-section-title">Two Programs, One Platform</h2>
            <p className="about-section-sub">
              Every Cloud Krida account has access to both — pick the one you need today.
            </p>
          </motion.div>

          <div className="about-grid-2">
            {PROGRAMS.map((p, i) => (
              <ProgramCard key={p.title} {...p} index={i} onNavigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="about-section about-section--alt">
        <div className="about-container about-centered">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="OUR MISSION" />
            <h2 className="about-section-title">Why We Build This</h2>
          </motion.div>

          <motion.div
            className="about-mission-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="about-mission-icon">🚀</div>
            <p className="about-mission-text">
              Our mission is to remove friction from running great tournaments and great summer
              programs alike. Cloud Krida automates pairings, tracks live scores, and manages
              registration and rosters — so organizers can focus on the people, not the paperwork.
              We want any organization, from a school chess club to a summer program coordinator,
              to run professional-grade operations without professional-grade overhead.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="about-section">
        <div className="about-container about-two-col about-two-col--reverse">
          <motion.div
            className="about-vision-visual"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="about-vision-ring about-vision-ring--outer" />
            <div className="about-vision-ring about-vision-ring--mid" />
            <div className="about-vision-ring about-vision-ring--inner" />
            <span className="about-vision-icon">🏆</span>
          </motion.div>

          <motion.div
            className="about-text-block"
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="OUR VISION" />
            <h2 className="about-section-title">Where We're Headed</h2>
            <p className="about-body-text">
              We're building toward a world where competitive excellence and quality education
              are both universally accessible. No expensive software, no specialized hardware,
              no expert setup — just a browser and an internet connection.
            </p>
            <p className="about-body-text">
              Cloud Krida will expand to support more sports, deeper analytics, and a full
              Summer Programs experience — keeping our core promise: make the technology
              invisible so the community can shine.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="about-section about-section--alt">
        <div className="about-container">
          <motion.div
            className="about-centered"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="WHO WE SERVE" />
            <h2 className="about-section-title">Built for Everyone Involved</h2>
            <p className="about-section-sub">
              Four groups of people, one platform that works for all of them.
            </p>
          </motion.div>

          <div className="about-grid-4">
            {AUDIENCES.map((a, i) => (
              <ValueCard key={a.title} {...a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="about-section">
        <div className="about-container">
          <motion.div
            className="about-centered"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="OUR VALUES" />
            <h2 className="about-section-title">What Drives Us</h2>
            <p className="about-section-sub">
              Four principles that shape every feature we ship.
            </p>
          </motion.div>

          <div className="about-grid-4">
            {VALUES.map((v, i) => (
              <ValueCard key={v.title} {...v} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Commitment to Quality ── */}
      <section className="about-section">
        <div className="about-container">
          <motion.div
            className="about-quality-banner"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="about-quality-left">
              <SectionTag text="COMMITMENT TO QUALITY" />
              <h2 className="about-section-title" style={{ marginBottom: 16 }}>Platform-Grade Standards</h2>
              <p className="about-body-text">
                Every feature on Cloud Krida is built to hold up under real use. We test
                pairing algorithms against established competitive rules, and we design
                registration and scheduling tools around how organizers and parents actually
                work. If it wouldn't hold up under pressure, it doesn't ship.
              </p>
            </div>
            <div className="about-quality-badges">
              {['Live Scoring', 'Swiss Pairings', 'Photo Galleries', 'Display Mode', 'CSV Import', 'Role Access', 'Registration', 'Class Scheduling'].map(b => (
                <span key={b} className="about-quality-badge">{b}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Expertise ── */}
      <section className="about-section about-section--alt">
        <div className="about-container">
          <motion.div
            className="about-centered"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="TOURNAMENT EXPERTISE" />
            <h2 className="about-section-title">Tournament Management, Perfected</h2>
            <p className="about-section-sub">
              Specialized systems built from real tournament experience.
            </p>
          </motion.div>

          <div className="about-grid-2">
            {EXPERTISE.map((e, i) => (
              <FeatureCard key={e.title} {...e} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="about-section">
        <div className="about-container">
          <motion.div
            className="about-centered"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTag text="CAPABILITIES" />
            <h2 className="about-section-title">Tournament Management Features</h2>
            <p className="about-section-sub">
              Everything a tournament needs, built into one platform.
            </p>
          </motion.div>

          <div className="about-grid-2">
            {CAPABILITIES.map((c, i) => (
              <FeatureCard key={c.title} {...c} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-section about-section--alt">
        <div className="about-container about-centered">
          <motion.div
            className="about-cta-box"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="about-cta-title">Ready to run your tournament?</h2>
            <p className="about-cta-sub">
              Jump in and create your first bracket — no account required to explore.
            </p>
            <div className="about-cta-actions">
              <button className="btn-primary" onClick={() => navigate('/tournaments/chess')}>
                Start with Chess
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button className="btn-ghost" onClick={() => navigate('/summerclasses')}>
                Explore Summer Programs
              </button>
              <button className="btn-ghost" onClick={() => navigate('/contact')}>
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
