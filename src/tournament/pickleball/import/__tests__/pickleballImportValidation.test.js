import { describe, it, expect } from 'vitest'
import {
  validateTeamCounts, validateLeagueMatchCounts, validateAllTeamsScheduled,
  validateNoSimultaneousMatches, validateNoCourtConflicts,
  validateTeamReferences, validateAdvancementMapping, runAllValidations,
} from '../pickleballImportValidation.js'
import { ataDraft } from '../__fixtures__/ataDraft.js'

// ── Real ATA PDF fixture ──────────────────────────────────────────────────
// Manually reconciled against the source document (see the fixture file's
// header comment): 6+6+5+6 = 23 teams matches the declared total, all 46
// league matches tie out identically whether counted by group or by
// court/time, and the knockout mapping only references real groups/ranks.
// This is NOT tailored to force a clean result — it's the actual state of
// the document. Deliberately-broken cases are exercised separately below.
describe('pickleballImportValidation — real ATA fixture', () => {
  it('reports zero issues — the document is internally consistent', () => {
    expect(runAllValidations(ataDraft)).toEqual([])
  })

  it('confirms the true team count (23) independently, not from the declared total', () => {
    const actual = ataDraft.groups.reduce((sum, g) => sum + g.teams.length, 0)
    expect(actual).toBe(23)
    expect(ataDraft.groups.map(g => g.teams.length)).toEqual([6, 6, 5, 6])
  })

  it('confirms all 46 league matches give every team exactly 4 matches', () => {
    const counts = new Map()
    for (const row of ataDraft.schedule) {
      if (row.stage !== 'league') continue
      counts.set(row.team1, (counts.get(row.team1) ?? 0) + 1)
      counts.set(row.team2, (counts.get(row.team2) ?? 0) + 1)
    }
    const leagueRows = ataDraft.schedule.filter(r => r.stage === 'league')
    expect(leagueRows).toHaveLength(46)
    for (const g of ataDraft.groups) {
      for (const t of g.teams) {
        expect(counts.get(t.code)).toBe(4)
      }
    }
  })
})

// ── Synthetic malformed fixtures — one per check ────────────────────────────
// Each of these clones the clean ATA draft and breaks exactly one thing, to
// prove the corresponding validator actually fires on a real problem rather
// than just staying quiet on documents that happen to have none.

function clone(draft) { return JSON.parse(JSON.stringify(draft)) }

describe('validateTeamCounts', () => {
  it('flags a declared-vs-actual mismatch as an error', () => {
    const draft = clone(ataDraft)
    draft.declaredTotals.totalTeams.value = 24 // document says 24, only 23 really exist
    const issues = validateTeamCounts(draft)
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('error')
    expect(issues[0].code).toBe('team_count_mismatch')
  })

  it('stays quiet when declared and actual agree', () => {
    expect(validateTeamCounts(ataDraft)).toEqual([])
  })

  it('stays quiet when no total is declared at all', () => {
    const draft = clone(ataDraft)
    draft.declaredTotals.totalTeams.value = null
    expect(validateTeamCounts(draft)).toEqual([])
  })
})

describe('validateLeagueMatchCounts', () => {
  it('flags a team with fewer matches than stated', () => {
    const draft = clone(ataDraft)
    draft.schedule = draft.schedule.filter(r => !(r.stage === 'league' && r.team1 === 'A1' && r.team2 === 'A2'))
    const issues = validateLeagueMatchCounts(draft)
    expect(issues.some(i => i.code === 'league_match_count_mismatch' && i.message.includes('A1'))).toBe(true)
  })

  it('flags a team with more matches than stated', () => {
    const draft = clone(ataDraft)
    draft.schedule.push({ stage: 'league', court: 'Court 1', timeSlot: '9:00 AM - 10:00 AM', roundIndex: 99, team1: 'A1', team2: 'A2' })
    const issues = validateLeagueMatchCounts(draft)
    expect(issues.some(i => i.code === 'league_match_count_mismatch' && i.message.includes('A1'))).toBe(true)
  })
})

describe('validateAllTeamsScheduled', () => {
  it('warns about a team with zero matches when no per-team rule is stated', () => {
    const draft = clone(ataDraft)
    draft.rules.structured.leagueMatchesPerTeam.value = null
    draft.schedule = draft.schedule.filter(r => r.team1 !== 'C5' && r.team2 !== 'C5')
    const issues = validateAllTeamsScheduled(draft)
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('warning')
    expect(issues[0].message).toContain('C5')
  })

  it('defers to validateLeagueMatchCounts when a per-team rule IS stated', () => {
    const draft = clone(ataDraft)
    draft.schedule = draft.schedule.filter(r => r.team1 !== 'C5' && r.team2 !== 'C5')
    expect(validateAllTeamsScheduled(draft)).toEqual([]) // leagueMatchesPerTeam is still set
    expect(validateLeagueMatchCounts(draft).some(i => i.message.includes('C5'))).toBe(true)
  })
})

describe('validateNoSimultaneousMatches', () => {
  it('flags a team double-booked across two courts in the same slot', () => {
    const draft = clone(ataDraft)
    // A1 is already playing A1vA2 on Court 1 at 8:00-9:00 slot 0 — add a
    // second, conflicting appearance for A1 at the exact same slot.
    draft.schedule.push({ stage: 'league', court: 'Court 5', timeSlot: '8:00 AM - 9:00 AM', roundIndex: 0, team1: 'A1', team2: 'B1' })
    const issues = validateNoSimultaneousMatches(draft)
    expect(issues.some(i => i.code === 'simultaneous_match' && i.message.includes('A1'))).toBe(true)
  })

  it('does not flag the same team appearing in different slots', () => {
    expect(validateNoSimultaneousMatches(ataDraft)).toEqual([])
  })
})

describe('validateNoCourtConflicts', () => {
  it('flags a court double-booked at the same slot', () => {
    const draft = clone(ataDraft)
    draft.schedule.push({ stage: 'league', court: 'Court 1', timeSlot: '8:00 AM - 9:00 AM', roundIndex: 0, team1: 'C1', team2: 'C2' })
    const issues = validateNoCourtConflicts(draft)
    expect(issues.some(i => i.code === 'court_conflict')).toBe(true)
  })
})

describe('validateTeamReferences', () => {
  it('flags a schedule row referencing a team that does not exist', () => {
    const draft = clone(ataDraft)
    draft.schedule.push({ stage: 'league', court: 'Court 1', timeSlot: '9:00 AM - 10:00 AM', roundIndex: 98, team1: 'A7', team2: 'A2' })
    const issues = validateTeamReferences(draft)
    expect(issues.some(i => i.code === 'invalid_team_reference' && i.message.includes('A7'))).toBe(true)
  })

  it('does not flag QF/SF/Final placeholder codes as invalid team references', () => {
    expect(validateTeamReferences(ataDraft)).toEqual([])
  })

  it('flags a quarterfinal mapping referencing a group that does not exist', () => {
    const draft = clone(ataDraft)
    draft.knockout.quarterfinals[0].team2Ref.group = 'E'
    const issues = validateTeamReferences(draft)
    expect(issues.some(i => i.code === 'invalid_group_reference' && i.message.includes('Group E'))).toBe(true)
  })
})

describe('validateAdvancementMapping', () => {
  it('flags a rank outside the group\'s actual team count', () => {
    const draft = clone(ataDraft)
    draft.knockout.quarterfinals[0].team2Ref = { group: 'C', rank: 7 } // Group C only has 5 teams
    const issues = validateAdvancementMapping(draft)
    expect(issues.some(i => i.code === 'invalid_advancement_rank' && i.message.includes('Group C'))).toBe(true)
  })

  it('does not flag valid rank references', () => {
    expect(validateAdvancementMapping(ataDraft)).toEqual([])
  })
})
