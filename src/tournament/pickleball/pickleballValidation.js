// Pure validation functions for tournament administration + entrant management.
// Called from the UI before any write, AND the UI never trusts itself alone —
// every write still goes through RLS server-side (is_superadmin()) regardless
// of what these functions say. This is defense in depth, not the only guard.

export const EVENT_TYPES = ['singles', 'doubles', 'mixed_doubles']
export const FORMATS     = ['pool_to_single_elim', 'single_elimination', 'double_elimination', 'round_robin_only']
export const STATUSES    = ['registration_open', 'registration_closed', 'in_progress', 'complete']
export const GAMES_TO_OPTIONS = [11, 15, 21]
export const BEST_OF_OPTIONS  = [1, 3, 5]

const REQUIRED_MEMBERS = { singles: 1, doubles: 2, mixed_doubles: 2 }

// ── Tournament configuration ───────────────────────────────────────────────

export function validateTournamentConfig(data) {
  const errors = []

  if (!data?.name?.trim()) errors.push('Tournament name is required.')

  if (!EVENT_TYPES.includes(data?.eventType)) {
    errors.push(`Event type must be one of: ${EVENT_TYPES.join(', ')}.`)
  }
  if (!FORMATS.includes(data?.format)) {
    errors.push(`Format must be one of: ${FORMATS.join(', ')}.`)
  }
  if (data?.status !== undefined && !STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${STATUSES.join(', ')}.`)
  }
  if (!GAMES_TO_OPTIONS.includes(data?.gamesTo)) {
    errors.push(`Games-to must be one of: ${GAMES_TO_OPTIONS.join(', ')}.`)
  }
  if (!BEST_OF_OPTIONS.includes(data?.bestOf)) {
    errors.push(`Best-of must be one of: ${BEST_OF_OPTIONS.join(', ')}.`)
  }
  if (typeof data?.winBy2 !== 'boolean') {
    errors.push('Win-by-two must be true or false.')
  }
  if (data?.poolSize != null && (!Number.isInteger(data.poolSize) || data.poolSize < 2)) {
    errors.push('Pool size must be a whole number of at least 2, or left blank.')
  }
  if (data?.courtCount != null && (!Number.isInteger(data.courtCount) || data.courtCount < 1)) {
    errors.push('Court count must be a whole number of at least 1, or left blank.')
  }

  return errors
}

// ── Entrant membership ─────────────────────────────────────────────────────

// memberPlayerIds: array of player ids being assigned to ONE entrant (1 for
// singles, 2 for doubles/mixed doubles — mixed doubles requires no specific
// composition beyond the same 2-member count, by explicit decision).
export function validateEntrantMembership(eventType, memberPlayerIds) {
  const errors = []
  const ids = (memberPlayerIds ?? []).filter(Boolean)
  const required = REQUIRED_MEMBERS[eventType]

  if (!required) {
    errors.push(`Unknown event type "${eventType}".`)
    return errors
  }

  if (ids.length !== required) {
    errors.push(
      eventType === 'singles'
        ? 'Singles requires exactly 1 player.'
        : `${eventType === 'doubles' ? 'Doubles' : 'Mixed Doubles'} requires exactly 2 players.`
    )
  }

  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    errors.push('A player cannot be paired with themselves.')
  }

  return errors
}

// ── Pool generation (Track B Phase 2) ──────────────────────────────────────

// tournament.poolSize is the single source of truth for pool size — this
// function never accepts an independently-chosen size, only validates the
// tournament's own configured value against the active roster.
export function validatePoolGeneration(tournament, activeEntrants) {
  const errors = []
  const poolSize = tournament?.poolSize
  const count = (activeEntrants ?? []).length

  if (poolSize == null || !Number.isInteger(poolSize) || poolSize < 2) {
    errors.push('Set a pool size (at least 2) in the tournament configuration before generating pools.')
    return errors // no meaningful further checks without a valid pool size
  }
  if (count < 2) {
    errors.push('At least 2 active entrants are required to generate pools.')
  }
  if (poolSize > count) {
    errors.push(`Pool size (${poolSize}) cannot exceed the number of active entrants (${count}).`)
  }

  return errors
}

// Three-way regeneration state, matching the Phase 2 plan's safeguard table:
//   'empty'    — no pools exist yet -> Generate Pools proceeds directly
//   'unscored' — pools exist, nothing scored -> Regenerate allowed, but the UI
//                must collect an explicit confirmation before calling
//                generatePools(..., forceRegenerate: true)
//   'scored'   — at least one pool match has results -> generation/regeneration
//                is blocked entirely; Reset Pools is the only path forward
export function getPoolGenerationState(pools, poolMatches) {
  if (!pools?.length) return 'empty'
  const hasScored = (poolMatches ?? []).some(
    m => m.status === 'complete' || (m.games?.length ?? 0) > 0
  )
  return hasScored ? 'scored' : 'unscored'
}

// ── Bracket generation (Track B Phase 5) ───────────────────────────────────

// pools/poolMatches come from the active tournament; bracket generation is
// only offered once pool play (if any pools were generated) is fully
// complete/bye — scoped to the pool_to_single_elim workflow this phase
// actually implements.
export function validateBracketGeneration(pools, poolMatches, activeEntrants) {
  const errors = []
  if (!pools?.length) {
    errors.push('Generate pools and complete pool play before generating the elimination bracket.')
    return errors
  }
  const incomplete = (poolMatches ?? []).filter(m => m.status !== 'complete' && m.status !== 'bye')
  if (incomplete.length > 0) {
    errors.push(`${incomplete.length} pool match(es) still need a result before the bracket can be generated.`)
  }
  if ((activeEntrants ?? []).length < 2) {
    errors.push('At least 2 active entrants are required to generate a bracket.')
  }
  return errors
}

// Same three-way shape as getPoolGenerationState — 'bye' matches don't count
// as "scored" (they're an automatic bracket-structure outcome, not a played
// game), matching the pools convention exactly.
export function getBracketGenerationState(elimMatches) {
  if (!elimMatches?.length) return 'empty'
  const hasScored = elimMatches.some(m => m.status === 'complete' || (m.games?.length ?? 0) > 0)
  return hasScored ? 'scored' : 'unscored'
}

// ── Pool placement (new work — move an entrant between already-generated
// pools without a full regenerate) ─────────────────────────────────────────

// entrant: {id, poolId, status}. poolMatches: full tournament pool-phase
// matches. Blocks the move if the entrant has a scored match in their
// current pool, or the target pool has ANY scored match — moving into/out
// of a pool with live results would corrupt standings history, same
// "never silently overwrite scored data" principle as pool regeneration.
export function validatePoolMove(entrant, targetPoolId, poolMatches) {
  const errors = []
  if (!entrant?.poolId) {
    errors.push('This entrant is not currently assigned to a pool.')
    return errors
  }
  if (entrant.poolId === targetPoolId) {
    errors.push('Entrant is already in that pool.')
    return errors
  }

  const isScored = m => m.status === 'complete' || (m.games?.length ?? 0) > 0

  const scoredInCurrentPool = (poolMatches ?? []).some(m =>
    m.poolId === entrant.poolId && isScored(m) &&
    (m.entrant1?.id === entrant.id || m.entrant2?.id === entrant.id)
  )
  if (scoredInCurrentPool) errors.push('Cannot move — this entrant already has a scored match in their current pool.')

  const scoredInTargetPool = (poolMatches ?? []).some(m => m.poolId === targetPoolId && isScored(m))
  if (scoredInTargetPool) errors.push('Cannot move — the target pool already has scored matches.')

  return errors
}

// ── Score entry (Track B Phase 4) ──────────────────────────────────────────

// Basic input sanity only — whether a game/match is actually "complete" is
// computed by pickleballScoring.js, not here. A tied score is not rejected
// by this function (a game can legitimately be mid-play at, say, 10-10);
// "no draws" is enforced by computeGameOutcome() never marking a tied score
// as complete, not by disallowing the input.
export function validateGameScore(scoreA, scoreB) {
  const errors = []
  if (!Number.isInteger(scoreA) || scoreA < 0) errors.push('Score must be a non-negative whole number.')
  if (!Number.isInteger(scoreB) || scoreB < 0) errors.push('Score must be a non-negative whole number.')
  return errors
}

// ── Duplicate participation within one tournament ──────────────────────────

// existingEntrants: [{ id, members: [{ playerId }] }] for the tournament.
// excludeEntrantId: when editing an existing entrant, exclude its own current
// members from the "already participating" check.
export function findDuplicateParticipants(existingEntrants, newMemberPlayerIds, excludeEntrantId = null) {
  const alreadyIn = new Set()
  for (const e of existingEntrants ?? []) {
    if (e.id === excludeEntrantId) continue
    if (e.status === 'withdrawn') continue // a withdrawn entrant frees its players up
    for (const m of e.members ?? []) {
      if (m.playerId) alreadyIn.add(m.playerId)
    }
  }
  return (newMemberPlayerIds ?? []).filter(id => alreadyIn.has(id))
}
