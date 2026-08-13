// ── Sport-agnostic bracket engine ──────────────────────────────────────────
// Extracted from src/tournament/chess/utils.js, verified generic by the
// regression suite at src/tournament/chess/__tests__/engine.regression.test.js
// (that suite must stay green — it is the proof this extraction changed
// nothing about Chess's existing behavior, phantom-bye edge case included).
//
// Scope: only the primitives a READ-ONLY bracket view needs (building a
// bracket, propagating winners, and rendering geometry). Interactive editing
// helpers (swap, repair, lock, manual score entry, validatePairings) stay in
// chess/utils.js for now — Pickleball doesn't need them until its own
// scoring/court-editing phase, and moving them before they're needed only
// adds surface area without benefit. Revisit then, re-verify then.
//
// Contract for anything calling into this module: entities are generic
// {name, ...} objects. The 'BYE' string is the sentinel for an empty seat.
// A bye is recorded as score1:1/score2:0 as a generic "advances" signal —
// this is NOT a literal point tally (chess's own point system lives in
// chess/pointsUtils.js, not here) and sports with a different scoring model
// (e.g. Pickleball's per-game score array) should treat these two fields as
// bracket bookkeeping only, storing their real score data separately.

// ── ID generator ─────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9)

// ── Math helpers ──────────────────────────────────────────────────────────────
export function nextPow2(n) {
  let p = 1
  while (p < n) p <<= 1
  return p
}

// ── Bracket layout constants ──────────────────────────────────────────────────
export const SLOT_H  = 110  // vertical space per match in round 0
export const CARD_H  = 90   // rendered match card height (header + 2 player rows)
export const ROUND_W = 224  // width of a round column
export const CONN_W  = 52   // width of connector zone between rounds
export const PAD_TOP = 52   // top padding before first card
export const PAD_L   = 20   // left padding

export function getCardTop(slot, round) {
  const spacing = SLOT_H * Math.pow(2, round)
  return PAD_TOP + slot * spacing + (spacing - CARD_H) / 2
}

export function getCenterY(slot, round) {
  return getCardTop(slot, round) + CARD_H / 2
}

export function getCardLeft(round) {
  return PAD_L + round * (ROUND_W + CONN_W)
}

export function getBracketDimensions(playerCount) {
  const safe    = Math.max(playerCount, 2)   // guard: minimum 2 players
  const size    = nextPow2(safe)
  const rounds  = Math.max(Math.log2(size), 1)   // guard: minimum 1 round
  const r0slots = size / 2

  // Guard: (rounds - 1) can be 0 when rounds = 1 → no connector zones
  const width  = PAD_L * 2 + rounds * ROUND_W + Math.max(rounds - 1, 0) * CONN_W
  const height = PAD_TOP * 2 + Math.max(r0slots, 1) * SLOT_H
  return { width: Math.max(width, ROUND_W + PAD_L * 2), height, rounds, r0slots }
}

// ── Bracket generation ────────────────────────────────────────────────────────
export function buildBracket(players) {
  // Guard: need at least 2 valid players
  const valid = (players ?? []).filter(p => p?.name?.trim())
  if (valid.length < 2) throw new Error(`Need at least 2 players (got ${valid.length})`)

  const size   = nextPow2(valid.length)
  const rounds = Math.log2(size)

  // Shuffle seeds
  const seeded = [...valid].sort(() => Math.random() - 0.5)
  while (seeded.length < size) seeded.push(null)  // null = BYE

  const matches = []

  // Round 0
  for (let slot = 0; slot < size / 2; slot++) {
    const p1 = seeded[slot * 2]
    const p2 = seeded[slot * 2 + 1]
    const bye = p2 === null

    matches.push({
      id: uid(),
      round: 0,
      slot,
      p1: p1 ?? null,
      p2: bye ? 'BYE' : (p2 ?? null),
      score1: bye ? 1 : null,
      score2: bye ? 0 : null,
      winner: bye ? (p1?.name ?? null) : null,
      status: bye ? 'bye' : 'pending',
    })
  }

  // Subsequent rounds (empty shells)
  for (let r = 1; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1)
    for (let slot = 0; slot < count; slot++) {
      matches.push({
        id: uid(),
        round: r,
        slot,
        p1: null,
        p2: null,
        score1: null,
        score2: null,
        winner: null,
        status: 'pending',
      })
    }
  }

  return propagateAll(matches)
}

// ── Winner propagation ────────────────────────────────────────────────────────
export function propagateAll(matches) {
  if (!matches?.length) return matches ?? []
  const ms = matches.map(m => ({ ...m }))
  // Guard: filter out entries with invalid round values before taking max
  const validRounds = ms.map(m => m.round).filter(r => typeof r === 'number' && Number.isFinite(r))
  if (!validRounds.length) return ms
  const maxRound = Math.max(...validRounds)

  for (let r = 0; r < maxRound; r++) {
    const roundMs = ms.filter(m => m.round === r)
    for (const m of roundMs) {
      if (!m.winner) continue
      const parentSlot = Math.floor(m.slot / 2)
      const parent = ms.find(x => x.round === r + 1 && x.slot === parentSlot)
      if (!parent) continue

      const seat = m.slot % 2 === 0 ? 'p1' : 'p2'
      // The winner's full player object is whichever side won
      const winnerObj = m.winner === m.p1?.name ? m.p1
                      : m.winner === m.p2?.name ? m.p2
                      : { name: m.winner }

      if (parent[seat] === null || parent[seat]?.name === m.winner) {
        parent[seat] = winnerObj

        // Auto-resolve if other seat is BYE
        const other = seat === 'p1' ? 'p2' : 'p1'
        if (parent[other] === 'BYE' || parent[other]?.name === 'BYE') {
          parent.winner = m.winner
          parent.score1 = seat === 'p1' ? 1 : 0
          parent.score2 = seat === 'p1' ? 0 : 1
          parent.status = 'bye'
        }
      }
    }
  }

  return ms
}

// Find the current active round (first round with any pending matches)
export function getCurrentRound(matches) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  for (const r of rounds) {
    if (matches.some(m => m.round === r && (m.status === 'pending' || m.status === 'live'))) {
      return r
    }
  }
  return rounds[rounds.length - 1] ?? 0
}

export function getRoundLabel(round, totalRounds) {
  if (round === totalRounds - 1) return 'Final'
  if (round === totalRounds - 2) return 'Semi-Final'
  if (round === totalRounds - 3) return 'Quarter-Final'
  return `Round ${round + 1}`
}
