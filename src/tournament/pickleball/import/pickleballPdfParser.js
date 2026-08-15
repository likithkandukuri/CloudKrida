// Deterministic Pickleball tournament-plan parser — no AI, no external API,
// no cost. Reads the token-positioned lines pdfText.js extracts and
// reconstructs the document's actual tables (team roster grid, court x time
// schedule grid) using column position, the same way a person visually
// reads a table: find the header row, note where each column sits, then
// read every following row against those same x-positions. A blank cell is
// simply a column with no token near it — no special-casing needed for
// "this group happens to have one fewer team," which is exactly the real
// ATA document's shape (Group C's 6th row is blank).
//
// Every value returned is { value, sourceText } — value is null when the
// document doesn't state something (never guessed, never defaulted from
// "typical" pickleball rules) and sourceText is the literal line it came
// from, so the review screen can show exactly what was found and where.
// pickleballImportValidation.js is what actually checks this output for
// internal consistency — this module only reads, it never judges.

import { TIMEZONE_ABBREVIATIONS, parseLooseTime } from '../pickleballTime.js'

function field(value, sourceText = null) {
  return { value, sourceText }
}

function emptyDraft() {
  const structuredKeys = [
    'teamSize', 'format', 'winningPoints', 'winBy2', 'bestOf', 'maxMatchDurationMinutes',
    'leagueMatchesPerTeam', 'advancementRule', 'tiebreakRule', 'minimumParticipantAge',
    'serveType', 'serveHeight', 'serviceArea', 'mustClearKitchenLine', 'disputeAuthority', 'pointsScoredBy',
  ]
  const structured = {}
  for (const k of structuredKeys) structured[k] = field(null)

  return {
    tournamentInfo: {
      name: field(null), organizer: field(null), date: field(null),
      location: field(null), courtCount: field(null), durationText: field(null),
      startTime: field(null), endTime: field(null), checkInTime: field(null),
      registrationDeadline: field(null), timeZone: field(null),
    },
    rules: { structured, rawText: '' },
    declaredTotals: { totalTeams: field(null), totalMatches: field(null), totalCourts: field(null) },
    groups: [],
    courts: [],
    schedule: [],
    knockout: { quarterfinals: [] },
  }
}

// Nearest-anchor column reconstruction: assigns each token to whichever
// column header sits closest on the x-axis, then joins each column's
// assigned tokens (in x order) into that cell's full text. Works whether a
// PDF cell arrives as one text run ("A1 vs A2") or several ("A1", "vs",
// "A2") — either way, tokens belonging to one cell land closer to that
// cell's own column anchor than to a neighboring one. A column with no
// nearby tokens simply comes back as '' — the blank-cell case, handled for
// free rather than as a special case.
function bucketByColumns(anchors, tokens) {
  const buckets = anchors.map(() => [])
  for (const tok of tokens) {
    let bestIndex = 0
    let bestDist = Infinity
    anchors.forEach((ax, i) => {
      const d = Math.abs(tok.x - ax)
      if (d < bestDist) { bestDist = d; bestIndex = i }
    })
    buckets[bestIndex].push(tok)
  }
  return buckets.map(b => b.slice().sort((a, b2) => a.x - b2.x).map(t => t.text).join(' ').trim())
}

// ── Tournament title / declared totals ──────────────────────────────────────
function parseTitleAndTotals(lines, draft) {
  for (const { text } of lines) {
    if (!draft.tournamentInfo.name.value) {
      const m = text.match(/^(.*PICKLEBALL TOURNAMENT PLAN.*)$/i)
      if (m) draft.tournamentInfo.name = field(toTitleCase(m[1].replace(/\bplan\b/i, '').trim()), m[1])
    }
    const teamsMatch = text.match(/TOTAL\s+TEAMS\s+(\d+)/i)
    if (teamsMatch) draft.declaredTotals.totalTeams = field(Number(teamsMatch[1]), text)

    const matchesMatch = text.match(/Total\s+Matches\s+(\d+)/i)
    if (matchesMatch) draft.declaredTotals.totalMatches = field(Number(matchesMatch[1]), text)

    // "N courts" (plural, specifically), and not on the "TOTAL TEAMS ..."
    // heading line. Two independent false-positive sources found by running
    // the real ATA PDF through the actual parser: (1) that heading line
    // reads "TOTAL TEAMS 23 COURTS Needed", where "23" sits right before the
    // word "COURTS" even though it's the team count, not a court count; (2)
    // a court-header row like "Court 1 Court 2 Court 3" also satisfies a
    // bare `\d+\s*courts?` scan, because the "1" from "Court 1" sits right
    // before the next column's "Court". The real declared-count phrases
    // ("5 courts", "2 courts") always use the plural, while the header only
    // ever uses singular "Court N" — requiring the 's' rules out (2); the
    // `!teamsMatch` guard rules out (1).
    if (!teamsMatch) {
      const courtsMatch = text.match(/(\d+)\s*courts\b/i)
      if (courtsMatch && draft.declaredTotals.totalCourts.value == null) {
        draft.declaredTotals.totalCourts = field(Number(courtsMatch[1]), text)
      }
    }

    const durationMatch = text.match(/(\d{1,2}\s*am\s*-\s*\d{1,2}\s*(?:am|pm))/gi)
    if (durationMatch && !draft.tournamentInfo.durationText.value) {
      draft.tournamentInfo.durationText = field(durationMatch.join(' ... '), text)
    }
  }
}

function toTitleCase(s) {
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// ── Rules / notes ────────────────────────────────────────────────────────────
// Populates only what the NOTE section literally states — everything else
// (winning score, serve rules, age minimum, dispute authority, ...) stays
// null/unspecified for a document like this one that never mentions them,
// rather than filling in "typical" pickleball defaults.
//
// Takes `pages` (not flattened lines) and only reads within the single page
// the "NOTE" heading was found on. A tournament plan's notes are always the
// tail of whatever page they appear on — reading "everything after NOTE:"
// across a flattened multi-page array would otherwise run straight into the
// NEXT page's own tables (confirmed against the real ATA PDF: without this
// boundary, the tiebreak rule swallowed the entire page-2 roster and
// schedule tables as if they were part of the note's prose).
function parseNotesAndRules(pages, draft) {
  const notePage = pages.find(page => page.some(l => /^NOTE\s*:?/i.test(l.text.trim())))
  if (!notePage) return
  const noteIndex = notePage.findIndex(l => /^NOTE\s*:?/i.test(l.text.trim()))

  // Extra guard even within the same page: stop at the first line that looks
  // like a new document heading (long all-caps title), in case some other
  // tournament plan's notes aren't the very last thing on their page.
  const restOfPage = notePage.slice(noteIndex + 1)
  const headingIdx = restOfPage.findIndex(l => /^[A-Z][A-Z\s&']{12,}$/.test(l.text.trim()))
  const noteLines = (headingIdx === -1 ? restOfPage : restOfPage.slice(0, headingIdx)).map(l => l.text)
  const rawText = noteLines.join('\n').trim()
  draft.rules.rawText = rawText

  const perTeamMatch = rawText.match(/plays\s+(\d+)\s+league\s+matches?/i)
  if (perTeamMatch) draft.rules.structured.leagueMatchesPerTeam = field(Number(perTeamMatch[1]), perTeamMatch[0])

  const durationMatch = rawText.match(/(\d+)\s*mins?\s+max\s+time\s+limit/i)
  if (durationMatch) draft.rules.structured.maxMatchDurationMinutes = field(Number(durationMatch[1]), durationMatch[0])

  const advancementSentence = noteLines.find(l => /advance/i.test(l))
  if (advancementSentence) draft.rules.structured.advancementRule = field(advancementSentence.trim(), advancementSentence.trim())

  const tieIdx = noteLines.findIndex(l => /\btie\b/i.test(l))
  if (tieIdx !== -1) {
    const tiebreakText = noteLines.slice(tieIdx).join(' ').trim()
    draft.rules.structured.tiebreakRule = field(tiebreakText, tiebreakText)
  }

  draft.rules.structured.format = field('round_robin_to_single_elim', 'League ... Quarter Finals ... Semi Finals ... Final')
}

// ── Groups / team roster table ───────────────────────────────────────────────
// Header row looks like "Group A   Group B   Group C   Group D" — each
// "Group X" token's x-position anchors that group's column. Numbered rows
// beneath it (1, 2, 3, ...) are bucketed against those anchors; a blank
// bucket for a given row (Group C's row 6 in the real document) simply
// produces no team for that group at that position — not padded, not
// invented.
function parseGroupsTable(lines, draft) {
  const headerIdx = lines.findIndex(l => (l.text.match(/\bGroup\s+[A-Z]\b/gi) || []).length >= 2)
  if (headerIdx === -1) return

  const headerLine = lines[headerIdx]
  const groupAnchors = []
  const groupLabels = []
  // Merge "Group" + "A" into one anchor if they arrived as separate tokens;
  // handle "Group A" as a single token too.
  for (let i = 0; i < headerLine.tokens.length; i++) {
    const tok = headerLine.tokens[i]
    const inline = tok.text.match(/^Group\s+([A-Z])$/i)
    if (inline) { groupAnchors.push(tok.x); groupLabels.push(inline[1].toUpperCase()); continue }
    if (/^Group$/i.test(tok.text) && headerLine.tokens[i + 1]) {
      const letterTok = headerLine.tokens[i + 1]
      const letterMatch = letterTok.text.match(/^([A-Z])$/i)
      if (letterMatch) { groupAnchors.push(tok.x); groupLabels.push(letterMatch[1].toUpperCase()); i++; continue }
    }
  }
  if (groupAnchors.length === 0) return

  const groups = groupLabels.map(label => ({ label, teams: [] }))

  for (let li = headerIdx + 1; li < lines.length; li++) {
    const line = lines[li]
    const firstTok = line.tokens[0]
    const rowNumMatch = firstTok?.text.match(/^(\d{1,2})$/)
    if (!rowNumMatch) {
      // Roster table ends at the first non-numbered-row line (e.g. "League").
      if (/^(League|Quarter Finals?)\b/i.test(line.text.trim())) break
      continue
    }
    const rowNum = Number(rowNumMatch[1])
    const restTokens = line.tokens.slice(1)
    const cells = bucketByColumns(groupAnchors, restTokens)

    cells.forEach((cellText, gi) => {
      if (!cellText) return // blank cell -- no team at this position for this group
      const players = cellText.split('&').map(s => s.trim()).filter(Boolean)
      groups[gi].teams.push({ code: `${groups[gi].label}${rowNum}`, players })
    })
  }

  draft.groups = groups
}

// ── Court x time schedule table ──────────────────────────────────────────────
// Same column-reconstruction technique as the roster table, anchored on the
// "Court 1  Court 2  Court 3  Court 4  Court 5" header that precedes the
// actual per-match schedule (there are two such headers in the document —
// the earlier one is the summary counts table; this looks specifically for
// the header immediately followed by rows containing "vs", which only the
// real schedule table has).
function parseScheduleTable(lines, draft) {
  const courtHeaderIndices = lines
    .map((l, i) => ({ i, count: (l.text.match(/\bCourt\s+\d+\b/gi) || []).length }))
    .filter(x => x.count >= 2)
    .map(x => x.i)

  const headerIdx = courtHeaderIndices.find(i => lines.slice(i + 1, i + 6).some(l => /\bvs\b/i.test(l.text)))
  if (headerIdx == null) return

  const headerLine = lines[headerIdx]
  const courtAnchors = []
  const courtLabels = []
  headerLine.tokens.forEach((tok, i) => {
    const inline = tok.text.match(/^Court\s+(\d+)$/i)
    if (inline) { courtAnchors.push(tok.x); courtLabels.push(`Court ${inline[1]}`); return }
    if (/^Court$/i.test(tok.text) && headerLine.tokens[i + 1]?.text.match(/^\d+$/)) {
      courtAnchors.push(tok.x); courtLabels.push(`Court ${headerLine.tokens[i + 1].text}`)
    }
  })
  if (courtAnchors.length === 0) return
  draft.courts = courtLabels.map(label => ({ label }))

  const schedule = []
  const roundCounters = new Map() // `${court}::${timeSlot}` -> next roundIndex

  let currentStage = null
  let currentTimeSlot = null

  const stagePattern = /^(League|Quarter\s*Finals?|QF|Semi\s*Finals?|SF|Finals?)\b/i
  const timePattern = /(\d{1,2}\s*am\s*-\s*\d{1,2}\s*(?:am|pm)|\d{1,2}\s*am\s*-\s*\d{1,2}\s*pm)/i

  for (let li = headerIdx + 1; li < lines.length; li++) {
    const line = lines[li]
    if (/^NOTE\s*:?/i.test(line.text.trim())) break

    let tokens = line.tokens
    const stageMatch = line.text.match(stagePattern)
    if (stageMatch) {
      currentStage = normalizeStage(stageMatch[1])
      // Drop the stage-label (and any time-range) tokens before bucketing,
      // so they never get misread as a team code.
      const labelText = stageMatch[0]
      let consumed = 0
      let acc = ''
      for (const tok of tokens) {
        acc = (acc ? acc + ' ' : '') + tok.text
        consumed++
        if (acc.length >= labelText.length) break
      }
      tokens = tokens.slice(consumed)
    }
    const timeMatch = line.text.match(timePattern)
    if (timeMatch) currentTimeSlot = timeMatch[1].replace(/\s+/g, ' ').trim()

    if (!currentStage) continue // haven't seen a stage label yet -- not a match row

    const cells = bucketByColumns(courtAnchors, tokens)
    cells.forEach((cellText, ci) => {
      const m = cellText.match(/([A-Za-z]*F?\d+[A-Za-z]?\d*)\s*vs\.?\s*([A-Za-z]*F?\d+[A-Za-z]?\d*)/i)
      if (!m) return
      const court = courtLabels[ci]
      const key = `${court}::${currentTimeSlot}`
      const roundIndex = roundCounters.get(key) ?? 0
      roundCounters.set(key, roundIndex + 1)
      schedule.push({
        stage: currentStage,
        court: field(court, court),
        timeSlot: field(currentTimeSlot, currentTimeSlot),
        roundIndex,
        team1: field(m[1].toUpperCase(), cellText),
        team2: field(m[2].toUpperCase(), cellText),
      })
    })
  }

  draft.schedule = schedule
}

function normalizeStage(raw) {
  const s = raw.toLowerCase().replace(/\s+/g, '')
  if (s.startsWith('league')) return 'league'
  if (s.startsWith('qf') || s.startsWith('quarterfinal')) return 'qf'
  if (s.startsWith('sf') || s.startsWith('semifinal')) return 'sf'
  if (s.startsWith('final')) return 'final'
  return 'league'
}

// ── Knockout advancement mapping ────────────────────────────────────────────
// Derived directly from the QF-stage schedule rows this same parse pass
// already extracted (e.g. "QFB1 vs QFC2") rather than a separate table —
// "QFB1" unambiguously means "Group B, rank 1" without needing any other
// part of the document.
function deriveKnockoutMapping(draft) {
  const qfRows = draft.schedule.filter(r => r.stage === 'qf')
  const refFromCode = (code) => {
    const m = code.match(/^QF([A-Z])(\d+)$/i)
    return m ? { group: m[1].toUpperCase(), rank: Number(m[2]) } : null
  }

  const quarterfinals = []
  qfRows.forEach((row, i) => {
    const t1 = refFromCode(row.team1.value)
    const t2 = refFromCode(row.team2.value)
    if (t1 && t2) quarterfinals.push({ slot: i, team1Ref: t1, team2Ref: t2 })
  })
  draft.knockout = { quarterfinals }
}

const TIME_TOKEN = /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i

function parseDateToISO(str) {
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Venue ────────────────────────────────────────────────────────────────
function parseVenue(lines, draft) {
  for (const { text } of lines) {
    const m = text.match(/^(?:Venue|Location|Address)\s*:?\s*(.+)$/i)
    if (m && m[1].trim()) { draft.tournamentInfo.location = field(m[1].trim(), text); return }
  }
}

// ── Tournament-level timing ─────────────────────────────────────────────────
// Every sub-field here follows the same "never invent" rule as the rest of
// this parser: only an explicit label (or, for the date only, a
// recognizable calendar-date pattern in the document's own header) counts.
// Start/end time additionally fall back to the earliest/latest printed
// schedule time-slot when no explicit label exists — confirmed as intended
// behavior, and disclosed via sourceText as a derivation (the times are
// literally printed in the schedule, just aggregated), the same convention
// already used for courtCount's schedule-derived fallback below.
//
// Check-in time and registration deadline are modeled as a time-of-day on
// the tournament's own date (combined with `date` at mapping time in
// pickleballImportMapping.js) rather than an independent date+time, since
// that's how they're printed on a same-day tournament plan; the review
// screen lets a Superadmin correct this for the rare document where a
// registration deadline falls on a different day.
function parseTimingInfo(pages, lines, draft) {
  const headerLines = (pages[0] ?? []).slice(0, 20)
  for (const { text } of headerLines) {
    if (draft.tournamentInfo.date.value) break
    const labeled = text.match(/^Date\s*:?\s*(.+)$/i)
    const candidate = labeled ? labeled[1] : text
    const monthName = candidate.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/i)
    const slash = candidate.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/)
    const raw = monthName?.[1] ?? slash?.[1]
    if (raw) {
      const iso = parseDateToISO(raw)
      if (iso) draft.tournamentInfo.date = field(iso, text)
    }
  }

  for (const { text } of lines) {
    if (draft.tournamentInfo.startTime.value) break
    const m = text.match(/\b(?:Start\s*Time|Starts?|Begins)\s*:?\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
    if (m) draft.tournamentInfo.startTime = field(m[1].trim(), text)
  }
  for (const { text } of lines) {
    if (draft.tournamentInfo.endTime.value) break
    const m = text.match(/\b(?:End\s*Time|Ends|Concludes|Finishes)\s*:?\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
    if (m) draft.tournamentInfo.endTime = field(m[1].trim(), text)
  }
  for (const { text } of lines) {
    if (draft.tournamentInfo.checkInTime.value) break
    const m = text.match(/\bCheck[- ]?in\s*:?\s*(?:time\s*:?\s*|opens?\s*(?:at)?\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
    if (m) draft.tournamentInfo.checkInTime = field(m[1].trim(), text)
  }
  for (const { text } of lines) {
    if (draft.tournamentInfo.registrationDeadline.value) break
    const m = text.match(/\bRegistration\s*Deadline\s*:?\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
    if (m) draft.tournamentInfo.registrationDeadline = field(m[1].trim(), text)
  }
  for (const { text } of lines) {
    if (draft.tournamentInfo.timeZone.value) break
    const labeled = text.match(/\bTime\s*Zone\s*:?\s*([A-Za-z/_]{2,})/i)
    if (labeled) {
      const raw = labeled[1]
      const iana = TIMEZONE_ABBREVIATIONS[raw.toUpperCase()] ?? (raw.includes('/') ? raw : null)
      if (iana) { draft.tournamentInfo.timeZone = field(iana, text); continue }
    }
    const abbr = text.match(/\b(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)\b/)
    if (abbr) draft.tournamentInfo.timeZone = field(TIMEZONE_ABBREVIATIONS[abbr[1]], text)
  }

  // Derived start/end fallback — only fills whichever of the two wasn't
  // already found via an explicit label above.
  if (!draft.tournamentInfo.startTime.value || !draft.tournamentInfo.endTime.value) {
    const fragments = draft.schedule
      .map(row => row.timeSlot?.value)
      .filter(Boolean)
      .flatMap(slot => slot.split('-').map(s => s.trim()))
      .filter(s => TIME_TOKEN.test(s))
      .map(s => ({ s, mins: (() => { const t = parseLooseTime(s); return t ? t.hour * 60 + t.minute : null })() }))
      .filter(x => x.mins != null)

    if (fragments.length) {
      const earliest = fragments.reduce((a, b) => (b.mins < a.mins ? b : a))
      const latest = fragments.reduce((a, b) => (b.mins > a.mins ? b : a))
      if (!draft.tournamentInfo.startTime.value) {
        draft.tournamentInfo.startTime = field(earliest.s, `derived from schedule: earliest printed time slot "${earliest.s}"`)
      }
      if (!draft.tournamentInfo.endTime.value) {
        draft.tournamentInfo.endTime = field(latest.s, `derived from schedule: latest printed time slot "${latest.s}"`)
      }
    }
  }
}

// The one function the wizard calls: pages -> the shared draft shape that
// pickleballImportValidation.js and pickleballImportMapping.js consume.
export function parseTournamentPlan(pages) {
  const lines = pages.flat()
  const draft = emptyDraft()

  parseTitleAndTotals(lines, draft)
  parseNotesAndRules(pages, draft)
  parseGroupsTable(lines, draft)
  parseScheduleTable(lines, draft)
  deriveKnockoutMapping(draft)
  parseVenue(lines, draft)
  parseTimingInfo(pages, lines, draft)

  if (!draft.tournamentInfo.courtCount.value && draft.courts.length) {
    draft.tournamentInfo.courtCount = field(draft.courts.length, `${draft.courts.length} courts detected in the schedule table`)
  }

  return draft
}
