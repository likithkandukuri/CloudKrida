import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

// Home shows the site-level 5 links. Tournament Management shows itself, its two
// sports (Chess live, Pickleball scaffolded — more sports land here as they're built),
// and About/Contact. Learning Programs gets its own smaller, self-contained set (no
// generic About/Contact, since Contact & Enrollment already covers that) and never
// shows auth UI.
const SECTION_LINKS = {
  home: [
    { label: 'Home',                  path: '/',                  exact: true  },
    { label: 'Tournament Management', path: '/tournaments',       exact: false },
    { label: 'Learning Programs',     path: '/summerclasses',     exact: false },
    { label: 'About',                 path: '/about',             exact: false },
    { label: 'Contact',               path: '/contact',           exact: false },
  ],
  tournament: [
    { label: 'Home',                  path: '/',                     exact: true  },
    { label: 'Tournament Management', path: '/tournaments',          exact: true  },
    { label: 'Chess',                 path: '/tournaments/chess',     exact: false },
    { label: 'Pickleball',            path: '/tournaments/pickleball',exact: false },
    { label: 'About',                 path: '/about',                exact: false },
    { label: 'Contact',               path: '/contact',              exact: false },
  ],
  summer: [
    { label: 'Home',                  path: '/',                          exact: true  },
    { label: 'Learning Programs',     path: '/summerclasses',             exact: true  },
    { label: 'About the Instructor',  path: '/summerclasses/instructor',  exact: false },
    { label: 'Mathematics Program',   path: '/summerclasses/mathematics', exact: false },
    { label: 'Contact & Enrollment',  path: '/summerclasses/enroll',      exact: false },
  ],
}

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

// ── Main GlobalNav ─────────────────────────────────────────────────────────
export default function GlobalNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isSignedIn = role !== 'guest'
  const isHomepage = location.pathname === '/'
  const section    = getSection(location.pathname)
  const links      = SECTION_LINKS[section]

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isActive = (path, exact) => exact
    ? location.pathname === path
    : location.pathname.startsWith(path)

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

          {/* ── Desktop nav links — auto-width chip, hugs its own content ── */}
          <div className="gnav-links">
            <div className="gnav-links-inner">
              {links.map(l => (
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
          </div>

          {/* ── Right side ── */}
          <div className="gnav-right">
            <ThemeToggle />

            {/* Auth UI is hidden on the homepage and throughout Learning Programs — Learning Programs is fully public, no login */}
            {!isHomepage && section !== 'summer' && (
              <>
                <RoleBadge role={role} />

                {isSignedIn ? (
                  <>
                    <button className="gnav-account" onClick={() => navigate('/account')} aria-label="Account settings">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </button>
                    <button className="gnav-signout" onClick={() => { logout(); navigate('/') }}>
                      Sign Out
                    </button>
                  </>
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
            {links.map(l => (
              <button
                key={l.path}
                className={`gnav-mobile-link ${isActive(l.path, l.exact) ? 'gnav-mobile-link--active' : ''}`}
                onClick={() => navigate(l.path)}
              >
                {l.label}
              </button>
            ))}

            {/* Auth UI is hidden on the homepage and throughout Learning Programs — Learning Programs is fully public, no login */}
            {!isHomepage && section !== 'summer' && (
              <>
                <div className="gnav-mobile-sep" />

                {isSignedIn ? (
                  <>
                    <button className="gnav-mobile-account" onClick={() => { navigate('/account'); setMenuOpen(false) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Account Settings
                    </button>
                    <button className="gnav-mobile-signout" onClick={() => { logout(); navigate('/'); setMenuOpen(false) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                      </svg>
                      Sign Out ({role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Guest'})
                    </button>
                  </>
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
