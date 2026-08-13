import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import { computePickleballStandings } from './pickleballStandings.js'
import { validatePoolGeneration, getPoolGenerationState } from './pickleballValidation.js'
import { STATUS_LABELS, formatGames, entrantLabel } from './pickleballDisplay.js'
import PickleballScoreEntry from './PickleballScoreEntry.jsx'

// Track B Phase 2 — Pools tab. tournament.poolSize is the single source of
// truth for pool size (Phase 2 plan §7): this component never collects its
// own value, it only reads tournament.poolSize and, if it needs to change,
// points the Superadmin at the existing tournament Edit form.
export default function PickleballPoolsTab({ tournament }) {
  const { isSuperAdmin } = useAuth()
  const { generatePools, resetPools } = usePickleball()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [scoringMatchId, setScoringMatchId] = useState(null)

  const pools         = tournament.pools ?? []
  const allEntrants    = tournament.entrants ?? []
  const activeEntrants = allEntrants.filter(e => e.status !== 'withdrawn')
  const poolMatches    = (tournament.matches ?? []).filter(m => m.phase === 'pool')

  const genState      = getPoolGenerationState(pools, poolMatches)
  const configErrors  = validatePoolGeneration(tournament, activeEntrants)

  const runGenerate = async (forceRegenerate) => {
    setBusy(true); setError(null)
    try {
      await generatePools(tournament.id, activeEntrants, tournament.poolSize, forceRegenerate)
      setConfirmRegenerate(false)
    } catch (err) {
      setError(err?.message ?? 'Failed to generate pools.')
    } finally {
      setBusy(false)
    }
  }

  const runReset = async () => {
    setBusy(true); setError(null)
    try {
      await resetPools(tournament.id)
      setConfirmReset(false)
    } catch (err) {
      setError(err?.message ?? 'Failed to reset pools.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {isSuperAdmin && (
        <div className="pb-admin-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Pool size: {tournament.poolSize ?? '—'} <span style={{ opacity: 0.7 }}>(set in tournament configuration)</span>
            </span>

            {genState === 'empty' && (
              <button
                className="pb-btn-primary"
                disabled={busy || configErrors.length > 0}
                onClick={() => runGenerate(false)}
              >
                Generate Pools
              </button>
            )}

            {genState === 'unscored' && !confirmRegenerate && (
              <button className="pb-btn-primary" disabled={busy} onClick={() => setConfirmRegenerate(true)}>
                Regenerate Pools
              </button>
            )}
            {genState === 'unscored' && confirmRegenerate && (
              <>
                <span style={{ fontSize: 12, color: '#f87171' }}>Replace the current pools and matches?</span>
                <button className="pb-btn-danger" disabled={busy} onClick={() => runGenerate(true)}>Yes, replace</button>
                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setConfirmRegenerate(false)}>Cancel</button>
              </>
            )}

            {genState === 'scored' && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Pool play has started — use Reset Pools to clear results first.
              </span>
            )}

            {pools.length > 0 && !confirmReset && (
              <button className="pb-btn-danger" disabled={busy} onClick={() => setConfirmReset(true)}>Reset Pools</button>
            )}
            {confirmReset && (
              <>
                <span style={{ fontSize: 12, color: '#f87171' }}>Reset all pools and pool matches?</span>
                <button className="pb-btn-danger" disabled={busy} onClick={runReset}>Yes, reset</button>
                <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
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

      {pools.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">🏓</div>
          <div className="pb-state-title">Pool play hasn't been scheduled yet</div>
          <div className="pb-state-sub">Pools will appear here once the tournament director generates them.</div>
        </div>
      ) : (
        <div className="pb-pool-grid">
          {pools.map(pool => {
            const rows = poolMatches.filter(m => m.poolId === pool.id)
            // Withdrawn entrants are excluded from active pool standings (they
            // may still keep a historical pool_id, but don't appear here) —
            // computePickleballStandings itself is reused unmodified.
            const poolActiveEntrants = activeEntrants.filter(e => e.poolId === pool.id)
            const standings = computePickleballStandings(poolActiveEntrants, rows)

            return (
              <div className="pb-pool-card" key={pool.id}>
                <div className="pb-pool-card-title">{pool.label}</div>
                {rows.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No matches assigned yet.</div>
                ) : rows.map(m => (
                  <div key={m.id}>
                    <div className="pb-pool-match">
                      <div className="pb-pool-match-names">
                        <span>{entrantLabel(m.entrant1)}</span>
                        <span>{entrantLabel(m.entrant2)}</span>
                      </div>
                      <div className="pb-pool-match-score">
                        {m.status === 'complete' || m.status === 'bye' ? formatGames(m.games) : STATUS_LABELS[m.status] ?? m.status}
                      </div>
                      {isSuperAdmin && m.status !== 'bye' && m.entrant1 && m.entrant2 && (
                        <button
                          className="pb-btn-small pb-btn-small--ghost"
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
                ))}

                {standings.length > 0 && (
                  <div className="pb-table-wrap" style={{ marginTop: 12 }}>
                    <table className="pb-table">
                      <thead>
                        <tr>
                          <th>Entrant</th>
                          <th>W</th>
                          <th>L</th>
                          <th>Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map(s => (
                          <tr key={s.id}>
                            <td>{s.displayName}</td>
                            <td>{s.wins}</td>
                            <td>{s.losses}</td>
                            <td>{s.gamesWon}-{s.gamesLost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
