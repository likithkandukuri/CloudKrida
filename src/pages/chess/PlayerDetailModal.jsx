import { motion } from 'framer-motion'
import { fmtPts } from './pointsUtils.js'

export default function PlayerDetailModal({ player, standing, matches, canViewPrivate, onClose }) {
  if (!player) return null

  const playerMatches = (matches ?? [])
    .filter(m =>
      m.p1?.name === player.name ||
      (m.p2 && m.p2 !== 'BYE' && m.p2?.name === player.name)
    )
    .sort((a, b) => a.round - b.round)

  return (
    <motion.div
      className="pdm-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pdm-panel"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <button className="pdm-close" onClick={onClose}>✕</button>

        {/* Name + section */}
        <div className="pdm-header">
          <div className="pdm-name">{player.name}</div>
          {player.section && <div className="pdm-tag">{player.section}</div>}
        </div>

        {/* Stats row */}
        {standing && (
          <div className="pdm-stats">
            <div className="pdm-stat">
              <div className="pdm-stat-val pdm-gold">{fmtPts(standing.points)}</div>
              <div className="pdm-stat-label">Points</div>
            </div>
            <div className="pdm-stat">
              <div className="pdm-stat-val">{standing.rank ?? '—'}</div>
              <div className="pdm-stat-label">Rank</div>
            </div>
            <div className="pdm-stat">
              <div className="pdm-stat-val">{standing.wins}</div>
              <div className="pdm-stat-label">W</div>
            </div>
            <div className="pdm-stat">
              <div className="pdm-stat-val">{standing.draws}</div>
              <div className="pdm-stat-label">D</div>
            </div>
            <div className="pdm-stat">
              <div className="pdm-stat-val">{standing.losses}</div>
              <div className="pdm-stat-label">L</div>
            </div>
            {standing.byes > 0 && (
              <div className="pdm-stat">
                <div className="pdm-stat-val">{standing.byes}</div>
                <div className="pdm-stat-label">Byes</div>
              </div>
            )}
          </div>
        )}

        {/* Contact info — only for admin/superadmin */}
        {canViewPrivate && (player.email || player.phone || player.registeredAt) && (
          <div className="pdm-section">
            <div className="pdm-section-title">Contact</div>
            <div className="pdm-info-grid">
              {player.email && (
                <>
                  <span className="pdm-info-key">Email</span>
                  <span className="pdm-info-val">{player.email}</span>
                </>
              )}
              {player.phone && (
                <>
                  <span className="pdm-info-key">Phone</span>
                  <span className="pdm-info-val">{player.phone}</span>
                </>
              )}
              {player.registeredAt && (
                <>
                  <span className="pdm-info-key">Registered</span>
                  <span className="pdm-info-val">{player.registeredAt}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Match history */}
        <div className="pdm-section">
          <div className="pdm-section-title">Match History</div>
          {playerMatches.length === 0 ? (
            <div style={{ color: 'var(--cc-muted)', fontSize: 13, padding: '8px 0' }}>No matches yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {playerMatches.map(m => {
                const isP1    = m.p1?.name === player.name
                const opp     = isP1 ? m.p2 : m.p1
                const myScore = isP1 ? m.score1 : m.score2
                const opScore = isP1 ? m.score2 : m.score1
                const isBye   = m.status === 'bye'
                const result  =
                  isBye ? 'BYE' :
                  m.status !== 'complete' ? 'Pending' :
                  m.winner === player.name ? 'Win' :
                  myScore === 0.5 ? 'Draw' : 'Loss'
                const rc = result === 'Win' || result === 'BYE' ? 'var(--cc-gold)'
                         : result === 'Draw' ? 'var(--cc-sub)'
                         : result === 'Loss' ? 'var(--cc-warn)'
                         : 'var(--cc-muted)'
                const fmt = s => s === 0.5 ? '½' : s ?? '?'

                return (
                  <div key={m.id} className="pdm-match-row">
                    <span className="pdm-match-round">R{m.round + 1}</span>
                    <span className="pdm-match-opp">
                      {isBye ? '— BYE —' : `vs ${opp?.name ?? 'TBD'}`}
                    </span>
                    {(m.status === 'complete') && !isBye && (
                      <span className="pdm-match-score">{fmt(myScore)}–{fmt(opScore)}</span>
                    )}
                    <span className="pdm-match-result" style={{ color: rc }}>{result}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
