import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uid, recordScore, markMatchLive, removePlayerFromPairing, getRoundLabel } from './utils.js'
import { computeStandings, generateSwissPairings, isRoundComplete, getTieStatus, fmtPts } from './pointsUtils.js'
import PairingsView from './PairingsView.jsx'
import StandingsView from './StandingsView.jsx'
import ScoreModal from './ScoreModal.jsx'
import GalleryView from './GalleryView.jsx'
import PlayerDetailModal from './PlayerDetailModal.jsx'

// ── History tab — all completed rounds ────────────────────────────────────────
function HistoryTab({ matches, currentRound }) {
  const completedRounds = Array.from(
    { length: currentRound },
    (_, r) => ({ r, matches: matches.filter(m => m.round === r && m.status !== 'bye') })
  ).reverse()

  if (!completedRounds.length) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <div className="empty-state-icon">📜</div>
        <div className="empty-state-title">No completed rounds yet</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {completedRounds.map(({ r, matches: rMs }) => (
        <div key={r}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--cc-sub)', textTransform: 'uppercase', marginBottom: 10 }}>
            Round {r + 1}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rMs.map(m => {
              const p1Win = m.winner === m.p1?.name
              const p2Win = m.winner === m.p2?.name
              const s1    = m.score1 === 0.5 ? '½' : m.score1
              const s2    = m.score2 === 0.5 ? '½' : m.score2
              return (
                <div key={m.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto',
                  alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  background: 'var(--cc-surface)', border: '1px solid var(--cc-border)',
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--cc-muted)', width: 40 }}>Bd {m.slot + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: p1Win ? 700 : 500, color: p1Win ? 'var(--cc-gold)' : 'var(--cc-text)' }}>
                    ♔ {m.p1?.name ?? 'TBD'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--cc-gold)', textAlign: 'center', minWidth: 52 }}>
                    {s1} – {s2}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: p2Win ? 700 : 500, color: p2Win ? 'var(--cc-gold)' : 'var(--cc-text)', textAlign: 'right' }}>
                    {m.p2?.name ?? 'TBD'} ♚
                  </span>
                  <span />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── PointsTournament ──────────────────────────────────────────────────────────
export default function PointsTournament({ tournament, playerFields, onUpdate, tournamentId, canUpload = false, canDelete = false, canViewPrivate = false, onDisplay, isSuperAdmin = false }) {
  // Guard: tournament data must be valid before any rendering
  if (!tournament?.players || !tournament?.matches) {
    return (
      <div className="chess-section">
        <div className="empty-state">
          <div className="empty-state-icon">⚠</div>
          <div className="empty-state-title">Tournament data unavailable</div>
          <div className="empty-state-sub">This tournament's data could not be loaded. It may have been corrupted. Try creating a new tournament.</div>
        </div>
      </div>
    )
  }
  const pf = playerFields ?? tournament.playerFields ?? ['name', 'elo']
  const name         = tournament.name ?? 'Tournament'
  const matches      = tournament.matches ?? []
  const players      = tournament.players ?? []
  const totalRounds  = Math.max(tournament.totalRounds ?? 1, 1)
  const currentRound = Math.max(tournament.currentRound ?? 0, 0)

  const [activeTab,      setActiveTab]      = useState('round')
  const [scoreModal,     setScoreModal]     = useState(null)
  const [playerModal,    setPlayerModal]    = useState(null) // { player, standing }
  const [addPlayerOpen,  setAddPlayerOpen]  = useState(false)
  const [newPlayerName,  setNewPlayerName]  = useState('')
  const [newPlayerEmail, setNewPlayerEmail] = useState('')
  const [newPlayerPhone, setNewPlayerPhone] = useState('')

  // ── Derived ────────────────────────────────────────────────────────────────
  const standings         = computeStandings(players, matches).map((s, i) => ({ ...s, rank: i + 1 }))
  const roundComplete     = isRoundComplete(matches, currentRound)
  const isFinalRound      = currentRound >= totalRounds - 1
  const allDone           = isFinalRound && roundComplete
  const { hasTie, tiedPlayers, winner } = allDone ? getTieStatus(standings) : { hasTie: false, tiedPlayers: [], winner: null }

  const currentRoundMs  = matches.filter(m => m.round === currentRound)
  const doneInRound     = currentRoundMs.filter(m => m.status === 'complete' || m.status === 'bye').length
  const totalInRound    = currentRoundMs.length

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMatchesUpdate = (updated) => onUpdate({ matches: updated })

  const handlePlayerClick = (playerName) => {
    const player  = players.find(p => p.name === playerName)
    const standing = standings.find(s => s.name === playerName)
    if (player) setPlayerModal({ player, standing })
  }

  const handleAddPlayer = () => {
    const name = newPlayerName.trim()
    if (!name) return
    const newPlayer = {
      id: uid(), name,
      email: newPlayerEmail.trim() || undefined,
      phone: newPlayerPhone.trim() || undefined,
      section: tournament.name,
    }
    const updatedPlayers = [...players, newPlayer]
    onUpdate({ players: updatedPlayers })
    setNewPlayerName(''); setNewPlayerEmail(''); setNewPlayerPhone('')
    setAddPlayerOpen(false)
  }

  const handleRemovePlayer = (playerName) => {
    const updatedMatches = removePlayerFromPairing(matches, playerName)
    const updatedPlayers = players.filter(p => p.name !== playerName)
    onUpdate({ matches: updatedMatches, players: updatedPlayers })
  }

  const handleScoreConfirm = (matchId, s1, s2, winnerName, imageUrl) => {
    onUpdate({ matches: recordScore(matches, matchId, s1, s2, winnerName, imageUrl) })
    setScoreModal(null)
  }

  const handleMarkLive = (matchId) => {
    onUpdate({ matches: markMatchLive(matches, matchId) })
  }

  const handleStartNextRound = () => {
    if (!confirm(`Start Round ${currentRound + 2} of ${totalRounds}?\n\nPairings will be generated based on current standings.`)) return
    const nextRound  = currentRound + 1
    const newMatches = generateSwissPairings(standings, nextRound)
    onUpdate({ matches: [...matches, ...newMatches], currentRound: nextRound })
    setActiveTab('round')
  }

  const handleStartTiebreak = () => {
    if (!confirm(`Start a Tiebreak Round for ${tiedPlayers.map(t => t.name).join(' and ')}?`)) return
    const nextRound      = currentRound + 1
    const tiedStandings  = standings.filter(s => tiedPlayers.some(t => t.name === s.name))
    const newMatches     = generateSwissPairings(tiedStandings, nextRound)
    onUpdate({
      matches:      [...matches, ...newMatches],
      currentRound: nextRound,
      totalRounds:  totalRounds + 1,  // extend tournament by one tiebreak round
    })
    setActiveTab('round')
  }

  const gallery = tournament.gallery ?? []

  const TAB_OPTS = [
    { id: 'round',     label: `⚔ Round ${currentRound + 1}` },
    { id: 'standings', label: '📊 Standings' },
    { id: 'history',   label: '📜 History' },
    { id: 'gallery',   label: `📸 Gallery${gallery.length ? ` (${gallery.length})` : ''}` },
  ]

  const tabStyle = (id) => ({
    padding: '7px 16px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: activeTab === id ? 'var(--cc-sel)' : 'transparent',
    color: activeTab === id ? 'var(--cc-gold)' : 'var(--cc-muted)',
  })

  return (
    <div className="chess-section-lg">

      {/* ── Champion / tiebreak banner ── */}
      <AnimatePresence>
        {allDone && !hasTie && winner && (
          <motion.div
            className="champion-banner"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="champion-label">🏆 Points Tournament Champion</div>
            <div className="champion-name">{winner}</div>
            <div style={{ fontSize: 14, color: 'var(--cc-sub)', marginTop: 6 }}>
              {fmtPts(standings[0]?.points ?? 0)} points · {standings[0]?.wins ?? 0} wins
            </div>
          </motion.div>
        )}
        {allDone && hasTie && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '18px 24px', borderRadius: 14, marginBottom: 24,
              background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--cc-warn)', marginBottom: 6 }}>
                ⚠ Tiebreak Needed
              </div>
              <div style={{ fontSize: 13, color: 'var(--cc-sub)' }}>
                {tiedPlayers.map(t => t.name).join(', ')} are tied at {fmtPts(standings[0].points)} pts
              </div>
            </div>
            {isSuperAdmin && (
              <button className="chess-btn-gold" onClick={handleStartTiebreak}>
                ⚔ Start Tiebreak Round
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Round header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--cc-text)' }}>
              Round {currentRound + 1} of {totalRounds}
            </span>
            {tournament.currentRound >= tournament.totalRounds && (
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: 'var(--cc-warn)', letterSpacing: '0.1em' }}>
                TIEBREAK
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSuperAdmin && roundComplete && !isFinalRound && (
              <button className="chess-btn-gold" onClick={handleStartNextRound}>
                ▶ Start Round {currentRound + 2}
              </button>
            )}
            <button className="topbar-btn topbar-btn--gold" onClick={onDisplay} style={{ fontSize: 13, padding: '7px 14px' }}>
              📺 Display
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: 'var(--cc-muted)' }}>
          <span>{doneInRound}/{totalInRound} matches complete</span>
          <span>{totalInRound > 0 ? Math.round((doneInRound / totalInRound) * 100) : 0}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--cc-surface)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--cc-gold), #a07820)', borderRadius: 2 }}
            animate={{ width: `${totalInRound > 0 ? (doneInRound / totalInRound) * 100 : 0}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Add Player panel ── */}
      <AnimatePresence>
        {isSuperAdmin && addPlayerOpen && (
          <motion.div
            className="add-player-panel"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
          >
            <div className="add-player-title">➕ Add Player to Tournament</div>
            <div className="add-player-fields">
              <input
                className="chess-input"
                placeholder="Player name *"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                autoFocus
              />
              <input
                className="chess-input"
                placeholder="Email (optional)"
                value={newPlayerEmail}
                onChange={e => setNewPlayerEmail(e.target.value)}
              />
              <input
                className="chess-input"
                placeholder="Phone (optional)"
                value={newPlayerPhone}
                onChange={e => setNewPlayerPhone(e.target.value)}
              />
            </div>
            <div className="add-player-actions">
              <button className="chess-btn-ghost" onClick={() => setAddPlayerOpen(false)}>Cancel</button>
              <button className="chess-btn-gold" onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
                Add Player
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginTop: 8 }}>
              After adding, use Recalculate in the Round tab to include them in current pairings.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <div style={{ display: 'flex', background: 'var(--cc-surface)', border: '1px solid var(--cc-border)', borderRadius: 10, padding: 3, gap: 3, width: 'fit-content' }}>
          {TAB_OPTS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>
          ))}
        </div>
        {isSuperAdmin && (
          <button
            className="chess-btn-ghost"
            onClick={() => setAddPlayerOpen(v => !v)}
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            {addPlayerOpen ? '✕ Cancel' : '➕ Add Player'}
          </button>
        )}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'round' && (
          <motion.div key="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <PairingsView
              matches={matches}
              players={players}
              totalRounds={totalRounds}
              meta={{ name }}
              playerFields={pf}
              onMatchesUpdate={isSuperAdmin ? handleMatchesUpdate : null}
              onRemovePlayer={isSuperAdmin ? handleRemovePlayer : null}
              onScoreClick={isSuperAdmin ? setScoreModal : null}
              onPlayerClick={handlePlayerClick}
            />
          </motion.div>
        )}

        {activeTab === 'standings' && (
          <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <StandingsView
              standings={standings}
              playerFields={pf}
              currentRound={currentRound}
              totalRounds={totalRounds}
              isTiebreak={tournament.currentRound >= tournament.totalRounds}
              onPlayerClick={handlePlayerClick}
            />
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <HistoryTab matches={matches} currentRound={currentRound} />
          </motion.div>
        )}

        {activeTab === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <GalleryView gallery={gallery} tournamentId={tournamentId} canUpload={canUpload} canDelete={canDelete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score modal */}
      <AnimatePresence>
        {scoreModal && (
          <ScoreModal
            match={scoreModal}
            playerFields={pf}
            tournamentId={tournamentId}
            onConfirm={handleScoreConfirm}
            onMarkLive={handleMarkLive}
            onClose={() => setScoreModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Player detail modal */}
      <AnimatePresence>
        {playerModal && (
          <PlayerDetailModal
            player={playerModal.player}
            standing={playerModal.standing}
            matches={matches}
            canViewPrivate={canViewPrivate}
            onClose={() => setPlayerModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
