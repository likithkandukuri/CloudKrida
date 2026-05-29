import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SLOT_H, CARD_H, ROUND_W, CONN_W, PAD_TOP, PAD_L,
  getCardTop, getCenterY, getCardLeft, getBracketDimensions,
  getRoundLabel, getScoreLabel, recordScore, markMatchLive,
} from './utils.js'
import PairingsView from './PairingsView.jsx'
import ScoreModal from './ScoreModal.jsx'
import GalleryView from './GalleryView.jsx'

// ── Image Viewer ──────────────────────────────────────────────────────────────
function ImageViewer({ url, onClose }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <img src={url} alt="Match record"
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, display: 'block',
                   boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%',
          background: '#d4a336', border: 'none', color: '#050912', fontWeight: 700,
          fontSize: 16, cursor: 'pointer',
        }}>✕</button>
      </motion.div>
    </motion.div>
  )
}



// ── Match Card (with board number + White/Black) ───────────────────────────────
function MatchCard({ match, round, totalRounds, onClick, onViewRecord, highlighted }) {
  const isBye      = match.status === 'bye'
  const isComplete = match.status === 'complete'
  const isLive     = match.status === 'live'
  const isPending  = match.status === 'pending'
  const isClickable = (isPending || isLive) && match.p1 && match.p2 && !!onClick
  const board      = match.slot + 1

  const top  = getCardTop(match.slot, round)
  const left = getCardLeft(round)

  const p1Win = isComplete && match.winner === match.p1?.name
  const p2Win = isComplete && match.winner === match.p2?.name
  const s1 = match.score1 === 0.5 ? '½' : match.score1
  const s2 = match.score2 === 0.5 ? '½' : match.score2

  const renderPlayer = (player, score, isWinner, colorIcon) => {
    const isBYE = player?.name === 'BYE' || player === 'BYE'
    return (
      <div className={`match-player ${isWinner ? 'winner' : ''}`}>
        <span className="match-color-icon">{colorIcon}</span>
        {!player || isBYE
          ? <span className="match-player-tbd">{isBYE ? 'BYE' : 'TBD'}</span>
          : <span className="match-player-name">{player.name}</span>
        }
        {score !== null && isComplete && (
          <span className="match-player-score">{score}</span>
        )}
      </div>
    )
  }

  return (
    <motion.div
      className={`match-card ${isComplete ? 'complete' : ''} ${isBye ? 'bye-match' : ''} ${isLive ? 'live' : ''} ${highlighted ? 'highlighted' : ''}`}
      style={{ position: 'absolute', top, left, width: ROUND_W, height: CARD_H }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={isClickable ? onClick : undefined}
      title={isClickable ? `Board ${board} — click to enter result` : undefined}
    >
      {/* Board number header strip */}
      <div className="match-card-header">
        <span className="match-board-num">Bd {board}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isLive && (
            <>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--cc-live)' }}>LIVE</span>
            </>
          )}
          {isComplete && match.record && (
            <button
              onClick={e => { e.stopPropagation(); onViewRecord(match.record.imageUrl) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
              title="View score sheet"
            >📎</button>
          )}
        </div>
      </div>

      {/* White player (p1) */}
      {renderPlayer(match.p1, s1, p1Win, '♔')}

      {/* Black player (p2) */}
      {renderPlayer(
        match.p2?.name === 'BYE' ? 'BYE' : match.p2,
        s2, p2Win, '♚',
      )}
    </motion.div>
  )
}

// ── SVG Connector Lines ───────────────────────────────────────────────────────
function BracketConnectors({ matches, totalRounds }) {
  const r0Count = matches.filter(m => m.round === 0).length
  const { width, height } = getBracketDimensions(r0Count * 2)
  const paths = []

  for (let r = 0; r < totalRounds - 1; r++) {
    const roundMs = matches.filter(m => m.round === r)
    for (let i = 0; i < roundMs.length; i += 2) {
      const childA = roundMs[i]
      const childB = roundMs[i + 1]
      if (!childA || !childB) continue
      const parentSlot = Math.floor(childA.slot / 2)
      const x1  = getCardLeft(r) + ROUND_W
      const y1a = getCenterY(childA.slot, r)
      const y1b = getCenterY(childB.slot, r)
      const x2  = getCardLeft(r + 1)
      const yp  = getCenterY(parentSlot, r + 1)
      const mx  = (x1 + x2) / 2
      paths.push(
        <path key={`a-${r}-${i}`} d={`M ${x1},${y1a} C ${mx},${y1a} ${mx},${yp} ${x2},${yp}`}
              fill="none" stroke="rgba(212,163,54,0.22)" strokeWidth="1" />,
        <path key={`b-${r}-${i}`} d={`M ${x1},${y1b} C ${mx},${y1b} ${mx},${yp} ${x2},${yp}`}
              fill="none" stroke="rgba(212,163,54,0.22)" strokeWidth="1" />,
      )
    }
  }

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
         width={width} height={height} overflow="visible">
      {paths}
    </svg>
  )
}

// ── BracketView ───────────────────────────────────────────────────────────────
export default function BracketView({ matches, players, totalRounds, meta, playerFields, gallery = [], onUpdate, onRemovePlayer, tournamentId, canUpload = false, canDelete = false, onDisplay, isSuperAdmin = false }) {
  const [modal,     setModal]    = useState(null)
  const [imgViewer, setImgViewer] = useState(null)
  const [activeTab, setActiveTab] = useState('bracket')
  const [search,    setSearch]   = useState('')

  // ── Safety: clamp and default all inputs ─────────────────────────────────────
  const safeMatches     = matches ?? []
  const safePlayers     = players ?? []
  const safeRounds      = Math.max(totalRounds ?? 1, 1)

  const r0Count = safeMatches.filter(m => m?.round === 0).length
  const { width, height } = getBracketDimensions(r0Count * 2)
  const finalMatch = safeMatches.find(m => m?.round === safeRounds - 1 && m?.slot === 0)
  const champion   = finalMatch?.winner ?? null

  const handleConfirm = (matchId, s1, s2, winner, imageUrl) => {
    onUpdate(recordScore(safeMatches, matchId, s1, s2, winner, imageUrl))
    setModal(null)
  }
  const handleMarkLive = (matchId) => onUpdate(markMatchLive(safeMatches, matchId))
  const handleRemoveSafe = (playerName) => {
    if (!confirm(`Remove "${playerName}"? Their opponent will need re-pairing.`)) return
    if (onRemovePlayer) onRemovePlayer(playerName)
  }

  const searchQuery = search.trim().toLowerCase()
  const highlightedIds = searchQuery
    ? new Set(safeMatches.filter(m =>
        m?.p1?.name?.toLowerCase().includes(searchQuery) ||
        (m?.p2?.name && m.p2.name !== 'BYE' && m.p2.name.toLowerCase().includes(searchQuery)) ||
        String((m?.slot ?? 0) + 1).includes(searchQuery)
      ).map(m => m.id))
    : null

  const totalReal = safeMatches.filter(m => m?.status !== 'bye').length
  const completed = safeMatches.filter(m => m?.status === 'complete').length
  const liveCount = safeMatches.filter(m => m?.status === 'live').length

  return (
    <div className="chess-section-lg">
      {/* Champion banner */}
      <AnimatePresence>
        {champion && (
          <motion.div className="champion-banner"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="champion-label">🏆 Tournament Champion</div>
            <div className="champion-name">{champion}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {totalReal > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--cc-sub)' }}>
            <span>{completed}/{totalReal} matches complete{liveCount > 0 ? ` · ${liveCount} live` : ''}</span>
            <span>{Math.round((completed / totalReal) * 100)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(212,163,54,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg, #d4a336, #a07820)', borderRadius: 2 }}
              initial={{ width: 0 }}
              animate={{ width: `${(completed / totalReal) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Tab + search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,163,54,0.12)', borderRadius: 10, padding: 3, gap: 3 }}>
          {[{ id: 'bracket', label: '🏆 Bracket' }, { id: 'pairings', label: '📋 Pairings' }, { id: 'gallery', label: `📸 Gallery${gallery.length ? ` (${gallery.length})` : ''}` }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === tab.id ? 'rgba(212,163,54,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--cc-gold)' : 'var(--cc-muted)',
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'bracket' && (
          <>
            <input
              className="chess-input"
              placeholder="🔍 Search player or board…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 210, flexShrink: 0 }}
            />
            {searchQuery && (
              <span style={{ fontSize: 12, color: 'var(--cc-sub)' }}>
                {highlightedIds?.size ?? 0} result{highlightedIds?.size !== 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Bracket tab — READ-ONLY visual, score entry only ── */}
      {activeTab === 'bracket' && (
        safeMatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">♟</div>
            <div className="empty-state-title">No matches generated</div>
            <div className="empty-state-sub">The bracket data could not be loaded. Try recreating the tournament.</div>
          </div>
        ) : (
          <div className="bracket-scroll-wrap">
            <div className="bracket-canvas" style={{ width, height, position: 'relative' }}>
              <BracketConnectors matches={safeMatches} totalRounds={safeRounds} />
              {Array.from({ length: safeRounds }).map((_, r) => (
                <div key={r} className="round-label" style={{ left: getCardLeft(r), top: PAD_TOP - 28 }}>
                  {getRoundLabel(r, safeRounds)}
                </div>
              ))}
              {safeMatches.map(m => m && (
                <MatchCard
                  key={m.id} match={m} round={m.round ?? 0} totalRounds={safeRounds}
                  onClick={isSuperAdmin ? () => setModal(m) : undefined}
                  onViewRecord={(url) => setImgViewer(url)}
                  highlighted={highlightedIds ? highlightedIds.has(m.id) : false}
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Pairings tab — CONTROL CENTER ── */}
      {activeTab === 'pairings' && (
        <PairingsView
          matches={safeMatches}
          players={safePlayers}
          totalRounds={safeRounds}
          meta={meta}
          playerFields={playerFields}
          onMatchesUpdate={onUpdate}
          onRemovePlayer={onRemovePlayer}
        />
      )}

      {/* ── Gallery tab ── */}
      {activeTab === 'gallery' && (
        <GalleryView gallery={gallery} tournamentId={tournamentId} canUpload={canUpload} canDelete={canDelete} />
      )}

      {/* Score modal */}
      <AnimatePresence>
        {modal && (
          <ScoreModal
            match={modal}
            playerFields={playerFields}
            tournamentId={tournamentId}
            onConfirm={handleConfirm}
            onMarkLive={handleMarkLive}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Image viewer */}
      <AnimatePresence>
        {imgViewer && <ImageViewer url={imgViewer} onClose={() => setImgViewer(null)} />}
      </AnimatePresence>
    </div>
  )
}
