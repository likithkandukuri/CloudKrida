import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChess } from './ChessContext.jsx'
import { getRoundLabel, getScoreLabel } from './utils.js'

function timeAgo(ts) {
  if (!ts) return '—'
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ImageViewer({ url, onClose }) {
  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400,
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <img src={url} alt="Score record"
          style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, display: 'block' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: -12, right: -12, width: 28, height: 28, borderRadius: '50%',
          background: '#d4a336', border: 'none', color: '#050912', fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>✕</button>
      </motion.div>
    </motion.div>
  )
}

const STATUS_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'complete', label: 'Completed' },
  { key: 'live',     label: 'Live' },
  { key: 'pending',  label: 'Upcoming' },
]

export default function MatchHistory({ activeTournamentId }) {
  const { tournaments, quickMatches } = useChess()
  const [filter,    setFilter]    = useState('all')
  const [imgViewer, setImgViewer] = useState(null)

  // Combine all tournament matches with source info
  const tournamentMatches = tournaments.flatMap(t =>
    t.matches
      .filter(m => m.status !== 'bye')
      .map(m => ({
        ...m,
        _source:      t.name,
        _tournamentId: t.id,
        _totalRounds:  t.totalRounds,
        _type:        'tournament',
      }))
  )

  // Quick matches
  const formattedQuick = quickMatches.map(m => ({
    ...m,
    _source:      'Quick Match',
    _tournamentId: null,
    _totalRounds:  1,
    _type:        'quick',
  }))

  // Merge and sort newest first
  const all = [...tournamentMatches, ...formattedQuick]
    .sort((a, b) => (b.completedAt ?? b.timestamp ?? 0) - (a.completedAt ?? a.timestamp ?? 0))

  const filtered = filter === 'all'      ? all
                 : filter === 'complete' ? all.filter(m => m.status === 'complete')
                 : filter === 'live'     ? all.filter(m => m.status === 'live')
                 :                        all.filter(m => m.status === 'pending')

  const counts = {
    all:      all.length,
    complete: all.filter(m => m.status === 'complete').length,
    live:     all.filter(m => m.status === 'live').length,
    pending:  all.filter(m => m.status === 'pending').length,
  }

  return (
    <div className="chess-section">
      <div className="chess-section-head">
        <div className="chess-eyebrow">Results & History</div>
        <h2 className="chess-heading">Match History</h2>
        <p className="chess-subhead">
          All matches across tournaments and quick games ·{' '}
          {counts.complete} completed · {counts.live} live · {counts.pending} upcoming
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
              background: filter === f.key ? 'var(--cc-sel)' : 'var(--cc-surface)',
              border: `1px solid ${filter === f.key ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
              color: filter === f.key ? 'var(--cc-gold)' : 'var(--cc-muted)',
              transition: 'all 0.2s',
            }}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">
            {all.length === 0 ? 'No matches yet' : 'No matches in this filter'}
          </div>
          <div className="empty-state-sub">
            {all.length === 0
              ? 'Create a tournament or record a quick match to see results here.'
              : 'Try a different filter above.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filtered.map((m, i) => {
              const isLive     = m.status === 'live'
              const isComplete = m.status === 'complete'
              const isPending  = m.status === 'pending'
              const p1Win      = isComplete && m.winner === m.p1?.name
              const p2Win      = isComplete && m.winner === m.p2?.name
              const score      = getScoreLabel(m)

              return (
                <motion.div
                  key={`${m._tournamentId ?? 'q'}-${m.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto 1fr auto 90px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: isLive ? 'rgba(251,146,60,0.06)' : 'var(--cc-surface)',
                    border: `1px solid ${isLive ? 'rgba(251,146,60,0.25)' : 'var(--cc-border)'}`,
                    borderRadius: 10,
                  }}
                >
                  {/* # */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc-muted)' }}>
                    {i + 1}
                  </span>

                  {/* Player 1 + source */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: p1Win ? 700 : 500, color: p1Win ? 'var(--cc-gold)' : 'var(--cc-text)' }}>
                      {m.p1?.name ?? 'TBD'}
                      {p1Win && ' 🏆'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginTop: 1 }}>
                      {m._source}
                      {m._type === 'tournament' && ` · ${getRoundLabel(m.round, m._totalRounds)}`}
                    </div>
                  </div>

                  {/* Score / status */}
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    {isLive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
                                     fontWeight: 800, color: 'var(--cc-live)', justifyContent: 'center' }}>
                        <span className="live-dot" />LIVE
                      </span>
                    )}
                    {isComplete && (
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--cc-gold)', fontVariantNumeric: 'tabular-nums' }}>
                        {score}
                      </span>
                    )}
                    {isPending && (
                      <span style={{ fontSize: 11, color: 'var(--cc-muted)' }}>vs</span>
                    )}
                  </div>

                  {/* Player 2 */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: p2Win ? 700 : 500, color: p2Win ? 'var(--cc-gold)' : 'var(--cc-text)' }}>
                      {p2Win && '🏆 '}
                      {m.p2?.name === 'BYE' ? '—' : (m.p2?.name ?? 'TBD')}
                    </div>
                    {m.notes && (
                      <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginTop: 1 }}>{m.notes}</div>
                    )}
                  </div>

                  {/* Record */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {m.record?.imageUrl && (
                      <button
                        onClick={() => setImgViewer(m.record.imageUrl)}
                        style={{
                          background: 'rgba(212,163,54,0.08)', border: '1px solid rgba(212,163,54,0.2)',
                          borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
                          fontSize: 11, color: 'var(--cc-gold)',
                        }}
                      >📎</button>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--cc-muted)', whiteSpace: 'nowrap' }}>
                    {isComplete ? timeAgo(m.completedAt)
                    : isLive    ? 'In progress'
                    :             'Upcoming'}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {imgViewer && <ImageViewer url={imgViewer} onClose={() => setImgViewer(null)} />}
      </AnimatePresence>
    </div>
  )
}
