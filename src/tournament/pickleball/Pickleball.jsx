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
import './Pickleball.css'

// One route (/tournaments/pickleball), internal view-state navigation — same
// convention Chess established (no nested router routes). Tournament
// creation/editing is Superadmin-only (enforced by RLS server-side, gated in
// the UI too so the controls are never shown to anyone else) — matching
// Chess's exact permission model: Superadmin edits everything, Admin is
// limited to gallery uploads (not built for Pickleball yet), Guest is
// read-only.
function PickleballShell() {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'tournaments' | 'create' | 'detail'
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
  // be a dead link while already on that URL, so the middle crumb stays
  // non-clickable; the "← Back" controls in each view handle in-page navigation.
  const trail = view === 'dashboard'
    ? [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }]
    : view === 'tournaments'
      ? [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }, { label: 'Tournaments' }]
      : view === 'create'
        ? [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }, { label: 'New Tournament' }]
        : [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Pickleball' }, { label: 'Tournament' }]

  return (
    <div className="pb-page">
      <GlobalNav />
      <Breadcrumb trail={trail} />

      {view === 'dashboard' && (
        <PickleballDashboard onBrowse={() => setView('tournaments')} onCreate={isSuperAdmin ? () => setView('create') : null} />
      )}
      {view === 'tournaments' && (
        <PickleballTournamentList onOpen={openTournament} onCreate={isSuperAdmin ? () => setView('create') : null} />
      )}
      {view === 'create' && (
        <div className="pb-section pb-container" style={{ paddingTop: 150 }}>
          <button className="pb-back" onClick={() => setView('tournaments')}>← Back to Tournaments</button>
          {isSuperAdmin ? (
            <PickleballTournamentForm onSubmit={handleCreate} onCancel={() => setView('tournaments')} />
          ) : (
            <div className="pb-state">
              <div className="pb-state-icon">🔒</div>
              <div className="pb-state-title">Superadmin Access Required</div>
              <div className="pb-state-sub">Only a Superadmin can create tournaments.</div>
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
