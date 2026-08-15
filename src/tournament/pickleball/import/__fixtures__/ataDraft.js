// Real ATA Pickleball Tournament Plan, transcribed and manually reconciled
// against the source PDF (league matches cross-checked against BOTH the
// by-group table AND the by-court/time schedule — they agree exactly; group
// totals, league match count, and the 46+4+2+1=53 total all tie out).
//
// Group C intentionally lists only 5 teams (its 6th row is blank in the
// document) — 6+6+5+6 = 23, matching the plan's own declared "TOTAL TEAMS
// 23". There is no team-count discrepancy in the real document. This fixture
// is therefore expected to validate clean (see pickleballImportValidation
// .test.js) — the malformed-input checks are exercised separately with
// synthetic fixtures, not by pretending this one has a bug it doesn't.

function team(code, players) {
  return { code, players }
}

export const ataDraft = {
  tournamentInfo: {
    name: { value: 'ATA Pickleball Tournament', sourceText: 'ATA PICKLEBALL TOURNAMENT PLAN', status: 'valid' },
    organizer: { value: null, sourceText: null, status: 'unspecified' },
    date: { value: null, sourceText: null, status: 'unspecified' },
    location: { value: null, sourceText: null, status: 'unspecified' },
    courtCount: { value: 5, sourceText: 'COURTS Needed ... 5 courts', status: 'valid' },
    durationText: { value: '8am-12pm', sourceText: '8am-10am ... 10am-12pm', status: 'valid' },
  },
  rules: {
    structured: {
      teamSize: { value: 2, sourceText: 'Haresh & Patrick (doubles pairing format)', status: 'valid' },
      format: { value: 'round_robin_to_single_elim', sourceText: 'League ... Quarter Finals ... Semi Finals ... Final', status: 'valid' },
      winningPoints: { value: null, sourceText: null, status: 'unspecified' },
      winBy2: { value: null, sourceText: null, status: 'unspecified' },
      bestOf: { value: null, sourceText: null, status: 'unspecified' },
      maxMatchDurationMinutes: { value: 15, sourceText: 'Each match has a 15 mins max time limit.', status: 'valid' },
      leagueMatchesPerTeam: { value: 4, sourceText: 'Each team plays 4 league matches.', status: 'valid' },
      advancementRule: { value: 'Two teams with most wins from each group advance to quarter finals.', sourceText: 'Two teams with most wins from each group advance to quarter finals.', status: 'valid' },
      tiebreakRule: { value: "If there is a tie, the winner of the league match between those 2 teams will move to next level. If those two teams didn't play in the league matches, then the points of all the matches will be taken into consideration.", sourceText: "If there is a tie, the winner of the league match between those 2 teams will move to next level.", status: 'valid' },
      minimumParticipantAge: { value: null, sourceText: null, status: 'unspecified' },
      serveType: { value: null, sourceText: null, status: 'unspecified' },
      serveHeight: { value: null, sourceText: null, status: 'unspecified' },
      serviceArea: { value: null, sourceText: null, status: 'unspecified' },
      mustClearKitchenLine: { value: null, sourceText: null, status: 'unspecified' },
      disputeAuthority: { value: null, sourceText: null, status: 'unspecified' },
      pointsScoredBy: { value: null, sourceText: null, status: 'unspecified' },
    },
    rawText: '1) Each team plays 4 league matches. Each match has a 15 mins max time limit.\n2) Two teams with most wins from each group advance to quarter finals.\n3) If there is a tie, the winner of the league match between those 2 teams will move to next level. If those two teams didn\'t play in the league matches, then the points of all the matches will be taken into consideration.',
  },
  declaredTotals: {
    totalTeams: { value: 23, sourceText: 'TOTAL TEAMS 23', status: 'valid' },
    totalMatches: { value: 53, sourceText: 'Total Matches 53', status: 'valid' },
    totalCourts: { value: 5, sourceText: 'COURTS Needed ... 5 courts', status: 'valid' },
  },
  groups: [
    { label: 'A', teams: [
      team('A1', ['Haresh', 'Patrick']), team('A2', ['Srikanth', 'Mahesh']), team('A3', ['BasavaRaj', 'Dharani']),
      team('A4', ['Cindy', 'Michael']), team('A5', ['Tarun', 'Srihari']), team('A6', ['Harsha Kota', 'Nikhil']),
    ] },
    { label: 'B', teams: [
      team('B1', ['Krishna', 'Subba']), team('B2', ['Debbie', 'John']), team('B3', ['Abhishek', 'Nitin']),
      team('B4', ['Bala', 'Nandu']), team('B5', ['Padmanaban', 'Samir']), team('B6', ['Jagadesh', 'Srinivas']),
    ] },
    { label: 'C', teams: [
      team('C1', ['Sridhar', 'Ravinder']), team('C2', ['Chaitanya', 'Pramod']), team('C3', ['Amanda', 'George']),
      team('C4', ['Naveen', 'Venkat']), team('C5', ['Vikram', 'Hanumanthu']),
    ] },
    { label: 'D', teams: [
      team('D1', ['Abhijeet', 'Kevin']), team('D2', ['Gopal', 'Chirag']), team('D3', ['Mallik', 'Venkat Kota']),
      team('D4', ['Abhinav', 'Anirudh']), team('D5', ['Craig', 'Scott']), team('D6', ['Dinesh', 'Nikhil']),
    ] },
  ],
  courts: [{ label: 'Court 1' }, { label: 'Court 2' }, { label: 'Court 3' }, { label: 'Court 4' }, { label: 'Court 5' }],
  schedule: buildSchedule(),
  knockout: {
    quarterfinals: [
      { slot: 0, team1Ref: { group: 'B', rank: 1 }, team2Ref: { group: 'C', rank: 2 } }, // QFB1 vs QFC2
      { slot: 1, team1Ref: { group: 'B', rank: 2 }, team2Ref: { group: 'C', rank: 1 } }, // QFB2 vs QFC1
      { slot: 2, team1Ref: { group: 'A', rank: 1 }, team2Ref: { group: 'D', rank: 2 } }, // QFA1 vs QFD2
      { slot: 3, team1Ref: { group: 'A', rank: 2 }, team2Ref: { group: 'D', rank: 1 } }, // QFA2 vs QFD1
    ],
    semifinals: [{ slot: 0, from: [0, 1] }, { slot: 1, from: [2, 3] }], // SF1 vs SF4 / SF2 vs SF3 → generic bracket progression
    final: { from: [0, 1] },
  },
}

function row(stage, court, timeSlot, roundIndex, team1, team2) {
  return { stage, court, timeSlot, roundIndex, team1, team2 }
}

function buildSchedule() {
  const rows = []

  // 8am-9am
  const c1_89 = ['A1vA2', 'A3vA5', 'A4vA6', 'A1vA3']
  const c2_89 = ['B1vB2', 'B3vB5', 'B2vB4', 'B5vB6']
  const c3_89 = ['C1vC2', 'C3vC4', 'C1vC5', 'C2vC3']
  const c4_89 = ['D1vD2', 'D3vD5', 'D4vD6', 'D1vD3']
  const c5_89 = ['A3vA6', 'A1vA4', 'B3vB6', 'B1vB4']
  ;[['Court 1', c1_89], ['Court 2', c2_89], ['Court 3', c3_89], ['Court 4', c4_89], ['Court 5', c5_89]]
    .forEach(([court, matches]) => matches.forEach((m, i) => {
      const [t1, t2] = m.split('v')
      rows.push(row('league', court, '8:00 AM - 9:00 AM', i, t1, t2))
    }))

  // 9am-10am
  const c1_910 = ['A2vA4', 'A5vA6', 'A2vA3', 'A2vA5']
  const c2_910 = ['B1vB6', 'B1vB3', 'B2vB3', 'B2vB5']
  const c3_910 = ['C4vC5', 'C1vC3', 'C2vC4', 'C1vC4']
  const c4_910 = ['D2vD4', 'D5vD6', 'D2vD3', 'D2vD5']
  const c5_910 = ['D3vD6', 'D1vD4', 'C3vC5', 'C2vC5']
  ;[['Court 1', c1_910], ['Court 2', c2_910], ['Court 3', c3_910], ['Court 4', c4_910], ['Court 5', c5_910]]
    .forEach(([court, matches]) => matches.forEach((m, i) => {
      const [t1, t2] = m.split('v')
      rows.push(row('league', court, '9:00 AM - 10:00 AM', i, t1, t2))
    }))

  // 10am-11am (only courts 1, 2, 4 have rows)
  const c1_1011 = ['A4vA5', 'A1vA6']
  const c2_1011 = ['B4vB5', 'B4vB6']
  const c4_1011 = ['D1vD6', 'D4vD5']
  ;[['Court 1', c1_1011], ['Court 2', c2_1011], ['Court 4', c4_1011]]
    .forEach(([court, matches]) => matches.forEach((m, i) => {
      const [t1, t2] = m.split('v')
      rows.push(row('league', court, '10:00 AM - 11:00 AM', i, t1, t2))
    }))

  // Knockout stage — courts 1 & 2 only, 11am-12pm
  rows.push(row('qf', 'Court 1', '11:00 AM - 12:00 PM', 0, 'QFB1', 'QFC2'))
  rows.push(row('qf', 'Court 2', '11:00 AM - 12:00 PM', 0, 'QFB2', 'QFC1'))
  rows.push(row('qf', 'Court 1', '11:00 AM - 12:00 PM', 1, 'QFA1', 'QFD2'))
  rows.push(row('qf', 'Court 2', '11:00 AM - 12:00 PM', 1, 'QFA2', 'QFD1'))
  rows.push(row('sf', 'Court 1', '11:00 AM - 12:00 PM', 2, 'SF1', 'SF4'))
  rows.push(row('sf', 'Court 2', '11:00 AM - 12:00 PM', 2, 'SF2', 'SF3'))
  rows.push(row('final', 'Court 1', '11:00 AM - 12:00 PM', 3, 'F1', 'F2'))

  return rows
}
