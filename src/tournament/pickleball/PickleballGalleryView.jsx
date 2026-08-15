import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePickleball } from './PickleballContext.jsx'
import {
  PB_GALLERY_ACCEPTED_IMAGE_TYPES, PB_GALLERY_ACCEPTED_VIDEO_TYPES,
  PB_GALLERY_MAX_IMAGE_BYTES, PB_GALLERY_MAX_VIDEO_BYTES,
} from '../services/pickleballDb.js'

const ACCEPTED_TYPES = [...PB_GALLERY_ACCEPTED_IMAGE_TYPES, ...PB_GALLERY_ACCEPTED_VIDEO_TYPES]

// Full-screen lightbox — same UX shape as Chess's GalleryView.Viewer, written
// fresh for Pickleball's own CSS classes (.pb-gallery-*), not shared code.
function Viewer({ items, index, onChange, onClose }) {
  const item = items[index]
  const isVideo = item?.mediaType === 'video'

  const handleKey = (e) => {
    if (e.key === 'ArrowRight') onChange((index + 1) % items.length)
    if (e.key === 'ArrowLeft') onChange((index - 1 + items.length) % items.length)
    if (e.key === 'Escape') onClose()
  }

  if (!item) return null

  return (
    <motion.div
      className="pb-gallery-viewer"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      onKeyDown={handleKey}
      tabIndex={-1}
    >
      <div className="pb-gallery-viewer-count">{index + 1} / {items.length}</div>
      <button className="pb-gallery-viewer-close" onClick={onClose}>✕</button>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          className="pb-gallery-viewer-media"
        >
          {isVideo
            ? <video src={item.imageUrl} controls autoPlay />
            : <img src={item.imageUrl} alt={item.name} />}
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <>
          <button className="pb-gallery-viewer-nav pb-gallery-viewer-nav--prev"
            onClick={e => { e.stopPropagation(); onChange((index - 1 + items.length) % items.length) }}>‹</button>
          <button className="pb-gallery-viewer-nav pb-gallery-viewer-nav--next"
            onClick={e => { e.stopPropagation(); onChange((index + 1) % items.length) }}>›</button>
        </>
      )}
    </motion.div>
  )
}

// Track B Phase B — media system. tournament.gallery already populated by
// fetchPickleballTournament(); uploadGalleryFile/deleteGalleryItem come from
// PickleballContext.jsx, same thin-wrapper-then-reload pattern as every
// other Track B write. canUpload/canDelete both come from
// isSuperAdmin || isAdmin (AuthContext.jsx), matching Chess's exact rule.
export default function PickleballGalleryView({ tournament, canUpload, canDelete, currentUserId, currentUserRole }) {
  const { uploadGalleryFile, deleteGalleryItem } = usePickleball()
  const gallery = tournament.gallery ?? []

  const [viewerIndex, setViewerIndex] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletedIds, setDeletedIds] = useState(new Set())
  const fileRef = useRef()

  const visibleGallery = gallery.filter(item => !deletedIds.has(item.id))

  const handleFiles = async (files) => {
    if (!tournament.id) return
    const valid = Array.from(files).filter(f => ACCEPTED_TYPES.includes(f.type))
    if (!valid.length) {
      setUploadError('Unsupported file type. Use JPG, PNG, WEBP, MP4, WEBM, or MOV.')
      return
    }
    setUploading(true)
    setUploadError('')

    for (const file of valid) {
      const isVideo = file.type.startsWith('video/')
      const maxBytes = isVideo ? PB_GALLERY_MAX_VIDEO_BYTES : PB_GALLERY_MAX_IMAGE_BYTES
      const maxLabel = isVideo ? '100 MB' : '12 MB'
      if (file.size > maxBytes) {
        setUploadError(`"${file.name}" exceeds ${maxLabel} — skipped.`)
        continue
      }
      try {
        await uploadGalleryFile(tournament.id, file, currentUserId, currentUserRole)
      } catch (err) {
        setUploadError(`Upload failed: ${err?.message ?? 'unknown error'}`)
      }
    }
    setUploading(false)
  }

  const handleDelete = async (item) => {
    const label = item.mediaType === 'video' ? 'video' : 'photo'
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    if (viewerIndex !== null && visibleGallery[viewerIndex]?.id === item.id) setViewerIndex(null)
    setDeletedIds(prev => new Set([...prev, item.id]))
    try {
      await deleteGalleryItem(item)
    } catch {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(item.id); return s })
    }
  }

  const photoCount = visibleGallery.filter(i => i.mediaType !== 'video').length
  const videoCount = visibleGallery.filter(i => i.mediaType === 'video').length
  const countLabel = visibleGallery.length === 0 ? '' :
    videoCount === 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` :
    photoCount === 0 ? `${videoCount} video${videoCount !== 1 ? 's' : ''}` :
    `${photoCount} photo${photoCount !== 1 ? 's' : ''} · ${videoCount} video${videoCount !== 1 ? 's' : ''}`

  return (
    <div className="pb-gallery-view">
      {canUpload && tournament.id && (
        <div
          className={`pb-gallery-upload-zone ${dragOver ? 'pb-gallery-upload-zone--drag' : ''} ${uploading ? 'pb-gallery-upload-zone--busy' : ''}`}
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
          <div className="pb-gallery-upload-icon">{uploading ? '⏳' : '📸'}</div>
          <div className="pb-gallery-upload-title">{uploading ? 'Uploading…' : 'Add Photos & Videos'}</div>
          <div className="pb-gallery-upload-sub">
            {uploading
              ? 'Please wait while media is being uploaded'
              : 'Drag & drop or click to browse · Photos: JPG PNG WEBP (max 12 MB) · Videos: MP4 WEBM MOV (max 100 MB)'}
          </div>
        </div>
      )}

      {uploadError && <div className="pb-error-list"><div>{uploadError}</div></div>}

      {visibleGallery.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {countLabel} · click to view{canDelete ? ' · hover to delete' : ''}
        </div>
      )}

      {visibleGallery.length === 0 ? (
        <div className="pb-state">
          <div className="pb-state-icon">🖼</div>
          <div className="pb-state-title">No media yet</div>
          <div className="pb-state-sub">Upload tournament photos and videos to create a permanent event archive.</div>
        </div>
      ) : (
        <div className="pb-gallery-grid">
          <AnimatePresence>
            {visibleGallery.map((item, i) => {
              const isVideo = item.mediaType === 'video'
              return (
                <motion.div
                  key={item.id}
                  className="pb-gallery-thumb"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
                >
                  {isVideo
                    ? <video src={item.imageUrl} preload="metadata" muted playsInline onClick={() => setViewerIndex(i)} />
                    : <img src={item.imageUrl} alt={item.name} onClick={() => setViewerIndex(i)} loading="lazy" />}

                  <div className="pb-gallery-media-badge">{isVideo ? '🎬' : '📷'}</div>
                  <div className="pb-gallery-thumb-overlay" onClick={() => setViewerIndex(i)}>
                    <span>{isVideo ? '▶' : '🔍'}</span>
                  </div>

                  {canDelete && (
                    <button
                      className="pb-gallery-delete-btn"
                      onClick={e => { e.stopPropagation(); handleDelete(item) }}
                      title={`Delete ${isVideo ? 'video' : 'photo'}`}
                    >✕</button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Rendered via a portal straight to <body> — this is a position:fixed
          full-screen overlay, and framer-motion's transform styles on
          ancestor motion.div wrappers create a new CSS stacking context that
          traps fixed-position descendants inside it (a well-known CSS
          gotcha), which let the site nav render on top of the lightbox and
          silently block its close/nav buttons. Found live during this
          session's verification pass. Chess's own GalleryView has the same
          underlying pattern and is presumably exposed to the same issue, but
          fixing it there is out of scope here — this only touches new
          Pickleball code. */}
      {viewerIndex !== null && visibleGallery.length > 0 && createPortal(
        <AnimatePresence>
          <Viewer
            items={visibleGallery}
            index={Math.min(viewerIndex, visibleGallery.length - 1)}
            onChange={setViewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
