import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const ACCEPTED_TYPES       = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
const MAX_IMAGE_BYTES = 12  * 1024 * 1024   // 12 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024   // 100 MB

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

  const item    = items[index]
  const isVideo = item.mediaType === 'video'

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
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isVideo ? (
            <video
              src={item.imageUrl}
              controls
              autoPlay
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10,
                       boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
            />
          ) : (
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10, objectFit: 'contain',
                       boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ position: 'absolute', bottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          {isVideo ? '🎬' : '📷'} {item.name}
        </div>
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
// gallery         — array of media objects from DB
// tournamentId    — Supabase Storage path prefix + DB insert key
// canUpload       — true for superadmin + admin
// canDelete       — true for superadmin only (can delete any item)
// currentUserId   — auth.uid() of the logged-in user (for ownership checks)
// currentUserRole — 'superadmin' | 'admin' | 'guest'
export default function GalleryView({
  gallery         = [],
  tournamentId,
  canUpload       = false,
  canDelete       = false,
  currentUserId   = null,
  currentUserRole = null,
}) {
  const [viewerIndex, setViewerIndex] = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  // Superadmin: delete anything. Admin: delete only their own uploads.
  const canDeleteItem = (item) => {
    if (canDelete) return true
    if (!canUpload || !currentUserId) return false
    return item.uploadedBy === currentUserId
  }

  const handleFiles = async (files) => {
    if (!tournamentId) return
    const valid = Array.from(files).filter(f => ACCEPTED_TYPES.includes(f.type))
    if (!valid.length) {
      setUploadError('Unsupported file type. Use JPG, PNG, WEBP, MP4, WEBM, or MOV.')
      return
    }
    setUploading(true)
    setUploadError('')

    for (const file of valid) {
      const isVideo   = file.type.startsWith('video/')
      const mediaType = isVideo ? 'video' : 'image'
      const maxBytes  = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
      const maxLabel  = isVideo ? '100 MB' : '12 MB'

      if (file.size > maxBytes) {
        setUploadError(`"${file.name}" exceeds ${maxLabel} — skipped.`)
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
        uploaded_by:   currentUserId,
        media_type:    mediaType,
        uploader_role: currentUserRole,
      })
      if (dbErr) console.error('[Krida] gallery_photos insert:', dbErr)
    }

    setUploading(false)
  }

  const handleDelete = async (item) => {
    const label = item.mediaType === 'video' ? 'video' : 'photo'
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    if (viewerIndex !== null && gallery[viewerIndex]?.id === item.id) setViewerIndex(null)

    const { error: dbErr } = await supabase.from('gallery_photos').delete().eq('id', item.id)
    if (dbErr) { console.error('[Krida] gallery delete:', dbErr); return }

    if (item.storagePath) {
      await supabase.storage.from('gallery').remove([item.storagePath])
    }
  }

  // Count label for the summary line
  const photoCount = gallery.filter(i => i.mediaType !== 'video').length
  const videoCount = gallery.filter(i => i.mediaType === 'video').length
  const countLabel = gallery.length === 0 ? '' :
    videoCount === 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` :
    photoCount === 0 ? `${videoCount} video${videoCount !== 1 ? 's' : ''}` :
    `${photoCount} photo${photoCount !== 1 ? 's' : ''} · ${videoCount} video${videoCount !== 1 ? 's' : ''}`

  const anyDeleteVisible = gallery.some(item => canDeleteItem(item))

  return (
    <div className="gallery-view">
      {/* Upload zone */}
      {canUpload && tournamentId && (
        <div
          className={`gallery-upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          <div className="gallery-upload-icon">{uploading ? '⏳' : '📸'}</div>
          <div className="gallery-upload-title">
            {uploading ? 'Uploading…' : 'Add Photos & Videos'}
          </div>
          <div className="gallery-upload-sub">
            {uploading
              ? 'Please wait while media is being uploaded'
              : 'Drag & drop or click to browse · Photos: JPG PNG WEBP (max 12 MB) · Videos: MP4 WEBM MOV (max 100 MB)'}
          </div>
        </div>
      )}

      {uploadError && (
        <div style={{ fontSize: 13, color: 'var(--cc-warn)', marginBottom: 12 }}>{uploadError}</div>
      )}

      {gallery.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--cc-muted)', marginBottom: 16 }}>
          {countLabel} · click to view{anyDeleteVisible ? ' · hover to delete' : ''}
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <div className="empty-state-icon">🖼</div>
          <div className="empty-state-title">No media yet</div>
          <div className="empty-state-sub">
            Upload tournament photos and videos to create a permanent event archive.
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          <AnimatePresence>
            {gallery.map((item, i) => {
              const isVideo     = item.mediaType === 'video'
              const showDelete  = canDeleteItem(item)
              return (
                <motion.div
                  key={item.id}
                  className="gallery-thumb"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
                >
                  {isVideo ? (
                    <video
                      src={item.imageUrl}
                      preload="metadata"
                      muted
                      playsInline
                      onClick={() => setViewerIndex(i)}
                    />
                  ) : (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      onClick={() => setViewerIndex(i)}
                      loading="lazy"
                    />
                  )}

                  {/* Media type badge — top-left */}
                  <div className="gallery-media-badge" aria-label={isVideo ? 'Video' : 'Photo'}>
                    {isVideo ? '🎬' : '📷'}
                  </div>

                  {/* Hover overlay */}
                  <div className="gallery-thumb-overlay" onClick={() => setViewerIndex(i)}>
                    <span>{isVideo ? '▶' : '🔍'}</span>
                  </div>

                  {/* Delete button — only for authorized items */}
                  {showDelete && (
                    <button
                      className="gallery-delete-btn"
                      onClick={e => { e.stopPropagation(); handleDelete(item) }}
                      title={`Delete ${isVideo ? 'video' : 'photo'}`}
                    >✕</button>
                  )}

                  {/* Caption with filename + upload time */}
                  <div className="gallery-thumb-caption">
                    <div className="gallery-thumb-caption-name">{item.name}</div>
                    <div className="gallery-thumb-caption-meta">{timeAgo(item.uploadedAt)}</div>
                  </div>
                </motion.div>
              )
            })}
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
