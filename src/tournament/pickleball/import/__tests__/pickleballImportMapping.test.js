import { describe, it, expect } from 'vitest'
import { toImportPayload } from '../pickleballImportMapping.js'
import { ataDraft } from '../__fixtures__/ataDraft.js'

describe('toImportPayload — ATA fixture', () => {
  const payload = toImportPayload(ataDraft)

  it('produces one player entry per roster seat (23 teams x 2 = 46)', () => {
    expect(payload.p_players).toHaveLength(46)
    expect(payload.p_players[0]).toEqual({ temp_id: 'player:A1:0', name: 'Haresh' })
  })

  it('produces one entrant per team (23), each referencing exactly 2 member temp_ids', () => {
    expect(payload.p_entrants).toHaveLength(23)
    expect(payload.p_entrants.every(e => e.member_temp_ids.length === 2)).toBe(true)
    const a1 = payload.p_entrants.find(e => e.temp_id === 'entrant:A1')
    expect(a1.display_name).toBe('Haresh & Patrick')
    expect(a1.member_temp_ids).toEqual(['player:A1:0', 'player:A1:1'])
  })

  it('produces 5 courts and 4 pools matching the group sizes', () => {
    expect(payload.p_courts).toHaveLength(5)
    expect(payload.p_pools).toHaveLength(4)
    const poolA = payload.p_pools.find(p => p.label === 'Pool A')
    expect(poolA.entrant_temp_ids).toHaveLength(6)
    const poolC = payload.p_pools.find(p => p.label === 'Pool C')
    expect(poolC.entrant_temp_ids).toHaveLength(5)
  })

  it('produces exactly the 46 league matches, none from the knockout stage', () => {
    expect(payload.p_matches).toHaveLength(46)
    expect(payload.p_matches.every(m => m.pool_temp_id && m.entrant1_temp_id && m.entrant2_temp_id && m.court_temp_id)).toBe(true)
  })

  it('infers doubles from the actual roster size, not a separately-stated rule', () => {
    expect(payload.p_tournament.event_type).toBe('doubles')
  })

  it('lifts winningPoints/leagueMatchesPerTeam-mapped fields onto real tournament columns; leaves games_to at its default since the ATA plan never states a winning score', () => {
    // The real ATA document never states "11 points" anywhere — ensure this
    // stays honest rather than assuming a default pickleball rule.
    expect(ataDraft.rules.structured.winningPoints.value).toBeNull()
    expect(payload.p_tournament.games_to).toBe(11) // engine default, not claimed as "extracted"
  })

  it('carries the knockout mapping and full rules record through untouched, for later bracket generation / display', () => {
    expect(payload.p_tournament.advancement_mapping.quarterfinals).toHaveLength(4)
    expect(payload.p_tournament.imported_rules.structured.leagueMatchesPerTeam.value).toBe(4)
    expect(payload.p_tournament.imported_rules.structured.minimumParticipantAge.value).toBeNull()
  })
})
