import { describe, it, expect } from 'vitest'
import { parseTournamentPlan } from '../pickleballPdfParser.js'
import { runAllValidations } from '../pickleballImportValidation.js'
import { ataDraft } from '../__fixtures__/ataDraft.js'

// ── Synthetic token-positioned "PDF pages" built FROM the already-verified
// ataDraft fixture ────────────────────────────────────────────────────────
// There is no real PDF binary available in this environment to run through
// pdfjs-dist, so this reconstructs plausible extracted lines/tokens (the
// exact shape pdfText.js produces) directly from the hand-reconciled ATA
// data, then feeds them through the real parser and checks the output
// matches. This proves the parser's column-reconstruction logic — nearest-
// anchor bucketing, blank-cell handling, the tricky "skips Court 3, lands on
// Court 4" mid-row gap — against the document's actual real structure, not
// a simplified stand-in for it.

const COURT_X = { 'Court 1': 100, 'Court 2': 220, 'Court 3': 340, 'Court 4': 460, 'Court 5': 580 }
const GROUP_X = { A: 120, B: 280, C: 440, D: 600 }

function line(text, tokens) { return { text, tokens } }
function tok(x, text) { return { x, text } }

function buildPage1() {
  const lines = []
  lines.push(line('ATA PICKLEBALL TOURNAMENT PLAN', [tok(50, 'ATA PICKLEBALL TOURNAMENT PLAN')]))
  lines.push(line('TOTAL TEAMS 23 COURTS Needed', [tok(50, 'TOTAL TEAMS 23'), tok(400, 'COURTS Needed')]))
  lines.push(line('Total Matches 53', [tok(50, 'Total Matches 53')]))
  lines.push(line('League Matches 46 8am-10am 5 courts League', [tok(50, 'League Matches 46 8am-10am 5 courts League')]))
  // Summary court header (should be SKIPPED -- no "vs" rows follow it)
  lines.push(line('Court 1 Court 2 Court 3 Court 4 Court 5', Object.entries(COURT_X).map(([label, x]) => tok(x, label))))
  lines.push(line('League 8am-9am 4 4 4 4 4', [tok(50, 'League 8am-9am'), ...Object.values(COURT_X).map(x => tok(x, '4'))]))

  lines.push(line('PICKLEBALL TOURNAMENT SCHEDULE', [tok(50, 'PICKLEBALL TOURNAMENT SCHEDULE')]))
  // Real schedule header (followed by "vs" rows) -- this is the one the parser must find.
  lines.push(line('Court 1 Court 2 Court 3 Court 4 Court 5', Object.entries(COURT_X).map(([label, x]) => tok(x, label))))

  // Group the real ataDraft.schedule rows by stage+timeSlot+roundIndex so
  // rows at the same round render on the same synthetic line (mirroring how
  // a multi-court table row actually looks), in printed court order.
  const byRound = new Map()
  for (const row of ataDraft.schedule) {
    const key = `${row.stage}::${row.timeSlot}::${row.roundIndex}`
    if (!byRound.has(key)) byRound.set(key, { stage: row.stage, timeSlot: row.timeSlot, cells: [] })
    byRound.get(key).cells.push(row)
  }

  let lastStage = null
  let lastTimeSlot = null
  for (const { stage, timeSlot, cells } of byRound.values()) {
    const stageLabel = { league: 'League', qf: 'QF', sf: 'SF', final: 'Final' }[stage]
    const needsLabel = stage !== lastStage || timeSlot !== lastTimeSlot
    const prefixText = needsLabel ? `${stageLabel} ${timeSlot}` : ''
    const tokens = []
    if (needsLabel) tokens.push(tok(10, prefixText))
    for (const cell of cells) {
      tokens.push(tok(COURT_X[cell.court], `${cell.team1} vs ${cell.team2}`))
    }
    lines.push(line([prefixText, ...cells.map(c => `${c.team1} vs ${c.team2}`)].filter(Boolean).join(' '), tokens))
    lastStage = stage
    lastTimeSlot = timeSlot
  }

  lines.push(line('NOTE :', [tok(10, 'NOTE :')]))
  lines.push(line('1) Each team plays 4 league matches. Each match has a 15 mins max time limit.',
    [tok(10, '1) Each team plays 4 league matches. Each match has a 15 mins max time limit.')]))
  lines.push(line('2) Two teams with most wins from each group advance to quarter finals.',
    [tok(10, '2) Two teams with most wins from each group advance to quarter finals.')]))
  lines.push(line("3) If there is a tie, the winner of the league match between those 2 teams will move to next level.",
    [tok(10, "3) If there is a tie, the winner of the league match between those 2 teams will move to next level.")]))
  lines.push(line("If those two teams didn't play in the league matches, then the points of all the matches will be taken into consideration.",
    [tok(10, "If those two teams didn't play in the league matches, then the points of all the matches will be taken into consideration.")]))

  return lines
}

function buildPage2() {
  const lines = []
  lines.push(line('ATA PICKLEBALL TOURNAMENT TEAMS & MATCHES', [tok(50, 'ATA PICKLEBALL TOURNAMENT TEAMS & MATCHES')]))
  lines.push(line('Group A Group B Group C Group D', Object.entries(GROUP_X).map(([label, x]) => tok(x, `Group ${label}`))))

  const maxRows = Math.max(...ataDraft.groups.map(g => g.teams.length))
  for (let row = 1; row <= maxRows; row++) {
    const tokens = [tok(10, String(row))]
    const textParts = [String(row)]
    for (const g of ataDraft.groups) {
      const team = g.teams[row - 1]
      if (team) {
        const cellText = team.players.join(' & ')
        tokens.push(tok(GROUP_X[g.label], cellText))
        textParts.push(cellText)
      }
    }
    lines.push(line(textParts.join(' '), tokens))
  }

  lines.push(line('League', [tok(10, 'League')]))
  return lines
}

describe('parseTournamentPlan — real ATA document, reconstructed as token-positioned pages', () => {
  const draft = parseTournamentPlan([buildPage1(), buildPage2()])

  it('extracts declared totals', () => {
    expect(draft.declaredTotals.totalTeams.value).toBe(23)
    expect(draft.declaredTotals.totalMatches.value).toBe(53)
  })

  it('extracts the group roster INCLUDING Group C\'s blank 6th row (not padded, not invented)', () => {
    expect(draft.groups).toHaveLength(4)
    const byLabel = Object.fromEntries(draft.groups.map(g => [g.label, g]))
    expect(byLabel.A.teams).toHaveLength(6)
    expect(byLabel.B.teams).toHaveLength(6)
    expect(byLabel.C.teams).toHaveLength(5) // the real gap -- must not become 6
    expect(byLabel.D.teams).toHaveLength(6)
    expect(byLabel.A.teams[0]).toEqual({ code: 'A1', players: ['Haresh', 'Patrick'] })
  })

  it('extracts all 53 schedule rows (46 league + 4 qf + 2 sf + 1 final)', () => {
    expect(draft.schedule).toHaveLength(53)
    expect(draft.schedule.filter(r => r.stage === 'league')).toHaveLength(46)
    expect(draft.schedule.filter(r => r.stage === 'qf')).toHaveLength(4)
    expect(draft.schedule.filter(r => r.stage === 'sf')).toHaveLength(2)
    expect(draft.schedule.filter(r => r.stage === 'final')).toHaveLength(1)
  })

  it('correctly attributes the 10-11am block\'s mid-row gap (Court 3 blank, Court 4 populated) by x-position, not left-to-right guessing', () => {
    const tenToEleven = draft.schedule.filter(r => r.timeSlot.value === '10:00 AM - 11:00 AM' || r.stage === 'league' && r.roundIndex < 2 && ['D1', 'D4'].includes(r.team1.value))
    const dRows = draft.schedule.filter(r => r.team1.value === 'D1' && r.team2.value === 'D6')
    expect(dRows).toHaveLength(1)
    expect(dRows[0].court.value).toBe('Court 4') // not Court 3
  })

  it('derives the exact QF pool-cross mapping from the QF schedule rows, not a generic seed', () => {
    expect(draft.knockout.quarterfinals).toHaveLength(4)
    const mapped = draft.knockout.quarterfinals.map(qf => `${qf.team1Ref.group}${qf.team1Ref.rank} vs ${qf.team2Ref.group}${qf.team2Ref.rank}`)
    expect(mapped).toEqual(['B1 vs C2', 'B2 vs C1', 'A1 vs D2', 'A2 vs D1'])
  })

  it('extracts only the rules the document actually states, leaving the rest unspecified', () => {
    expect(draft.rules.structured.leagueMatchesPerTeam.value).toBe(4)
    expect(draft.rules.structured.maxMatchDurationMinutes.value).toBe(15)
    expect(draft.rules.structured.advancementRule.value).toMatch(/advance to quarter finals/i)
    expect(draft.rules.structured.minimumParticipantAge.value).toBeNull()
    expect(draft.rules.structured.serveHeight.value).toBeNull()
    expect(draft.rules.structured.disputeAuthority.value).toBeNull()
  })

  // Regression: an earlier version read "everything after NOTE:" across the
  // flattened multi-page array with no stopping point, so on the real ATA
  // PDF the tiebreak rule silently swallowed all of page 2's roster and
  // schedule tables as if they were part of its own sentence. Caught only by
  // actually running the real PDF binary through pdfjs-dist — this
  // fixture-based suite hadn't asserted the tiebreak text's *exact* content
  // before, only that other unrelated fields were null.
  it('does not let the tiebreak rule (last thing on page 1) bleed into page 2\'s tables', () => {
    const tiebreak = draft.rules.structured.tiebreakRule.value
    expect(tiebreak).toMatch(/winner of the league match/i)
    expect(tiebreak).not.toMatch(/Group A/i)
    expect(tiebreak).not.toMatch(/QFA1/i)
    expect(tiebreak.length).toBeLessThan(300) // the real sentence is ~230 chars; a leak was 1000+
  })

  // Regression: "TOTAL TEAMS 23 COURTS Needed" is one printed line on the
  // real document — a naive `\d+\s*courts?` scan matched "23" (the team
  // count sitting right before the word "COURTS") instead of the real court
  // count stated later in the document ("... 5 courts ...").
  it('does not mistake the team count for the court count just because they sit on the same heading line', () => {
    expect(draft.declaredTotals.totalCourts.value).toBe(5)
  })

  it('every extracted value carries the literal source text it came from', () => {
    expect(draft.declaredTotals.totalTeams.sourceText).toContain('23')
    expect(draft.rules.structured.leagueMatchesPerTeam.sourceText).toMatch(/plays 4 league matches/i)
  })

  it('END TO END: the parsed draft validates completely clean, matching the real document\'s actual consistency', () => {
    const issues = runAllValidations(draft)
    expect(issues).toEqual([])
  })
})

describe('parseTournamentPlan — no PDF/table data at all', () => {
  it('returns an empty-but-well-shaped draft rather than throwing', () => {
    const draft = parseTournamentPlan([[]])
    expect(draft.groups).toEqual([])
    expect(draft.schedule).toEqual([])
    expect(draft.declaredTotals.totalTeams.value).toBeNull()
  })

  it('every new timing field is null (never invented) when nothing is stated', () => {
    const draft = parseTournamentPlan([[]])
    expect(draft.tournamentInfo.startTime.value).toBeNull()
    expect(draft.tournamentInfo.endTime.value).toBeNull()
    expect(draft.tournamentInfo.checkInTime.value).toBeNull()
    expect(draft.tournamentInfo.registrationDeadline.value).toBeNull()
    expect(draft.tournamentInfo.timeZone.value).toBeNull()
    expect(draft.tournamentInfo.location.value).toBeNull()
  })
})

describe('parseTournamentPlan — real ATA document: timing fields it never states stay null', () => {
  const draft = parseTournamentPlan([buildPage1(), buildPage2()])

  it('derives startTime/endTime from the printed schedule\'s earliest/latest time slot, since the document never labels them explicitly', () => {
    expect(draft.tournamentInfo.startTime.value).not.toBeNull()
    expect(draft.tournamentInfo.endTime.value).not.toBeNull()
    expect(draft.tournamentInfo.startTime.sourceText).toMatch(/derived from schedule/i)
    expect(draft.tournamentInfo.endTime.sourceText).toMatch(/derived from schedule/i)
  })

  it('leaves check-in, registration deadline, time zone, and venue null — this document never states any of them', () => {
    expect(draft.tournamentInfo.checkInTime.value).toBeNull()
    expect(draft.tournamentInfo.registrationDeadline.value).toBeNull()
    expect(draft.tournamentInfo.timeZone.value).toBeNull()
    expect(draft.tournamentInfo.location.value).toBeNull()
  })
})

describe('parseTournamentPlan — explicit timing labels take priority over any derived fallback', () => {
  function buildTimingPage() {
    return [
      line('ATA PICKLEBALL TOURNAMENT PLAN', [tok(50, 'ATA PICKLEBALL TOURNAMENT PLAN')]),
      line('Date: August 14, 2026', [tok(10, 'Date: August 14, 2026')]),
      line('Venue: Riverside Community Center', [tok(10, 'Venue: Riverside Community Center')]),
      line('Start Time: 7:30 AM', [tok(10, 'Start Time: 7:30 AM')]),
      line('End Time: 5:00 PM', [tok(10, 'End Time: 5:00 PM')]),
      line('Check-in: 7:00 AM', [tok(10, 'Check-in: 7:00 AM')]),
      line('Registration Deadline: 6:45 AM', [tok(10, 'Registration Deadline: 6:45 AM')]),
      line('Time Zone: PST', [tok(10, 'Time Zone: PST')]),
    ]
  }

  const draft = parseTournamentPlan([buildTimingPage()])

  it('extracts an explicit calendar date near the title into ISO form', () => {
    expect(draft.tournamentInfo.date.value).toBe('2026-08-14')
  })

  it('extracts venue from an explicit "Venue:" label', () => {
    expect(draft.tournamentInfo.location.value).toBe('Riverside Community Center')
  })

  it('extracts explicit Start Time / End Time labels verbatim, not derived', () => {
    expect(draft.tournamentInfo.startTime.value).toBe('7:30 AM')
    expect(draft.tournamentInfo.startTime.sourceText).toBe('Start Time: 7:30 AM')
    expect(draft.tournamentInfo.endTime.value).toBe('5:00 PM')
  })

  it('extracts Check-in time and Registration Deadline from explicit labels', () => {
    expect(draft.tournamentInfo.checkInTime.value).toBe('7:00 AM')
    expect(draft.tournamentInfo.registrationDeadline.value).toBe('6:45 AM')
  })

  it('maps a printed time zone abbreviation to its real IANA name', () => {
    expect(draft.tournamentInfo.timeZone.value).toBe('America/Los_Angeles')
  })
})

describe('parseTournamentPlan — date recognized from an unlabeled calendar-date pattern in the header', () => {
  it('finds "Month D, YYYY" near the title even without a "Date:" label', () => {
    const page = [
      line('SPRING OPEN PICKLEBALL TOURNAMENT PLAN', [tok(50, 'SPRING OPEN PICKLEBALL TOURNAMENT PLAN')]),
      line('Saturday, March 7, 2026', [tok(10, 'Saturday, March 7, 2026')]),
    ]
    const draft = parseTournamentPlan([page])
    expect(draft.tournamentInfo.date.value).toBe('2026-03-07')
  })

  it('finds a slash-formatted date too', () => {
    const page = [
      line('SPRING OPEN PICKLEBALL TOURNAMENT PLAN', [tok(50, 'SPRING OPEN PICKLEBALL TOURNAMENT PLAN')]),
      line('3/7/2026', [tok(10, '3/7/2026')]),
    ]
    const draft = parseTournamentPlan([page])
    expect(draft.tournamentInfo.date.value).toBe('2026-03-07')
  })
})
