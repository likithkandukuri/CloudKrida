// Pure functions turning a (validated, possibly reviewer-corrected) import
// draft into the exact temp_id-keyed payload import_pickleball_tournament
// expects (migrations 017/019). No DB calls here — building the payload is
// fully deterministic and unit-testable on its own, separate from actually
// calling the RPC (see pickleballDb.js's importPickleballTournament).

import { zonedTimeToUtcIso } from '../pickleballTime.js'

function val(field) {
  return field && typeof field === 'object' && 'value' in field ? field.value : field
}

// One p_players entry per (team, seat) position — the RPC resolves matching
// real names into the same pickleball_players row itself (exact trimmed-name
// match, migration 017), so this doesn't need to de-duplicate names here.
function buildPlayers(groups) {
  const players = []
  for (const g of groups) {
    for (const team of g.teams) {
      (team.players ?? []).forEach((name, seat) => {
        players.push({ temp_id: `player:${team.code}:${seat}`, name })
      })
    }
  }
  return players
}

function buildEntrants(groups) {
  const entrants = []
  let seedOrder = 0
  for (const g of groups) {
    for (const team of g.teams) {
      seedOrder += 1
      entrants.push({
        temp_id: `entrant:${team.code}`,
        display_name: (team.players ?? []).join(' & ') || team.code,
        seed_order: seedOrder,
        member_temp_ids: (team.players ?? []).map((_, seat) => `player:${team.code}:${seat}`),
      })
    }
  }
  return entrants
}

function buildCourts(courts) {
  return (courts ?? []).map(c => ({ temp_id: `court:${c.label}`, label: c.label }))
}

function buildPools(groups) {
  return groups.map(g => ({
    temp_id: `pool:${g.label}`,
    label: `Pool ${g.label}`,
    entrant_temp_ids: g.teams.map(t => `entrant:${t.code}`),
  }))
}

// A relative time-of-day ("8:00 AM - 9:00 AM") only becomes an absolute
// timestamp if the tournament's date is actually known; otherwise
// scheduled_at is left null — the court + printed order are still preserved
// either way, just not as an absolute instant. When the document also
// states a time zone, that zone is used to construct the correct instant
// (zonedTimeToUtcIso); without one, this falls back to constructing the
// instant in whatever zone this code happens to run in — the same behavior
// this function always had, before time zones existed anywhere in the
// importer.
function resolveScheduledAt(dateValue, timeSlot, timeZone) {
  if (!dateValue || !timeSlot) return null
  const start = String(timeSlot).split('-')[0].trim() // "8:00 AM - 9:00 AM" -> "8:00 AM"
  return zonedTimeToUtcIso(dateValue, start, timeZone)
}

function buildLeagueMatches(draft) {
  const dateValue = val(draft.tournamentInfo?.date)
  const timeZone = val(draft.tournamentInfo?.timeZone)
  const codeToGroupLabel = new Map()
  for (const g of draft.groups ?? []) for (const t of g.teams ?? []) codeToGroupLabel.set(t.code, g.label)

  return (draft.schedule ?? [])
    .filter(row => val(row.stage) === 'league')
    .map(row => {
      const team1 = val(row.team1)
      const team2 = val(row.team2)
      return {
        pool_temp_id: `pool:${codeToGroupLabel.get(team1)}`,
        entrant1_temp_id: `entrant:${team1}`,
        entrant2_temp_id: `entrant:${team2}`,
        court_temp_id: `court:${val(row.court)}`,
        scheduled_at: resolveScheduledAt(dateValue, val(row.timeSlot), timeZone),
      }
    })
}

// Team size is read from the actual extracted rosters (how many names are
// listed per team), not a separately-stated "rule" field that may not have
// been extracted at all — the roster itself is the more reliable signal.
function inferEventType(groups) {
  const firstTeam = (groups ?? []).flatMap(g => g.teams ?? [])[0]
  const size = firstTeam?.players?.length ?? 2
  return size === 1 ? 'singles' : 'doubles'
}

// Fields that map to a real pickleball_tournaments column (and are therefore
// genuinely enforced by the existing scoring engine — see the Enforcement
// table in the implementation plan) are lifted onto the tournament payload
// directly. Everything else stays only in imported_rules, display-only.
function buildTournamentInfo(draft) {
  const structured = draft.rules?.structured ?? {}
  const groups = draft.groups ?? []
  const info = draft.tournamentInfo ?? {}
  const dateValue = val(info.date)
  const timeZone = val(info.timeZone)

  return {
    name: val(info.name) || 'Imported Tournament',
    event_type: inferEventType(groups),
    format: 'pool_to_single_elim',
    date: dateValue || null,
    location: val(info.location) || null,
    description: val(info.organizer) ? `Organized by ${val(info.organizer)}` : '',
    games_to: val(structured.winningPoints) ?? 11,
    win_by_2: val(structured.winBy2) ?? true,
    best_of: val(structured.bestOf) ?? 1,
    pool_size: null,
    court_count: (draft.courts ?? []).length || null,
    skill_division: null,
    age_band: null,
    advancement_mapping: draft.knockout ?? null,
    imported_rules: draft.rules ?? null,
    // Tournament timing (migration 019) — each is only non-null when the
    // document actually stated it (directly or via the disclosed
    // schedule-derived fallback for start/end); zonedTimeToUtcIso returns
    // null on any missing/unparseable input, so an absent field here just
    // stays null rather than ever guessing a time.
    start_at:                 zonedTimeToUtcIso(dateValue, val(info.startTime), timeZone),
    end_at:                   zonedTimeToUtcIso(dateValue, val(info.endTime), timeZone),
    check_in_at:              zonedTimeToUtcIso(dateValue, val(info.checkInTime), timeZone),
    registration_deadline_at: zonedTimeToUtcIso(dateValue, val(info.registrationDeadline), timeZone),
    time_zone: timeZone || null,
  }
}

// The one function the import wizard's final step calls to build the RPC
// payload — see pickleballDb.js's importPickleballTournament.
export function toImportPayload(draft) {
  const groups = draft?.groups ?? []
  return {
    p_tournament: buildTournamentInfo(draft ?? {}),
    p_players: buildPlayers(groups),
    p_entrants: buildEntrants(groups),
    p_courts: buildCourts(draft?.courts),
    p_pools: buildPools(groups),
    p_matches: buildLeagueMatches(draft ?? {}),
  }
}
