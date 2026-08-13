// New work (post-Track-B) — granular bracket-editing capabilities matching
// the *level* of control Chess's PairingsView offers (swap, lock, bye
// assign/remove, validate warnings), written fresh for Pickleball's own
// entrant/match shape rather than reusing any Chess code. Pure
// validation/logic only; the atomic writes live in migration 014's RPCs.

// Both matches must be pending (unscored, not a bye) elimination matches,
// unlocked, and actually different matches — mirrors Chess's swapPlayers
// guard (utils.js) of "two pending, unlocked matches".
export function validateBracketSwap(matchA, matchB) {
  const errors = []
  if (!matchA || !matchB) { errors.push('Select two matches to swap.'); return errors }
  if (matchA.id === matchB.id) { errors.push('Cannot swap a match with itself.'); return errors }
  for (const [label, m] of [['First', matchA], ['Second', matchB]]) {
    if (m.phase !== 'elimination') errors.push(`${label} match is not part of the bracket.`)
    if (m.status !== 'pending') errors.push(`${label} match already has a result and cannot be swapped.`)
    if (m.locked) errors.push(`${label} match is locked.`)
  }
  return errors
}

// A bye can only be assigned to a pending, unlocked elimination match, and
// the chosen winner must actually be seated in that match.
export function validateBracketByeAssign(match, winnerEntrantId) {
  const errors = []
  if (!match) { errors.push('Match not found.'); return errors }
  if (match.phase !== 'elimination') errors.push('Byes can only be assigned on bracket matches.')
  if (match.status !== 'pending') errors.push('This match already has a result.')
  if (match.locked) errors.push('This match is locked.')
  if (winnerEntrantId !== match.entrant1?.id && winnerEntrantId !== match.entrant2?.id) {
    errors.push('The chosen winner is not seated in this match.')
  }
  return errors
}

export function validateBracketByeRemove(match) {
  const errors = []
  if (!match) { errors.push('Match not found.'); return errors }
  if (match.status !== 'bye') errors.push('This match is not currently a bye.')
  return errors
}

// Read-only integrity warnings, mirroring the spirit of Chess's
// validatePairings (duplicate boards / repeat opponents / multiple byes)
// adapted to a single-elimination bracket's structure.
export function validateBracketIntegrity(elimMatches) {
  const warnings = []
  for (const m of elimMatches ?? []) {
    if (m.status === 'bye' && !m.winnerEntrantId) {
      warnings.push(`Round ${m.round + 1}, slot ${m.slot + 1}: a bye with no recorded winner.`)
    }
    if (m.entrant1?.id && m.entrant1.id === m.entrant2?.id) {
      warnings.push(`Round ${m.round + 1}, slot ${m.slot + 1}: the same entrant is seated on both sides.`)
    }
    if (m.locked) {
      warnings.push(`Round ${m.round + 1}, slot ${m.slot + 1}: locked.`)
    }
  }
  return warnings
}
