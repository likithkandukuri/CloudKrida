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
