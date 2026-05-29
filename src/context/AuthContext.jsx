import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [userId,  setUserId]  = useState(null)
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)   // true until Supabase resolves session

  // ── Session init + persistence ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setUserId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (uid) => {
    setUserId(uid)
    const { data } = await supabase
      .from('user_profiles')
      .select('username, role, status')
      .eq('id', uid)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }

  // ── Derived flags ───────────────────────────────────────────────────────────
  const role            = profile?.role     ?? 'guest'
  const username        = profile?.username ?? null
  const isSuperAdmin    = role === 'superadmin'
  const isAdmin         = role === 'admin'
  const canUploadPhotos = isSuperAdmin || isAdmin
  const canDeletePhotos = isSuperAdmin

  // ── Login / logout ──────────────────────────────────────────────────────────
  const login = async (inputUsername, inputPassword) => {
    const email = `${inputUsername.trim().toLowerCase()}@chess-arena.app`
    const { error } = await supabase.auth.signInWithPassword({ email, password: inputPassword })
    if (error) return { ok: false, error: 'Incorrect username or password.' }
    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  // ── User management (superadmin only) ────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, role, status, created_at')
      .neq('role', 'superadmin')
      .order('created_at')
    setUsers(data ?? [])
  }, [])

  useEffect(() => {
    if (isSuperAdmin) fetchUsers()
  }, [isSuperAdmin, fetchUsers])

  const addUser = async (newUsername, password, userRole = 'guest') => {
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'create', username: newUsername.trim(), password, role: userRole },
    })
    if (error) return { ok: false, error: error.message }
    if (data?.error) return { ok: false, error: data.error }
    await fetchUsers()
    return { ok: true }
  }

  const updateUser = async (id, changes) => {
    const { error } = await supabase.from('user_profiles').update(changes).eq('id', id)
    if (error) { console.error('[Krida] updateUser:', error); return }
    await fetchUsers()
  }

  const removeUser = async (id) => {
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'delete', userId: id },
    })
    if (error || data?.error) {
      console.error('[Krida] removeUser:', error ?? data?.error)
      return
    }
    await fetchUsers()
  }

  return (
    <AuthCtx.Provider value={{
      role, username, userId, loading,
      isSuperAdmin, isAdmin,
      canUploadPhotos, canDeletePhotos,
      login, logout,
      users, addUser, updateUser, removeUser,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
