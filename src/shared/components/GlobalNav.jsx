import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from './ThemeToggle.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import './GlobalNav.css'

// Section is derived from the URL — each has its own link set, brand subtitle, and accent (via CSS class)
function getSection(pathname) {
  if (pathname.startsWith('/tournaments')) return 'tournament'
  if (pathname.startsWith('/summerclasses') || pathname.startsWith('/admin/summer-classes')) return 'summer'
  return 'home'
}

const SECTION_SUBTITLE = {
  home:       'Cloud Krida Platform',
  tournament: 'Tournament Platform',
  summer:     'Learning Programs',
}

// Always-present link back to the main Cloud Krida homepage — shown in every
// section except Home itself (where the section's own first link already is Home).
const HOME_LINK = { label: 'Home', path: '/', exact: true }

// First entry of each section doubles as the section's "home" link.
// The Chess dropdown (ChessNavItem) is injected right after the first link — only in the tournament section.
const SECTION_LINKS = {
  home: [
    { label: 'Home',                  path: '/',               exact: true  },
    { label: 'Tournament Management', path: '/tournaments',    exact: false },
    { label: 'Learning Programs',     path: '/summerclasses',  exact: false },
    { label: 'About',                 path: '/about',          exact: false },
    { label: 'Contact',               path: '/contact',        exact: false },
  ],
  tournament: [
    { label: 'Tournament Home', path: '/tournaments',        exact: true  },
    { label: 'Tennis',          path: '/tournaments/tennis', exact: false },
    { label: 'Darts',           path: '/tournaments/darts',  exact: false },
    { label: 'About',           path: '/about',              exact: false },
    { label: 'Contact',         path: '/contact',             exact: false },
  ],
  summer: [
    { label: 'Programs Home',        path: '/summerclasses',            exact: true  },
    { label: 'About the Instructor', path: '/summerclasses/instructor', exact: false },
    { label: 'Mathematics Program',  path: '/summerclasses/mathematics', exact: false },
    { label: 'Contact & Enrollment', path: '/summerclasses/enroll',     exact: false },
    { label: 'About',                path: '/about',                    exact: false },
    { label: 'Contact',              path: '/contact',                  exact: false },
  ],
}

// Actions filtered at render time by role
const CHESS_ACTIONS = [
  { icon: '🏆', label: 'Create Tournament',  path: '/tournaments/chess?view=create',     superAdminOnly: true },
  { icon: '📋', label: 'View Pairings',      path: '/tournaments/chess?view=tournaments' },
  { icon: '📺', label: 'Display Mode',       path: '/tournaments/chess?view=tournaments' },
  { icon: '📊', label: 'Standings',          path: '/tournaments/chess?view=tournaments' },
  { icon: '🕘', label: 'Match History',      path: '/tournaments/chess?view=history'     },
  { icon: '🖼', label: 'Tournament Gallery', path: null, galleryAction: true  },
]

function RoleBadge({ role }) {
  if (role === 'superadmin') return (
    <div className="gnav-role-badge gnav-role-badge--superadmin">
      <span>👑</span> Super Admin
    </div>
  )
  if (role === 'admin') return (
    <div className="gnav-role-badge gnav-role-badge--admin">
      <span>📸</span> Admin
    </div>
  )
  return (
    <div className="gnav-role-badge gnav-role-badge--guest">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
      </svg>
      Guest
    </div>
  )
}

// ── Chess dropdown item — desktop ──────────────────────────────────────────
function ChessNavItem({ isActive, isSuperAdmin }) {
  const navigate    = useNavigate()
  const wrapRef     = useRef(null)
  const [open, setOpen] = useState(false)
  const closeTimer  = useRef(null)

  const visibleActions = CHESS_ACTIONS.filter(a => !a.superAdminOnly || isSuperAdmin)

  const openMenu  = useCallback(() => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [])

  const handleAction = useCallback((action) => {
    setOpen(false)
    if (action.galleryAction) {
      // Only navigate if there is tournament/event data
      if (localStorage.getItem('krida-has-data') === '1') {
        navigate('/tournaments/chess?view=tournaments')
      }
      return
    }
    navigate(action.path)
  }, [navigate])

  // Keyboard: close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="gnav-chess-wrap"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      {/* The Chess nav button */}
      <button
        className={`gnav-link gnav-chess-btn${isActive ? ' gnav-link--active' : ''}${open ? ' gnav-chess-btn--open' : ''}`}
        onClick={() => navigate('/tournaments/chess')}
        aria-haspopup="true"
        aria-expanded={open}
      >
        ♟ Chess
        {isActive && <span className="gnav-active-dot" />}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="gnav-chess-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            role="menu"
          >
            {/* Gold top accent line */}
            <div className="gnav-chess-dropdown-accent" />

            {visibleActions.map((action, i) => (
              <button
                key={action.label}
                className={`gnav-chess-action${i === 0 && action.superAdminOnly ? ' gnav-chess-action--admin' : ''}`}
                onClick={() => handleAction(action)}
                role="menuitem"
              >
                <span className="gnav-chess-action-icon">{action.icon}</span>
                <span className="gnav-chess-action-label">{action.label}</span>
                <svg className="gnav-chess-action-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main GlobalNav ─────────────────────────────────────────────────────────
export default function GlobalNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout, isSuperAdmin } = useAuth()
  const [scrolled,       setScrolled]       = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [chessExpanded,  setChessExpanded]  = useState(false)

  const isSignedIn = role !== 'guest'
  const isHomepage = location.pathname === '/'
  const section    = getSection(location.pathname)
  const links      = SECTION_LINKS[section]
  const [firstLink, ...restLinks] = links

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setMenuOpen(false); setChessExpanded(false) }, [location.pathname])

  const isActive = (path, exact) => exact
    ? location.pathname === path
    : location.pathname.startsWith(path)

  const isChessActive = location.pathname.startsWith('/tournaments/chess')

  const visibleMobileActions = CHESS_ACTIONS.filter(a => !a.superAdminOnly || isSuperAdmin)

  const handleMobileChessAction = (action) => {
    setMenuOpen(false)
    if (action.galleryAction) {
      if (localStorage.getItem('krida-has-data') === '1') navigate('/tournaments/chess?view=tournaments')
      return
    }
    navigate(action.path)
  }

  return (
    <>
      <motion.nav
        className={`gnav gnav--section-${section} ${scrolled ? 'gnav--scrolled' : ''}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="gnav-inner">

          {/* ── Brand ── */}
          <button className="gnav-logo" onClick={() => navigate('/')}>
            <div className="gnav-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="url(#gnavGold)"
                />
                <defs>
                  <linearGradient id="gnavGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="gnav-logo-text-wrap">
              <span className="gnav-logo-text">Cloud Krida</span>
              <span className="gnav-logo-sub">{SECTION_SUBTITLE[section]}</span>
            </div>
          </button>

          {/* ── Desktop nav links ── */}
          <div className="gnav-links">
            {/* Back to the main Cloud Krida homepage — every section except Home */}
            {section !== 'home' && (
              <button
                className={`gnav-link ${isActive(HOME_LINK.path, HOME_LINK.exact) ? 'gnav-link--active' : ''}`}
                onClick={() => navigate(HOME_LINK.path)}
              >
                {HOME_LINK.label}
                {isActive(HOME_LINK.path, HOME_LINK.exact) && <span className="gnav-active-dot" />}
              </button>
            )}

            {/* Section "home" link (Home / Tournament Home / Summer Classes Home) */}
            <button
              className={`gnav-link ${isActive(firstLink.path, firstLink.exact) ? 'gnav-link--active' : ''}`}
              onClick={() => navigate(firstLink.path)}
            >
              {firstLink.label}
              {isActive(firstLink.path, firstLink.exact) && <span className="gnav-active-dot" />}
            </button>

            {/* Chess — special item with dropdown, tournament section only */}
            {section === 'tournament' && (
              <ChessNavItem isActive={isChessActive} isSuperAdmin={isSuperAdmin} />
            )}

            {/* Remaining section links */}
            {restLinks.map(l => (
              <button
                key={l.path}
                className={`gnav-link ${isActive(l.path, l.exact) ? 'gnav-link--active' : ''}`}
                onClick={() => navigate(l.path)}
              >
                {l.label}
                {isActive(l.path, l.exact) && <span className="gnav-active-dot" />}
              </button>
            ))}
          </div>

          {/* ── Right side ── */}
          <div className="gnav-right">
            <ThemeToggle />

            {/* Auth UI is intentionally hidden on the homepage only — every other page is unchanged */}
            {!isHomepage && (
              <>
                <RoleBadge role={role} />

                {isSignedIn ? (
                  <button className="gnav-signout" onClick={() => { logout(); navigate('/') }}>
                    Sign Out
                  </button>
                ) : (
                  <button className="gnav-signin" onClick={() => navigate('/login')}>
                    Sign In
                  </button>
                )}
              </>
            )}

            <button
              className={`gnav-burger ${menuOpen ? 'gnav-burger--open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>

        </div>
      </motion.nav>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="gnav-mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Back to the main Cloud Krida homepage — every section except Home */}
            {section !== 'home' && (
              <button
                className={`gnav-mobile-link ${isActive(HOME_LINK.path, HOME_LINK.exact) ? 'gnav-mobile-link--active' : ''}`}
                onClick={() => navigate(HOME_LINK.path)}
              >
                {HOME_LINK.label}
              </button>
            )}

            {/* Section "home" link */}
            <button
              className={`gnav-mobile-link ${isActive(firstLink.path, firstLink.exact) ? 'gnav-mobile-link--active' : ''}`}
              onClick={() => navigate(firstLink.path)}
            >
              {firstLink.label}
            </button>

            {/* Chess — expandable sub-section, tournament section only */}
            {section === 'tournament' && (
              <>
                <button
                  className={`gnav-mobile-link gnav-chess-mobile-toggle${isChessActive ? ' gnav-mobile-link--active' : ''}`}
                  onClick={() => setChessExpanded(v => !v)}
                >
                  ♟ Chess
                  <svg
                    className={`gnav-chess-chevron${chessExpanded ? ' gnav-chess-chevron--open' : ''}`}
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                <AnimatePresence>
                  {chessExpanded && (
                    <motion.div
                      className="gnav-chess-mobile-sub"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {visibleMobileActions.map((action, i) => (
                        <button
                          key={action.label}
                          className={`gnav-chess-mobile-action${i === 0 && action.superAdminOnly ? ' gnav-chess-mobile-action--admin' : ''}`}
                          onClick={() => handleMobileChessAction(action)}
                        >
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Remaining section links */}
            {restLinks.map(l => (
              <button
                key={l.path}
                className={`gnav-mobile-link ${isActive(l.path, false) ? 'gnav-mobile-link--active' : ''}`}
                onClick={() => navigate(l.path)}
              >
                {l.label}
              </button>
            ))}

            {/* Auth UI is intentionally hidden on the homepage only — every other page is unchanged */}
            {!isHomepage && (
              <>
                <div className="gnav-mobile-sep" />

                {isSignedIn ? (
                  <button className="gnav-mobile-signout" onClick={() => { logout(); navigate('/'); setMenuOpen(false) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    Sign Out ({role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Guest'})
                  </button>
                ) : (
                  <button className="gnav-mobile-signin" onClick={() => { navigate('/login'); setMenuOpen(false) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                    </svg>
                    Sign In
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
