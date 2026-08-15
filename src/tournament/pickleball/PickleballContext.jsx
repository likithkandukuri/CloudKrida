import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../shared/utilities/supabase.js'
import {
  fetchPickleballTournamentList, fetchPickleballTournament,
  createPickleballTournament, updatePickleballTournament, deletePickleballTournament,
  createPickleballEntrant, updatePickleballEntrant, deletePickleballEntrant,
  withdrawPickleballEntrant, reinstatePickleballEntrant, setPickleballEntrantMembers,
  generatePickleballPools, resetPickleballPools,
  createPickleballCourt, deletePickleballCourt, assignPickleballMatchCourt,
  recordPickleballMatchScore, generatePickleballBracket,
  uploadPickleballGalleryFile, deletePickleballGalleryItem,
  movePickleballEntrantToPool,
  togglePickleballMatchLock, swapPickleballBracketEntrants,
  assignPickleballMatchBye, removePickleballMatchBye,
  importPickleballTournament,
} from '../services/pickleballDb.js'
import { generatePoolAssignments, generatePoolMatches } from './pickleballPools.js'
import { computeMatchOutcome } from './pickleballScoring.js'
import { computeBracketSeeds, generateBracketRows, generateBracketRowsFromMapping } from './pickleballBracket.js'
import { computePickleballStandings } from './pickleballStandings.js'

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

  // ── Pools (Superadmin only, enforced by RLS + the RPC's own re-validation) ─
  // Seeding/pairing (which entrant goes in which pool, which pairs get
  // generated) is computed here in JS via pickleballPools.js — pure,
  // Vitest-testable. generatePickleballPools/resetPickleballPools then apply
  // that plan through a single atomic Postgres RPC call; there is no
  // client-side rollback here because the database function guarantees it.
  const generatePools = useCallback(async (tournamentId, activeEntrants, poolSize, forceRegenerate = false) => {
    const assignments = generatePoolAssignments(activeEntrants, poolSize)
    const matches = generatePoolMatches(assignments.pools)
    await generatePickleballPools(tournamentId, poolSize, assignments, matches, forceRegenerate)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const resetPools = useCallback(async (tournamentId) => {
    await resetPickleballPools(tournamentId)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const moveEntrantToPool = useCallback(async (entrantId, targetPoolId) => {
    await movePickleballEntrantToPool(entrantId, targetPoolId)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  // ── Courts (Superadmin only, enforced by RLS) ──────────────────────────────
  const addCourt = useCallback(async (tournamentId, label) => {
    await createPickleballCourt(tournamentId, label)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const removeCourt = useCallback(async (id) => {
    await deletePickleballCourt(id)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const assignMatchCourt = useCallback(async (matchId, courtId) => {
    await assignPickleballMatchCourt(matchId, courtId)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const activeTournament = tournaments.find(t => t.id === activeTournamentId) ?? null

  // ── Scoring (Superadmin only, enforced by RLS + the RPC's own re-check) ───
  // games is the raw per-game score array the UI collected; outcome (which
  // side won the match, and whether it's now complete) is computed here via
  // pickleballScoring.js against the tournament's own gamesTo/winBy2/bestOf,
  // then handed to the atomic RPC (which also performs elimination
  // advancement in the same transaction, for phase='elimination' matches).
  const scoreMatch = useCallback(async (matchId, games) => {
    const match = activeTournament?.matches?.find(m => m.id === matchId)
    if (!match) throw new Error('Match not found')
    const { status, winnerSeat } = computeMatchOutcome(games, activeTournament.bestOf, activeTournament.gamesTo, activeTournament.winBy2)
    const winnerEntrantId = winnerSeat === 1 ? match.entrant1?.id ?? null : winnerSeat === 2 ? match.entrant2?.id ?? null : null
    await recordPickleballMatchScore(matchId, games, status, winnerEntrantId)
    await reloadActiveTournament()
  }, [activeTournament, reloadActiveTournament])

  // ── Bracket generation (Superadmin only, enforced by RLS + the RPC's own
  // re-validation of "pool play complete" and the scored/unscored guards) ───
  const generateBracket = useCallback(async (tournamentId, activeEntrants, poolMatches, forceRegenerate = false) => {
    const seeds = computeBracketSeeds(activeEntrants, poolMatches)
    const rows = generateBracketRows(seeds)
    await generatePickleballBracket(tournamentId, rows, forceRegenerate)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  // ── Gallery (Phase B — media; upload gated by isSuperAdmin||isAdmin at the
  // call site, delete the same, matching Chess's exact AuthContext rule) ────
  const uploadGalleryFile = useCallback(async (tournamentId, file, userId, userRole) => {
    await uploadPickleballGalleryFile(tournamentId, file, userId, userRole)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const deleteGalleryItem = useCallback(async (item) => {
    await deletePickleballGalleryItem(item)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  // ── Bracket granular editing (new work; Superadmin only, RLS + RPC
  // re-validation enforced server-side, not just in the UI) ─────────────────
  const toggleMatchLock = useCallback(async (matchId, locked) => {
    await togglePickleballMatchLock(matchId, locked)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const swapBracketEntrants = useCallback(async (match1Id, seat1, match2Id, seat2) => {
    await swapPickleballBracketEntrants(match1Id, seat1, match2Id, seat2)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const assignMatchBye = useCallback(async (matchId, winnerEntrantId) => {
    await assignPickleballMatchBye(matchId, winnerEntrantId)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  const removeMatchBye = useCallback(async (matchId) => {
    await removePickleballMatchBye(matchId)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  // ── PDF Tournament Importer (Superadmin only, enforced by RLS + the RPC's
  // own explicit is_superadmin() check) ──────────────────────────────────────
  // The one write the import wizard's final step performs — see
  // pickleballImportMapping.js for how a reviewed draft becomes `payload`,
  // and migration 017 for why this is one atomic RPC call rather than a
  // sequence of the create/addEntrant/generatePools calls above (a failure
  // partway through those would leave a half-created tournament; this can't).
  const importTournament = useCallback(async (payload) => {
    const id = await importPickleballTournament(payload)
    const list = await fetchPickleballTournamentList()
    setTournaments(list)
    return id
  }, [])

  // Consumes an imported tournament's stored advancement_mapping once league
  // play has actually finished — resolves each quarterfinal slot from the
  // document's own pool-cross mapping (not a generic seeded bracket) via
  // generateBracketRowsFromMapping, computing each pool's own standings
  // in-place with the existing, unmodified computePickleballStandings, then
  // persists through the same generatePickleballBracket RPC the manual
  // seeded-bracket flow already uses.
  const importBracketFromMapping = useCallback(async (tournamentId, mapping, pools, entrants, poolMatches) => {
    const standingsByLabel = {}
    for (const pool of pools ?? []) {
      const poolEntrants = (entrants ?? []).filter(e => e.poolId === pool.id)
      const matchesInPool = (poolMatches ?? []).filter(m => m.poolId === pool.id)
      const label = pool.label.replace(/^Pool\s+/i, '') // "Pool A" -> "A", matching the mapping's group codes
      standingsByLabel[label] = computePickleballStandings(poolEntrants, matchesInPool)
    }
    const rows = generateBracketRowsFromMapping(mapping, standingsByLabel)
    await generatePickleballBracket(tournamentId, rows, false)
    await reloadActiveTournament()
  }, [reloadActiveTournament])

  return (
    <PickleballCtx.Provider value={{
      tournaments, dataLoading, loadError, detailLoading,
      activeTournament, activeTournamentId, setActiveTournamentId,
      reloadActiveTournament,
      createTournament, updateTournament, deleteTournament,
      addEntrant, editEntrant, withdrawEntrant, reinstateEntrant, removeEntrant, setEntrantMembers,
      generatePools, resetPools, moveEntrantToPool,
      addCourt, removeCourt, assignMatchCourt,
      scoreMatch, generateBracket,
      uploadGalleryFile, deleteGalleryItem,
      toggleMatchLock, swapBracketEntrants, assignMatchBye, removeMatchBye,
      importTournament, importBracketFromMapping,
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
