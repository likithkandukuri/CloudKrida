import { motion } from 'framer-motion'
import { fmtPts } from './pointsUtils.js'
import { playerSubInfo } from './utils.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function StandingsView({ standings, playerFields, currentRound, totalRounds, isTiebreak, large = false, onPlayerClick = null }) {
  const pf = playerFields ?? ['name', 'elo']
  if (!standings || standings.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No standings yet</div>
        <div className="empty-state-sub">Complete some matches to see standings.</div>
      </div>
    )
  }

  const topScore    = standings[0].points
  const tiedAtTop   = standings.filter(s => s.points === topScore)
  const hasWinner   = tiedAtTop.length === 1 && currentRound !== null && currentRound >= totalRounds - 1

  const fs = large
    ? { rank: 36, name: 28, pts: 32, num: 20, th: 14 }
    : { rank: 22, name: 16, pts: 20, num: 13, th: 11 }

  return (
    <div className="standings-view">
      {/* Podium — show after final round with a clear winner */}
      {hasWinner && !isTiebreak && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'flex-end',
            marginBottom: 32, flexWrap: 'wrap',
          }}
        >
          {standings.slice(0, 3).map((s, i) => (
            <div key={s.name} style={{
              textAlign: 'center', padding: '16px 20px',
              background: i === 0 ? 'var(--cc-sel)' : 'var(--cc-surface)',
              border: `1px solid ${i === 0 ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
              borderRadius: 14,
              minWidth: 120,
              order: i === 0 ? 0 : i === 1 ? -1 : 1,
              boxShadow: i === 0 ? '0 0 32px rgba(212,163,54,0.15)' : 'none',
            }}>
              <div style={{ fontSize: i === 0 ? 36 : 28, marginBottom: 6 }}>{MEDALS[i]}</div>
              <div style={{ fontSize: i === 0 ? 17 : 14, fontWeight: 800, color: 'var(--cc-text)', lineHeight: 1.2, marginBottom: 4 }}>
                {s.name}
              </div>
              {playerSubInfo(s, pf) && (
                <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginBottom: 4 }}>{playerSubInfo(s, pf)}</div>
              )}
              <div style={{ fontSize: i === 0 ? 22 : 18, fontWeight: 900, color: 'var(--cc-gold)' }}>
                {fmtPts(s.points)}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tie notice */}
      {currentRound !== null && currentRound >= totalRounds - 1 && tiedAtTop.length > 1 && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)',
          color: 'var(--cc-warn)', fontSize: 14,
        }}>
          ⚠ {tiedAtTop.length} players tied at {fmtPts(topScore)} pts — a tiebreak round is needed.
        </div>
      )}

      <table className="standings-table">
        <thead>
          <tr>
            <th style={{ fontSize: fs.th, width: 50, textAlign: 'center' }}>#</th>
            <th style={{ fontSize: fs.th }}>Player</th>
            <th style={{ fontSize: fs.th, textAlign: 'center' }}>Pts</th>
            <th style={{ fontSize: fs.th, textAlign: 'center' }}>W</th>
            <th style={{ fontSize: fs.th, textAlign: 'center' }}>D</th>
            <th style={{ fontSize: fs.th, textAlign: 'center' }}>L</th>
            <th style={{ fontSize: fs.th, textAlign: 'center' }}>Games</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const tied = s.points === topScore && i > 0
            return (
              <motion.tr
                key={s.name}
                className="standings-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                style={{ background: i < 3 && hasWinner ? 'var(--cc-surface)' : undefined }}
              >
                <td style={{ textAlign: 'center' }}>
                  {i < 3 ? (
                    <span style={{ fontSize: fs.rank }}>{MEDALS[i]}</span>
                  ) : (
                    <span style={{ fontSize: fs.num, color: 'var(--cc-sub)', fontWeight: 700 }}>{i + 1}</span>
                  )}
                </td>
                <td>
                  <div
                    style={{ fontSize: fs.name, fontWeight: i === 0 ? 800 : 600, color: 'var(--cc-text)', lineHeight: 1.2 }}
                    className={onPlayerClick ? 'standings-player-name--clickable' : ''}
                    onClick={onPlayerClick ? () => onPlayerClick(s.name) : undefined}
                  >
                    {s.name}
                  </div>
                  {playerSubInfo(s, pf) && (
                    <div style={{ fontSize: fs.th, color: 'var(--cc-muted)', marginTop: 3 }}>
                      {playerSubInfo(s, pf)}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: fs.pts, fontWeight: 900, color: 'var(--cc-gold)' }}>
                    {fmtPts(s.points)}
                  </span>
                </td>
                <td style={{ textAlign: 'center', fontSize: fs.num, color: 'var(--cc-text)', fontWeight: 600 }}>{s.wins}</td>
                <td style={{ textAlign: 'center', fontSize: fs.num, color: 'var(--cc-sub)' }}>{s.draws}</td>
                <td style={{ textAlign: 'center', fontSize: fs.num, color: 'var(--cc-muted)' }}>{s.losses}</td>
                <td style={{ textAlign: 'center', fontSize: fs.num, color: 'var(--cc-muted)' }}>{s.gamesPlayed}</td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
