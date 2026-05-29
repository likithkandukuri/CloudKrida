import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLE_LABELS = {
  superadmin: { icon: '👑', label: 'Super Admin', cls: 'um-role--superadmin' },
  admin:      { icon: '📸', label: 'Admin',       cls: 'um-role--admin'      },
  guest:      { icon: '👀', label: 'Guest',       cls: 'um-role--guest'      },
}

function RolePill({ role }) {
  const r = ROLE_LABELS[role] ?? ROLE_LABELS.guest
  return (
    <span className={`um-role-pill ${r.cls}`}>
      {r.icon} {r.label}
    </span>
  )
}

function StatusPill({ status }) {
  return (
    <span className={`um-status-pill ${status === 'active' ? 'um-status--active' : 'um-status--disabled'}`}>
      {status === 'active' ? 'Active' : 'Disabled'}
    </span>
  )
}

// ── Add User Form ─────────────────────────────────────────────────────────────
function AddUserForm({ onAdd }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('guest')
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return setError('Username is required.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setSaving(true)
    const result = await onAdd(username, password, role)
    setSaving(false)
    if (!result.ok) return setError(result.error)
    setUsername('')
    setPassword('')
    setRole('guest')
    setError('')
  }

  return (
    <form className="um-add-form" onSubmit={handleSubmit}>
      <div className="um-add-title">Add New User</div>

      {error && <div className="um-error">{error}</div>}

      <div className="um-add-fields">
        <input
          className="chess-input"
          placeholder="Username"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          autoComplete="off"
          disabled={saving}
        />

        <div style={{ position: 'relative' }}>
          <input
            className="chess-input"
            type={showPw ? 'text' : 'password'}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            autoComplete="new-password"
            style={{ paddingRight: 44 }}
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--cc-muted)', fontSize: 16, lineHeight: 1, padding: 0,
            }}
          >{showPw ? '🙈' : '👁'}</button>
        </div>

        <select
          className="chess-input"
          value={role}
          onChange={e => setRole(e.target.value)}
          disabled={saving}
        >
          <option value="guest">👀 Guest (view only)</option>
          <option value="admin">📸 Admin (view + upload photos)</option>
        </select>

        <button type="submit" className="chess-btn-gold" disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Adding…' : '+ Add User'}
        </button>
      </div>
    </form>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────
function UserRow({ user, onPromote, onDemote, onToggle, onRemove }) {
  const [confirm, setConfirm] = useState(null)
  const [busy,    setBusy]    = useState(false)

  const run = async (fn) => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  return (
    <motion.tr
      className="um-row"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <td className="um-cell um-cell--username">
        <span className="um-username">{user.username}</span>
      </td>
      <td className="um-cell">
        <RolePill role={user.role} />
      </td>
      <td className="um-cell">
        <StatusPill status={user.status} />
      </td>
      <td className="um-cell um-cell--actions">
        {confirm ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--cc-warn)' }}>Sure?</span>
            <button className="um-btn um-btn--danger" disabled={busy}
              onClick={() => run(() => onRemove(user.id)).then(() => setConfirm(null))}>
              Yes
            </button>
            <button className="um-btn um-btn--ghost" onClick={() => setConfirm(null)}>No</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {user.role === 'guest' && (
              <button className="um-btn um-btn--promote" disabled={busy}
                onClick={() => run(() => onPromote(user.id))}>
                📸 Promote to Admin
              </button>
            )}
            {user.role === 'admin' && (
              <button className="um-btn um-btn--demote" disabled={busy}
                onClick={() => run(() => onDemote(user.id))}>
                👀 Remove Admin
              </button>
            )}
            <button
              className={`um-btn ${user.status === 'active' ? 'um-btn--disable' : 'um-btn--enable'}`}
              disabled={busy}
              onClick={() => run(() => onToggle(user.id, user.status))}
            >
              {user.status === 'active' ? 'Disable' : 'Enable'}
            </button>
            <button className="um-btn um-btn--danger" disabled={busy} onClick={() => setConfirm(true)}>
              Remove
            </button>
          </div>
        )}
      </td>
    </motion.tr>
  )
}

// ── UserManagement ────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { users, addUser, updateUser, removeUser } = useAuth()

  const handlePromote = (id) => updateUser(id, { role: 'admin' })
  const handleDemote  = (id) => updateUser(id, { role: 'guest' })
  const handleToggle  = (id, currentStatus) =>
    updateUser(id, { status: currentStatus === 'active' ? 'disabled' : 'active' })

  const adminCount = users.filter(u => u.role === 'admin').length
  const guestCount = users.filter(u => u.role === 'guest').length

  return (
    <div className="chess-section">
      <div className="chess-section-head">
        <div className="chess-eyebrow">Control Center</div>
        <h2 className="chess-heading">User Management</h2>
        <p className="chess-subhead">
          {users.length} user{users.length !== 1 ? 's' : ''} · {adminCount} photo admin{adminCount !== 1 ? 's' : ''} · {guestCount} guest{guestCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Permission reference */}
      <div className="um-permission-grid">
        {[
          { icon: '👑', title: 'Super Admin', items: ['Full tournament management', 'Create & delete tournaments', 'Enter scores & manage pairings', 'Upload & delete photos', 'Manage all users'] },
          { icon: '📸', title: 'Admin', items: ['View all tournaments', 'View brackets & standings', 'Upload tournament photos', '— cannot edit anything else'] },
          { icon: '👀', title: 'Guest', items: ['View all tournaments', 'View brackets & standings', 'View galleries', '— read-only access'] },
        ].map(p => (
          <div key={p.title} className="um-perm-card">
            <div className="um-perm-title">{p.icon} {p.title}</div>
            <ul className="um-perm-list">
              {p.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Add user */}
      <AddUserForm onAdd={addUser} />

      {/* Users table */}
      <div className="um-table-wrap">
        {users.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 32 }}>
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No managed users yet</div>
            <div className="empty-state-sub">Add users above to give them login access.</div>
          </div>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onPromote={handlePromote}
                    onDemote={handleDemote}
                    onToggle={handleToggle}
                    onRemove={removeUser}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Superadmin note */}
      <div style={{
        marginTop: 24, padding: '12px 16px', borderRadius: 10, fontSize: 12,
        background: 'rgba(212,163,54,0.05)', border: '1px solid rgba(212,163,54,0.14)',
        color: 'var(--cc-muted)',
      }}>
        👑 Super Admin account (<strong style={{ color: 'var(--cc-sub)' }}>superadmin</strong>) is permanent and cannot be modified here.
        User accounts are stored securely in the cloud database.
      </div>
    </div>
  )
}
