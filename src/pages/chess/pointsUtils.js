import { uid } from './utils.js'

// ── Compute standings from all matches ────────────────────────────────────────
export function computeStandings(players, matches) {
  if (!players?.length) return []
  const map = {}
  for (const p of (players ?? [])) {
    if (!p?.name) continue
    map[p.name] = {
      name:             p.name,
      rating:           p.rating ?? p.elo ?? 0,
      elo:              p.elo ?? p.rating ?? null,
      grade:            p.grade ?? null,
      age:              p.age   ?? null,
      points:           0,
      wins:             0,
      draws:            0,
      losses:           0,
      byes:             0,
      opponentsPlayed:  [],
      colorHistory:     [],
      gamesPlayed:      0,
    }
  }

  // Process in round order so colorHistory is chronological
  const sorted = [...(matches ?? [])].sort((a, b) => a.round - b.round || a.slot - b.slot)

  for (const m of sorted) {
    if (m.status === 'bye') {
      const s = map[m.p1?.name]
      if (s) { s.points += 1; s.byes++; s.wins++; s.gamesPlayed++ }
      continue
    }
    if (m.status !== 'complete') continue

    const s1 = map[m.p1?.name]
    const s2 = m.p2 && m.p2 !== 'BYE' && m.p2?.name !== 'BYE' ? map[m.p2?.name] : null

    if (s1) {
      s1.colorHistory.push('W')
      if (s2) { s1.opponentsPlayed.push(m.p2.name); s1.gamesPlayed++ }
      if      (m.score1 === 1)   { s1.wins++;  s1.points += 1   }
      else if (m.score1 === 0.5) { s1.draws++; s1.points += 0.5 }
      else if (m.score1 === 0)   { s1.losses++ }
    }
    if (s2) {
      s2.colorHistory.push('B')
      if (s1) { s2.opponentsPlayed.push(m.p1.name); s2.gamesPlayed++ }
      if      (m.score2 === 1)   { s2.wins++;  s2.points += 1   }
      else if (m.score2 === 0.5) { s2.draws++; s2.points += 0.5 }
      else if (m.score2 === 0)   { s2.losses++ }
    }
  }

  return Object.values(map).sort((a, b) =>
    (b.points - a.points) || (b.wins - a.wins) || ((b.elo ?? b.rating ?? 0) - (a.elo ?? a.rating ?? 0))
  )
}

// ── Generate Swiss pairings for a round ──────────────────────────────────────
// standings must be sorted by points desc before calling
export function generateSwissPairings(standings, roundIndex) {
  // Guard: need at least 1 standing entry, and a valid roundIndex
  if (!standings?.length) return []
  const safeRound = typeof roundIndex === 'number' && isFinite(roundIndex) ? roundIndex : 0

  const pool = standings.filter(s => s?.name)   // filter out any null/invalid entries
  if (pool.length === 0) return []

  const used = new Set()
  const pairs = []

  // ── Handle odd player — bye goes to lowest-ranked player without a previous bye ──
  if (pool.length % 2 !== 0) {
    let byeStanding = null
    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i] && !pool[i].byes) { byeStanding = pool[i]; break }
    }
    if (!byeStanding) byeStanding = pool[pool.length - 1]
    if (!byeStanding) return []   // should never happen after the length check above
    used.add(byeStanding.name)

    pairs.push({
      id: uid(), round: safeRound, slot: -1,
      p1: { name: byeStanding.name, rating: byeStanding.rating, elo: byeStanding.elo, grade: byeStanding.grade, age: byeStanding.age },
      p2: 'BYE',
      score1: 1, score2: 0,
      winner: byeStanding.name, status: 'bye',
    })
  }

  // ── Pair remaining players top-down ──────────────────────────────────────────
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]
    if (used.has(p.name)) continue
    used.add(p.name)

    let opponent = null

    // First pass: no rematch
    for (let j = i + 1; j < pool.length; j++) {
      const q = pool[j]
      if (used.has(q.name)) continue
      if (p.opponentsPlayed.includes(q.name)) continue
      opponent = q
      break
    }

    // Fallback: allow rematch (everyone has played each other)
    if (!opponent) {
      for (let j = i + 1; j < pool.length; j++) {
        const q = pool[j]
        if (!used.has(q.name)) { opponent = q; break }
      }
    }

    if (!opponent) continue // should not happen

    used.add(opponent.name)

    // ── Color assignment ─────────────────────────────────────────────────────
    // Count Black games (more Black → wants White)
    const pWantsWhite  = p.colorHistory.filter(c => c === 'B').length >
                         p.colorHistory.filter(c => c === 'W').length
    const opWantsWhite = opponent.colorHistory.filter(c => c === 'B').length >
                         opponent.colorHistory.filter(c => c === 'W').length

    let white, black
    if      (pWantsWhite && !opWantsWhite)  { white = p;       black = opponent }
    else if (opWantsWhite && !pWantsWhite)  { white = opponent; black = p }
    else                                     { white = p;       black = opponent }

    const mkPlayer = (s) => ({ name: s.name, rating: s.rating, elo: s.elo, grade: s.grade, age: s.age })
    pairs.push({
      id: uid(), round: safeRound, slot: 0,
      p1: mkPlayer(white),
      p2: mkPlayer(black),
      score1: null, score2: null, winner: null, status: 'pending',
    })
  }

  // Assign slot numbers in order (byes at end)
  const regularPairs = pairs.filter(p => p.status !== 'bye')
  const byePairs     = pairs.filter(p => p.status === 'bye')
  return [
    ...regularPairs.map((p, i) => ({ ...p, slot: i })),
    ...byePairs.map((p, i) => ({ ...p, slot: regularPairs.length + i })),
  ]
}

// ── Check if all matches in a round are done ──────────────────────────────────
export function isRoundComplete(matches, round) {
  if (!matches?.length || typeof round !== 'number') return false
  const rms = matches.filter(m => m.round === round)
  return rms.length > 0 && rms.every(m => m.status === 'complete' || m.status === 'bye')
}

// ── Tie detection after the final round ───────────────────────────────────────
export function getTieStatus(standings) {
  if (!standings?.length) return { hasTie: false, tiedPlayers: [], winner: null }
  const top  = standings[0].points
  const tied = standings.filter(s => s.points === top)
  return {
    hasTie:      tied.length > 1,
    tiedPlayers: tied,
    winner:      tied.length === 1 ? standings[0].name : null,
  }
}

// ── Format points for display ─────────────────────────────────────────────────
export function fmtPts(n) {
  if (n === Math.floor(n)) return String(n)
  return n.toFixed(1)
}

