import { useState } from 'react'
import { usePickleball } from './PickleballContext.jsx'
import { validateGameScore } from './pickleballValidation.js'

// Track B Phase 4 — shared score-entry form, used from both the Pools tab
// (pool-phase matches) and the Bracket tab (elimination-phase matches, where
// saving a complete result also advances the winner — see
// record_pickleball_match_score in migration 011). Scores are always
// editable by Superadmin (approved decision) — opening this on an
// already-scored match just pre-fills the existing games for correction.
export default function PickleballScoreEntry({ match, tournament, onClose }) {
  const { scoreMatch } = usePickleball()
  const [games, setGames] = useState(() => {
    const existing = match.games ?? []
    return Array.from({ length: tournament.bestOf }, (_, i) => ({
      score_a: existing[i]?.score_a ?? '',
      score_b: existing[i]?.score_b ?? '',
    }))
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const setScore = (i, side, value) => {
    setGames(prev => prev.map((g, idx) => idx === i ? { ...g, [side]: value } : g))
  }

  const handleSave = async () => {
    setBusy(true); setError(null)
    try {
      const parsed = games
        .filter(g => g.score_a !== '' || g.score_b !== '')
        .map((g, i) => ({ game: i + 1, score_a: Number(g.score_a) || 0, score_b: Number(g.score_b) || 0 }))

      const errors = parsed.flatMap(g => validateGameScore(g.score_a, g.score_b))
      if (errors.length) { setError(errors[0]); setBusy(false); return }

      await scoreMatch(match.id, parsed)
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Failed to save score.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-score-entry">
      {games.map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 52 }}>Game {i + 1}</span>
          <input
            className="pb-input" type="number" min="0" style={{ width: 60 }}
            value={g.score_a} onChange={e => setScore(i, 'score_a', e.target.value)}
            disabled={busy} aria-label={`Game ${i + 1} score, entrant 1`}
          />
          <span>–</span>
          <input
            className="pb-input" type="number" min="0" style={{ width: 60 }}
            value={g.score_b} onChange={e => setScore(i, 'score_b', e.target.value)}
            disabled={busy} aria-label={`Game ${i + 1} score, entrant 2`}
          />
        </div>
      ))}
      {error && <div className="pb-error-list"><div>{error}</div></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="pb-btn-primary" onClick={handleSave} disabled={busy}>Save Score</button>
        <button className="pb-btn-small pb-btn-small--ghost" onClick={onClose} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}
