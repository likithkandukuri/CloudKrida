// Pure pool-assignment logic for Track B Phase 2 — no DB calls, fully
// unit-testable. Kept pickleball-specific (not moved into src/tournament/engine/)
// because round-robin pool assignment isn't a generic bracket concern the way
// buildBracket/propagateAll are.
//
// The output of these two functions is handed, as-is, to the
// generate_pickleball_pools Postgres RPC (see pickleballDb.js), which applies
// it atomically and re-validates what only the database can see authoritatively
// (current scores, current tournament.pool_size). All seeding/pairing math
// stays here so it can be tested with plain Vitest, not a live database.

// Spreadsheet-style label sequence: A, B, ..., Z, AA, AB, ... — supports any
// pool count without hardcoding a 26-pool ceiling.
function poolLabel(index) {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `Pool ${label}`
}

// Deterministic sort: seedOrder ascending (plain number — Phase 1 never gave
// seedOrder special "0 = unseeded" meaning, so this doesn't invent that
// either), then normalized name, then id, so ties never produce ambiguous
// ordering and "Generate Pools" run twice on identical input is byte-identical.
function sortForSeeding(entrants) {
  return [...entrants].sort((a, b) => {
    const so = (a.seedOrder ?? 0) - (b.seedOrder ?? 0)
    if (so !== 0) return so
    const an = (a.displayName ?? '').trim().toLowerCase()
    const bn = (b.displayName ?? '').trim().toLowerCase()
    if (an !== bn) return an < bn ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

// entrants: [{id, displayName, seedOrder, status}], active (non-withdrawn) only
// expected as input — withdrawn entrants are excluded by the caller before
// this runs, not filtered here, so this function has no implicit knowledge of
// "withdrawn" as a concept.
export function generatePoolAssignments(entrants, poolSize) {
  const sorted = sortForSeeding(entrants ?? [])
  const poolCount = Math.max(1, Math.ceil(sorted.length / poolSize))
  const pools = Array.from({ length: poolCount }, (_, i) => ({ label: poolLabel(i), entrantIds: [] }))

  sorted.forEach((entrant, i) => {
    const pass = Math.floor(i / poolCount)
    const posInPass = i % poolCount
    const poolIndex = pass % 2 === 0 ? posInPass : poolCount - 1 - posInPass
    pools[poolIndex].entrantIds.push(entrant.id)
  })

  return { pools }
}

// Round-robin pairs within each pool — no bye handling needed: unlike
// single-elimination, round-robin has no bracket "shell" to fill. An
// odd-sized pool just means each entrant plays one fewer total match, which
// this generates naturally with no phantom-bye risk (that edge case belongs
// to engine/bracket.js's power-of-2 padding and doesn't apply here).
export function generatePoolMatches(pools) {
  const matches = []
  for (const pool of pools ?? []) {
    const ids = pool.entrantIds
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        matches.push({ poolLabel: pool.label, entrant1Id: ids[i], entrant2Id: ids[j] })
      }
    }
  }
  return matches
}
