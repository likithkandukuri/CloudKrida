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

// ── Mark a match as currently live ───────────────────────────────────────────
export function markMatchLive(matches, matchId) {
  return matches.map(m =>
    m.id === matchId && m.status === 'pending' ? { ...m, status: 'live' } : m
  )
}

// ── Record a match result ─────────────────────────────────────────────────────
// imageUrl is an optional base64 data URL of an attached score sheet
export function recordScore(matches, matchId, score1, score2, winnerName, imageUrl = null) {
  const updated = matches.map(m => {
    if (m.id !== matchId) return { ...m }
    return {
      ...m,
      score1,
      score2,
      winner: winnerName,
      status: 'complete',
      completedAt: Date.now(),
      record: imageUrl ? { imageUrl, uploadedAt: Date.now() } : (m.record ?? null),
    }
  })
  return propagateAll(updated)
}

// ── Remove a player from the bracket ─────────────────────────────────────────
export function removePlayer(matches, playerName) {
  const updated = matches.map(m => {
    if (m.status === 'complete') return { ...m }

    const isP1 = m.p1?.name === playerName
    const isP2 = m.p2?.name === playerName
    if (!isP1 && !isP2) return { ...m }

    const opp  = isP1 ? m.p2 : m.p1
    const oppOk = opp && opp !== 'BYE' && opp?.name !== 'BYE'

    return {
      ...m,
      p1: isP1 ? null : m.p1,
      p2: isP2 ? null : m.p2,
      winner: oppOk ? opp.name : null,
      score1: oppOk ? (isP1 ? 0 : 1) : null,
      score2: oppOk ? (isP2 ? 0 : 1) : null,
      status: oppOk ? 'complete' : 'pending',
    }
  })
  return propagateAll(updated)
}

// ── Helpers for display ───────────────────────────────────────────────────────
export function getScoreLabel(m) {
  if (!m.status || m.status === 'pending') return null
  if (m.status === 'bye') return 'BYE'
  if (m.score1 === null) return null
  const s1 = m.score1 === 0.5 ? '½' : m.score1
  const s2 = m.score2 === 0.5 ? '½' : m.score2
  return `${s1} – ${s2}`
}

export function getRoundLabel(round, totalRounds) {
  if (round === totalRounds - 1) return 'Final'
  if (round === totalRounds - 2) return 'Semi-Final'
  if (round === totalRounds - 3) return 'Quarter-Final'
  return `Round ${round + 1}`
}

// ── Remove player from pending match — NO auto-advance ───────────────────────
// The opponent is left unpaired (null slot). Director must recalculate.
export function removePlayerFromPairing(matches, playerName) {
  return matches.map(m => {
    if (m.status === 'complete' || m.status === 'bye') return { ...m }
    if (m.p1?.name === playerName) return { ...m, p1: null }
    if (m.p2?.name === playerName) return { ...m, p2: null }
    return { ...m }
  })
  // Do NOT propagate — no winners are created
}

// ── Recalculate pairings for current round ────────────────────────────────────
// Collects all real players from pending matches (inc. unpaired ones) and re-pairs
export function recalculatePairings(matches) {
  const target  = getCurrentRound(matches)
  const pending = matches.filter(m => m.round === target && m.status === 'pending')

  const seen = new Set()
  const pool = []
  for (const m of pending) {
    for (const p of [m.p1, m.p2]) {
      if (p?.name && p !== 'BYE' && p?.name !== 'BYE' && !seen.has(p.name)) {
        seen.add(p.name)
        pool.push(p)
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  let pi = 0
  const updated = matches.map(m => {
    if (m.round !== target || m.status !== 'pending') return { ...m }
    const p1  = pool[pi++] ?? null
    const p2  = pool[pi++] ?? null
    if (!p1 && !p2) return { ...m, status: 'void' }
    const bye = p1 !== null && p2 === null
    return {
      ...m, p1,
      p2: bye ? 'BYE' : p2,
      score1: bye ? 1 : null,
      score2: bye ? 0 : null,
      winner: bye ? p1.name : null,
      status: bye ? 'bye' : 'pending',
    }
  })
  return propagateAll(updated.filter(m => m.status !== 'void'))
}

// ── Swap two players between pending matches ───────────────────────────────────
export function swapPlayers(matches, matchId1, slot1, matchId2, slot2) {
  const m1 = matches.find(m => m.id === matchId1)
  const m2 = matches.find(m => m.id === matchId2)
  if (!m1 || !m2 || m1.status !== 'pending' || m2.status !== 'pending' || m1.locked || m2.locked) return matches
  const p1copy = m1[slot1]
  const p2copy = m2[slot2]
  return matches.map(m => {
    if (m.id === matchId1) return { ...m, [slot1]: p2copy }
    if (m.id === matchId2) return { ...m, [slot2]: p1copy }
    return m
  })
}

// ── Board / color helpers ─────────────────────────────────────────────────────
export function getBoardNumber(match) {
  return match.slot + 1
}

// p1 is always White, p2 is always Black (standard chess convention)
export function getWhite(match) {
  return match.p1 ?? null
}
export function getBlack(match) {
  const p2 = match.p2
  if (!p2 || p2 === 'BYE' || p2?.name === 'BYE') return null
  return p2
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

// Re-shuffle pending matches in the current active round (tournament director tool)
export function shuffleRepairRound(matches) {
  const target = getCurrentRound(matches)
  const pending = matches.filter(m => m.round === target && m.status === 'pending')
  if (pending.length === 0) return matches

  // Collect all real players from pending matches
  const pool = []
  for (const m of pending) {
    if (m.p1?.name && m.p1 !== 'BYE') pool.push(m.p1)
    if (m.p2?.name && m.p2 !== 'BYE' && m.p2?.name !== 'BYE') pool.push(m.p2)
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  let pi = 0
  return matches.map(m => {
    if (m.round !== target || m.status !== 'pending') return { ...m }
    const white = pool[pi++] ?? null
    const black = pool[pi++] ?? null
    const bye   = black === null
    return {
      ...m,
      p1: white,
      p2: bye ? 'BYE' : black,
      score1: bye ? 1 : null,
      score2: bye ? 0 : null,
      winner: bye ? (white?.name ?? null) : null,
      status: bye ? 'bye' : 'pending',
    }
  })
}

// ── CSV parser — robust, forgiving, field-aware ───────────────────────────────
// Rules:
//  • Name is the only required column — everything else is optional
//  • Missing optional columns are silently skipped (field left blank)
//  • Handles: BOM, semicolon delimiters, quoted values, no-header CSVs
//  • Auto-detects delimiter (comma or semicolon)
//  • Flexible column name matching (multiple aliases per field)
export function parseCSV(text, playerFields = ['name', 'elo']) {
  if (!text) return []

  // Strip UTF-8 BOM and normalize line endings
  const clean = text.replace(/^﻿/, '').trim()
  if (!clean) return []

  const rawLines = clean.split(/\r?\n/)
  const lines = rawLines.filter(l => l.trim().length > 0)
  if (lines.length === 0) return []

  // ── Detect delimiter ──
  const sample  = lines[0]
  const delim   = (sample.split(';').length > sample.split(',').length) ? ';' : ','

  // ── Parse one CSV row, handling quoted fields ──
  const parseRow = (line) => {
    const cols = []
    let cur = '', inQ = false
    for (const ch of line) {
      if ((ch === '"' || ch === "'") && !inQ)   { inQ = true; continue }
      if ((ch === '"' || ch === "'") && inQ)    { inQ = false; continue }
      if (ch === delim && !inQ) { cols.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cols.push(cur.trim())
    return cols
  }

  // ── Detect if first row is a header ──
  const firstCols = parseRow(lines[0]).map(c => c.toLowerCase())
  const HEADER_WORDS = ['name','player','elo','rating','grade','age','class','year','level','rank','school']
  const hasHeader = firstCols.some(h => HEADER_WORDS.some(w => h.includes(w)))

  let headers, dataLines
  if (hasHeader) {
    headers   = firstCols
    dataLines = lines.slice(1)
  } else {
    headers   = []      // no header — col 0 = name
    dataLines = lines
  }

  // ── Column index helpers ──
  const findIdx = (...aliases) =>
    hasHeader ? headers.findIndex(h => aliases.some(a => h.includes(a))) : -1

  const nameIdx  = hasHeader
    ? Math.max(findIdx('name', 'player', 'competitor'), 0)   // default col 0
    : 0

  const eloIdx   = playerFields.includes('elo')
    ? findIdx('elo', 'rating', ' r')
    : -1
  const gradeIdx = playerFields.includes('grade')
    ? findIdx('grade', 'class', 'year', 'level', 'group')
    : -1
  const ageIdx   = playerFields.includes('age')
    ? findIdx('age', 'dob', 'born')
    : -1

  // ── Parse data rows ──
  const result = []
  for (const line of dataLines) {
    if (!line.trim()) continue
    const cols = parseRow(line)
    const name = (cols[nameIdx] ?? cols[0] ?? '').trim()
    if (!name) continue   // skip rows with no name — never crash

    const p = { id: uid(), name }

    // Each optional field: silently skip if index is -1 or value is missing
    if (eloIdx >= 0) {
      const raw = (cols[eloIdx] ?? '').trim()
      const v   = parseInt(raw)
      if (!isNaN(v) && v > 0) { p.elo = v; p.rating = v }
    }
    if (gradeIdx >= 0) {
      const v = (cols[gradeIdx] ?? '').trim()
      if (v) p.grade = v
    }
    if (ageIdx >= 0) {
      const raw = (cols[ageIdx] ?? '').trim()
      const v   = parseInt(raw)
      if (!isNaN(v) && v > 0) p.age = v
    }

    result.push(p)
  }
  return result
}

// ── Recalculate pairings including players not yet in any match ───────────────
// Extends recalculatePairings to also include newly-added players that have
// no match in the current round yet. Locked matches are never touched.
export function recalculatePairingsWithAll(matches, allPlayers) {
  const target = getCurrentRound(matches)

  // Track who already has a complete/bye/locked result this round (don't touch these)
  const doneInRound = new Set()
  for (const m of matches.filter(m => m.round === target && (m.status === 'complete' || m.status === 'bye' || m.locked))) {
    if (m.p1?.name) doneInRound.add(m.p1.name)
    if (m.p2?.name && m.p2 !== 'BYE') doneInRound.add(m.p2.name)
  }

  // Track everyone in the current round
  const inRound = new Set(doneInRound)
  for (const m of matches.filter(m => m.round === target && m.status === 'pending' && !m.locked)) {
    if (m.p1?.name) inRound.add(m.p1.name)
    if (m.p2?.name && m.p2 !== 'BYE') inRound.add(m.p2.name)
  }

  // Build pool: pending (non-locked) match players + anyone not in round at all
  const seen = new Set(doneInRound)
  const pool = []

  for (const m of matches.filter(m => m.round === target && m.status === 'pending' && !m.locked)) {
    for (const p of [m.p1, m.p2]) {
      if (p?.name && p !== 'BYE' && p?.name !== 'BYE' && !seen.has(p.name)) {
        seen.add(p.name); pool.push(p)
      }
    }
  }
  for (const p of (allPlayers ?? [])) {
    if (p?.name && !inRound.has(p.name) && !seen.has(p.name)) {
      seen.add(p.name)
      pool.push({ name: p.name, rating: p.rating ?? p.elo ?? 0, elo: p.elo ?? null })
    }
  }

  if (!pool.length) return matches

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Keep non-pending matches and locked pending matches
  const kept = matches.filter(m => !(m.round === target && m.status === 'pending' && !m.locked))
  const completedSlots = kept.filter(m => m.round === target)
  let nextSlot = completedSlots.length > 0 ? Math.max(...completedSlots.map(m => m.slot)) + 1 : 0

  const newMatches = []
  let pi = 0
  while (pi < pool.length) {
    const p1 = pool[pi++]
    const p2 = pi < pool.length ? pool[pi++] : null
    const bye = p2 === null
    newMatches.push({
      id: uid(), round: target, slot: nextSlot++,
      status: bye ? 'bye' : 'pending',
      p1, p2: bye ? 'BYE' : p2,
      score1: bye ? 1 : null, score2: bye ? 0 : null,
      winner: bye ? p1.name : null,
    })
  }

  return propagateAll([...kept, ...newMatches])
}

// ── Smart Repair: only pair players in null slots or not yet in round ─────────
// Intact pairings (both slots filled) are never touched. Locked matches are skipped.
// Use this after player removal/addition to fix only what's broken.
export function smartRepair(matches, allPlayers) {
  const target = getCurrentRound(matches)
  const inRound = matches.filter(m => m.round === target)

  // Identify matches that need repair: pending, not locked, missing an opponent
  const toRepair = inRound.filter(m =>
    m.status === 'pending' && !m.locked &&
    (!m.p1?.name || !m.p2 || m.p2 === null || m.p2 === 'BYE' || m.p2?.name === 'BYE')
  )

  // Build pool from players in repair matches + players not in round at all
  const pool = []
  const poolNames = new Set()
  for (const m of toRepair) {
    if (m.p1?.name && m.p1 !== 'BYE' && !poolNames.has(m.p1.name)) {
      pool.push(m.p1); poolNames.add(m.p1.name)
    }
    if (m.p2?.name && m.p2 !== 'BYE' && m.p2?.name !== 'BYE' && !poolNames.has(m.p2.name)) {
      pool.push(m.p2); poolNames.add(m.p2.name)
    }
  }
  const allInRound = new Set(inRound.flatMap(m => [m.p1?.name, m.p2?.name]).filter(Boolean))
  for (const p of allPlayers ?? []) {
    if (!allInRound.has(p.name) && !poolNames.has(p.name)) {
      pool.push({ name: p.name, elo: p.elo ?? null })
      poolNames.add(p.name)
    }
  }

  if (!pool.length) return matches

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Reuse slot numbers from toRepair (sorted), then continue from max slot
  const repairSlots = toRepair.map(m => m.slot).sort((a, b) => a - b)
  const keptInRound = inRound.filter(m => !toRepair.some(r => r.id === m.id))
  let nextSlot = keptInRound.length ? Math.max(...keptInRound.map(m => m.slot)) + 1 : 0

  // Remove broken matches from base, pair the pool into new matches
  const base = matches.filter(m => !toRepair.some(r => r.id === m.id))
  const newMatches = []
  let pi = 0, si = 0
  while (pi < pool.length) {
    const p1 = pool[pi++]
    const p2 = pi < pool.length ? pool[pi++] : null
    const bye = p2 === null
    const slot = si < repairSlots.length ? repairSlots[si++] : nextSlot++
    newMatches.push({
      id: uid(), round: target, slot,
      status: bye ? 'bye' : 'pending',
      p1, p2: bye ? 'BYE' : p2,
      score1: bye ? 1 : null, score2: bye ? 0 : null,
      winner: bye ? p1.name : null,
    })
  }

  return propagateAll([...base, ...newMatches])
}

// ── Toggle a match's locked state ─────────────────────────────────────────────
export function toggleMatchLock(matches, matchId) {
  return matches.map(m => m.id === matchId ? { ...m, locked: !m.locked } : m)
}

// ── Flip colors (swap p1/p2) in a pending match ───────────────────────────────
export function flipMatchColors(matches, matchId) {
  return matches.map(m => {
    if (m.id !== matchId || m.status !== 'pending' || m.locked) return m
    return { ...m, p1: m.p2, p2: m.p1 }
  })
}

// ── Assign BYE to a match — recipientSlot is the player who WINS the BYE ─────
// Normalizes to p1 = real player, p2 = 'BYE' (standard representation).
export function assignMatchBye(matches, matchId, recipientSlot) {
  return matches.map(m => {
    if (m.id !== matchId || m.status !== 'pending' || m.locked) return m
    const recipient = m[recipientSlot]
    if (!recipient?.name) return m
    return {
      ...m,
      p1: recipient,
      p2: 'BYE',
      winner: recipient.name,
      score1: 1,
      score2: 0,
      status: 'bye',
    }
  })
}

// ── Remove BYE from a match, reverting to pending with one null slot ──────────
export function removeMatchBye(matches, matchId) {
  return matches.map(m => {
    if (m.id !== matchId || m.status !== 'bye') return m
    return { ...m, p2: null, winner: null, score1: null, score2: null, status: 'pending' }
  })
}

// ── Set match board number (slot = boardNum - 1) ──────────────────────────────
// Returns { matches, error } — error is null on success
export function setMatchSlot(matches, matchId, newBoardNum) {
  const newSlot = Math.max(0, newBoardNum - 1)
  const target  = matches.find(m => m.id === matchId)
  if (!target) return { matches, error: null }
  const dup = matches.find(m => m.round === target.round && m.id !== matchId && m.slot === newSlot)
  if (dup) return { matches, error: `Board ${newBoardNum} is already taken` }
  return {
    matches: matches.map(m => m.id === matchId ? { ...m, slot: newSlot } : m),
    error: null,
  }
}

// ── Validate pairings for a round — returns list of warning strings ───────────
export function validatePairings(matches, round) {
  const warnings = []
  const roundMs  = matches.filter(m => m.round === round)
  const history  = matches.filter(m => m.round < round && (m.status === 'complete' || m.status === 'bye'))

  // Duplicate board numbers
  const slots    = roundMs.map(m => m.slot)
  const dupSlots = slots.filter((s, i) => slots.indexOf(s) !== i)
  if (dupSlots.length) {
    warnings.push(`Duplicate board numbers: ${[...new Set(dupSlots)].map(s => `Board ${s + 1}`).join(', ')}`)
  }

  const byeWinners = []
  for (const m of roundMs) {
    const p1    = m.p1?.name
    const p2    = m.p2?.name
    const isBye = m.status === 'bye' || m.p2 === 'BYE' || p2 === 'BYE'
    const board = `Board ${m.slot + 1}`

    if (isBye && p1) {
      byeWinners.push(p1)
      const prevBye = history.find(h => h.status === 'bye' && h.p1?.name === p1)
      if (prevBye) warnings.push(`${p1} is receiving a 2nd BYE (first was Round ${prevBye.round + 1})`)
    }

    if (!p1 || !p2 || isBye) continue

    const prevMeet = history.find(h =>
      (h.p1?.name === p1 && h.p2?.name === p2) ||
      (h.p1?.name === p2 && h.p2?.name === p1)
    )
    if (prevMeet) {
      warnings.push(`${board}: Repeat pairing — ${p1} vs ${p2} (played Round ${prevMeet.round + 1})`)
    }
  }

  if (byeWinners.length > 1) {
    warnings.push(`Multiple BYEs in this round: ${byeWinners.join(', ')}`)
  }

  return warnings
}

// ── Player sub-info string (shared across all display components) ─────────────
// playerFields is the tournament's configured field list, e.g. ['name','elo','grade']
export function playerSubInfo(player, playerFields) {
  if (!player || typeof player !== 'object') return ''
  const pf   = playerFields ?? ['name', 'elo']
  const parts = []
  const elo  = player.elo ?? player.rating
  if (pf.includes('elo')   && elo)          parts.push(`ELO ${elo}`)
  if (pf.includes('grade') && player.grade) parts.push(`Grade ${player.grade}`)
  if (pf.includes('age')   && player.age)   parts.push(`Age ${player.age}`)
  return parts.join(' • ')
}

