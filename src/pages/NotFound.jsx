import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'
import './NotFound.css'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="notfound-page">
      <div className="notfound-bg" aria-hidden="true">
        <div className="notfound-orb notfound-orb-1" />
        <div className="notfound-orb notfound-orb-2" />
        <div className="notfound-grid" />
      </div>

      <GlobalNav />

      <motion.div
        className="notfound-content"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page not found</h1>
        <p className="notfound-desc">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="notfound-actions">
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button className="btn-ghost" onClick={() => navigate('/chess')}>
            Chess Platform
          </button>
        </div>
      </motion.div>

      <GlobalFooter />
    </div>
  )
}
