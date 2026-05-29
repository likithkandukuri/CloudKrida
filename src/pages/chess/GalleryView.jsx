import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Full-screen viewer ────────────────────────────────────────────────────────
function Viewer({ items, index, onChange, onClose }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') onChange((index + 1) % items.length)
      if (e.key === 'ArrowLeft')  onChange((index - 1 + items.length) % items.length)
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [index, items.length, onChange, onClose])

  const item = items[index]

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 600,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center',
                    fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
        {index + 1} / {items.length}
      </div>

      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 20, width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 18,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✕</button>

      <AnimatePresence mode="wait">
        <motion.img
          key={item.id}
          src={item.imageUrl}
          alt={item.name}
          style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10, objectFit: 'contain',
                   boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
        />
      </AnimatePresence>

      <div style={{ position: 'absolute', bottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(item.uploadedAt)}</div>
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onChange((index - 1 + items.length) % items.length) }}
            style={{
              position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
              width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
              border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>
          <button
            onClick={e => { e.stopPropagation(); onChange((index + 1) % items.length) }}
            style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
              border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </>
      )}
    </motion.div>
  )
}

// ── GalleryView ───────────────────────────────────────────────────────────────
// gallery        — array of photo objects from DB (id, imageUrl, name, storagePath, uploadedAt)
// tournamentId   — needed for Supabase Storage path + DB insert
// canUpload      — true for superadmin + admin
// canDelete      — true for superadmin only
export default function GalleryView({ gallery = [], tournamentId, canUpload = false, canDelete = false }) {
  const [viewerIndex, setViewerIndex] = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  const handleFiles = async (files) => {
    if (!tournamentId) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!valid.length) return
    setUploading(true)
    setUploadError('')

    for (const file of valid) {
      if (file.size > 12 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds 12 MB — skipped.`)
        continue
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path     = `${tournamentId}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from('gallery').upload(path, file)
      if (uploadErr) {
        console.error('[Krida] gallery upload:', uploadErr)
        setUploadError(`Upload failed: ${uploadErr.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('gallery_photos').insert({
        tournament_id: tournamentId,
        storage_path:  path,
        public_url:    publicUrl,
        file_name:     file.name,
      })
      if (dbErr) console.error('[Krida] gallery_photos insert:', dbErr)
      // Real-time subscription in ChessContext will update gallery state on all clients
    }

    setUploading(false)
  }

  const handleDelete = async (item) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    if (viewerIndex !== null && gallery[viewerIndex]?.id === item.id) setViewerIndex(null)

    // Remove from DB (cascades handled by realtime — gallery state updates on all clients)
    const { error: dbErr } = await supabase.from('gallery_photos').delete().eq('id', item.id)
    if (dbErr) { console.error('[Krida] gallery delete:', dbErr); return }

    // Best-effort storage cleanup
    if (item.storagePath) {
      await supabase.storage.from('gallery').remove([item.storagePath])
    }
  }

  return (
    <div className="gallery-view">
      {/* Upload area */}
      {canUpload && tournamentId && (
        <div
          className={`gallery-upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)} />
          <div className="gallery-upload-icon">{uploading ? '⏳' : '📸'}</div>
          <div className="gallery-upload-title">
            {uploading ? 'Uploading…' : 'Add Tournament Photos'}
          </div>
          <div className="gallery-upload-sub">
            {uploading
              ? 'Please wait while photos are being uploaded'
              : 'Drag & drop images here or click to browse · Max 12 MB per photo'}
          </div>
        </div>
      )}

      {uploadError && (
        <div style={{ fontSize: 13, color: 'var(--cc-warn)', marginBottom: 12 }}>{uploadError}</div>
      )}

      {gallery.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--cc-muted)', marginBottom: 16 }}>
          {gallery.length} photo{gallery.length !== 1 ? 's' : ''} · click to view{canDelete ? ' · hover to delete' : ''}
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <div className="empty-state-icon">🖼</div>
          <div className="empty-state-title">No photos yet</div>
          <div className="empty-state-sub">
            Upload tournament photos, award ceremony shots, and playing hall images to create a permanent event archive.
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          <AnimatePresence>
            {gallery.map((item, i) => (
              <motion.div
                key={item.id}
                className="gallery-thumb"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  onClick={() => setViewerIndex(i)}
                  loading="lazy"
                />
                <div className="gallery-thumb-overlay" onClick={() => setViewerIndex(i)}>
                  <span>🔍</span>
                </div>
                {canDelete && (
                  <button
                    className="gallery-delete-btn"
                    onClick={e => { e.stopPropagation(); handleDelete(item) }}
                    title="Delete photo"
                  >✕</button>
                )}
                <div className="gallery-thumb-caption">{item.name}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {viewerIndex !== null && gallery.length > 0 && (
          <Viewer
            items={gallery}
            index={Math.min(viewerIndex, gallery.length - 1)}
            onChange={setViewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
