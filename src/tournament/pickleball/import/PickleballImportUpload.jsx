import { useRef, useState } from 'react'

// Step 1 of the import wizard. PDF only for this first version (per spec) —
// deliberately not a generic multi-format picker. Interaction pattern
// (drag state, click-to-browse, busy state) mirrors PickleballGalleryView's
// established upload zone rather than inventing new upload UI, styled via
// the parallel .pb-import-upload-zone* classes (Pickleball.css).
export default function PickleballImportUpload({ onFileSelected, busy }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const acceptFile = (candidate) => {
    if (!candidate) return
    if (candidate.type !== 'application/pdf') {
      setError('Only PDF files are supported for this first version of the importer.')
      return
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setError('That PDF is larger than 25 MB — please upload the official tournament plan document itself.')
      return
    }
    setError('')
    setFile(candidate)
  }

  const formatSize = (bytes) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div>
      {!file ? (
        <div
          className={`pb-import-upload-zone ${dragOver ? 'pb-import-upload-zone--drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]) }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => acceptFile(e.target.files?.[0])}
          />
          <div className="pb-import-upload-icon">📄</div>
          <div className="pb-gallery-upload-title">Upload Tournament Plan PDF</div>
          <div className="pb-gallery-upload-sub">Drag &amp; drop or click to browse · PDF only, up to 25 MB</div>
        </div>
      ) : (
        <div className="pb-import-file-row">
          <div className="pb-import-file-icon">📄</div>
          <div className="pb-import-file-info">
            <div className="pb-import-file-name">{file.name}</div>
            <div className="pb-import-file-meta">{formatSize(file.size)}</div>
          </div>
          {!busy && (
            <button className="pb-btn-ghost" onClick={() => setFile(null)}>Replace</button>
          )}
        </div>
      )}

      {error && <div className="pb-error-list">{error}</div>}

      <div className="pb-form-actions">
        <button
          className="pb-btn-primary"
          disabled={!file || busy}
          onClick={() => onFileSelected(file)}
        >
          {busy ? 'Analyzing…' : 'Analyze Tournament Plan'}
        </button>
      </div>
    </div>
  )
}
