import { motion, AnimatePresence } from 'framer-motion'
import { useChess } from './ChessContext.jsx'

function timeAgo(ts) {
  if (!ts) return ''
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Event card (parent event with section list) ───────────────────────────────
function EventCard({ event, sections, onOpenEvent, onDelete, isSuperAdmin }) {
  const allComplete  = sections.length > 0 && sections.every(s => s.status === 'complete')
  const anyLive      = sections.some(s => s.status === 'active')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="chess-card event-card"
      style={{ padding: '20px 24px', marginBottom: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
              color: '#f0c060', opacity: 0.8 }}>EVENT</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--cc-text)', letterSpacing: '-0.01em' }}>
              🏆 {event.name}
            </span>
            {anyLive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800,
                letterSpacing: '0.12em', color: 'var(--cc-live)' }}>
                <span className="live-dot" />LIVE
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '2px 8px',
              borderRadius: 5, textTransform: 'uppercase',
              background: allComplete ? 'rgba(212,163,54,0.12)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${allComplete ? 'rgba(212,163,54,0.3)' : 'rgba(59,130,246,0.25)'}`,
              color: allComplete ? 'var(--cc-gold)' : 'var(--cc-sub)',
            }}>
              {allComplete ? 'Complete' : 'Active'}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ fontSize: 13, color: 'var(--cc-sub)', marginBottom: 12 }}>
            {sections.length} section{sections.length !== 1 ? 's' : ''}
            {event.date && ` · 📅 ${fmtDate(event.date)}`}
            {event.location && ` · 📍 ${event.location}`}
            <span style={{ color: 'var(--cc-muted)', marginLeft: 6 }}>{timeAgo(event.createdAt)}</span>
          </div>

          {/* Section chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sections.map(s => (
              <span key={s.id} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 5, fontWeight: 600,
                background: 'rgba(212,163,54,0.08)', border: '1px solid rgba(212,163,54,0.18)',
                color: 'var(--cc-sub)',
              }}>
                ♟ {s.name}
              </span>
            ))}
            {sections.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--cc-muted)', fontStyle: 'italic' }}>
                No sections yet
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button
            className="chess-btn-gold"
            style={{ padding: '8px 18px', fontSize: 13 }}
            onClick={() => onOpenEvent(event.id)}
          >
            Open Event
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => {
                if (confirm(`Delete "${event.name}"? This will permanently delete all ${sections.length} section(s) inside it.`))
                  onDelete(event.id)
              }}
              style={{
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--cc-warn)',
                fontSize: 13, fontFamily: 'inherit', transition: 'background 0.2s',
              }}
            >Delete</button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Standalone tournament card ─────────────────────────────────────────────────
function TournamentCard({ t, onOpen, onDelete, isSuperAdmin }) {
  const totalMatches = t.matches.filter(m => m.status !== 'bye').length
  const doneMatches  = t.matches.filter(m => m.status === 'complete').length
  const liveMatches  = t.matches.filter(m => m.status === 'live').length
  const finalMatch   = t.matches.find(m => m.round === t.totalRounds - 1 && m.slot === 0)
  const champion     = finalMatch?.winner ?? null
  const isComplete   = !!champion
  const pct          = totalMatches > 0 ? Math.round((doneMatches / totalMatches) * 100) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="chess-card"
      style={{ padding: '20px 24px', marginBottom: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--cc-text)', letterSpacing: '-0.01em' }}>
              {t.name}
            </span>
            {liveMatches > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800,
                letterSpacing: '0.12em', color: 'var(--cc-live)' }}>
                <span className="live-dot" />LIVE
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '2px 8px',
              borderRadius: 5, textTransform: 'uppercase',
              background: isComplete ? 'rgba(212,163,54,0.12)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${isComplete ? 'rgba(212,163,54,0.3)' : 'rgba(59,130,246,0.25)'}`,
              color: isComplete ? 'var(--cc-gold)' : 'var(--cc-sub)',
            }}>
              {isComplete ? 'Complete' : 'Active'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--cc-muted)' }}>{timeAgo(t.createdAt)}</span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--cc-sub)', marginBottom: 10 }}>
            {t.players.length} players · {t.totalRounds} round{t.totalRounds !== 1 ? 's' : ''}
            {isComplete
              ? ` · 🏆 Champion: ${champion}`
              : ` · ${doneMatches}/${totalMatches} matches complete`
            }
          </div>

          {!isComplete && totalMatches > 0 && (
            <div style={{ height: 3, background: 'rgba(212,163,54,0.1)', borderRadius: 2, overflow: 'hidden', maxWidth: 300 }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg,#d4a336,#a07820)',
                width: `${pct}%`, borderRadius: 2, transition: 'width 0.5s ease',
              }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button className="chess-btn-gold" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => onOpen(t.id)}>
            {isComplete ? 'View Results' : 'Open Bracket'}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => {
                if (confirm(`Delete "${t.name}"? This cannot be undone.`)) onDelete(t.id)
              }}
              style={{
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--cc-warn)',
                fontSize: 13, fontFamily: 'inherit', transition: 'background 0.2s',
              }}
            >Delete</button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main list component ───────────────────────────────────────────────────────
export default function TournamentList({ onOpen, onOpenEvent, onCreate, isSuperAdmin = false }) {
  const { tournaments, events, deleteTournament, deleteEvent } = useChess()

  const standaloneTournaments = tournaments.filter(t => !t.eventId)
  const hasAnything = events.length > 0 || standaloneTournaments.length > 0

  return (
    <div className="chess-section">
      <div className="chess-section-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="chess-eyebrow">All Events & Tournaments</div>
          <h2 className="chess-heading">Tournament Library</h2>
          <p className="chess-subhead">
            {!hasAnything
              ? isSuperAdmin ? 'No tournaments yet — create or import your first one.' : 'No tournaments available yet.'
              : `${events.length > 0 ? `${events.length} event${events.length !== 1 ? 's' : ''}` : ''}${events.length > 0 && standaloneTournaments.length > 0 ? ' · ' : ''}${standaloneTournaments.length > 0 ? `${standaloneTournaments.length} standalone tournament${standaloneTournaments.length !== 1 ? 's' : ''}` : ''}`
            }
          </p>
        </div>
        {isSuperAdmin && onCreate && (
          <button className="chess-btn-gold" onClick={onCreate}>
            + New Tournament
          </button>
        )}
      </div>

      {!hasAnything ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-title">
            {isSuperAdmin ? 'No tournaments yet' : 'No tournaments available'}
          </div>
          <div className="empty-state-sub">
            {isSuperAdmin
              ? 'Import a CSV to create a full event, or create a standalone tournament.'
              : 'Tournaments will appear here once the Super Admin creates them.'}
          </div>
          {isSuperAdmin && onCreate && (
            <button className="chess-btn-gold" style={{ marginTop: 20 }} onClick={onCreate}>
              ♛ Create Tournament
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {/* Events (parent events with sections) */}
          {events.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              sections={tournaments.filter(t => t.eventId === ev.id)}
              onOpenEvent={onOpenEvent}
              onDelete={deleteEvent}
              isSuperAdmin={isSuperAdmin}
            />
          ))}

          {/* Standalone tournaments (not part of any event) */}
          {standaloneTournaments.length > 0 && events.length > 0 && (
            <motion.div
              key="standalone-divider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--cc-muted)',
                padding: '4px 0 12px', marginTop: 8, borderTop: '1px solid var(--cc-sep)' }}
            >
              STANDALONE TOURNAMENTS
            </motion.div>
          )}
          {standaloneTournaments.map(t => (
            <TournamentCard
              key={t.id}
              t={t}
              onOpen={onOpen}
              onDelete={deleteTournament}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
