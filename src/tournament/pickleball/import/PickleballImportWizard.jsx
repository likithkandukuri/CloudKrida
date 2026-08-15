import { useState } from 'react'
import { usePickleball } from '../PickleballContext.jsx'
import { extractPdfPages } from './pdfText.js'
import { parseTournamentPlan } from './pickleballPdfParser.js'
import { toImportPayload } from './pickleballImportMapping.js'
import PickleballImportProgress from './PickleballImportProgress.jsx'
import PickleballImportUpload from './PickleballImportUpload.jsx'
import PickleballImportReview from './PickleballImportReview.jsx'

// Owns the wizard's state machine (Upload -> Analyze -> Review -> Create).
// The draft lives only here, in memory, until the final "Create Tournament"
// click — nothing is written to the database before that (spec: "no
// tournament database records should be created" until approval). Cancelling
// or navigating away at any point before then simply discards it.
export default function PickleballImportWizard({ onCancel, onCreated }) {
  const { importTournament } = usePickleball()
  const [step, setStep] = useState('upload') // 'upload' | 'analyze' | 'review' | 'create'
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const handleFileSelected = async (file) => {
    setError('')
    setStep('analyze')
    try {
      const pages = await extractPdfPages(file)
      const result = parseTournamentPlan(pages)
      setDraft(result)
      setStep('review')
    } catch (err) {
      setError(err?.message ?? 'Could not read this PDF. Make sure it\'s a text-based tournament plan, not a scanned image.')
      setStep('upload')
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const payload = toImportPayload(draft)
      const id = await importTournament(payload)
      onCreated(id)
    } catch (err) {
      setCreateError(err?.message ?? 'Could not create the tournament. Nothing was saved — you can fix the issue above and try again.')
      setCreating(false)
    }
  }

  const progressStep = step === 'review' && creating ? 'create' : step === 'review' ? 'validate' : step

  return (
    <div className="pb-import-wizard">
      <PickleballImportProgress currentStep={progressStep} />

      {step === 'upload' && (
        <>
          {error && <div className="pb-error-list">{error}</div>}
          <PickleballImportUpload onFileSelected={handleFileSelected} busy={false} />
          <div className="pb-form-actions">
            <button className="pb-btn-ghost" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}

      {step === 'analyze' && (
        <div className="pb-state" role="status" aria-live="polite">
          <div className="pb-spinner" />
          <div className="pb-state-title">Analyzing tournament plan…</div>
          <div className="pb-state-sub">Reading rules, teams, groups, courts, and schedule from the document.</div>
        </div>
      )}

      {step === 'review' && draft && (
        <PickleballImportReview
          draft={draft}
          onDraftChange={setDraft}
          onBack={() => setStep('upload')}
          onCreate={handleCreate}
          creating={creating}
          createError={createError}
        />
      )}
    </div>
  )
}
