import { motion } from 'framer-motion'
import { usePickleball } from './PickleballContext.jsx'
import { STATUS_LABELS, EVENT_TYPE_LABELS, FORMAT_LABELS } from './pickleballDisplay.js'

export default function PickleballTournamentList({ onOpen, onCreate, onBack }) {
  const { tournaments, dataLoading, loadError } = usePickleball()

  return (
    <div className="pb-section pb-container" style={{ paddingTop: 150 }}>
      {onBack && <button className="pb-back" onClick={onBack}>← Back to Pickleball</button>}
      <div className="pb-section-head">
        <div className="pb-section-title">All Tournaments</div>
        {onCreate && <button className="pb-btn-primary" onClick={onCreate}>+ Create Tournament</button>}
      </div>

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
      ) : tournaments.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">🏓</div>
          <div className="pb-state-title">No tournaments yet</div>
          <div className="pb-state-sub">Pickleball tournaments will appear here once they're created.</div>
        </div>
      ) : (
        <div className="pb-tournament-grid">
          {tournaments.map((t, i) => (
            <motion.button
              key={t.id}
              className="pb-tournament-card"
              onClick={() => onOpen(t.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
            >
              <div className="pb-card-top">
                <div className="pb-card-name">{t.name}</div>
                <span className={`pb-status pb-status--${t.status}`}>{STATUS_LABELS[t.status] ?? t.status}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {EVENT_TYPE_LABELS[t.eventType] ?? t.eventType} · {FORMAT_LABELS[t.format] ?? t.format}
              </div>
              <div className="pb-card-meta">
                {t.skillDivision && <span className="pb-tag">{t.skillDivision}</span>}
                {t.ageBand && <span className="pb-tag">{t.ageBand}</span>}
                {t.courtCount && <span className="pb-tag">{t.courtCount} courts</span>}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
