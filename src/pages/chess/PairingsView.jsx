import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getRoundLabel, getScoreLabel, getBoardNumber, playerSubInfo,
  recalculatePairings, recalculatePairingsWithAll, swapPlayers, removePlayerFromPairing, getCurrentRound,
} from './utils.js'

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, score }) {
  if (status === 'live')     return <span className="pairings-badge pairings-badge--live">🔴 LIVE</span>
  if (status === 'complete') return <span className="pairings-badge pairings-badge--done">{score ?? '—'}</span>
  if (status === 'bye')      return <span className="pairings-badge pairings-badge--bye">BYE</span>
  return <span style={{ color: 'var(--cc-muted)', fontSize: 15 }}>—</span>
}

// ── Player cell ───────────────────────────────────────────────────────────────
function PlayerCell({ match, slot, player, playerFields, isSelected, canSwap, onSelect, onRemove, onPlayerClick, editable, large }) {
  const pf          = playerFields ?? ['name', 'elo']
  const isBye       = player === 'BYE' || player?.name === 'BYE'
  const isUnpaired  = !player && !isBye
  const isWinner    = match.status === 'complete' && match.winner === player?.name
  const isPending   = match.status === 'pending'
  const fs          = large ? { name: 30, elo: 18 } : { name: 16, elo: 12 }

  const nameColor = isSelected ? 'var(--cc-gold)'
                  : isWinner   ? 'var(--cc-gold)'
                  : isUnpaired ? 'var(--cc-warn)'
                  : 'var(--cc-text)'

  const cellBg = isSelected ? 'var(--cc-sel)'
               : canSwap    ? 'var(--cc-hover)'
               : 'transparent'

  const handleClick = () => {
    if (!editable || !isPending || isBye) return
    onSelect(match.id, slot, player)
  }
  const handleRemove = (e) => {
    e.stopPropagation()
    onRemove(match.id, slot, player?.name)
  }

  return (
    <td
      onClick={handleClick}
      style={{
        padding: large ? '18px 20px' : '12px 14px',
        cursor: editable && isPending && !isBye ? 'pointer' : 'default',
        background: cellBg,
        borderRadius: 8,
        transition: 'background 0.15s',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {isSelected && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc-gold)', marginBottom: 4, letterSpacing: '0.1em' }}>
          ★ SELECTED — click another player to swap
        </div>
      )}
      {canSwap && !isSelected && (
        <div style={{ fontSize: 11, color: 'var(--cc-sub)', marginBottom: 4 }}>
          ↕ click to swap here
        </div>
      )}

      {isUnpaired ? (
        <div style={{ fontSize: fs.name * 0.85, fontStyle: 'italic', color: 'var(--cc-warn)', fontWeight: 600 }}>
          ⚠ Needs pairing
        </div>
      ) : isBye ? (
        <div style={{ fontSize: fs.name * 0.8, color: 'var(--cc-muted)', fontStyle: 'italic' }}>— BYE —</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: fs.name, fontWeight: isSelected || isWinner ? 800 : 600, color: nameColor, lineHeight: 1.2 }}>
              {player?.name}
            </div>
            {onPlayerClick && !isBye && player?.name && (
              <button
                className="player-info-btn"
                title="View player details"
                onClick={e => { e.stopPropagation(); onPlayerClick(player.name) }}
              >ℹ</button>
            )}
          </div>
          {playerSubInfo(player, pf) && (
            <div style={{ fontSize: fs.elo, color: 'var(--cc-sub)', marginTop: 3 }}>
              {playerSubInfo(player, pf)}
            </div>
          )}
        </>
      )}

      {editable && isPending && !isBye && !isUnpaired && (
        <button
          onClick={handleRemove}
          title={`Remove ${player?.name}`}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 6, width: 22, height: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--cc-warn)', transition: 'background 0.15s',
          }}
        >✕</button>
      )}
    </td>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PairingsView({
  matches,
  players,
  totalRounds,
  meta,
  playerFields,
  onMatchesUpdate,
  onRemovePlayer,
  onScoreClick = null,
  onPlayerClick = null,
  displayMode = false,
}) {
  // Backward compat: if no playerFields, default to name+elo
  const pf = playerFields ?? ['name', 'elo']
  const activeRound = getCurrentRound(matches)
  const [round,    setRound]    = useState(activeRound)
  const [search,   setSearch]   = useState('')
  const [sortKey,  setSortKey]  = useState('board')
  const [sortDir,  setSortDir]  = useState(1)
  const [selected, setSelected] = useState(null)

  const editable = !!onMatchesUpdate && !displayMode

  const handlePlayerSelect = (matchId, slot, player) => {
    if (!editable) return
    if (!selected) { setSelected({ matchId, slot }) }
    else if (selected.matchId === matchId && selected.slot === slot) { setSelected(null) }
    else {
      onMatchesUpdate(swapPlayers(matches, selected.matchId, selected.slot, matchId, slot))
      setSelected(null)
    }
  }

  const handleRemove = (matchId, slot, playerName) => {
    if (!onRemovePlayer || !playerName) return
    if (!confirm(`Remove "${playerName}" from the tournament?\n\nTheir opponent will need re-pairing.\nUse "Recalculate Pairings" to rebuild the round.`)) return
    onRemovePlayer(playerName)
    setSelected(null)
  }

  const handleRecalculate = () => {
    if (!onMatchesUpdate) return
    // Count pending matches AND any players not yet in the round
    const inRound = new Set()
    matches.filter(m => m.round === round).forEach(m => {
      if (m.p1?.name) inRound.add(m.p1.name)
      if (m.p2?.name && m.p2 !== 'BYE') inRound.add(m.p2.name)
    })
    const pendingCount  = matches.filter(m => m.round === round && m.status === 'pending').length
    const unmatchedCount = (players ?? []).filter(p => !inRound.has(p.name)).length
    if (!pendingCount && !unmatchedCount) { alert('No pending matches to recalculate.'); return }
    const msg = unmatchedCount > 0
      ? `Re-pair all pending matches and add ${unmatchedCount} new player${unmatchedCount !== 1 ? 's' : ''} to this round?`
      : 'Re-shuffle and re-pair all players in pending matches?\nCompleted matches are not affected.'
    if (!confirm(msg)) return
    onMatchesUpdate(recalculatePairingsWithAll(matches, players ?? []))
    setSelected(null)
  }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(1) }
  }

  const roundMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return matches
      .filter(m => m.round === round)
      .filter(m => {
        if (!q) return true
        const bd = String(getBoardNumber(m))
        const matchesPlayer = (p) => {
          if (!p || p === 'BYE' || p?.name === 'BYE') return false
          if (p.name?.toLowerCase().includes(q)) return true
          if (pf.includes('elo')   && String(p.elo ?? p.rating ?? '').includes(q)) return true
          if (pf.includes('grade') && (p.grade ?? '').toLowerCase().includes(q))   return true
          if (pf.includes('age')   && String(p.age ?? '').includes(q))             return true
          return false
        }
        return matchesPlayer(m.p1) || matchesPlayer(m.p2) || bd.includes(q)
      })
      .slice()
      .sort((a, b) => {
        let va, vb
        if (sortKey === 'board') { va = a.slot; vb = b.slot }
        else if (sortKey === 'white') { va = a.p1?.name ?? ''; vb = b.p1?.name ?? '' }
        else { va = a.p2?.name ?? ''; vb = b.p2?.name ?? '' }
        return typeof va === 'number' ? (va - vb) * sortDir : va.localeCompare(vb) * sortDir
      })
  }, [matches, round, search, sortKey, sortDir])

  const unpaired  = matches.filter(m => m.round === round && m.status === 'pending' && (!m.p1 || !m.p2))
  const hasUnpaired = unpaired.length > 0

  const SortIcon = ({ k }) => (
    <span style={{ marginLeft: 4, opacity: sortKey !== k ? 0.3 : 1 }}>
      {sortKey === k ? (sortDir === 1 ? '↑' : '↓') : '↕'}
    </span>
  )

  const fs = displayMode
    ? { board: 48, name: 32, elo: 20, th: 16 }
    : { board: 22, name: 16, elo: 12, th: 11 }

  const roundTabStyle = (r) => ({
    padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12,
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: round === r ? 'var(--cc-sel)' : 'var(--cc-surface)',
    border: `1px solid ${round === r ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
    color: round === r ? 'var(--cc-gold)' : 'var(--cc-muted)',
  })

  return (
    <div className={`pairings-view ${displayMode ? 'pairings-display' : ''}`}>

      {/* Print header */}
      <div className="print-header">
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{meta?.name ?? 'Tournament'}</div>
        <div style={{ fontSize: 16, marginBottom: 4 }}>{getRoundLabel(round, totalRounds)} — Pairings</div>
        <div style={{ fontSize: 12 }}>{new Date().toLocaleDateString()}</div>
        <hr style={{ margin: '12px 0' }} />
      </div>

      {/* Controls */}
      {!displayMode && (
        <>
          <div className="pairings-controls no-print">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: totalRounds }, (_, r) => (
                <button key={r} onClick={() => { setRound(r); setSelected(null) }} style={roundTabStyle(r)}>
                  {getRoundLabel(r, totalRounds)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
              <input
                className="chess-input"
                placeholder="🔍 Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 180 }}
              />
              {editable && (
                <button className="chess-btn-gold" onClick={handleRecalculate}
                  title="Re-shuffle pending matches and re-pair all players"
                  style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  🔀 Recalculate
                </button>
              )}
              <button className="chess-btn-ghost" onClick={() => window.print()} style={{ fontSize: 13 }}>
                🖨 Print
              </button>
            </div>
          </div>

          {/* Warning / swap banner */}
          <AnimatePresence>
            {(selected || hasUnpaired) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="no-print"
                style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13,
                  background: selected ? 'var(--cc-sel)' : 'rgba(248,113,113,0.07)',
                  border: `1px solid ${selected ? 'var(--cc-border2)' : 'rgba(248,113,113,0.3)'}`,
                  color: selected ? 'var(--cc-gold)' : 'var(--cc-warn)',
                }}
              >
                {selected
                  ? '★ Player selected — click any other player to swap them.'
                  : `⚠ ${unpaired.length} board${unpaired.length > 1 ? 's need' : ' needs'} pairing. Click "Recalculate" to rebuild.`
                }
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Table */}
      {roundMatches.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          <div className="empty-state-icon">♟</div>
          <div className="empty-state-title">{search ? 'No matches found' : 'No matches this round'}</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="pairings-table">
            <thead>
              <tr>
                <th style={{ fontSize: fs.th, width: 80 }} onClick={() => toggleSort('board')}>
                  Board <SortIcon k="board" />
                </th>
                <th style={{ fontSize: fs.th }} onClick={() => toggleSort('white')}>
                  ♔ White <SortIcon k="white" />
                </th>
                <th style={{ fontSize: fs.th }} onClick={() => toggleSort('black')}>
                  ♚ Black <SortIcon k="black" />
                </th>
                <th style={{ fontSize: fs.th, width: 110 }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {roundMatches.map((m, i) => {
                const sel1  = selected?.matchId === m.id && selected?.slot === 'p1'
                const sel2  = selected?.matchId === m.id && selected?.slot === 'p2'
                const canSw = (slot) => selected && !sel1 && !sel2 && m.status === 'pending'
                  && (slot === 'p1' ? m.p1?.name : m.p2?.name && m.p2 !== 'BYE')

                return (
                  <motion.tr
                    key={m.id}
                    className={`pairings-row ${m.status === 'live' ? 'pairings-row--live' : ''} ${i % 2 === 0 ? 'pairings-row--even' : ''}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                  >
                    <td className="pairings-board" style={{ fontSize: fs.board }}>
                      {getBoardNumber(m)}
                    </td>
                    <PlayerCell
                      match={m} slot="p1" player={m.p1}
                      playerFields={pf}
                      isSelected={sel1} canSwap={canSw('p1')}
                      onSelect={handlePlayerSelect} onRemove={handleRemove}
                      onPlayerClick={onPlayerClick}
                      editable={editable} large={displayMode}
                    />
                    <PlayerCell
                      match={m} slot="p2" player={m.p2?.name === 'BYE' ? 'BYE' : m.p2}
                      playerFields={pf}
                      isSelected={sel2} canSwap={canSw('p2')}
                      onSelect={handlePlayerSelect} onRemove={handleRemove}
                      onPlayerClick={onPlayerClick}
                      editable={editable} large={displayMode}
                    />
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <StatusBadge status={m.status} score={getScoreLabel(m)} />
                      {onScoreClick && m.status === 'pending' && m.p1 && m.p2 && m.p2 !== 'BYE' && m.p2?.name !== 'BYE' && (
                        <button
                          onClick={() => onScoreClick(m)}
                          style={{
                            marginTop: 5, display: 'block', width: '100%',
                            padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit',
                            background: 'var(--cc-hover)', border: '1px solid var(--cc-border2)',
                            color: 'var(--cc-gold)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          }}
                        >Enter Result</button>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
