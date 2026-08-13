import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import { validateBracketGeneration, getBracketGenerationState } from './pickleballValidation.js'
import { getRoundLabel } from '../engine/bracket.js'
import { entrantLabel } from './pickleballDisplay.js'
import PickleballScoreEntry from './PickleballScoreEntry.jsx'

// Track B Phase 5 (bracket generation/advancement) + Phase 6 (champion
// banner / mark-complete convenience). Seeding is cross-pool overall
// ranking, computed by pickleballBracket.js and applied atomically via the
// generate_pickleball_bracket RPC (migration 012).
export default function PickleballBracketTab({ tournament }) {
  const { isSuperAdmin } = useAuth()
  const { generateBracket, updateTournament } = usePickleball()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [scoringMatchId, setScoringMatchId] = useState(null)

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
          </div>

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
                  return (
                    <div key={m.id}>
                      <div className={`pb-bracket-match ${decided ? 'pb-bracket-match--complete' : ''}`}>
                        <div className={`pb-bracket-seat ${decided && m.winnerEntrantId === m.entrant1?.id ? 'pb-bracket-seat--winner' : ''} ${!m.entrant1 ? 'pb-bracket-seat--empty' : ''}`}>
                          <span>{m.entrant1 ? entrantLabel(m.entrant1) : 'TBD'}</span>
                          {m.status === 'complete' && <span className="pb-bracket-seat-score">{m.games?.filter(g => g.score_a > g.score_b).length ?? ''}</span>}
                        </div>
                        <div className={`pb-bracket-seat ${decided && m.winnerEntrantId === m.entrant2?.id ? 'pb-bracket-seat--winner' : ''} ${!m.entrant2 ? 'pb-bracket-seat--empty' : ''}`}>
                          <span>{m.entrant2 ? entrantLabel(m.entrant2) : 'TBD'}</span>
                          {m.status === 'complete' && <span className="pb-bracket-seat-score">{m.games?.filter(g => g.score_b > g.score_a).length ?? ''}</span>}
                        </div>
                        {isSuperAdmin && m.status !== 'bye' && m.entrant1 && m.entrant2 && (
                          <button
                            className="pb-btn-small pb-btn-small--ghost"
                            style={{ marginTop: 6 }}
                            onClick={() => setScoringMatchId(scoringMatchId === m.id ? null : m.id)}
                          >
                            {m.status === 'complete' ? 'Edit Score' : 'Enter Score'}
                          </button>
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
