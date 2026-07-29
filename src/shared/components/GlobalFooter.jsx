import { useNavigate, useLocation } from 'react-router-dom'
import './GlobalFooter.css'

// ── Home + Tournament footer — content unchanged, do not modify ──────────
const NAV_LINKS = [
  { label: 'Home',              path: '/'                },
  { label: 'Chess',             path: '/tournaments/chess'  },
  { label: 'Tennis',            path: '/tournaments/tennis' },
  { label: 'Darts',             path: '/tournaments/darts'  },
  { label: 'Learning Programs', path: '/summerclasses'  },
  { label: 'About',             path: '/about'           },
  { label: 'Contact',           path: '/contact'         },
]

const TOOL_LINKS = [
  { label: 'Create Tournament',  path: '/tournaments/chess' },
  { label: 'Points Tournament',  path: '/tournaments/chess' },
  { label: 'Live Pairings',      path: '/tournaments/chess' },
  { label: 'Display Mode',       path: '/tournaments/chess' },
  { label: 'Match History',      path: '/tournaments/chess' },
  { label: 'Tournament Gallery', path: '/tournaments/chess' },
]

// ── Learning Programs footer — new, additive, only rendered under /summerclasses ──
const SUMMER_NAV_LINKS = [
  { label: 'Programs Home',        path: '/summerclasses'                    },
  { label: 'About the Instructor', path: '/summerclasses/instructor'         },
  { label: 'Mathematics Program',  path: '/summerclasses/mathematics'        },
  { label: 'Schedule & Pricing',   path: '/summerclasses/schedule-pricing'   },
  { label: 'How Classes Work',     path: '/summerclasses/tools'              },
  { label: 'Learning Materials',   path: '/summerclasses/materials'          },
  { label: 'Testimonials',         path: '/summerclasses/testimonials'       },
  { label: 'Contact & Enrollment', path: '/summerclasses/enroll'             },
]

function SummerFooter({ navigate, year }) {
  return (
    <footer className="gfooter gfooter-summer">
      <div className="gfooter-summer-inner">

        <div className="gfooter-summer-brand">
          <div className="gfooter-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fbbf24"/>
            </svg>
            Cloud Krida
          </div>
          <p className="gfooter-desc">
            Personalized mathematics tutoring on Cloud Krida — online or in-person,
            one-on-one or small group.
          </p>
        </div>

        <div className="gfooter-summer-col">
          <div className="gfooter-col-title gfooter-col-title--summer">Learning Programs</div>
          {SUMMER_NAV_LINKS.map(l => (
            <button key={l.label} className="gfooter-link" onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="gfooter-summer-col">
          <div className="gfooter-col-title">More from Cloud Krida</div>
          <button className="gfooter-link" onClick={() => navigate('/')}>Home</button>
          <button className="gfooter-link" onClick={() => navigate('/tournaments')}>Tournament Management</button>
          <button className="gfooter-link" onClick={() => navigate('/about')}>About</button>
          <button className="gfooter-link" onClick={() => navigate('/contact')}>Contact</button>
        </div>

        <div className="gfooter-summer-col">
          <div className="gfooter-col-title">Contact</div>
          <p className="gfooter-text">
            Questions or feedback?<br />
            <a href="mailto:cloudkrida@gmail.com" className="gfooter-email">
              cloudkrida@gmail.com
            </a>
            <br />
            <span style={{ opacity: 0.7 }}>cloudkrida.com</span>
          </p>
        </div>

      </div>

      <div className="gfooter-bottom">
        <span>© {year} Cloud Krida. All rights reserved.</span>
        <span className="gfooter-bottom-links">
          <button className="gfooter-link-inline" onClick={() => navigate('/privacy')}>Privacy Policy</button>
        </span>
        <span className="gfooter-version">v1.0 · Beta</span>
      </div>
    </footer>
  )
}

export default function GlobalFooter() {
  const navigate = useNavigate()
  const location = useLocation()
  const year = new Date().getFullYear()

  const isSummer = location.pathname.startsWith('/summerclasses') || location.pathname.startsWith('/admin/summer-classes')
  if (isSummer) return <SummerFooter navigate={navigate} year={year} />

  // ── Original Home + Tournament footer — unchanged ──
  return (
    <footer className="gfooter">
      <div className="gfooter-inner">

        {/* Brand */}
        <div className="gfooter-brand">
          <div className="gfooter-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fbbf24"/>
            </svg>
            Cloud Krida
          </div>
          <p className="gfooter-desc">
            Professional tournament management for chess, tennis, darts, and more.
            Built for tournament directors and players who need a real-world tool.
          </p>
          <div className="gfooter-games">
            <span>♟ Chess</span>
            <span>🎾 Tennis</span>
            <span>🎯 Darts</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="gfooter-col">
          <div className="gfooter-col-title">Navigation</div>
          {NAV_LINKS.map(l => (
            <button key={l.path + l.label} className="gfooter-link" onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Tournament Tools */}
        <div className="gfooter-col">
          <div className="gfooter-col-title">Tournament Tools</div>
          {TOOL_LINKS.map(l => (
            <button key={l.label} className="gfooter-link" onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="gfooter-col">
          <div className="gfooter-col-title">About</div>
          <p className="gfooter-text">
            Supports Single Elimination brackets and Swiss Points Tournaments.
            Full pairings management, live scoring, board assignments, and photo galleries.
          </p>
          <div style={{ marginTop: 16 }}>
            <div className="gfooter-col-title" style={{ marginBottom: 8 }}>Contact</div>
            <p className="gfooter-text">
              Questions or feedback?<br />
              <a href="mailto:cloudkrida@gmail.com" className="gfooter-email">
                cloudkrida@gmail.com
              </a>
              <br />
              <span style={{ opacity: 0.7 }}>cloudkrida.com</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="gfooter-bottom">
        <span>© {year} Cloud Krida Tournament Platform. All rights reserved.</span>
        <span className="gfooter-bottom-links">
          <button className="gfooter-link-inline" onClick={() => navigate('/privacy')}>Privacy Policy</button>
        </span>
        <span className="gfooter-version">v1.0 · Beta</span>
      </div>
    </footer>
  )
}
