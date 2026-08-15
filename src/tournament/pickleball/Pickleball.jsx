import { useState } from 'react'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { PickleballProvider, usePickleball } from './PickleballContext.jsx'
import PickleballDashboard from './PickleballDashboard.jsx'
import PickleballTournamentList from './PickleballTournamentList.jsx'
import PickleballTournamentDetail from './PickleballTournamentDetail.jsx'
import PickleballTournamentForm from './PickleballTournamentForm.jsx'
import PickleballImportWizard from './import/PickleballImportWizard.jsx'
import './Pickleball.css'

// One route (/tournaments/pickleball), internal view-state navigation — same
// convention Chess established (no nested router routes). Tournament
// creation/editing is Superadmin-only (enforced by RLS server-side, gated in
// the UI too so the controls are never shown to anyone else) — matching
// Chess's exact permission model: Superadmin edits everything, Admin is
// limited to gallery uploads (not built for Pickleball yet), Guest is
// read-only.
function PickleballShell() {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'tournaments' | 'create' | 'import' | 'detail'
  const { setActiveTournamentId, createTournament } = usePickleball()
  const { isSuperAdmin } = useAuth()

  const openTournament = (id) => {
    setActiveTournamentId(id)
    setView('detail')
  }

  const backToList = () => {
    setActiveTournamentId(null)
    setView('tournaments')
  }

  const handleCreate = async (data) => {
    const id = await createTournament(data)
    openTournament(id)
  }

  // Pickleball is a single route with internal view-state (same convention Chess
  // established) — a "Pickleball" crumb pointing at /tournaments/pickleball would
  // be a dead link while already on that URL, so it stays non-clickable. The
  // global breadcrumb only ever needs to express the hierarchy down to
  // "Pickleball" itself (it still provides the route back up to Tournament
  // Management); it does not grow a deeper segment per internal view — the
  // "← Back to Pickleball" / "← Back to Tournaments" controls in each view
  // handle that finer in-page navigation instead.
  const trail = [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }]

  return (
    <div className="pb-page">
      <GlobalNav />
      <Breadcrumb trail={trail} />

      {view === 'dashboard' && (
        <PickleballDashboard
          onViewTournaments={() => setView('tournaments')}
          onCreate={isSuperAdmin ? () => setView('create') : null}
          onImport={isSuperAdmin ? () => setView('import') : null}
        />
      )}
      {view === 'tournaments' && (
        <PickleballTournamentList
          onOpen={openTournament}
          onCreate={isSuperAdmin ? () => setView('create') : null}
          onBack={() => setView('dashboard')}
        />
      )}
      {view === 'create' && (
        <div className="pb-section pb-container" style={{ paddingTop: 150 }}>
          <button className="pb-back" onClick={() => setView('dashboard')}>← Back to Pickleball</button>
          {isSuperAdmin ? (
            <PickleballTournamentForm onSubmit={handleCreate} onCancel={() => setView('dashboard')} />
          ) : (
            <div className="pb-state">
              <div className="pb-state-icon">🔒</div>
              <div className="pb-state-title">Superadmin Access Required</div>
              <div className="pb-state-sub">Only a Superadmin can create tournaments.</div>
            </div>
          )}
        </div>
      )}
      {view === 'import' && (
        <div className="pb-section pb-container" style={{ paddingTop: 150 }}>
          <button className="pb-back" onClick={() => setView('dashboard')}>← Back to Pickleball</button>
          {isSuperAdmin ? (
            <PickleballImportWizard onCancel={() => setView('dashboard')} onCreated={openTournament} />
          ) : (
            <div className="pb-state">
              <div className="pb-state-icon">🔒</div>
              <div className="pb-state-title">Superadmin Access Required</div>
              <div className="pb-state-sub">Only a Superadmin can import a tournament plan.</div>
            </div>
          )}
        </div>
      )}

      {view === 'detail' && <PickleballTournamentDetail onBack={backToList} />}

      <GlobalFooter />
    </div>
  )
}

export default function Pickleball() {
  usePageMeta({
    title: 'Pickleball — Tournament Management — Cloud Krida',
    description: 'Pickleball tournaments on Cloud Krida — pool play, brackets, schedules, and live standings.',
  })

  return (
    <PickleballProvider>
      <PickleballShell />
    </PickleballProvider>
  )
}
