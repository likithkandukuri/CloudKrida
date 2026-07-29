import { useState } from 'react'
import { motion } from 'framer-motion'
import { getRoundLabel, getCurrentRound } from './utils.js'
import PairingsView from './PairingsView.jsx'
import StandingsView from './StandingsView.jsx'

// ── Bracket tab ───────────────────────────────────────────────────────────────
function BracketTab({ matches, totalRounds }) {
  const live    = matches.filter(m => m.status === 'live')
  const grouped = Array.from({ length: totalRounds }, (_, r) => ({
    round:   r,
    label:   getRoundLabel(r, totalRounds),
    matches: matches.filter(m => m.round === r && m.status !== 'bye'),
  })).filter(g => g.matches.length > 0)

  const MatchBlock = ({ m, large }) => {
    const p1Win  = m.status === 'complete' && m.winner === m.p1?.name
    const p2Win  = m.status === 'complete' && m.winner === m.p2?.name
    const isLive = m.status === 'live'
    const s1     = m.score1 === 0.5 ? '½' : m.score1
    const s2     = m.score2 === 0.5 ? '½' : m.score2
    const board  = m.slot + 1
    const fs     = large
      ? { board: 13, name: 22, elo: 13, score: 20 }
      : { board: 10, name: 15, elo: 11, score: 14 }

    return (
      <div style={{
        background: isLive ? 'rgba(251,146,60,0.06)' : 'var(--cc-surface)',
        border: `1px solid ${isLive ? 'rgba(251,146,60,0.3)' : 'var(--cc-border)'}`,
        borderRadius: 14,
        padding: large ? '20px 24px' : '14px 16px',
        boxShadow: isLive ? '0 0 24px rgba(251,146,60,0.1)' : 'none',
      }}>
        {/* Board + live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: large ? 12 : 8 }}>
          <span style={{ fontSize: fs.board, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--cc-gold)', textTransform: 'uppercase' }}>
            Board {board}
          </span>
          {isLive && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: fs.board, fontWeight: 800, color: 'var(--cc-live)' }}>
              <span className="live-dot" />LIVE
            </span>
          )}
          {m.status === 'complete' && s1 !== null && (
            <span style={{ fontSize: fs.score, fontWeight: 800, color: 'var(--cc-gold)', fontVariantNumeric: 'tabular-nums' }}>
              {s1} – {s2}
            </span>
          )}
        </div>

        {/* Players */}
        {[
          { player: m.p1, isWinner: p1Win, icon: '♔' },
          { player: m.p2?.name === 'BYE' ? null : m.p2, isWinner: p2Win, icon: '♚' },
        ].map((row, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: `${large ? 8 : 5}px ${large ? 10 : 6}px`,
            borderRadius: 8,
            background: row.isWinner ? 'var(--cc-sel)' : 'transparent',
            marginBottom: i === 0 ? 4 : 0,
          }}>
            <span style={{ fontSize: large ? 20 : 14, opacity: 0.65, flexShrink: 0 }}>{row.icon}</span>
            <div>
              <div style={{
                fontSize: fs.name,
                fontWeight: row.isWinner ? 800 : 600,
                color: row.isWinner ? 'var(--cc-gold)' : 'var(--cc-text)',
              }}>
                {row.player?.name ?? 'TBD'}
              </div>
              {row.player?.rating && (
                <div style={{ fontSize: fs.elo, color: 'var(--cc-sub)' }}>ELO {row.player.rating}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="display-body">
      {live.length > 0 && (
        <div>
          <div className="display-round-label" style={{ color: 'var(--cc-live)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" style={{ width: 8, height: 8 }} />LIVE MATCHES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {live.map(m => <MatchBlock key={m.id} m={m} large />)}
          </div>
        </div>
      )}
      {grouped.map(({ round, label, matches: rMs }) => (
        <div key={round}>
          <div className="display-round-label">{label}</div>
          <div className="display-matches-grid">
            {rMs.map(m => <MatchBlock key={m.id} m={m} large={false} />)}
          </div>
        </div>
      ))}
      {matches.filter(m => m.status !== 'bye').length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No matches yet</div></div>
      )}
    </div>
  )
}

// ── DisplayMode root ──────────────────────────────────────────────────────────
export default function DisplayMode({ matches, totalRounds, meta, onClose, standings = null, playerFields }) {
  const isPoints = meta?.format === 'points_tournament'
  const [tab, setTab] = useState(isPoints ? 'standings' : 'pairings')

  const champion       = matches.find(m => m.round === totalRounds - 1 && m.slot === 0)?.winner
  const completedCount = matches.filter(m => m.status === 'complete').length
  const totalCount     = matches.filter(m => m.status !== 'bye').length
  const liveCount      = matches.filter(m => m.status === 'live').length

  const tabBtnStyle = (id) => ({
    padding: '7px 18px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: tab === id ? 'var(--cc-sel)' : 'transparent',
    color: tab === id ? 'var(--cc-gold)' : 'var(--cc-muted)',
  })

  return (
    <motion.div
      className="display-mode"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="display-header">
        <div>
          <div className="display-title">♛ {meta?.name ?? 'Chess Tournament'}</div>
          <div className="display-subtitle" style={{ color: 'var(--cc-sub)', marginTop: 4 }}>
            {champion
              ? `🏆 Champion: ${champion}`
              : `${completedCount}/${totalCount} complete${liveCount ? ` · ${liveCount} live` : ''}`
            }
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', padding: 3, gap: 3, borderRadius: 10,
            background: 'var(--cc-surface)', border: '1px solid var(--cc-border)',
          }}>
            {[
              ...(isPoints ? [{ id: 'standings', label: '📊 Standings' }] : []),
              { id: 'pairings', label: '📋 Pairings' },
              ...(!isPoints ? [{ id: 'bracket', label: '🏆 Bracket' }] : []),
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={tabBtnStyle(t.id)}>{t.label}</button>
            ))}
          </div>
          {/* Progress */}
          {totalCount > 0 && (
            <div style={{ width: 120 }}>
              <div style={{ height: 4, background: 'var(--cc-surface)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg,var(--cc-gold),#a07820)',
                  width: `${(completedCount / totalCount) * 100}%`, borderRadius: 2, transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )}
          <button className="display-close" onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Close
          </button>
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div style={{
          background: 'var(--cc-sel)', borderBottom: '1px solid var(--cc-border2)',
          padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 40 }}>🏆</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--cc-gold)', marginBottom: 4 }}>CHAMPION</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--cc-text)' }}>{champion}</div>
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'standings' && standings && (
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
          <StandingsView standings={standings} playerFields={playerFields} currentRound={getCurrentRound(matches)} totalRounds={totalRounds} isTiebreak={false} large />
        </div>
      )}
      {tab === 'bracket'  && <BracketTab matches={matches} totalRounds={totalRounds} />}
      {tab === 'pairings' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
          <PairingsView
            matches={matches} totalRounds={totalRounds} meta={meta}
            displayMode
          />
        </div>
      )}
    </motion.div>
  )
}
