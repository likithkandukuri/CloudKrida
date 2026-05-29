import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playerSubInfo } from './utils.js'
import { supabase } from '../../lib/supabase.js'

export default function ScoreModal({ match, playerFields, tournamentId, onConfirm, onMarkLive, onClose }) {
  const pf = playerFields ?? ['name', 'elo']
  const [result,      setResult]     = useState(null)
  const [drawWinner,  setDraw]       = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [preview,     setPreview]    = useState(null)
  const [dragOver,    setDragOver]   = useState(false)
  const [confirming,  setConfirming] = useState(false)
  const fileRef = useRef()

  if (!match) return null
  const board  = match.slot + 1
  const p1name = match.p1?.name ?? '?'
  const p2name = match.p2?.name ?? '?'

  const RESULTS = [
    { id: 'p1',   s1: 1,   s2: 0,   score: '1 – 0', label: `${p1name} wins (White)` },
    { id: 'draw', s1: 0.5, s2: 0.5, score: '½ – ½', label: 'Draw' },
    { id: 'p2',   s1: 0,   s2: 1,   score: '0 – 1', label: `${p2name} wins (Black)` },
  ]

  const canConfirm = result && (result !== 'draw' || drawWinner)

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 8 * 1024 * 1024) { alert('Image must be under 8 MB'); return }
    setPendingFile(file)
    // Create an object URL for immediate preview (no base64 needed)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPendingFile(null)
    setPreview(null)
  }

  const handleConfirm = async () => {
    if (!result || confirming) return
    setConfirming(true)

    const r      = RESULTS.find(x => x.id === result)
    const winner = result === 'p1' ? p1name
                 : result === 'p2' ? p2name
                 : drawWinner === 'p1' ? p1name : p2name

    let recordUrl = null
    if (pendingFile && tournamentId && match.id) {
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path     = `${tournamentId}/${match.id}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('score-records').upload(path, pendingFile)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('score-records').getPublicUrl(path)
        recordUrl = publicUrl
      } else {
        console.error('[Krida] score sheet upload:', upErr)
      }
    }

    onConfirm(match.id, r.s1, r.s2, winner, recordUrl)
    setConfirming(false)
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="score-modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title">Board {board} — Enter Result</div>

        <div className="modal-players">
          <div className="modal-player">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(212,163,54,0.6)', letterSpacing: '0.1em', marginBottom: 4 }}>♔ WHITE</div>
            <div className="modal-player-name">{p1name}</div>
            {playerSubInfo(match.p1, pf) && <div style={{ fontSize: 11, color: 'var(--cc-sub)', marginTop: 2 }}>{playerSubInfo(match.p1, pf)}</div>}
          </div>
          <div className="modal-vs">VS</div>
          <div className="modal-player">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(212,163,54,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>♚ BLACK</div>
            <div className="modal-player-name">{p2name}</div>
            {playerSubInfo(match.p2, pf) && <div style={{ fontSize: 11, color: 'var(--cc-sub)', marginTop: 2 }}>{playerSubInfo(match.p2, pf)}</div>}
          </div>
        </div>

        {/* Mark Live */}
        {match.status !== 'live' && onMarkLive && (
          <button
            style={{
              width: '100%', marginBottom: 16,
              background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
              color: 'var(--cc-live)', borderRadius: 10, padding: '9px 0', fontFamily: 'inherit',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13,
            }}
            onClick={() => { onMarkLive(match.id); onClose() }}
          >
            <span className="live-dot" style={{ width: 7, height: 7 }} />
            Mark Board {board} as LIVE
          </button>
        )}

        {/* Result buttons */}
        <div className="result-buttons">
          {RESULTS.map(r => (
            <button
              key={r.id}
              className={`result-btn ${result === r.id ? 'selected' : ''}`}
              onClick={() => { setResult(r.id); if (r.id !== 'draw') setDraw(null) }}
            >
              <span className="result-btn-score">{r.score}</span>
              <span className="result-btn-label">{r.label}</span>
            </button>
          ))}
        </div>

        {/* Draw tiebreak */}
        <AnimatePresence>
          {result === 'draw' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
            >
              <div className="draw-winner-label">Draw — who advances?</div>
              <div className="draw-winner">
                <button className={`draw-btn ${drawWinner === 'p1' ? 'selected' : ''}`} onClick={() => setDraw('p1')}>{p1name}</button>
                <button className={`draw-btn ${drawWinner === 'p2' ? 'selected' : ''}`} onClick={() => setDraw('p2')}>{p2name}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score sheet image */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(212,163,54,0.55)', marginBottom: 8 }}>
            📎 ATTACH SCORE SHEET (OPTIONAL)
          </div>
          {preview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={preview} alt="Preview"
                style={{ height: 72, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(212,163,54,0.3)' }} />
              <button onClick={clearImage}
                style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
                         background: '#b91c1c', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
          ) : (
            <div
              className={`csv-drop-zone ${dragOver ? 'drag-over' : ''}`}
              style={{ padding: '12px' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleImageFile(e.target.files[0])} />
              <div style={{ fontSize: 13, color: 'var(--cc-sub)' }}>Drop image or click to upload</div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="chess-btn-ghost" onClick={onClose} disabled={confirming}>Cancel</button>
          <button className="chess-btn-gold" onClick={handleConfirm}
            disabled={!canConfirm || confirming}
            style={{ opacity: canConfirm && !confirming ? 1 : 0.4 }}>
            {confirming ? 'Saving…' : 'Confirm Result'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
