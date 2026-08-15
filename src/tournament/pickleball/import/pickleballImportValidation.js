// Deterministic validation for PDF-imported Pickleball tournament drafts.
//
// This is the layer that does NOT trust the parser's extraction (see
// pickleballPdfParser.js — a plain pattern/column-position parser, no AI or
// external service of any kind). Every check here only looks at internal
// consistency of the draft itself — declared totals vs. actual counts,
// schedule vs. group membership, one team/court double-booked, a knockout
// mapping referencing a group/rank that doesn't exist. Nothing here calls
// any external service or the database, so it's fully unit-testable and
// safe to re-run on every edit the reviewer makes.
//
// Draft field shape: every leaf value the parser extracted is
// { value, sourceText } rather than a bare value (see
// pickleballImportMapping.js / PickleballImportReview.jsx) so the review
// screen can show exactly what was found, and where, or that it wasn't found
// at all. `val()` below unwraps either shape so these functions also accept
// plain values in tests without needing to wrap everything.
//
// Each validator returns { level: 'error' | 'warning', code, message, path }
// — `path` addresses the exact record so the review UI can highlight it.

function val(field) {
  return field && typeof field === 'object' && 'value' in field ? field.value : field
}

function slotKey(row) {
  return `${val(row.timeSlot)}::${val(row.roundIndex) ?? 0}`
}

// The document states a total team count; the actual count is whatever the
// extracted groups add up to. A mismatch is an ERROR, not a warning — the
// spec is explicit that this class of issue must block creation until the
// administrator resolves it by editing either the team list or the declared
// total, never by the system silently removing/merging/renaming a team.
export function validateTeamCounts(draft) {
  const declared = val(draft?.declaredTotals?.totalTeams)
  const groups = draft?.groups ?? []
  const actual = groups.reduce((sum, g) => sum + (g.teams?.length ?? 0), 0)
  if (declared == null || declared === actual) return []
  return [{
    level: 'error',
    code: 'team_count_mismatch',
    message: `The tournament plan states ${declared} total teams, but ${actual} team entries were detected across Groups ${groups.map(g => g.label).join('-')}. Please review before creating the tournament.`,
    path: 'declaredTotals.totalTeams',
  }]
}

// "Each team plays N league matches" — verified against the actual extracted
// schedule. Covers the zero-matches case too (a team with no rows fails this
// check outright rather than needing a separate warning), so
// validateAllTeamsScheduled below only applies when this rule isn't stated.
export function validateLeagueMatchCounts(draft) {
  const expected = val(draft?.rules?.structured?.leagueMatchesPerTeam)
  if (expected == null) return []

  const counts = new Map()
  for (const row of draft?.schedule ?? []) {
    if (val(row.stage) !== 'league') continue
    for (const team of [val(row.team1), val(row.team2)]) {
      if (team) counts.set(team, (counts.get(team) ?? 0) + 1)
    }
  }

  const issues = []
  for (const g of draft?.groups ?? []) {
    for (const team of g.teams ?? []) {
      const count = counts.get(team.code) ?? 0
      if (count !== expected) {
        issues.push({
          level: 'error',
          code: 'league_match_count_mismatch',
          message: `Team ${team.code} is scheduled for ${count} league match${count === 1 ? '' : 'es'}, but the plan states each team plays ${expected}.`,
          path: `groups.${val(draft.groups.find(gr => gr === g)?.label) ?? g.label}.teams.${team.code}`,
        })
      }
    }
  }
  return issues
}

// Fallback for when the document never states a per-team match count (so
// validateLeagueMatchCounts has nothing to check against) — a team that
// never appears in the schedule at all is still worth flagging, just as a
// warning rather than an error since there's no stated expectation it's
// violating.
export function validateAllTeamsScheduled(draft) {
  if (val(draft?.rules?.structured?.leagueMatchesPerTeam) != null) return []

  const scheduled = new Set()
  for (const row of draft?.schedule ?? []) {
    for (const team of [val(row.team1), val(row.team2)]) {
      if (team) scheduled.add(team)
    }
  }

  const issues = []
  for (const g of draft?.groups ?? []) {
    for (const team of g.teams ?? []) {
      if (!scheduled.has(team.code)) {
        issues.push({
          level: 'warning',
          code: 'team_not_scheduled',
          message: `Team ${team.code} has no scheduled league matches.`,
          path: `groups.${g.label}.teams.${team.code}`,
        })
      }
    }
  }
  return issues
}

// A team can't play two matches at once. The document doesn't print an exact
// timestamp per match — only an hour-wide time bucket (e.g. "8am-9am") shared
// by 4 sequential rows per court — so this treats same-position rows across
// courts within the same bucket as concurrent (row 1 on every court happens
// first, row 2 second, etc.), the natural reading of a multi-court round
// schedule. That inferred-concurrency assumption is surfaced to the reviewer
// alongside the schedule, not silently baked in as a hidden fact.
export function validateNoSimultaneousMatches(draft) {
  const issues = []
  const seenPerSlot = new Map() // slotKey -> Map(team -> court)

  for (const row of draft?.schedule ?? []) {
    const key = slotKey(row)
    const court = val(row.court)
    if (!seenPerSlot.has(key)) seenPerSlot.set(key, new Map())
    const slotMap = seenPerSlot.get(key)

    for (const team of [val(row.team1), val(row.team2)]) {
      if (!team) continue
      const existingCourt = slotMap.get(team)
      if (existingCourt && existingCourt !== court) {
        issues.push({
          level: 'error',
          code: 'simultaneous_match',
          message: `Team ${team} is scheduled on ${existingCourt} and ${court} at ${val(row.timeSlot)}.`,
          path: 'schedule',
        })
      } else {
        slotMap.set(team, court)
      }
    }
  }
  return issues
}

// A court can't host two matches at the same concurrent slot — defends
// against a duplicated or malformed schedule row rather than something a
// well-formed extraction would normally produce (each court's own rows are
// naturally one-per-slot by construction).
export function validateNoCourtConflicts(draft) {
  const issues = []
  const seen = new Set()
  for (const row of draft?.schedule ?? []) {
    const key = `${val(row.court)}::${slotKey(row)}`
    if (seen.has(key)) {
      issues.push({
        level: 'error',
        code: 'court_conflict',
        message: `${val(row.court)} has two matches scheduled at ${val(row.timeSlot)}.`,
        path: 'schedule',
      })
    }
    seen.add(key)
  }
  return issues
}

// Every team code the LEAGUE schedule or knockout mapping references must
// actually exist among the extracted groups. QF/SF/Final rows intentionally
// use placeholder codes ("QFA1", "SF1", "F1" — "the winner of X") rather than
// real team codes, since those slots aren't known until earlier rounds
// finish; those get validated separately by validateAdvancementMapping.
export function validateTeamReferences(draft) {
  const issues = []
  const validCodes = new Set()
  for (const g of draft?.groups ?? []) for (const t of g.teams ?? []) validCodes.add(t.code)

  const groupLabels = new Set((draft?.groups ?? []).map(g => g.label))

  ;(draft?.schedule ?? []).forEach((row, i) => {
    if (val(row.stage) !== 'league') return
    for (const [key, code] of [['team1', val(row.team1)], ['team2', val(row.team2)]]) {
      if (code && !validCodes.has(code)) {
        issues.push({
          level: 'error',
          code: 'invalid_team_reference',
          message: `Invalid team reference: ${code} does not exist in any extracted group.`,
          path: `schedule[${i}].${key}`,
        })
      }
    }
  })

  ;(draft?.knockout?.quarterfinals ?? []).forEach((qf, i) => {
    for (const key of ['team1Ref', 'team2Ref']) {
      const group = val(qf[key]?.group)
      if (group && !groupLabels.has(group)) {
        issues.push({
          level: 'error',
          code: 'invalid_group_reference',
          message: `Quarterfinal mapping references Group ${group}, which does not exist.`,
          path: `knockout.quarterfinals[${i}].${key}`,
        })
      }
    }
  })
  return issues
}

// The quarterfinal mapping's rank references must be within range for the
// group they point at (e.g. "Group C rank 2" is invalid if Group C only has
// 5 teams and only the top 2 advance — that's fine; but "rank 7" never is).
export function validateAdvancementMapping(draft) {
  const issues = []
  const groupsByLabel = new Map((draft?.groups ?? []).map(g => [g.label, g]))

  ;(draft?.knockout?.quarterfinals ?? []).forEach((qf, i) => {
    for (const key of ['team1Ref', 'team2Ref']) {
      const ref = qf[key]
      if (!ref) continue
      const group = val(ref.group)
      const rank = val(ref.rank)
      const g = groupsByLabel.get(group)
      if (g && rank != null && (rank < 1 || rank > (g.teams?.length ?? 0))) {
        issues.push({
          level: 'error',
          code: 'invalid_advancement_rank',
          message: `Quarterfinal mapping references Group ${group} rank ${rank}, but Group ${group} only has ${g.teams?.length ?? 0} teams.`,
          path: `knockout.quarterfinals[${i}].${key}`,
        })
      }
    }
  })
  return issues
}

// Tournament-level timing sanity — advisory only (`warning`, never
// `error`): these are printed times a human stated, and the review screen
// lets the Superadmin fix any of them directly, so an inconsistency here
// shouldn't block creation the way a structural mismatch (team count,
// double-booked court) does. Only compares fields that are actually
// present — a field the document never stated is never treated as "0:00"
// or any other invented value.
export function validateTimingConsistency(draft) {
  const info = draft?.tournamentInfo ?? {}
  const startTime = val(info.startTime)
  const endTime = val(info.endTime)
  const checkInTime = val(info.checkInTime)
  const registrationDeadline = val(info.registrationDeadline)

  const toMinutes = (t) => {
    if (!t) return null
    const m = String(t).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
    if (!m) return null
    let hour = Number(m[1])
    const minute = Number(m[2] ?? 0)
    const ampm = m[3]?.toLowerCase()
    if (ampm) { hour = hour % 12; if (ampm === 'pm') hour += 12 }
    return hour * 60 + minute
  }

  const issues = []
  const startMins = toMinutes(startTime)
  const endMins = toMinutes(endTime)
  const checkInMins = toMinutes(checkInTime)
  const deadlineMins = toMinutes(registrationDeadline)

  if (startMins != null && endMins != null && endMins <= startMins) {
    issues.push({
      level: 'warning', code: 'end_before_start',
      message: `End time (${endTime}) is not after start time (${startTime}).`,
      path: 'tournamentInfo.endTime',
    })
  }
  if (checkInMins != null && startMins != null && checkInMins > startMins) {
    issues.push({
      level: 'warning', code: 'checkin_after_start',
      message: `Check-in time (${checkInTime}) is after the tournament start time (${startTime}).`,
      path: 'tournamentInfo.checkInTime',
    })
  }
  if (deadlineMins != null && startMins != null && deadlineMins > startMins) {
    issues.push({
      level: 'warning', code: 'deadline_after_start',
      message: `Registration deadline (${registrationDeadline}) is after the tournament start time (${startTime}).`,
      path: 'tournamentInfo.registrationDeadline',
    })
  }
  return issues
}

// Full sweep — re-run on every edit in the review screen, no re-upload
// needed. The league-match-count and schedule-conflict checks here are also
// reused (imported, not copy-pasted) from the post-creation editing flows
// (PickleballScheduleTab.jsx / PickleballEntrantForm.jsx) so there is one
// definition of these rules, not two.
export function runAllValidations(draft) {
  return [
    ...validateTeamCounts(draft),
    ...validateLeagueMatchCounts(draft),
    ...validateAllTeamsScheduled(draft),
    ...validateNoSimultaneousMatches(draft),
    ...validateNoCourtConflicts(draft),
    ...validateTeamReferences(draft),
    ...validateAdvancementMapping(draft),
    ...validateTimingConsistency(draft),
  ]
}
