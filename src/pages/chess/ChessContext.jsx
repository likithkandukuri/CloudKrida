import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import {
  fetchTournamentList, fetchTournament,
  createTournamentInDB, deleteTournamentFromDB,
  persistTournamentUpdate, persistNewRound,
  fetchQuickMatches, saveQuickMatch,
  fetchEventList, fetchEvent,
  createEventInDB, updateEventInDB, deleteEventInDB,
} from '../../lib/db.js'

const ChessCtx = createContext(null)

export function ChessProvider({ children }) {
  const [tournaments,        setTournaments]        = useState([])
  const [quickMatches,       setQuickMatches]       = useState([])
  const [events,             setEvents]             = useState([])
  const [activeTournamentId, setActiveTournamentId] = useState(null)
  const [activeEventId,      setActiveEventId]      = useState(null)
  const [dataLoading,        setDataLoading]        = useState(true)

  const tournamentsRef = useRef(tournaments)
  useEffect(() => { tournamentsRef.current = tournaments }, [tournaments])

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchTournamentList(), fetchQuickMatches(), fetchEventList()])
      .then(([tList, qms, evList]) => {
        setTournaments(tList)
        setQuickMatches(qms)
        setEvents(evList)
        // Write a flag so the GlobalNav gallery link knows data exists
        if (tList.length > 0 || evList.length > 0) {
          localStorage.setItem('krida-has-data', '1')
        } else {
          localStorage.removeItem('krida-has-data')
        }
      })
      .catch(err => console.error('[Krida] initial load:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // ── Load full tournament when one is activated ────────────────────────────
  useEffect(() => {
    if (!activeTournamentId) return
    const existing = tournamentsRef.current.find(t => t.id === activeTournamentId)
    if (existing?.matches?.length > 0 || existing?.players?.length > 0) return

    fetchTournament(activeTournamentId).then(t => {
      if (!t) return
      setTournaments(prev => prev.map(x => x.id === t.id ? t : x))
    })
  }, [activeTournamentId])

  // ── Realtime: tournament list ─────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('krida-tournaments')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tournaments' },
        payload => {
          fetchTournament(payload.new.id).then(t => {
            if (!t) return
            setTournaments(prev =>
              prev.some(x => x.id === t.id) ? prev : [t, ...prev]
            )
            // Update parent event's section list if applicable
            if (t.eventId) {
              setEvents(prev => prev.map(ev => {
                if (ev.id !== t.eventId) return ev
                const already = ev.sections.some(s => s.id === t.id)
                if (already) return ev
                return { ...ev, sections: [...ev.sections, t].sort((a, b) => a.eventOrder - b.eventOrder) }
              }))
            }
          })
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tournaments' },
        payload => {
          setTournaments(prev => prev.filter(t => t.id !== payload.old.id))
          setActiveTournamentId(prev => (prev === payload.old.id ? null : prev))
          setEvents(prev => prev.map(ev => ({
            ...ev,
            sections: ev.sections.filter(s => s.id !== payload.old.id),
          })))
        })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  // ── Realtime: events table ────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('krida-events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        payload => {
          fetchEvent(payload.new.id).then(ev => {
            if (!ev) return
            setEvents(prev => prev.some(e => e.id === ev.id) ? prev : [ev, ...prev])
          })
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        payload => {
          fetchEvent(payload.new.id).then(ev => {
            if (!ev) return
            setEvents(prev => prev.map(e => e.id === ev.id ? ev : e))
          })
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        payload => {
          setEvents(prev => prev.filter(e => e.id !== payload.old.id))
          setActiveEventId(prev => prev === payload.old.id ? null : prev)
        })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  // ── Realtime: active tournament detail ────────────────────────────────────
  useEffect(() => {
    if (!activeTournamentId) return

    const reload = () => {
      fetchTournament(activeTournamentId).then(t => {
        if (!t) return
        setTournaments(prev => prev.map(x => x.id === activeTournamentId ? t : x))
      })
    }

    const ch = supabase
      .channel(`krida-t-${activeTournamentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'matches',
          filter: `tournament_id=eq.${activeTournamentId}` },
        reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players',
          filter: `tournament_id=eq.${activeTournamentId}` },
        reload)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gallery_photos',
          filter: `tournament_id=eq.${activeTournamentId}` },
        reload)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments',
          filter: `id=eq.${activeTournamentId}` },
        reload)
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [activeTournamentId])

  // ── Tournament CRUD ───────────────────────────────────────────────────────
  const createTournament = useCallback(async (data, { setActive = true } = {}) => {
    const tournament = await createTournamentInDB(data)
    setTournaments(prev => [tournament, ...prev])
    if (setActive) setActiveTournamentId(tournament.id)
    return tournament.id
  }, [])

  const updateTournament = useCallback(async (id, updates) => {
    const current = tournamentsRef.current.find(t => t.id === id)

    setTournaments(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

    const isNewRound =
      updates.currentRound !== undefined &&
      updates.matches      !== undefined &&
      current              !== undefined &&
      updates.currentRound > (current.currentRound ?? 0)

    if (isNewRound) {
      const existingIds   = new Set((current.matches ?? []).map(m => m.id))
      const newLocalMs    = updates.matches.filter(m => !existingIds.has(m.id))
      await persistNewRound(id, newLocalMs, updates.currentRound, updates.totalRounds)
      const reloaded = await fetchTournament(id)
      if (reloaded) setTournaments(prev => prev.map(t => t.id === id ? reloaded : t))
    } else {
      await persistTournamentUpdate(id, updates, current)
    }
  }, [])

  const deleteTournament = useCallback(async (id) => {
    setTournaments(prev => prev.filter(t => t.id !== id))
    setActiveTournamentId(prev => (prev === id ? null : prev))
    await deleteTournamentFromDB(id)
  }, [])

  // ── Event CRUD ────────────────────────────────────────────────────────────
  const createEvent = useCallback(async (data) => {
    const ev = await createEventInDB(data)
    setEvents(prev => [ev, ...prev])
    setActiveEventId(ev.id)
    return ev.id
  }, [])

  const updateEvent = useCallback(async (id, partial) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...partial } : e))
    await updateEventInDB(id, partial)
  }, [])

  const deleteEvent = useCallback(async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    setActiveEventId(prev => (prev === id ? null : prev))
    setTournaments(prev => prev.filter(t => t.eventId !== id))
    await deleteEventInDB(id)
  }, [])

  // ── Quick matches ─────────────────────────────────────────────────────────
  const addQuickMatch = useCallback(async (match) => {
    setQuickMatches(prev => [match, ...prev])
    await saveQuickMatch(match)
  }, [])

  const reloadActiveTournament = useCallback(async () => {
    if (!activeTournamentId) return
    const t = await fetchTournament(activeTournamentId)
    if (t) setTournaments(prev => prev.map(x => x.id === activeTournamentId ? t : x))
  }, [activeTournamentId])

  const activeTournament = tournaments.find(t => t.id === activeTournamentId) ?? null
  const activeEvent      = events.find(e => e.id === activeEventId) ?? null

  return (
    <ChessCtx.Provider value={{
      tournaments, quickMatches, events,
      activeTournament, activeTournamentId, setActiveTournamentId,
      activeEvent, activeEventId, setActiveEventId,
      createTournament, updateTournament, deleteTournament,
      createEvent, updateEvent, deleteEvent,
      addQuickMatch, reloadActiveTournament,
      dataLoading,
    }}>
      {children}
    </ChessCtx.Provider>
  )
}

export function useChess() {
  const ctx = useContext(ChessCtx)
  if (!ctx) throw new Error('useChess must be used inside ChessProvider')
  return ctx
}
