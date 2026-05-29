import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const item = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

function getCards(tournamentCount, quickMatchCount, isSuperAdmin) {
  const all = [
    {
      id:    'create',
      icon:  '♛',
      label: 'New',
      title: 'Create Tournament',
      desc:  'Set up a single-elimination or swiss-points tournament with full bracket management.',
      action: 'create',
      count: null,
      superAdminOnly: true,
    },
    {
      id:    'csvimport',
      icon:  '📋',
      label: 'Import',
      title: 'Import CSV Registration',
      desc:  'Upload a registration CSV to automatically create tournaments by section — K–2, 3rd–5th, 6th–12th, Adults.',
      action: 'csvimport',
      count: null,
      superAdminOnly: true,
    },
    {
      id:    'tournaments',
      icon:  '🏆',
      label: 'Tournaments',
      title: 'View Tournaments',
      desc:  tournamentCount > 0
               ? `${tournamentCount} tournament${tournamentCount !== 1 ? 's' : ''} — open a bracket, continue scoring, or view results.`
               : 'Browse your tournaments and open any bracket.',
      action: 'tournaments',
      count: tournamentCount || null,
      superAdminOnly: false,
    },
    {
      id:    'quickmatch',
      icon:  '⚔️',
      label: 'Quick',
      title: 'Record a Match',
      desc:  'Log a 1v1 result instantly — no tournament setup required.',
      action: 'quickmatch',
      count: null,
      superAdminOnly: true,
    },
    {
      id:    'history',
      icon:  '📋',
      label: 'History',
      title: 'Match History',
      desc:  quickMatchCount > 0 || tournamentCount > 0
               ? 'View all match results, scores, and attached records.'
               : 'Your full match history will appear here.',
      action: 'history',
      count: quickMatchCount || null,
      superAdminOnly: false,
    },
    {
      id:    'usermanagement',
      icon:  '👥',
      label: 'Users',
      title: 'User Management',
      desc:  'Manage user accounts — promote photo admins, disable access, and add new users.',
      action: 'usermanagement',
      count: null,
      superAdminOnly: true,
    },
  ]
  return isSuperAdmin ? all : all.filter(c => !c.superAdminOnly)
}

export default function Dashboard({ onAction, tournamentCount = 0, quickMatchCount = 0, isSuperAdmin = false }) {
  const navigate = useNavigate()
  const cards = getCards(tournamentCount, quickMatchCount, isSuperAdmin)

  return (
    <div className="chess-section">
      {/* Hero */}
      <motion.div
        className="dashboard-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="dashboard-crown">♛</span>
        <h1 className="dashboard-title">KRIDA Chess</h1>
        <p className="dashboard-sub">
          {isSuperAdmin
            ? 'Full tournament control. Create brackets, track scores, manage players, and administer your platform.'
            : 'Browse tournaments, view results, and follow live match standings.'}
        </p>
      </motion.div>

      {/* Guest / Admin notice */}
      {!isSuperAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderRadius: 12, marginBottom: 28, flexWrap: 'wrap', gap: 12,
            background: 'rgba(212,163,54,0.06)', border: '1px solid rgba(212,163,54,0.18)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--cc-sub)' }}>
            <span style={{ color: 'var(--cc-gold)', fontWeight: 700 }}>
              👀 View-only mode
            </span>
            {' '}— You can view all tournaments and results. Sign in for additional access.
          </div>
          <button
            className="chess-btn-gold"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </motion.div>
      )}

      {/* Cards */}
      <motion.div
        className="dashboard-grid"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {cards.map(card => (
          <motion.div
            key={card.id}
            className="chess-card dash-card"
            variants={item}
            onClick={() => onAction(card.action)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="dash-card-icon">{card.icon}</div>
              {card.count !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(212,163,54,0.12)', color: 'var(--cc-gold)',
                  border: '1px solid rgba(212,163,54,0.25)',
                }}>{card.count}</span>
              )}
            </div>
            <div className="dash-card-label">{card.label}</div>
            <div className="dash-card-title">{card.title}</div>
            <div className="dash-card-desc">{card.desc}</div>
            <div className="dash-card-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
