import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../shared/utilities/supabase.js'
import {
  fetchPickleballTournamentList, fetchPickleballTournament,
  createPickleballTournament, updatePickleballTournament, deletePickleballTournament,
  createPickleballEntrant, updatePickleballEntrant, deletePickleballEntrant,
  withdrawPickleballEntrant, reinstatePickleballEntrant, setPickleballEntrantMembers,
} from '../services/pickleballDb.js'

// Mirrors ChessContext.jsx's data-flow pattern (lazy-hydrate on activation,
// Realtime scoped to the active tournament). Write callbacks are thin
// wrappers that call the db layer then refresh — RLS (is_superadmin()) is the
// real enforcement; the UI additionally gates these behind isSuperAdmin so
// the controls are never even shown to non-superadmins.
const PickleballCtx = createContext(null)

export function PickleballProvider({ children }) {
  const [tournaments,        setTournaments]        = useState([])
  const [activeTournamentId, setActiveTournamentId]  = useState(null)
  const [dataLoading,        setDataLoading]         = useState(true)
  const [loadError,          setLoadError]           = useState(null)
  const [detailLoading,      setDetailLoading]       = useState(false)

  const tournamentsRef = useRef(tournaments)
  useEffect(() => { tournamentsRef.current = tournaments }, [tournaments])

  // ── Initial list load ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setDataLoading(true)
    setLoadError(null)
    fetchPickleballTournamentList()
      .then(list => { if (!cancelled) setTournaments(list) })
      .catch(err => { if (!cancelled) { console.error('[Krida/Pickleball] initial load:', err); setLoadError(err) } })
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Hydrate full detail when a tournament is activated ────────────────────
  useEffect(() => {
    if (!activeTournamentId) return
    const existing = tournamentsRef.current.find(t => t.id === activeTournamentId)
    if (existing?.entrants || existing?.matches) return // already hydrated

    let cancelled = false
    setDetailLoading(true)
    fetchPickleballTournament(activeTournamentId)
      .then(t => {
        if (cancelled || !t) return
        setTournaments(prev => prev.map(x => x.id === t.id ? t : x))
      })
      .catch(err => console.error('[Krida/Pickleball] fetchTournament:', err))
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [activeTournamentId])

  const reloadActiveTournament = useCallback(async () => {
    if (!activeTournamentId) return
    const t = await fetchPickleballTournament(activeTournamentId)
    if (t) setTournaments(prev => prev.map(x => x.id === activeTournamentId ? t : x))
  }, [activeTournamentId])

  // ── Realtime: tournament list (new tournaments appear, deleted ones vanish) ──
  useEffect(() => {
    const ch = supabase
      .channel('krida-pb-tournaments')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pickleball_tournaments' },
        payload => {
          fetchPickleballTournament(payload.new.id).then(t => {
            if (!t) return
            setTournaments(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev])
          })
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pickleball_tournaments' },
        payload => {
          setTournaments(prev => prev.filter(t => t.id !== payload.old.id))
          setActiveTournamentId(prev => (prev === payload.old.id ? null : prev))
        })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  // ── Realtime: active tournament detail ─────────────────────────────────────
  useEffect(() => {
    if (!activeTournamentId) return

    const reload = () => {
      fetchPickleballTournament(activeTournamentId).then(t => {
        if (!t) return
        setTournaments(prev => prev.map(x => x.id === activeTournamentId ? t : x))
      })
    }

    const ch = supabase
      .channel(`krida-pb-t-${activeTournamentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_matches',
          filter: `tournament_id=eq.${activeTournamentId}` }, reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_entrants',
          filter: `tournament_id=eq.${activeTournamentId}` }, reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_pools',
          filter: `tournament_id=eq.${activeTournamentId}` }, reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_courts',
          filter: `tournament_id=eq.${activeTournamentId}` }, reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_gallery_photos',
          filter: `tournament_id=eq.${activeTournamentId}` }, reload)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pickleball_tournaments',
          filter: `id=eq.${activeTournamentId}` }, reload)
      // pickleball_entrant_members has no tournament_id column (it's keyed by
      // entrant_id), so it can't be filtered the same way — subscribe
      // unfiltered and just reload; cheap enough at this scale, and the
      // alternative (missing partner-change updates entirely) is worse.
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickleball_entrant_members' }, reload)
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [activeTournamentId])

  // ── Tournament administration (Superadmin only, enforced by RLS) ──────────
  const createTournament = useCallback(async (data) => {
    const t = await createPickleballTournament(data)
    setTournaments(prev => [t, ...prev])
    return t.id
  }, [])

  const updateTournament = useCallback(async (id, data) => {
    const t = await updatePickleballTournament(id, data)
    setTournaments(prev => prev.map(x => x.id === id ? { ...x, ...t } : x))
    return t
  }, [])

  const deleteTournament = useCallback(async (id) => {
    await deletePickleballTournament(id)
    setTournaments(prev => prev.filter(t => t.id !== id))
    setActiveTournamentId(prev => (prev === id ? null : prev))
  }, [])

  // ── Entrant management (Superadmin only, enforced by RLS) ─────────────────
  const addEntrant = useCallback(async (params) => {
    const id = await createPickleballEntrant(params)
    await reloadActiveTournament()
    return id
  }, [reloadActiveTournament])

  const editEntrant = useCallback(async (id, data) => {
    await updatePickleballEntrant(id, data)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const withdrawEntrant = useCallback(async (id) => {
    await withdrawPickleballEntrant(id)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const reinstateEntrant = useCallback(async (id) => {
    await reinstatePickleballEntrant(id)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const removeEntrant = useCallback(async (id) => {
    await deletePickleballEntrant(id)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const setEntrantMembers = useCallback(async (entrantId, memberPlayerIds) => {
    await setPickleballEntrantMembers(entrantId, memberPlayerIds)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const activeTournament = tournaments.find(t => t.id === activeTournamentId) ?? null

  return (
    <PickleballCtx.Provider value={{
      tournaments, dataLoading, loadError, detailLoading,
      activeTournament, activeTournamentId, setActiveTournamentId,
      reloadActiveTournament,
      createTournament, updateTournament, deleteTournament,
      addEntrant, editEntrant, withdrawEntrant, reinstateEntrant, removeEntrant, setEntrantMembers,
    }}>
      {children}
    </PickleballCtx.Provider>
  )
}

export function usePickleball() {
  const ctx = useContext(PickleballCtx)
  if (!ctx) throw new Error('usePickleball must be used inside PickleballProvider')
  return ctx
}
