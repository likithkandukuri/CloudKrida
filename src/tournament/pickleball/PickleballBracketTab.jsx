import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import { validateBracketGeneration, getBracketGenerationState } from './pickleballValidation.js'
import { validateBracketSwap, validateBracketByeAssign, validateBracketByeRemove, validateBracketIntegrity } from './pickleballBracketEdit.js'
import { getRoundLabel } from '../engine/bracket.js'
import { entrantLabel } from './pickleballDisplay.js'
import PickleballScoreEntry from './PickleballScoreEntry.jsx'

// Track B Phase 5 (bracket generation/advancement) + Phase 6 (champion
// banner / mark-complete convenience). Seeding is cross-pool overall
// ranking, computed by pickleballBracket.js and applied atomically via the
// generate_pickleball_bracket RPC (migration 012).
export default function PickleballBracketTab({ tournament }) {
  const { isSuperAdmin } = useAuth()
  const {
    generateBracket, updateTournament,
    toggleMatchLock, swapBracketEntrants, assignMatchBye, removeMatchBye,
  } = usePickleball()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [scoringMatchId, setScoringMatchId] = useState(null)
  const [swapSelection, setSwapSelection] = useState([]) // [{matchId, seat}, ...] up to 2
  const [showValidate, setShowValidate] = useState(false)

  const pools          = tournament.pools ?? []
  const matches         = tournament.matches ?? []
  const poolMatches     = matches.filter(m => m.phase === 'pool')
  const elimMatches     = matches.filter(m => m.phase === 'elimination')
  const activeEntrants  = (tournament.entrants ?? []).filter(e => e.status !== 'withdrawn')

  const genState     = getBracketGenerationState(elimMatches)
  const configErrors = validateBracketGeneration(pools, poolMatches, activeEntrants)

  const totalRounds = elimMatches.length ? Math.max(...elimMatches.map(m => m.round)) + 1 : 0
  const roundsAsc    = [...new Set(elimMatches.map(m => m.round))].sort((a, b) => a - b)

  const finalMatch = elimMatches.find(m => m.round === totalRounds - 1)
  const finalDecided = finalMatch?.status === 'complete' || finalMatch?.status === 'bye'
  const champion = finalDecided
    ? (finalMatch.winnerEntrantId === finalMatch.entrant1?.id ? finalMatch.entrant1 : finalMatch.entrant2)
    : null

  const runGenerate = async (forceRegenerate) => {
    setBusy(true); setError(null)
    try {
      await generateBracket(tournament.id, activeEntrants, poolMatches, forceRegenerate)
      setConfirmRegenerate(false)
    } catch (err) {
      setError(err?.message ?? 'Failed to generate bracket.')
    } finally {
      setBusy(false)
    }
  }

  const markComplete = async () => {
    setBusy(true); setError(null)
    try {
      await updateTournament(tournament.id, { status: 'complete' })
    } catch (err) {
      setError(err?.message ?? 'Failed to update tournament status.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleLock = async (m) => {
    setBusy(true); setError(null)
    try { await toggleMatchLock(m.id, !m.locked) }
    catch (err) { setError(err?.message ?? 'Failed to update lock.') }
    finally { setBusy(false) }
  }

  const handleSelectSeat = (matchId, seat) => {
    setSwapSelection(prev => {
      const already = prev.find(s => s.matchId === matchId && s.seat === seat)
      if (already) return prev.filter(s => !(s.matchId === matchId && s.seat === seat))
      if (prev.length >= 2) return prev
      return [...prev, { matchId, seat }]
    })
  }

  const handleSwap = async () => {
    if (swapSelection.length !== 2) return
    const [a, b] = swapSelection
    const matchA = elimMatches.find(m => m.id === a.matchId)
    const matchB = elimMatches.find(m => m.id === b.matchId)
    const errors = validateBracketSwap(matchA, matchB)
    if (errors.length) { setError(errors[0]); return }
    setBusy(true); setError(null)
    try {
      await swapBracketEntrants(a.matchId, a.seat, b.matchId, b.seat)
      setSwapSelection([])
    } catch (err) {
      setError(err?.message ?? 'Failed to swap entrants.')
    } finally {
      setBusy(false)
    }
  }

  const handleAssignBye = async (m, winnerEntrantId) => {
    const errors = validateBracketByeAssign(m, winnerEntrantId)
    if (errors.length) { setError(errors[0]); return }
    setBusy(true); setError(null)
    try { await assignMatchBye(m.id, winnerEntrantId) }
    catch (err) { setError(err?.message ?? 'Failed to assign bye.') }
    finally { setBusy(false) }
  }

  const handleRemoveBye = async (m) => {
    const errors = validateBracketByeRemove(m)
    if (errors.length) { setError(errors[0]); return }
    setBusy(true); setError(null)
    try { await removeMatchBye(m.id) }
    catch (err) { setError(err?.message ?? 'Failed to undo bye.') }
    finally { setBusy(false) }
  }

  const integrityWarnings = validateBracketIntegrity(elimMatches)

  return (
    <div>
      {isSuperAdmin && (
        <div className="pb-admin-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {genState === 'empty' && (
              <button className="pb-btn-primary" disabled={busy || configErrors.length > 0} onClick={() => runGenerate(false)}>
                Generate Bracket
              </button>
            )}
            {genState === 'unscored' && !confirmRegenerate && (
              <button className="pb-btn-primary" disabled={busy} onClick={() => setConfirmRegenerate(true)}>
                Regenerate Bracket
              </button>
            )}
            {genState === 'unscored' && confirmRegenerate && (
              <>
                <span style={{ fontSize: 12, color: '#f87171' }}>Replace the current bracket?</span>
                <button className="pb-btn-danger" disabled={busy} onClick={() => runGenerate(true)}>Yes, replace</button>
                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setConfirmRegenerate(false)}>Cancel</button>
              </>
            )}
            {genState === 'scored' && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Results have been recorded — correct individual matches with the score buttons below; full regeneration is disabled once any match has a result.
              </span>
            )}
            {champion && tournament.status !== 'complete' && (
              <button className="pb-btn-primary" disabled={busy} onClick={markComplete}>Mark Tournament Complete</button>
            )}
            {elimMatches.length > 0 && (
              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setShowValidate(v => !v)}>✓ Validate</button>
            )}
            {swapSelection.length === 2 && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Swap the 2 selected entrants?</span>
                <button className="pb-btn-primary" disabled={busy} onClick={handleSwap}>Swap</button>
                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setSwapSelection([])}>Cancel</button>
              </>
            )}
          </div>

          {showValidate && (
            <div className="pb-notice" style={{ fontSize: 13 }}>
              {integrityWarnings.length === 0
                ? '✓ No issues found.'
                : <ul style={{ margin: 0, paddingLeft: 18 }}>{integrityWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            </div>
          )}

          {genState === 'empty' && configErrors.length > 0 && (
            <ul className="pb-error-list">
              {configErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {error && <div className="pb-error-list"><div>{error}</div></div>}
        </div>
      )}

      {champion && (
        <div className="pb-notice" style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>
          🏆 Champion: {entrantLabel(champion)}
        </div>
      )}

      {elimMatches.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">🏆</div>
          <div className="pb-state-title">Bracket not generated yet</div>
          <div className="pb-state-sub">The elimination bracket will appear here once pool play is complete.</div>
        </div>
      ) : (
        <div className="pb-bracket-scroll">
          <div className="pb-bracket-rounds">
            {roundsAsc.map(r => (
              <div className="pb-bracket-round" key={r}>
                <div className="pb-bracket-round-label">{getRoundLabel(r, totalRounds)}</div>
                {elimMatches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot).map(m => {
                  const decided = m.status === 'complete' || m.status === 'bye'
                  const canEdit = isSuperAdmin && m.status === 'pending' && !m.locked
                  const isSelected = seat => swapSelection.some(s => s.matchId === m.id && s.seat === seat)
                  return (
                    <div key={m.id}>
                      <div className={`pb-bracket-match ${decided ? 'pb-bracket-match--complete' : ''}`}>
                        <div
                          className={`pb-bracket-seat ${decided && m.winnerEntrantId === m.entrant1?.id ? 'pb-bracket-seat--winner' : ''} ${!m.entrant1 ? 'pb-bracket-seat--empty' : ''}`}
                          style={canEdit && m.entrant1 ? { outline: isSelected(1) ? '2px solid var(--sport-pickleball)' : 'none', cursor: 'pointer' } : undefined}
                          onClick={canEdit && m.entrant1 ? () => handleSelectSeat(m.id, 1) : undefined}
                        >
                          <span>{m.entrant1 ? entrantLabel(m.entrant1) : 'TBD'}</span>
                          {m.status === 'complete' && <span className="pb-bracket-seat-score">{m.games?.filter(g => g.score_a > g.score_b).length ?? ''}</span>}
                        </div>
                        <div
                          className={`pb-bracket-seat ${decided && m.winnerEntrantId === m.entrant2?.id ? 'pb-bracket-seat--winner' : ''} ${!m.entrant2 ? 'pb-bracket-seat--empty' : ''}`}
                          style={canEdit && m.entrant2 ? { outline: isSelected(2) ? '2px solid var(--sport-pickleball)' : 'none', cursor: 'pointer' } : undefined}
                          onClick={canEdit && m.entrant2 ? () => handleSelectSeat(m.id, 2) : undefined}
                        >
                          <span>{m.entrant2 ? entrantLabel(m.entrant2) : 'TBD'}</span>
                          {m.status === 'complete' && <span className="pb-bracket-seat-score">{m.games?.filter(g => g.score_b > g.score_a).length ?? ''}</span>}
                        </div>

                        {isSuperAdmin && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {m.status !== 'bye' && m.entrant1 && m.entrant2 && (
                              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setScoringMatchId(scoringMatchId === m.id ? null : m.id)}>
                                {m.status === 'complete' ? 'Edit Score' : 'Enter Score'}
                              </button>
                            )}
                            {m.status === 'pending' && m.entrant1 && m.entrant2 && !m.locked && (
                              <>
                                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => handleAssignBye(m, m.entrant1.id)}>Bye → {entrantLabel(m.entrant1)}</button>
                                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => handleAssignBye(m, m.entrant2.id)}>Bye → {entrantLabel(m.entrant2)}</button>
                              </>
                            )}
                            {m.status === 'bye' && (
                              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => handleRemoveBye(m)}>Undo Bye</button>
                            )}
                            {m.status !== 'complete' && (
                              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => handleToggleLock(m)}>
                                {m.locked ? '🔒 Locked' : '🔓 Lock'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {scoringMatchId === m.id && (
                        <PickleballScoreEntry match={m} tournament={tournament} onClose={() => setScoringMatchId(null)} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
