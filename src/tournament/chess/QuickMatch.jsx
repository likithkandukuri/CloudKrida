import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uid } from './utils.js'
import { useChess } from './ChessContext.jsx'

const RESULT_OPTS = [
  { id: 'p1',   s1: 1,   s2: 0,   score: '1 – 0' },
  { id: 'draw', s1: 0.5, s2: 0.5, score: '½ – ½' },
  { id: 'p2',   s1: 0,   s2: 1,   score: '0 – 1' },
]

export default function QuickMatch() {
  const { addQuickMatch } = useChess()

  const [p1,      setP1]      = useState('')
  const [p2,      setP2]      = useState('')
  const [result,  setResult]  = useState(null)
  const [notes,   setNotes]   = useState('')
  const [saved,   setSaved]   = useState(false)

  const p1Label = p1.trim() || 'Player 1'
  const p2Label = p2.trim() || 'Player 2'

  const canSave = p1.trim() && p2.trim() && result

  const handleSave = () => {
    if (!canSave) return
    const r = RESULT_OPTS.find(x => x.id === result)
    const winner = result === 'p1' ? p1.trim() : result === 'p2' ? p2.trim() : null

    addQuickMatch({
      id: uid(),
      type: 'quick',
      p1: { name: p1.trim() },
      p2: { name: p2.trim() },
      result,
      score1: r.s1,
      score2: r.s2,
      winner,
      status: 'complete',
      completedAt: Date.now(),
      notes: notes.trim() || null,
      round: 0,
      slot: 0,
      record: null,
    })

    setSaved(true)
    setTimeout(() => {
      setP1(''); setP2(''); setResult(null); setNotes(''); setSaved(false)
    }, 2200)
  }

  return (
    <div className="chess-section">
      <div className="chess-section-head">
        <div className="chess-eyebrow">Quick Match</div>
        <h2 className="chess-heading">Record a Match</h2>
        <p className="chess-subhead">Log a 1v1 result instantly without creating a full tournament.</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                textAlign: 'center', padding: '56px 24px',
                background: 'rgba(212,163,54,0.06)',
                border: '1px solid rgba(212,163,54,0.2)',
                borderRadius: 16,
              }}
            >
              <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cc-gold)', marginBottom: 8 }}>Match Saved!</div>
              <div style={{ fontSize: 14, color: 'var(--cc-sub)' }}>Added to your match history.</div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Player names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 7 }}>
                    WHITE / PLAYER 1
                  </label>
                  <input
                    className="chess-input"
                    placeholder="Player name"
                    value={p1}
                    onChange={e => setP1(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('qm-p2')?.focus()}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--cc-muted)', textAlign: 'center', marginTop: 20 }}>VS</div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 7 }}>
                    BLACK / PLAYER 2
                  </label>
                  <input
                    id="qm-p2"
                    className="chess-input"
                    placeholder="Player name"
                    value={p2}
                    onChange={e => setP2(e.target.value)}
                  />
                </div>
              </div>

              {/* Result */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 12 }}>
                MATCH RESULT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
                {RESULT_OPTS.map(r => {
                  const label = r.id === 'p1' ? `${p1Label} Wins`
                              : r.id === 'p2' ? `${p2Label} Wins`
                              : 'Draw'
                  return (
                    <button
                      key={r.id}
                      className={`result-btn ${result === r.id ? 'selected' : ''}`}
                      onClick={() => setResult(r.id)}
                    >
                      <span className="result-btn-score">{r.score}</span>
                      <span className="result-btn-label">{label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Winner confirmation when result is set */}
              <AnimatePresence>
                {result && p1.trim() && p2.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 24 }}
                  >
                    <div style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: 'rgba(212,163,54,0.07)',
                      border: '1px solid rgba(212,163,54,0.2)',
                      fontSize: 13, color: 'var(--cc-text)',
                    }}>
                      {result === 'draw'
                        ? `½–½ Draw between ${p1.trim()} and ${p2.trim()}`
                        : `🏆 ${result === 'p1' ? p1.trim() : p2.trim()} wins`
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(212,163,54,0.5)', marginBottom: 7 }}>
                NOTES (OPTIONAL)
              </label>
              <input
                className="chess-input"
                placeholder="e.g. Sicilian Defence, 42 moves"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ marginBottom: 24 }}
              />

              <button
                className="chess-btn-gold"
                onClick={handleSave}
                disabled={!canSave}
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 0', opacity: canSave ? 1 : 0.4 }}
              >
                ♟ Save Match to History
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
