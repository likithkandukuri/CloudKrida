import { motion } from 'framer-motion'
import { usePickleball } from './PickleballContext.jsx'

export default function PickleballDashboard({ onViewTournaments, onCreate, onImport }) {
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
        </motion.div>
      </div>

      <div className="pb-container">
        <div className="pb-import-feature-grid">
          <button className="pb-import-feature-card" onClick={onViewTournaments}>
            <div className="pb-import-feature-icon">🏆</div>
            <div className="pb-import-feature-title">View Tournaments</div>
            <div className="pb-import-feature-desc">
              {tournaments.length > 0
                ? `${tournaments.length} tournament${tournaments.length !== 1 ? 's' : ''} — open a bracket, manage teams and pools, or check standings.`
                : 'Browse all tournaments and open any bracket or schedule.'}
            </div>
          </button>
          {onCreate && (
            <button className="pb-import-feature-card" onClick={onCreate}>
              <div className="pb-import-feature-icon">🏓</div>
              <div className="pb-import-feature-title">Create Tournament</div>
              <div className="pb-import-feature-desc">Set up a new Pickleball tournament from scratch — event type, format, scoring, and pool/bracket configuration.</div>
            </button>
          )}
          {onImport && (
            <button className="pb-import-feature-card pb-import-feature-card--import" onClick={onImport}>
              <div className="pb-import-feature-icon">📄</div>
              <div className="pb-import-feature-title">Import Tournament Plan</div>
              <div className="pb-import-feature-desc">Upload an official tournament plan PDF and let Cloud Krida analyze the rules, teams, groups, schedule, courts, and tournament structure before creating the tournament.</div>
            </button>
          )}
        </div>

        <div className="pb-notice">
          🔨 Live court scheduling with timers is coming in a later phase — tournaments, pools, brackets, scoring, and PDF import can all be managed now.
        </div>
      </div>
    </>
  )
}
