import { motion } from 'framer-motion'
import { usePickleball } from './PickleballContext.jsx'

export default function PickleballDashboard({ onBrowse, onCreate }) {
  const { tournaments, dataLoading, loadError } = usePickleball()

  const openCount     = tournaments.filter(t => t.status === 'registration_open').length
  const liveCount     = tournaments.filter(t => t.status === 'in_progress').length
  const completeCount = tournaments.filter(t => t.status === 'complete').length

  return (
    <>
      <div className="pb-hero">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pb-eyebrow">🏓 Pickleball</div>
          <h1>Cloud Krida Pickleball</h1>
          <p>Singles, doubles, and mixed doubles tournaments — pool play, brackets, and live standings.</p>

          {dataLoading ? (
            <div className="pb-state" role="status" aria-live="polite">
              <div className="pb-spinner" />
              <div className="pb-state-sub">Loading tournaments…</div>
            </div>
          ) : loadError ? (
            <div className="pb-state pb-state--error" role="alert">
              <div className="pb-state-icon">⚠</div>
              <div className="pb-state-title">Couldn't load tournaments</div>
              <div className="pb-state-sub">Check your connection and refresh the page.</div>
            </div>
          ) : (
            <div className="pb-stat-grid">
              <div className="pb-stat-tile">
                <div className="pb-stat-value">{tournaments.length}</div>
                <div className="pb-stat-label">Total Tournaments</div>
              </div>
              <div className="pb-stat-tile">
                <div className="pb-stat-value">{openCount}</div>
                <div className="pb-stat-label">Open Registration</div>
              </div>
              <div className="pb-stat-tile">
                <div className="pb-stat-value">{liveCount}</div>
                <div className="pb-stat-label">In Progress</div>
              </div>
              <div className="pb-stat-tile">
                <div className="pb-stat-value">{completeCount}</div>
                <div className="pb-stat-label">Completed</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onBrowse}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
                padding: '13px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #22e0c4, #0d9488)', color: '#031321',
                fontSize: 14.5, fontWeight: 700,
                boxShadow: '0 0 26px rgba(34, 224, 196,0.3)',
              }}
            >
              Browse Tournaments
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            {onCreate && (
              <button className="pb-btn-ghost" onClick={onCreate}>+ Create Tournament</button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="pb-container">
        <div className="pb-notice">
          🔨 Pool play, court scheduling, and live scoring are coming in a later phase — tournaments, players, and entrants can be managed now.
        </div>
      </div>
    </>
  )
}
