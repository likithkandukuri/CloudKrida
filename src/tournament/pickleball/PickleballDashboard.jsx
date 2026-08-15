import { motion } from 'framer-motion'
import { usePickleball } from './PickleballContext.jsx'
import PickleballCountdown from './PickleballCountdown.jsx'
import { computeTimingStatus } from './pickleballTime.js'
import { usePickleballClock } from './usePickleballClock.js'

// Picks the single most relevant tournament to headline, if any: a live one
// first, else the soonest starting-soon one. Merely "upcoming" tournaments
// (more than an hour out) are deliberately not surfaced here — the banner
// exists to answer "is something happening right now / very soon", not to
// duplicate the tournament library.
function pickHeadline(tournaments, nowMs) {
  const live = tournaments.filter(t => computeTimingStatus(t, nowMs) === 'live')
  if (live.length) return { tournament: live[0], status: 'live' }
  const soon = tournaments
    .filter(t => computeTimingStatus(t, nowMs) === 'starting_soon')
    .sort((a, b) => (a.startAt ?? Infinity) - (b.startAt ?? Infinity))
  if (soon.length) return { tournament: soon[0], status: 'starting_soon' }
  return null
}

export default function PickleballDashboard({ onViewTournaments, onCreate, onImport }) {
  const { tournaments, dataLoading, loadError } = usePickleball()
  const nowMs = usePickleballClock(30000)
  const headline = pickHeadline(tournaments, nowMs)

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
        {headline && (
          <button
            className={`pb-live-banner ${headline.status === 'starting_soon' ? 'pb-live-banner--upcoming' : ''}`}
            onClick={onViewTournaments}
          >
            {headline.status === 'live' ? '🔴 LIVE NOW:' : '🟡 Starting Soon:'}
            <span className="pb-live-banner-name">{headline.tournament.name}</span>
            {headline.status === 'starting_soon' && (
              <PickleballCountdown label="in" targetMs={headline.tournament.startAt} nowMs={nowMs} />
            )}
          </button>
        )}

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
          🏓 Tournaments, pools, brackets, scoring, live status/countdowns, and PDF import can all be managed now.
        </div>
      </div>
    </>
  )
}
