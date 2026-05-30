import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { removePlayerFromPairing } from './utils.js'
import { computeStandings } from './pointsUtils.js'
import { ChessProvider, useChess } from './ChessContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import GlobalFooter from '../../components/GlobalFooter.jsx'
import { usePageMeta } from '../../hooks/usePageMeta.js'
import Dashboard from './Dashboard.jsx'
import TournamentCreator from './TournamentCreator.jsx'
import TournamentList from './TournamentList.jsx'
import BracketView from './BracketView.jsx'
import PointsTournament from './PointsTournament.jsx'
import QuickMatch from './QuickMatch.jsx'
import MatchHistory from './MatchHistory.jsx'
import DisplayMode from './DisplayMode.jsx'
import UserManagement from './UserManagement.jsx'
import CSVImporter from './CSVImporter.jsx'
import EventDetail from './EventDetail.jsx'
import './Chess.css'

const viewAnim = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -14, transition: { duration: 0.28 } },
}

// ── Inner page (has access to context) ───────────────────────────────────────
function ChessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    tournaments, quickMatches, events,
    activeTournament, activeTournamentId, setActiveTournamentId,
    activeEvent, activeEventId, setActiveEventId,
    createTournament, updateTournament, createEvent,
    dataLoading,
  } = useChess()

  const { isSuperAdmin, isAdmin, canUploadPhotos, canDeletePhotos, userId } = useAuth()
  const canViewPrivate  = isSuperAdmin || isAdmin
  const currentUserRole = isSuperAdmin ? 'superadmin' : isAdmin ? 'admin' : 'guest'

  usePageMeta({
    title:       'Chess Tournaments — Cloud Krida',
    description: 'Manage chess tournaments with Swiss pairings, single-elimination brackets, live scoring, photo galleries, and display mode — all on Cloud Krida.',
  })

  const [view,        setView]        = useState('dashboard')
  const [displayOpen, setDisplayOpen] = useState(false)

  // Read ?view= from the URL on first mount so homepage quick-action links work
  useEffect(() => {
    const v = new URLSearchParams(location.search).get('view')
    const allowed = ['dashboard', 'tournaments', 'history', 'create', 'csvimport']
    if (v && allowed.includes(v)) setView(v)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tournament creation ───────────────────────────────────────────────────────
  const handleTournamentComplete = async (data) => {
    await createTournament(data)
    setView('bracket')
  }

  // CSV bulk create: builds a parent event then creates section tournaments inside it
  const handleBulkCreate = async (sectionTournaments, eventData) => {
    const log = import.meta.env.DEV ? console.log.bind(console) : () => {}
    if (eventData?.name) {
      log('[Import] Creating event in DB:', eventData)
      const eventId = await createEvent(eventData)
      log('[Import] Event created, id:', eventId)

      for (let i = 0; i < sectionTournaments.length; i++) {
        const t = sectionTournaments[i]
        log(`[Import] Creating tournament ${i + 1}/${sectionTournaments.length}: "${t.name}" (${t.players.length} players, ${t.totalRounds} rounds)`)
        await createTournament(
          { ...t, eventId, eventOrder: i },
          { setActive: false },
        )
        log(`[Import] Tournament ${i + 1} inserted`)
      }

      log('[Import] All done — navigating to event view')
      setActiveEventId(eventId)
      setView('event')
    } else {
      for (let i = 0; i < sectionTournaments.length; i++) {
        const t = sectionTournaments[i]
        log(`[Import] Creating standalone tournament ${i + 1}/${sectionTournaments.length}: "${t.name}"`)
        await createTournament(t, { setActive: false })
      }
      setView('tournaments')
    }
  }

  // ── Bracket updates ─────────────────────────────────────────────────────────
  const handleMatchesUpdate = (updatedMatches) => {
    if (activeTournamentId) {
      updateTournament(activeTournamentId, { matches: updatedMatches })
    }
  }

  const handleRemovePlayer = (playerName) => {
    if (!activeTournament) return
    const updatedMatches = removePlayerFromPairing(activeTournament.matches, playerName)
    const updatedPlayers = activeTournament.players.filter(p => p.name !== playerName)
    updateTournament(activeTournamentId, { matches: updatedMatches, players: updatedPlayers })
  }

  // ── Open tournament / event from list ─────────────────────────────────────
  const handleOpenTournament = (id) => {
    setActiveTournamentId(id)
    setView('bracket')
  }

  const handleOpenEvent = (id) => {
    setActiveEventId(id)
    setView('event')
  }

  // ── Dashboard actions ───────────────────────────────────────────────────────
  const handleDashboardAction = (action) => {
    if (!isSuperAdmin && (action === 'create' || action === 'quickmatch')) return
    if (!isSuperAdmin && action === 'usermanagement') return
    if (action === 'create')         return setView('create')
    if (action === 'csvimport')      return setView('csvimport')
    if (action === 'tournaments')    return setView('tournaments')
    if (action === 'quickmatch')     return setView('quickmatch')
    if (action === 'history')        return setView('history')
    if (action === 'usermanagement') return setView('usermanagement')
  }

  // ── Back logic ──────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (view === 'bracket') return setView('tournaments')
    if (view === 'event')   return setView('tournaments')
    if (view === 'history') return activeEvent ? setView('event') : setView(activeTournament ? 'bracket' : 'dashboard')
    setView('dashboard')
  }

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────
  const crumbs = {
    dashboard:      'Home › Chess',
    create:         'Home › Chess › Create Tournament',
    csvimport:      'Home › Chess › Import CSV',
    tournaments:    'Home › Chess › Events & Tournaments',
    bracket:        `Home › Chess › ${activeTournament?.name ?? 'Bracket'}`,
    event:          `Home › Chess › ${activeEvent?.name ?? 'Event'}`,
    quickmatch:     'Home › Chess › Quick Match',
    history:        'Home › Chess › History',
    usermanagement: 'Home › Chess › User Management',
  }

  // ── Top-bar secondary actions ───────────────────────────────────────────────
  const topActions = () => {
    if (view === 'bracket') return (
      <>
        <button className="topbar-btn topbar-btn--ghost"
          onClick={() => setView(view === 'history' ? 'bracket' : 'history')}>
          📋 History
        </button>
        <button className="topbar-btn topbar-btn--ghost"
          onClick={() => setView('tournaments')}>
          ← All Events
        </button>
        <button className="topbar-btn topbar-btn--gold" onClick={() => setDisplayOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          Display
        </button>
      </>
    )
    if (view === 'event') return (
      <>
        <button className="topbar-btn topbar-btn--ghost"
          onClick={() => setView('history')}>
          📋 History
        </button>
        <button className="topbar-btn topbar-btn--ghost"
          onClick={() => setView('tournaments')}>
          ← All Events
        </button>
      </>
    )
    if (view === 'tournaments' && isSuperAdmin) return (
      <button className="topbar-btn topbar-btn--gold" onClick={() => setView('create')}>
        + New Tournament
      </button>
    )
    if (view === 'history') return (
      <button className="topbar-btn topbar-btn--ghost"
        onClick={() => activeEvent ? setView('event') : setView('bracket')}
        style={{ display: activeTournament ? undefined : 'none' }}>
        {activeEvent ? '🏆 Event' : '🏆 Bracket'}
      </button>
    )
    return null
  }

  return (
    <div className="chess-page">
      {/* Background */}
      <div className="chess-bg" aria-hidden="true">
        <div className="chess-orb chess-orb-1" />
        <div className="chess-orb chess-orb-2" />
        <div className="chess-orb chess-orb-3" />
        <div className="chess-grid-overlay" />
      </div>

      {/* Top bar */}
      <motion.header
        className="chess-topbar"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <button className="chess-topbar-brand" onClick={() => navigate('/')}>
          <div className="chess-topbar-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#tbGold)"/>
              <defs>
                <linearGradient id="tbGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#d97706"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="chess-topbar-brand-text">Cloud Krida</span>
        </button>

        <div className="chess-topbar-sep" />

        <button
          className="chess-back-btn"
          onClick={view === 'dashboard' ? () => navigate('/') : handleBack}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {view === 'dashboard' ? 'Home' : 'Back'}
        </button>

        <div className="chess-topbar-title">
          <span className="topbar-icon">♛</span>
          <div>
            <div className="topbar-name">CHESS</div>
            <div className="topbar-breadcrumb">{crumbs[view] ?? crumbs.dashboard}</div>
          </div>
        </div>

        <div className="chess-topbar-actions">
          {topActions()}
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main content */}
      <div className="chess-content">
        <ErrorBoundary>
        <AnimatePresence mode="wait">

          {view === 'dashboard' && (
            <motion.div key="dashboard" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <Dashboard
                onAction={handleDashboardAction}
                tournamentCount={tournaments.length}
                quickMatchCount={quickMatches.length}
                isSuperAdmin={isSuperAdmin}
              />
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div key="create" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              {isSuperAdmin ? (
                <TournamentCreator
                  onComplete={handleTournamentComplete}
                  onCancel={() => setView('dashboard')}
                />
              ) : (
                <div className="chess-section">
                  <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <div className="empty-state-title">Super Admin Access Required</div>
                    <div className="empty-state-sub">Only the Super Admin can create and manage tournaments.</div>
                    <button className="chess-btn-gold" style={{ marginTop: 20 }} onClick={() => navigate('/login')}>
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'tournaments' && (
            <motion.div key="tournaments" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <TournamentList
                onOpen={handleOpenTournament}
                onOpenEvent={handleOpenEvent}
                onCreate={isSuperAdmin ? () => setView('create') : null}
                isSuperAdmin={isSuperAdmin}
              />
            </motion.div>
          )}

          {view === 'event' && activeEvent && (
            <motion.div key={`event-${activeEventId}`} variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <EventDetail
                event={activeEvent}
                isSuperAdmin={isSuperAdmin}
                canUploadPhotos={canUploadPhotos}
                canDeletePhotos={canDeletePhotos}
                canViewPrivate={canViewPrivate}
                currentUserId={userId}
                currentUserRole={currentUserRole}
              />
            </motion.div>
          )}

          {view === 'event' && !activeEvent && (
            <motion.div key="no-event" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <div className="chess-section">
                <div className="empty-state">
                  <div className="empty-state-icon">🏆</div>
                  <div className="empty-state-title">No event selected</div>
                  <div className="empty-state-sub">Select an event to view its sections.</div>
                  <button className="chess-btn-ghost" style={{ marginTop: 20 }} onClick={() => setView('tournaments')}>
                    View All
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'bracket' && activeTournament && (
            <motion.div key={`bracket-${activeTournamentId}`} variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              {activeTournament.format === 'points_tournament' ? (
                <PointsTournament
                  tournament={activeTournament}
                  playerFields={activeTournament.playerFields}
                  onUpdate={isSuperAdmin ? (partial) => updateTournament(activeTournamentId, partial) : null}
                  tournamentId={activeTournamentId}
                  canUpload={canUploadPhotos}
                  canDelete={canDeletePhotos}
                  currentUserId={userId}
                  currentUserRole={currentUserRole}
                  canViewPrivate={canViewPrivate}
                  onDisplay={() => setDisplayOpen(true)}
                  isSuperAdmin={isSuperAdmin}
                />
              ) : (
                <BracketView
                  matches={activeTournament.matches}
                  players={activeTournament.players}
                  totalRounds={activeTournament.totalRounds}
                  meta={{ name: activeTournament.name, format: activeTournament.format }}
                  playerFields={activeTournament.playerFields}
                  gallery={activeTournament.gallery ?? []}
                  onUpdate={isSuperAdmin ? handleMatchesUpdate : null}
                  onRemovePlayer={isSuperAdmin ? handleRemovePlayer : null}
                  tournamentId={activeTournamentId}
                  canUpload={canUploadPhotos}
                  canDelete={canDeletePhotos}
                  currentUserId={userId}
                  currentUserRole={currentUserRole}
                  onDisplay={() => setDisplayOpen(true)}
                  isSuperAdmin={isSuperAdmin}
                />
              )}
            </motion.div>
          )}

          {view === 'bracket' && !activeTournament && (
            <motion.div key="no-bracket" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <div className="chess-section">
                <div className="empty-state">
                  <div className="empty-state-icon">♛</div>
                  <div className="empty-state-title">No tournament selected</div>
                  <div className="empty-state-sub">Select a tournament to view its bracket.</div>
                  <button className="chess-btn-ghost" style={{ marginTop: 20 }} onClick={() => setView('tournaments')}>View All</button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'csvimport' && (
            <motion.div key="csvimport" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              {isSuperAdmin ? (
                <CSVImporter
                  onGenerateTournaments={handleBulkCreate}
                  onCancel={() => setView('dashboard')}
                />
              ) : (
                <div className="chess-section">
                  <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <div className="empty-state-title">Super Admin Access Required</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'quickmatch' && (
            <motion.div key="quickmatch" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <QuickMatch />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div key="history" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              <MatchHistory activeTournamentId={activeTournamentId} />
            </motion.div>
          )}

          {view === 'usermanagement' && (
            <motion.div key="usermanagement" variants={viewAnim} initial="hidden" animate="visible" exit="exit">
              {isSuperAdmin ? (
                <UserManagement />
              ) : (
                <div className="chess-section">
                  <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <div className="empty-state-title">Super Admin Only</div>
                    <div className="empty-state-sub">User management is restricted to the Super Admin.</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
        </ErrorBoundary>
      </div>

      {/* Footer */}
      <GlobalFooter />

      {/* Section / standalone display mode */}
      <AnimatePresence>
        {displayOpen && activeTournament && (
          <DisplayMode
            matches={activeTournament.matches}
            totalRounds={activeTournament.totalRounds}
            meta={{ name: activeTournament.name, format: activeTournament.format }}
            playerFields={activeTournament.playerFields}
            standings={
              activeTournament.format === 'points_tournament'
                ? computeStandings(activeTournament.players, activeTournament.matches)
                : null
            }
            onClose={() => setDisplayOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Root export (provides context) ────────────────────────────────────────────
export default function Chess() {
  return (
    <ChessProvider>
      <ChessPage />
    </ChessProvider>
  )
}
