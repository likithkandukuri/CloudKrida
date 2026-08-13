// Small, pure display helpers shared across the Pickleball views — kept
// separate from pickleballStandings.js since this is presentation text, not
// tournament math.

export const STATUS_LABELS = {
  registration_open:   'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress:         'In Progress',
  complete:            'Complete',
}

export const EVENT_TYPE_LABELS = {
  singles:       'Singles',
  doubles:       'Doubles',
  mixed_doubles: 'Mixed Doubles',
}

export const FORMAT_LABELS = {
  pool_to_single_elim: 'Pools → Single Elimination',
  single_elimination:  'Single Elimination',
  double_elimination:  'Double Elimination',
  round_robin_only:    'Round Robin',
}

export function formatGames(games) {
  if (!games?.length) return '—'
  return games.map(g => `${g.score_a}-${g.score_b}`).join(', ')
}

export function entrantLabel(entrant) {
  if (!entrant) return 'TBD'
  return entrant.displayName ?? entrant.display_name ?? 'TBD'
}

export function formatDate(ms) {
  if (!ms) return null
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(ms) {
  if (!ms) return null
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
