import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../auth/AuthContext.jsx'
import ThemeToggle from '../../shared/components/ThemeToggle.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import './Account.css'

const ROLE_LABEL = {
  superadmin: '👑 Super Admin',
  admin:      '📸 Admin',
  guest:      '👀 Guest',
}

function UsernameForm() {
  const { username, changeUsername } = useAuth()
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [saving,  setSaving]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const trimmed = value.trim()
    if (!trimmed) return setError('Enter a new username.')
    if (trimmed.toLowerCase() === username) return setError('That is already your username.')

    setSaving(true)
    const result = await changeUsername(trimmed)
    setSaving(false)

    if (!result.ok) return setError(result.error)
    setValue('')
    setSuccess('Username updated.')
  }

  return (
    <form className="acct-form" onSubmit={handleSubmit}>
      <div className="acct-field">
        <label className="acct-label">Current Username</label>
        <input className="acct-input" value={username ?? ''} disabled />
      </div>

      <div className="acct-field">
        <label className="acct-label" htmlFor="acct-new-username">New Username</label>
        <input
          id="acct-new-username"
          className="acct-input"
          value={value}
          onChange={e => { setValue(e.target.value); setError(''); setSuccess('') }}
          placeholder="3-20 characters: letters, numbers, underscores"
          autoComplete="off"
          disabled={saving}
        />
      </div>

      {error && <div className="acct-error">{error}</div>}
      {success && <div className="acct-success">{success}</div>}

      <button type="submit" className="acct-btn" disabled={saving}>
        {saving ? 'Saving…' : 'Update Username'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const { changePassword } = useAuth()
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!current) return setError('Enter your current password.')
    if (next.length < 6) return setError('New password must be at least 6 characters.')
    if (next !== confirm) return setError('New passwords do not match.')

    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)

    if (!result.ok) return setError(result.error)
    setCurrent('')
    setNext('')
    setConfirm('')
    setSuccess('Password updated.')
  }

  return (
    <form className="acct-form" onSubmit={handleSubmit}>
      <div className="acct-field">
        <label className="acct-label" htmlFor="acct-current-pw">Current Password</label>
        <input
          id="acct-current-pw"
          className="acct-input"
          type="password"
          value={current}
          onChange={e => { setCurrent(e.target.value); setError(''); setSuccess('') }}
          autoComplete="current-password"
          disabled={saving}
        />
      </div>

      <div className="acct-field">
        <label className="acct-label" htmlFor="acct-new-pw">New Password</label>
        <input
          id="acct-new-pw"
          className="acct-input"
          type="password"
          value={next}
          onChange={e => { setNext(e.target.value); setError(''); setSuccess('') }}
          placeholder="Min 6 characters"
          autoComplete="new-password"
          disabled={saving}
        />
      </div>

      <div className="acct-field">
        <label className="acct-label" htmlFor="acct-confirm-pw">Confirm New Password</label>
        <input
          id="acct-confirm-pw"
          className="acct-input"
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError(''); setSuccess('') }}
          autoComplete="new-password"
          disabled={saving}
        />
      </div>

      {error && <div className="acct-error">{error}</div>}
      {success && <div className="acct-success">{success}</div>}

      <button type="submit" className="acct-btn" disabled={saving}>
        {saving ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  )
}

export default function Account() {
  const navigate = useNavigate()
  const { userId, username, role, loading } = useAuth()

  usePageMeta({
    title:       'Account Settings — Cloud Krida',
    description: 'Manage your Cloud Krida login credentials.',
  })

  useEffect(() => {
    if (!loading && !userId) navigate('/login', { replace: true })
  }, [loading, userId, navigate])

  if (loading || !userId) return null

  return (
    <div className="acct-page">
      <div className="acct-bg" aria-hidden="true">
        <div className="acct-orb acct-orb-1" />
        <div className="acct-orb acct-orb-2" />
      </div>

      <div className="acct-topbar">
        <button className="acct-back" onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <ThemeToggle />
      </div>

      <div className="acct-center">
        <motion.div
          className="acct-card"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="acct-heading">Account Settings</div>
          <div className="acct-subheading">
            Signed in as <strong>{username}</strong> · {ROLE_LABEL[role] ?? role}
          </div>

          <div className="acct-divider" />

          <div className="acct-section-title">Change Username</div>
          <UsernameForm />

          <div className="acct-divider" />

          <div className="acct-section-title">Change Password</div>
          <PasswordForm />
        </motion.div>
      </div>
    </div>
  )
}
