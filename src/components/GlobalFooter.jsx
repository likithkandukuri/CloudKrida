import { useNavigate } from 'react-router-dom'
import './GlobalFooter.css'

const NAV_LINKS = [
  { label: 'Home',   path: '/' },
  { label: 'Chess',  path: '/chess' },
  { label: 'Tennis', path: '/tennis' },
  { label: 'Darts',  path: '/darts' },
]

const TOOL_LINKS = [
  { label: 'Create Tournament',  path: '/chess' },
  { label: 'Points Tournament',  path: '/chess' },
  { label: 'Live Pairings',      path: '/chess' },
  { label: 'Display Mode',       path: '/chess' },
  { label: 'Match History',      path: '/chess' },
  { label: 'Tournament Gallery', path: '/chess' },
]

export default function GlobalFooter() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()

  return (
    <footer className="gfooter">
      <div className="gfooter-inner">

        {/* Brand */}
        <div className="gfooter-brand">
          <div className="gfooter-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fbbf24"/>
            </svg>
            KRIDA
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
            <button key={l.path} className="gfooter-link" onClick={() => navigate(l.path)}>
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
              <a href="mailto:kridatournament@gmail.com" className="gfooter-email">
                kridatournament@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="gfooter-bottom">
        <span>© {year} KRIDA Tournament Platform. All rights reserved.</span>
        <span className="gfooter-version">v1.0 · Beta</span>
      </div>
    </footer>
  )
}
