import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import './Login.css'

export default function Login() {
  const navigate         = useNavigate()
  const { login, username: loggedInUser, loading: authLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Redirect any authenticated user away from the login page
  useEffect(() => {
    if (!authLoading && loggedInUser) navigate('/', { replace: true })
  }, [loggedInUser, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Please fill in both fields.'); return }
    setLoading(true)
    setError('')
    const result = await login(username, password)
    if (result.ok) {
      navigate('/')
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* Animated background */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid" />
      </div>

      {/* Topbar */}
      <div className="login-topbar">
        <button className="login-back" onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to KRIDA
        </button>
        <ThemeToggle />
      </div>

      {/* Centred card */}
      <div className="login-center">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >

          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#lgGold)"/>
                <defs>
                  <linearGradient id="lgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="login-brand-name">KRIDA</div>
              <div className="login-brand-sub">Tournament Platform</div>
            </div>
          </div>

          <div className="login-divider" />

          <div className="login-heading">Admin Sign In</div>
          <div className="login-subheading">
            Enter your credentials to manage tournaments and scores.
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>

            <div className="login-field">
              <label className="login-label" htmlFor="lg-user">Username</label>
              <input
                id="lg-user"
                className="login-input"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="lg-pass">Password</label>
              <div className="login-input-wrap">
                <input
                  id="lg-pass"
                  className="login-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-show-pass"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </motion.div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <span className="login-spinner" />
                : <>
                    Sign In
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
              }
            </button>
          </form>

          <div className="login-divider" />

          {/* Guest CTA */}
          <div className="login-guest">
            <div className="login-guest-label">Just browsing?</div>
            <button className="login-guest-btn" onClick={() => navigate('/')}>
              Continue as Guest
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <div className="login-guest-note">Guests can view all tournaments and results</div>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
