import { useNavigate } from 'react-router-dom'
import './Breadcrumb.css'

// trail is the path AFTER "Home" — e.g. [{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Chess' }]
// The last entry (current page) should omit `path` so it renders as non-clickable.
export default function Breadcrumb({ trail }) {
  const navigate = useNavigate()
  const items = [{ label: 'Home', path: '/' }, ...trail]

  return (
    <nav className="crumb-bar" aria-label="Breadcrumb">
      <div className="crumb-inner">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <span key={i} className="crumb-item">
              {item.path && !isLast ? (
                <button className="crumb-link" onClick={() => navigate(item.path)}>{item.label}</button>
              ) : (
                <span className="crumb-current">{item.label}</span>
              )}
              {!isLast && <span className="crumb-sep">›</span>}
            </span>
          )
        })}
      </div>
    </nav>
  )
}
