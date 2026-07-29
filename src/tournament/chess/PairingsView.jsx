import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getRoundLabel, getScoreLabel, getBoardNumber, playerSubInfo,
  recalculatePairingsWithAll, smartRepair, swapPlayers, removePlayerFromPairing,
  getCurrentRound, toggleMatchLock, flipMatchColors, assignMatchBye, removeMatchBye,
  setMatchSlot, validatePairings,
} from './utils.js'

const fmtPts = (n) => (n == null ? null : n % 1 === 0 ? String(n) : n.toFixed(1))

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, score }) {
  if (status === 'live')     return <span className="pairings-badge pairings-badge--live">🔴 LIVE</span>
  if (status === 'complete') return <span className="pairings-badge pairings-badge--done">{score ?? '—'}</span>
  if (status === 'bye')      return <span className="pairings-badge pairings-badge--bye">BYE</span>
  return <span style={{ color: 'var(--cc-muted)', fontSize: 15 }}>—</span>
}

// ── Small action button ───────────────────────────────────────────────────────
function ActBtn({ onClick, title, children, warn, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '3px 7px', borderRadius: 5, border: `1px solid ${warn ? 'rgba(248,113,113,0.3)' : active ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
        background: warn ? 'rgba(248,113,113,0.08)' : active ? 'var(--cc-sel)' : 'var(--cc-surface)',
        color: warn ? 'var(--cc-warn)' : active ? 'var(--cc-gold)' : 'var(--cc-muted)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap', lineHeight: 1.4, transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ── Player cell ───────────────────────────────────────────────────────────────
function PlayerCell({ match, slot, player, playerFields, isSelected, canSwap, onSelect, onRemove, onPlayerClick, editable, large, removeTitle = 'Remove' }) {
  const pf          = playerFields ?? ['name', 'elo']
  const isBye       = player === 'BYE' || player?.name === 'BYE'
  const isUnpaired  = !player && !isBye
  const isWinner    = match.status === 'complete' && match.winner === player?.name
  const isPending   = match.status === 'pending'
  const isLocked    = !!match.locked
  const fs          = large ? { name: 30, elo: 18 } : { name: 16, elo: 12 }

  const nameColor = isSelected ? 'var(--cc-gold)'
                  : isWinner   ? 'var(--cc-gold)'
                  : isUnpaired ? 'var(--cc-warn)'
                  : 'var(--cc-text)'

  const cellBg = isSelected ? 'var(--cc-sel)'
               : canSwap    ? 'var(--cc-hover)'
               : 'transparent'

  const handleClick = () => {
    if (!editable || !isPending || isBye || isLocked) return
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
        cursor: editable && isPending && !isBye && !isLocked ? 'pointer' : 'default',
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
            <div style={{ fontSize: fs.elo, color: 'var(--cc-sub)', marginTop: 2 }}>
              {playerSubInfo(player, pf)}
            </div>
          )}
        </>
      )}

      {editable && isPending && !isBye && !isUnpaired && !isLocked && (
        <button
          onClick={handleRemove}
          title={`${removeTitle} ${player?.name}`}
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
  standings = [],
  withdrawMode = false,
}) {
  const pf = playerFields ?? ['name', 'elo']
  const activeRound = getCurrentRound(matches)
  const [round,          setRound]          = useState(activeRound)
  const [search,         setSearch]         = useState('')
  const [sortKey,        setSortKey]        = useState('board')
  const [sortDir,        setSortDir]        = useState(1)
  const [selected,       setSelected]       = useState(null)
  const [editingBoard,   setEditingBoard]   = useState(null) // { matchId, value }
  const [boardError,     setBoardError]     = useState(null) // { matchId, msg }
  const [validationWarn, setValidationWarn] = useState(null) // null | string[]

  // Reset per-round UI state when round changes
  useEffect(() => {
    setValidationWarn(null)
    setEditingBoard(null)
    setBoardError(null)
    setSelected(null)
  }, [round])

  const editable = !!onMatchesUpdate && !displayMode

  // Standing lookup: player name → points (only show in round > 0)
  const standingMap = useMemo(() =>
    Object.fromEntries((standings ?? []).map(s => [s.name, s.points ?? 0])),
    [standings]
  )
  const showPts = (standings?.length ?? 0) > 0 && round > 0

  // ── Pairing swap ─────────────────────────────────────────────────────────────
  const handlePlayerSelect = (matchId, slot, player) => {
    if (!editable) return
    if (!selected) { setSelected({ matchId, slot }) }
    else if (selected.matchId === matchId && selected.slot === slot) { setSelected(null) }
    else {
      onMatchesUpdate(swapPlayers(matches, selected.matchId, selected.slot, matchId, slot))
      setSelected(null)
    }
  }

  // ── Remove player ─────────────────────────────────────────────────────────────
  const handleRemove = (matchId, slot, playerName) => {
    if (!onRemovePlayer || !playerName) return
    const msg = withdrawMode
      ? `Withdraw "${playerName}" from active play?\n\n` +
        `They'll be pulled from this round's pairings, but their standings, points, and match history stay intact.\n` +
        `Their opponent will need re-pairing — use "🩹 Repair" to fix just that board.\n` +
        `Reactivate them anytime from "➕ Add Player".`
      : `Remove "${playerName}" from the tournament?\n\n` +
        `Their opponent will need re-pairing.\n` +
        `Use "🩹 Repair" to fix only the affected board, leaving other pairings intact.`
    if (!confirm(msg)) return
    onRemovePlayer(playerName)
    setSelected(null)
  }

  // ── Smart Repair ─────────────────────────────────────────────────────────────
  const handleRepair = () => {
    if (!onMatchesUpdate) return
    const inRound = matches.filter(m => m.round === round)
    const nullSlots = inRound.filter(m =>
      m.status === 'pending' && !m.locked &&
      (!m.p1?.name || !m.p2 || m.p2 === null || m.p2 === 'BYE' || m.p2?.name === 'BYE')
    )
    const allInRound = new Set(inRound.flatMap(m => [m.p1?.name, m.p2?.name]).filter(Boolean))
    const newPlayers = (players ?? []).filter(p => !allInRound.has(p.name))
    if (!nullSlots.length && !newPlayers.length) {
      alert('Nothing to repair — all boards are fully paired.')
      return
    }
    const parts = []
    if (nullSlots.length) parts.push(`${nullSlots.length} board${nullSlots.length > 1 ? 's' : ''} with missing opponents`)
    if (newPlayers.length) parts.push(`${newPlayers.length} new player${newPlayers.length > 1 ? 's' : ''} to add`)
    if (!confirm(`Repair: ${parts.join(' + ')}?\n\nAll other pairings will remain exactly as-is.`)) return
    onMatchesUpdate(smartRepair(matches, players ?? []))
    setSelected(null)
  }

  // ── Full reshuffle + auto-validate ────────────────────────────────────────────
  const handleReshuffle = () => {
    if (!onMatchesUpdate) return
    const pending = matches.filter(m => m.round === round && m.status === 'pending' && !m.locked)
    if (!pending.length) { alert('No unlocked pending matches to reshuffle.'); return }
    const lockedCount = matches.filter(m => m.round === round && m.status === 'pending' && m.locked).length
    const msg = lockedCount > 0
      ? `Reshuffle all ${pending.length} unlocked pending match${pending.length !== 1 ? 'es' : ''}?\n\n${lockedCount} locked match${lockedCount !== 1 ? 'es' : ''} will stay in place.\nCompleted matches are never touched.`
      : `Reshuffle all ${pending.length} pending match${pending.length !== 1 ? 'es' : ''}?\n\nThis randomizes all pending pairings for this round.\nCompleted matches are never touched.`
    if (!confirm(msg)) return
    const reshuffled = recalculatePairingsWithAll(matches, players ?? [])
    onMatchesUpdate(reshuffled)
    setSelected(null)
    setValidationWarn(validatePairings(reshuffled, round))
  }

  // ── Board number editing ──────────────────────────────────────────────────────
  const handleBoardCommit = (matchId) => {
    if (!editingBoard || editingBoard.matchId !== matchId) return
    const num = parseInt(editingBoard.value)
    if (isNaN(num) || num < 1) {
      setBoardError({ matchId, msg: 'Must be ≥ 1' })
      return
    }
    const { matches: updated, error } = setMatchSlot(matches, matchId, num)
    if (error) {
      setBoardError({ matchId, msg: error })
      return
    }
    onMatchesUpdate(updated)
    setEditingBoard(null)
    setBoardError(null)
  }

  // ── Lock / unlock ─────────────────────────────────────────────────────────────
  const handleLock = (matchId) => {
    if (!onMatchesUpdate) return
    onMatchesUpdate(toggleMatchLock(matches, matchId))
    setSelected(null)
  }

  // ── Flip colors ───────────────────────────────────────────────────────────────
  const handleFlipColors = (matchId) => {
    if (!onMatchesUpdate) return
    onMatchesUpdate(flipMatchColors(matches, matchId))
  }

  // ── BYE management ───────────────────────────────────────────────────────────
  const handleAssignBye = (matchId, recipientSlot) => {
    if (!onMatchesUpdate) return
    onMatchesUpdate(assignMatchBye(matches, matchId, recipientSlot))
  }

  const handleRemoveBye = (matchId) => {
    if (!onMatchesUpdate) return
    if (!confirm('Remove BYE and revert to pending?\n\nThe board will need a new opponent. Use "Repair" to pair them.')) return
    onMatchesUpdate(removeMatchBye(matches, matchId))
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const handleValidate = () => setValidationWarn(validatePairings(matches, round))

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

  // Status summaries
  const nullSlotMatches = matches.filter(m => m.round === round && m.status === 'pending' && !m.locked &&
    (!m.p1?.name || !m.p2 || m.p2 === null || m.p2 === 'BYE' || m.p2?.name === 'BYE'))
  const allInRound = new Set(matches.filter(m => m.round === round).flatMap(m => [m.p1?.name, m.p2?.name]).filter(Boolean))
  const waitingPlayers = (players ?? []).filter(p => !allInRound.has(p.name))
  const needsRepair = nullSlotMatches.length > 0 || waitingPlayers.length > 0

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
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="chess-input"
                placeholder="🔍 Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 160 }}
              />
              {editable && (
                <>
                  <button
                    className="chess-btn-gold"
                    onClick={handleRepair}
                    title="Fix only boards with missing players — all other pairings stay exactly as-is"
                    style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    🩹 Repair
                  </button>
                  <button
                    className="chess-btn-ghost"
                    onClick={handleReshuffle}
                    title="Reshuffle ALL pending (non-locked) matches — randomizes pairings"
                    style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    🔀 Reshuffle
                  </button>
                  <button
                    className="chess-btn-ghost"
                    onClick={handleValidate}
                    title="Check for repeat opponents, duplicate boards, multiple BYEs, etc."
                    style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    ✓ Validate
                  </button>
                </>
              )}
              <button className="chess-btn-ghost" onClick={() => window.print()} style={{ fontSize: 13 }}>
                🖨 Print
              </button>
            </div>
          </div>

          {/* Status + validation banners */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key="swap-banner"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="no-print"
                style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 10, fontSize: 13,
                  background: 'var(--cc-sel)', border: '1px solid var(--cc-border2)',
                  color: 'var(--cc-gold)',
                }}
              >
                ★ Player selected — click any other non-locked player to swap them, or click the same player to cancel.
              </motion.div>
            )}
            {!selected && needsRepair && (
              <motion.div
                key="repair-banner"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="no-print"
                style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 10, fontSize: 13,
                  background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)',
                  color: 'var(--cc-warn)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}
              >
                <span>
                  {nullSlotMatches.length > 0 && `⚠ ${nullSlotMatches.length} board${nullSlotMatches.length > 1 ? 's need' : ' needs'} pairing. `}
                  {waitingPlayers.length > 0 && `⚠ ${waitingPlayers.length} player${waitingPlayers.length > 1 ? 's' : ''} waiting to be added. `}
                  Click <strong>🩹 Repair</strong> to fix only affected boards.
                </span>
                {editable && (
                  <button className="chess-btn-gold" onClick={handleRepair} style={{ fontSize: 12, padding: '5px 10px' }}>
                    🩹 Repair Now
                  </button>
                )}
              </motion.div>
            )}

            {/* Validation warnings panel */}
            {validationWarn !== null && (
              <motion.div
                key="validation-panel"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="no-print"
                style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                  background: validationWarn.length === 0 ? 'rgba(34,197,94,0.06)' : 'rgba(251,146,60,0.07)',
                  border: `1px solid ${validationWarn.length === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(251,146,60,0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {validationWarn.length === 0 ? (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>✓ Pairings look good — no issues found.</span>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(251,146,60,1)', marginBottom: 8 }}>
                          ⚠ {validationWarn.length} issue{validationWarn.length > 1 ? 's' : ''} detected:
                        </div>
                        <ul style={{ margin: '0 0 8px 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {validationWarn.map((w, i) => (
                            <li key={i} style={{ fontSize: 12, color: 'var(--cc-sub)' }}>{w}</li>
                          ))}
                        </ul>
                        <div style={{ fontSize: 11, color: 'var(--cc-muted)' }}>
                          Director has final authority — proceed as-is or fix manually.
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setValidationWarn(null)}
                    title="Dismiss"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--cc-muted)', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
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
                {showPts && <th style={{ fontSize: fs.th, width: 80, textAlign: 'center' }}>Pts</th>}
                <th style={{ fontSize: fs.th }} onClick={() => toggleSort('black')}>
                  ♚ Black <SortIcon k="black" />
                </th>
                {showPts && <th style={{ fontSize: fs.th, width: 80, textAlign: 'center' }}>Pts</th>}
                <th style={{ fontSize: fs.th, width: 110 }}>Result</th>
                {editable && <th className="no-print" style={{ fontSize: fs.th, width: 140, textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {roundMatches.map((m, i) => {
                const sel1  = selected?.matchId === m.id && selected?.slot === 'p1'
                const sel2  = selected?.matchId === m.id && selected?.slot === 'p2'
                const canSw = (slot) => selected && !sel1 && !sel2 && m.status === 'pending' && !m.locked
                  && (slot === 'p1' ? m.p1?.name : m.p2?.name && m.p2 !== 'BYE')

                const p1Real = m.p1?.name && m.p1 !== 'BYE'
                const p2Real = m.p2?.name && m.p2 !== 'BYE' && m.p2?.name !== 'BYE'

                const p1Points = showPts && p1Real ? (standingMap[m.p1.name] ?? null) : null
                const p2Points = showPts && p2Real ? (standingMap[m.p2.name] ?? null) : null

                const isEditingBoard  = editingBoard?.matchId === m.id
                const thisBoardError  = boardError?.matchId === m.id ? boardError.msg : null

                return (
                  <motion.tr
                    key={m.id}
                    className={`pairings-row ${m.status === 'live' ? 'pairings-row--live' : ''} ${i % 2 === 0 ? 'pairings-row--even' : ''}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    style={m.locked ? { boxShadow: 'inset 3px 0 0 rgba(212,163,54,0.5)' } : undefined}
                  >
                    {/* Board number — click to edit when editable */}
                    <td className="pairings-board" style={{ fontSize: fs.board, position: 'relative', verticalAlign: 'middle' }}>
                      {editable && isEditingBoard ? (
                        <input
                          type="number"
                          min={1}
                          value={editingBoard.value}
                          onChange={e => setEditingBoard(prev => ({ ...prev, value: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  handleBoardCommit(m.id)
                            if (e.key === 'Escape') { setEditingBoard(null); setBoardError(null) }
                          }}
                          onBlur={() => handleBoardCommit(m.id)}
                          autoFocus
                          style={{
                            width: 52, textAlign: 'center', fontFamily: 'inherit',
                            fontSize: Math.floor(fs.board * 0.8), fontWeight: 800,
                            background: 'var(--cc-surface)', border: '1px solid var(--cc-border2)',
                            color: 'var(--cc-gold)', borderRadius: 6, padding: '2px 4px',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => editable && setEditingBoard({ matchId: m.id, value: String(getBoardNumber(m)) })}
                          title={editable ? 'Click to edit board number' : undefined}
                          style={{ cursor: editable ? 'pointer' : 'default' }}
                        >
                          {getBoardNumber(m)}
                        </span>
                      )}
                      {m.locked && <div style={{ fontSize: 9, color: 'var(--cc-gold)', marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>LOCKED</div>}
                      {thisBoardError && (
                        <div style={{ fontSize: 9, color: 'var(--cc-warn)', marginTop: 2, whiteSpace: 'nowrap' }}>{thisBoardError}</div>
                      )}
                    </td>

                    <PlayerCell
                      match={m} slot="p1" player={m.p1}
                      playerFields={pf}
                      isSelected={sel1} canSwap={canSw('p1')}
                      onSelect={handlePlayerSelect} onRemove={handleRemove}
                      onPlayerClick={onPlayerClick}
                      editable={editable} large={displayMode}
                      removeTitle={withdrawMode ? 'Withdraw' : 'Remove'}
                    />
                    {showPts && (
                      <td
                        className="pairings-pts-col"
                        onClick={() => {
                          if (editable && m.status === 'pending' && !m.locked && p1Real)
                            handlePlayerSelect(m.id, 'p1', m.p1)
                        }}
                        style={{
                          padding: displayMode ? '18px 14px' : '10px 10px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          cursor: editable && m.status === 'pending' && !m.locked && p1Real ? 'pointer' : 'default',
                          background: sel1 ? 'var(--cc-sel)' : canSw('p1') ? 'var(--cc-hover)' : 'transparent',
                          borderRadius: 8,
                          transition: 'background 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        {p1Real && p1Points != null && (
                          <div className="pairings-pts" style={{ fontSize: displayMode ? 28 : 20, fontWeight: 800, color: 'var(--cc-gold)', lineHeight: 1 }}>
                            {fmtPts(p1Points)}
                          </div>
                        )}
                      </td>
                    )}
                    <PlayerCell
                      match={m} slot="p2" player={m.p2?.name === 'BYE' ? 'BYE' : m.p2}
                      playerFields={pf}
                      isSelected={sel2} canSwap={canSw('p2')}
                      onSelect={handlePlayerSelect} onRemove={handleRemove}
                      onPlayerClick={onPlayerClick}
                      editable={editable} large={displayMode}
                      removeTitle={withdrawMode ? 'Withdraw' : 'Remove'}
                    />
                    {showPts && (
                      <td
                        className="pairings-pts-col"
                        onClick={() => {
                          if (editable && m.status === 'pending' && !m.locked && p2Real)
                            handlePlayerSelect(m.id, 'p2', m.p2)
                        }}
                        style={{
                          padding: displayMode ? '18px 14px' : '10px 10px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          cursor: editable && m.status === 'pending' && !m.locked && p2Real ? 'pointer' : 'default',
                          background: sel2 ? 'var(--cc-sel)' : canSw('p2') ? 'var(--cc-hover)' : 'transparent',
                          borderRadius: 8,
                          transition: 'background 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        {p2Real && p2Points != null && (
                          <div className="pairings-pts" style={{ fontSize: displayMode ? 28 : 20, fontWeight: 800, color: 'var(--cc-gold)', lineHeight: 1 }}>
                            {fmtPts(p2Points)}
                          </div>
                        )}
                      </td>
                    )}

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <StatusBadge status={m.status} score={getScoreLabel(m)} />
                      {/* Enter result — pending matches */}
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
                      {/* Edit result — completed matches */}
                      {onScoreClick && editable && m.status === 'complete' && m.p1 && m.p2 && (
                        <button
                          onClick={() => onScoreClick(m)}
                          style={{
                            marginTop: 5, display: 'block', width: '100%',
                            padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit',
                            background: 'transparent', border: '1px solid var(--cc-border)',
                            color: 'var(--cc-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >✏ Edit</button>
                      )}
                    </td>

                    {/* ── Actions column ── */}
                    {editable && (
                      <td className="no-print" style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Lock / Unlock */}
                          <ActBtn
                            onClick={() => handleLock(m.id)}
                            title={m.locked ? 'Unlock — allow editing and recalculation' : 'Lock — prevent recalculation and swapping'}
                            active={m.locked}
                          >
                            {m.locked ? '🔒' : '🔓'}
                          </ActBtn>

                          {/* Flip colors */}
                          {m.status === 'pending' && !m.locked && p1Real && p2Real && (
                            <ActBtn onClick={() => handleFlipColors(m.id)} title="Swap White ↔ Black colors">
                              ⇄
                            </ActBtn>
                          )}

                          {/* BYE controls */}
                          {m.status === 'pending' && !m.locked && p1Real && p2Real && (
                            <>
                              <ActBtn
                                onClick={() => handleAssignBye(m.id, 'p1')}
                                title={`Give BYE win to ${m.p1.name} (White)`}
                              >
                                BYE ♔
                              </ActBtn>
                              <ActBtn
                                onClick={() => handleAssignBye(m.id, 'p2')}
                                title={`Give BYE win to ${m.p2.name} (Black)`}
                              >
                                BYE ♚
                              </ActBtn>
                            </>
                          )}
                          {m.status === 'pending' && !m.locked && p1Real && !p2Real && (
                            <ActBtn
                              onClick={() => handleAssignBye(m.id, 'p1')}
                              title={`Give BYE win to ${m.p1.name}`}
                            >
                              BYE
                            </ActBtn>
                          )}
                          {m.status === 'bye' && (
                            <ActBtn
                              onClick={() => handleRemoveBye(m.id)}
                              title="Remove BYE — board reverts to pending (needs opponent)"
                              warn
                            >
                              ↩ Un-BYE
                            </ActBtn>
                          )}
                        </div>
                      </td>
                    )}
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
