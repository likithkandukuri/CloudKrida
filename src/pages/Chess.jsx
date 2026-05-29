import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Placeholder.css'

export default function Chess() {
  const navigate = useNavigate()
  return (
    <div className="placeholder placeholder--chess">
      <div className="placeholder-bg" />
      <motion.div
        className="placeholder-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="placeholder-icon">♛</span>
        <span className="placeholder-tag">STRATEGY</span>
        <h1 className="placeholder-title">Chess</h1>
        <p className="placeholder-desc">
          Full chess tournament management coming soon.<br />
          Track matches, ELO rankings, and live games.
        </p>
        <button className="placeholder-back" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to KRIDA
        </button>
      </motion.div>
    </div>
  )
}
