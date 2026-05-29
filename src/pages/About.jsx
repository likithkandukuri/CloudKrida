import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'
import './About.css'

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
}

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

export default function About() {
  const navigate = useNavigate()

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
            Our Story
          </motion.div>

          <motion.h1 className="about-hero-title" variants={fadeUp} custom={1}>
            Meet<br />
            <span className="gradient-text">Cloud Krida</span>
          </motion.h1>

          <motion.p className="about-hero-subtitle" variants={fadeUp} custom={2}>
            The cloud-powered tournament platform built for serious competition —
            from school chess clubs to national-level brackets.
          </motion.p>

          <motion.div className="about-hero-actions" variants={fadeUp} custom={3}>
            <button className="btn-primary" onClick={() => navigate('/chess')}>
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
              Cloud Krida is a modern, real-time tournament management system designed for
              directors and competitors who demand precision. We handle the full competitive
              lifecycle — from player registration and pairing generation through live scoring
              and final standings.
            </p>
            <p className="about-body-text">
              We built Cloud Krida because managing tournaments with spreadsheets is fragile,
              slow, and error-prone. A cloud-native platform that automates the repetitive
              parts means directors can focus on the competition, not the logistics.
            </p>
          </motion.div>

          <motion.div
            className="about-highlight-box"
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="about-highlight-icon">♟</div>
            <blockquote className="about-highlight-quote">
              "Tournament directors shouldn't wrestle with spreadsheets when they could be
              focused on the players."
            </blockquote>
            <div className="about-highlight-tag">Cloud Krida Philosophy</div>
          </motion.div>
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
              Our mission is to remove friction from running great competitions. Cloud Krida
              automates pairings, tracks live scores, and publishes results instantly — so every
              round runs smoother than the last. We want any organization, from a school chess
              club to a regional sports federation, to run a professional-grade tournament
              without professional-grade overhead.
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
              We're building toward a world where competitive excellence is universally
              accessible. No expensive software, no specialized hardware, no expert setup — just
              a browser and an internet connection.
            </p>
            <p className="about-body-text">
              Cloud Krida will expand to support more sports, deeper analytics, and live
              spectator features — keeping our core promise: make the technology invisible
              so the competition can shine.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="about-section about-section--alt">
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
              <h2 className="about-section-title" style={{ marginBottom: 16 }}>Tournament-Grade Standards</h2>
              <p className="about-body-text">
                Every feature on Cloud Krida is built to tournament-grade standards. We test
                against real competitive formats, validate pairing algorithms against established
                rules, and iterate based on feedback from active tournament directors. If it
                wouldn't hold up under match pressure, it doesn't ship.
              </p>
            </div>
            <div className="about-quality-badges">
              {['Live Scoring', 'Swiss Pairings', 'Photo Galleries', 'Display Mode', 'CSV Import', 'Role Access'].map(b => (
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
            <SectionTag text="OUR EXPERTISE" />
            <h2 className="about-section-title">What We Do Best</h2>
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
            <h2 className="about-section-title">Platform Features</h2>
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
              <button className="btn-primary" onClick={() => navigate('/chess')}>
                Start with Chess
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
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
