import { useState, useRef } from 'react'
import { uid } from './utils.js'
import { generateSwissPairings } from './pointsUtils.js'

// ── Section normalization ─────────────────────────────────────────────────────
const SECTION_ORDER = [
  'Kindergarten - 2nd Grade',
  '3rd Grade - 5th Grade',
  '6th Grade - 12th Grade',
  'Adults',
]

// Convert any raw string to a stable slug: lowercase, no control chars,
// uniform hyphens, collapsed spaces. Used for fuzzy matching only — never
// returned to the caller.
function toSectionKey(str) {
  return str
    .toLowerCase()
    .replace(/[\r\n\t]/g, ' ')   // control chars → space
    .replace(/[–—]/g, '-')        // em/en dash → hyphen
    .replace(/\s*-\s*/g, '-')     // remove spaces around hyphens
    .replace(/\s*\(.*?\)\s*/g, '') // strip parentheticals
    .replace(/[^a-z0-9\s-]/g, '') // keep only alphanumeric, spaces, hyphens
    .replace(/\s+/g, ' ')          // collapse spaces
    .trim()
}

// Each entry: canonical display name + predicate on the normalized key.
// Order matters — first match wins.
// Patterns use broad number-based matching so variations like "3-5", "grade 6-12",
// "K thru 2", etc. all resolve to the same canonical without a raw-string fallback.
const CANONICAL_SECTIONS = [
  {
    canonical: 'Kindergarten - 2nd Grade',
    test: (k) =>
      k.startsWith('kindergarten') ||
      k.startsWith('kinder') ||
      /\bk-?2\b/.test(k) ||          // "K-2", "K2"
      k === 'k-2' || k === 'k 2' ||
      (/\bk\b/.test(k) && /\b2(nd)?\b/.test(k)),  // "K thru 2nd"
  },
  {
    canonical: '3rd Grade - 5th Grade',
    test: (k) =>
      k.startsWith('3rd') ||
      k.startsWith('third') ||
      /\b3rd\b/.test(k) ||
      // Number-based: any key containing standalone 3 and 5, but NOT 6 or 12
      (k.match(/\b3\b/) !== null && k.match(/\b5\b/) !== null &&
       !k.includes('6') && !k.includes('12')),
  },
  {
    canonical: '6th Grade - 12th Grade',
    test: (k) =>
      k.startsWith('6th') ||
      k.startsWith('sixth') ||
      /\b6th\b/.test(k) ||
      (k.includes('6th') && k.includes('12th')) ||
      // Number-based: key containing 6 and any of 7–12
      (k.match(/\b6\b/) !== null &&
       /\b(7|8|9|10|11|12)\b/.test(k)) ||
      k.includes('middle school') ||
      k.includes('high school'),
  },
  {
    canonical: 'Adults',
    test: (k) =>
      k === 'adults' ||
      k === 'adult' ||
      k.startsWith('adult') ||
      k === 'open' ||
      /\bopen\b/.test(k),   // "Open Section", "Open Division"
  },
]

// Returns one of the 4 exact canonical strings, or null if unrecognized.
function normalizeSection(raw) {
  if (!raw?.trim()) return null
  // Fast path: exact canonical match (case-insensitive, trimmed)
  const lowered = raw.trim().toLowerCase()
  for (const { canonical } of CANONICAL_SECTIONS) {
    if (lowered === canonical.toLowerCase()) return canonical
  }
  const key = toSectionKey(raw)
  if (!key) return null
  for (const { canonical, test } of CANONICAL_SECTIONS) {
    if (test(key)) return canonical
  }
  return null
}

function getSections(rawSection) {
  if (!rawSection) return []
  // Support semicolons and pipes as multi-section separators
  return rawSection.split(/[;|]/)
    .map(s => normalizeSection(s.trim()))
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
}

function parseRegistrationCSV(text) {
  if (!text) return []
  const clean = text.replace(/^﻿/, '').trim()
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const parseRow = (line) => {
    const cols = []; let cur = '', inQ = false
    for (const ch of line) {
      if ((ch === '"' || ch === "'") && !inQ) { inQ = true; continue }
      if ((ch === '"' || ch === "'") && inQ)  { inQ = false; continue }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cols.push(cur.trim())
    return cols
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  const getIdx = (...aliases) => {
    for (const a of aliases) {
      const i = headers.findIndex(h => h.includes(a))
      if (i >= 0) return i
    }
    return -1
  }

  const nameIdx    = Math.max(getIdx('playername', 'name', 'player'), 1)
  const emailIdx   = getIdx('email')
  const phoneIdx   = getIdx('phone', 'phonenumber')
  const sectionIdx = getIdx('section', 'grade', 'category', 'division')
  const timeIdx    = getIdx('timestamp', 'time', 'date')

  return lines.slice(1).map(line => {
    const cols = parseRow(line)
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) return null
    const rawSection = (sectionIdx >= 0 ? cols[sectionIdx] : '').trim()
    return {
      _id:       uid(),
      name,
      email:     (emailIdx >= 0 ? cols[emailIdx]  : '').trim(),
      phone:     (phoneIdx >= 0 ? cols[phoneIdx]  : '').trim(),
      sections:  getSections(rawSection),
      rawSection,
      timestamp: (timeIdx >= 0 ? cols[timeIdx] : '').trim(),
    }
  }).filter(Boolean)
}

function groupBySections(rows) {
  // Use canonical section name as key — normalizeSection always returns one of
  // the 4 exact display strings (or a cleaned fallback), so two differently-
  // formatted CSV values that map to the same section can never create two groups.
  const map = {}
  for (const row of rows) {
    for (const s of row.sections) {
      if (!map[s]) map[s] = []
      if (!map[s].some(r => r._id === row._id)) map[s].push(row)
    }
  }
  return map
}

function suggestRounds(n) {
  if (n <= 4)  return 3
  if (n <= 8)  return 5
  if (n <= 16) return 7
  return 9
}

function buildTournamentData(sectionName, players, roundCount) {
  const domainPlayers = players.map(p => ({
    id: uid(), name: p.name.trim(),
    email: p.email, phone: p.phone,
    section: sectionName, registeredAt: p.timestamp,
  }))
  const seedStandings = domainPlayers.map(p => ({
    name: p.name, rating: 0, elo: null, grade: null, age: null,
    points: 0, wins: 0, draws: 0, losses: 0, byes: 0,
    opponentsPlayed: [], colorHistory: [], gamesPlayed: 0,
  }))
  const matches = generateSwissPairings(seedStandings, 0)
  return {
    name: sectionName, format: 'points_tournament',
    players: domainPlayers, matches,
    totalRounds: roundCount, currentRound: 0,
    playerFields: ['name'],
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CSVImporter({ onGenerateTournaments, onCancel }) {
  const [rows,        setRows]        = useState([])
  const [step,        setStep]        = useState('upload')
  const [drag,        setDrag]        = useState(false)
  const [roundCounts, setRoundCounts] = useState({})
  const [error,        setError]        = useState('')
  const [importError,  setImportError]  = useState('')
  // Event metadata (collected in 'event' step)
  const [eventName,     setEventName]     = useState('')
  const [eventDate,     setEventDate]     = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseRegistrationCSV(e.target.result)
      if (!parsed.length) { setError('No valid rows found. Check the file format.'); return }
      setRows(parsed)
      const groups = groupBySections(parsed)
      const defaults = {}
      for (const [s, ps] of Object.entries(groups)) defaults[s] = suggestRounds(ps.length)
      setRoundCounts(defaults)
      setStep('event')  // go to event name step before preview
      setError('')
    }
    reader.readAsText(file)
  }

  const removeRow = (id) => setRows(prev => prev.filter(r => r._id !== id))

  const updateRowSection = (id, newSection) =>
    setRows(prev => prev.map(r => r._id === id ? { ...r, sections: [newSection] } : r))

  const setRound = (section, val) => {
    const n = Math.max(1, parseInt(val) || 1)
    setRoundCounts(prev => ({ ...prev, [section]: n }))
  }

  const groups = groupBySections(rows)
  const sortedSections = [
    ...SECTION_ORDER.filter(s => groups[s]),
    ...Object.keys(groups).filter(s => !SECTION_ORDER.includes(s)),
  ]
  const totalTournaments = sortedSections.length
  const invalidRows = rows.filter(r => !r.sections.length)

  const handleGenerate = async () => {
    setStep('generating')
    setImportError('')
    try {
      // Strict canonical dedup — only creates tournaments for the 4 known sections.
      // Any section value that doesn't map to a canonical is silently skipped rather
      // than creating a mystery 5th tournament (the root cause of the duplication bug).
      const canonMap = {}
      for (const section of sortedSections) {
        const canon = normalizeSection(section)
        if (!canon) {
          console.warn('[Import] Skipping non-canonical section key:', JSON.stringify(section))
          continue
        }
        if (!canonMap[canon]) canonMap[canon] = []
        const seen = new Set(canonMap[canon].map(p => p._id))
        for (const p of groups[section] ?? []) {
          if (!seen.has(p._id)) { canonMap[canon].push(p); seen.add(p._id) }
        }
      }

      // Only the 4 canonical sections, in defined order, skipping empty ones.
      // Never includes raw fallback strings or "Other" as a section name.
      const finalSections = SECTION_ORDER.filter(s => (canonMap[s]?.length ?? 0) > 0)

      console.log('[Import] Final sections after dedup:', finalSections)
      console.log('[Import] Player counts:', Object.fromEntries(finalSections.map(s => [s, canonMap[s].length])))

      const tournaments = finalSections.map(section => {
        const ps = canonMap[section]
        const rc = roundCounts[section] ?? suggestRounds(ps.length)
        console.log('[Import] Section:', section, '—', ps.length, 'players,', rc, 'rounds')
        return buildTournamentData(section, ps, rc)
      })

      console.log('[Import] Calling onGenerateTournaments with event:', eventName.trim())
      await onGenerateTournaments(tournaments, {
        name:     eventName.trim(),
        date:     eventDate     || null,
        location: eventLocation.trim(),
      })
      console.log('[Import] Import complete')
    } catch (err) {
      console.error('[Import] Import failed:', err)
      setImportError(
        err?.message
          ? `${err.message}${err.details ? ` — ${err.details}` : ''}${err.hint ? ` (${err.hint})` : ''}`
          : String(err) || 'Unknown error'
      )
      setStep('preview')
    }
  }

  return (
    <div className="chess-section">
      <div className="chess-section-head">
        <div className="chess-eyebrow">Bulk Import</div>
        <h2 className="chess-heading">Import CSV Registration</h2>
        <p className="chess-subhead">
          Upload your registration file to automatically create tournaments by section.
        </p>
      </div>

      {/* ── Upload step ── */}
      {step === 'upload' && (
        <div>
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--cc-warn)', fontSize: 13,
            }}>⚠ {error}</div>
          )}

          <div
            className={`csv-drop-zone ${drag ? 'drag-over' : ''}`}
            style={{ minHeight: 240 }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <div className="csv-drop-icon" style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <div className="csv-drop-text">Drop registration CSV or click to browse</div>
            <div className="csv-drop-sub" style={{ marginTop: 10 }}>
              Expected columns: <strong>Player Name, Email, Phone Number, Section</strong>
            </div>
            <div className="csv-drop-sub" style={{ marginTop: 6 }}>
              Sections detected: Kindergarten–2nd · 3rd–5th · 6th–12th · Adults
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="chess-btn-ghost" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Event step ── */}
      {step === 'event' && (
        <div>
          <div style={{
            padding: '20px 24px', borderRadius: 14, marginBottom: 28,
            background: 'var(--cc-surface)', border: '1px solid var(--cc-border)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--cc-gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 16 }}>
              STEP 2 OF 3 — EVENT DETAILS
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cc-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
                EVENT NAME *
              </label>
              <input
                className="chess-input"
                type="text"
                placeholder="e.g. Albany Chess Championship 2026"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                style={{ width: '100%', fontSize: 15, fontWeight: 600 }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cc-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
                  DATE (optional)
                </label>
                <input
                  className="chess-input"
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cc-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
                  LOCATION (optional)
                </label>
                <input
                  className="chess-input"
                  type="text"
                  placeholder="e.g. Albany Community Center"
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(212,163,54,0.06)', border: '1px solid var(--cc-border)',
              fontSize: 12, color: 'var(--cc-sub)' }}>
              📋 {rows.length} registrations · {groupBySections(rows) && Object.keys(groupBySections(rows)).length} sections detected
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="chess-btn-ghost" onClick={() => { setRows([]); setStep('upload') }}>
              ← Re-upload
            </button>
            <button
              className="chess-btn-gold"
              onClick={() => {
                if (!eventName.trim()) { alert('Please enter an event name.'); return }
                setStep('preview')
              }}
              style={{ fontSize: 14, padding: '12px 28px' }}
            >
              Continue → Set Rounds
            </button>
          </div>
        </div>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && (
        <div>
          {/* Import error banner */}
          {importError && (
            <div style={{
              padding: '14px 18px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)',
              color: 'var(--cc-warn)', fontSize: 13,
            }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>❌ Import failed</div>
              <div style={{ opacity: 0.85, wordBreak: 'break-word' }}>{importError}</div>
              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                Fix the issue above and try again, or check the browser console for details.
              </div>
            </div>
          )}

          {/* Event name banner */}
          {eventName && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 16,
              background: 'var(--cc-sel)', border: '1px solid var(--cc-border2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--cc-text)' }}>{eventName}</div>
                {(eventDate || eventLocation) && (
                  <div style={{ fontSize: 12, color: 'var(--cc-sub)', marginTop: 2 }}>
                    {eventDate && new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {eventDate && eventLocation && ' · '}
                    {eventLocation && `📍 ${eventLocation}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'var(--cc-sel)', border: '1px solid var(--cc-border2)',
              fontSize: 13, color: 'var(--cc-gold)', fontWeight: 700,
            }}>
              {rows.length} registrations
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'var(--cc-surface)', border: '1px solid var(--cc-border)',
              fontSize: 13, color: 'var(--cc-text)', fontWeight: 600,
            }}>
              {totalTournaments} tournament{totalTournaments !== 1 ? 's' : ''} will be created
            </div>
            {invalidRows.length > 0 && (
              <div style={{
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)',
                fontSize: 13, color: 'var(--cc-warn)', fontWeight: 600,
              }}>
                ⚠ {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} missing section
              </div>
            )}
          </div>

          {/* ── Tournament summary table (set rounds here) ── */}
          {totalTournaments > 0 && (
            <div style={{ marginBottom: 32, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--cc-border)' }}>
              <div style={{
                padding: '13px 20px', background: 'var(--cc-surface)',
                borderBottom: '1px solid var(--cc-border)',
                fontSize: 12, fontWeight: 700, color: 'var(--cc-muted)', letterSpacing: '0.08em',
              }}>
                TOURNAMENT SETUP — set rounds for each section
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cc-bg)' }}>
                    <th style={{ padding: '10px 20px', fontSize: 10, fontWeight: 700, color: 'var(--cc-muted)', textAlign: 'left', letterSpacing: '0.1em' }}>
                      TOURNAMENT SECTION
                    </th>
                    <th style={{ padding: '10px 20px', fontSize: 10, fontWeight: 700, color: 'var(--cc-muted)', textAlign: 'center', letterSpacing: '0.1em' }}>
                      PLAYERS
                    </th>
                    <th style={{ padding: '10px 20px', fontSize: 10, fontWeight: 700, color: 'var(--cc-muted)', textAlign: 'center', letterSpacing: '0.1em' }}>
                      NUMBER OF ROUNDS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSections.map((section, i) => {
                    const ps     = groups[section]
                    const rounds = roundCounts[section] || suggestRounds(ps.length)
                    return (
                      <tr key={section} style={{
                        borderTop: '1px solid var(--cc-border)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--cc-surface)',
                      }}>
                        <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 700, color: 'var(--cc-text)' }}>
                          ♟ {section}
                        </td>
                        <td style={{ padding: '13px 20px', textAlign: 'center', fontSize: 14, color: 'var(--cc-sub)', fontWeight: 600 }}>
                          {ps.length}
                        </td>
                        <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                          <input
                            type="number"
                            className="chess-input"
                            value={rounds}
                            min="1"
                            max="99"
                            onChange={e => setRound(section, e.target.value)}
                            style={{
                              width: 72, fontSize: 15, fontWeight: 800,
                              textAlign: 'center', padding: '6px 8px',
                              color: 'var(--cc-gold)',
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Unassigned players */}
          {invalidRows.length > 0 && (
            <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 12,
              border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cc-warn)', marginBottom: 12 }}>
                Players without a section — assign them or remove:
              </div>
              {invalidRows.map(row => (
                <div key={row._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--cc-text)', minWidth: 160 }}>{row.name}</span>
                  <select
                    className="chess-input"
                    value=""
                    onChange={e => e.target.value && updateRowSection(row._id, e.target.value)}
                    style={{ fontSize: 12, padding: '5px 10px', width: 'auto' }}
                  >
                    <option value="">— Assign section —</option>
                    {SECTION_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeRow(row._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cc-warn)', fontSize: 16 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Per-section player tables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
            {sortedSections.map(section => {
              const players = groups[section]
              const rounds  = roundCounts[section] || suggestRounds(players.length)
              return (
                <div key={section} style={{ borderRadius: 12, border: '1px solid var(--cc-border)', overflow: 'hidden' }}>

                  {/* Section header */}
                  <div style={{
                    padding: '14px 20px', background: 'var(--cc-surface)',
                    borderBottom: '1px solid var(--cc-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--cc-text)' }}>♟ {section}</div>
                      <div style={{ fontSize: 12, color: 'var(--cc-muted)', marginTop: 3 }}>
                        {players.length} player{players.length !== 1 ? 's' : ''} · {rounds} round{rounds !== 1 ? 's' : ''} · Swiss Points Tournament
                      </div>
                    </div>
                  </div>

                  {/* Players table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['PLAYER', 'EMAIL', 'PHONE', 'SECTION', ''].map(h => (
                            <th key={h} style={{
                              padding: '9px 16px', fontSize: 10, fontWeight: 700,
                              color: 'var(--cc-muted)', textAlign: 'left', letterSpacing: '0.1em',
                              background: 'var(--cc-bg)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((row, i) => (
                          <tr key={row._id} style={{
                            borderTop: '1px solid var(--cc-border)',
                            background: i % 2 === 0 ? 'transparent' : 'var(--cc-surface)',
                          }}>
                            <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, color: 'var(--cc-text)' }}>
                              {row.name}
                            </td>
                            <td style={{ padding: '9px 16px', fontSize: 12, color: 'var(--cc-sub)' }}>
                              {row.email || '—'}
                            </td>
                            <td style={{ padding: '9px 16px', fontSize: 12, color: 'var(--cc-sub)' }}>
                              {row.phone || '—'}
                            </td>
                            <td style={{ padding: '9px 16px' }}>
                              <select
                                className="chess-input"
                                value={row.sections[0] || section}
                                onChange={e => updateRowSection(row._id, e.target.value)}
                                style={{ fontSize: 11, padding: '3px 7px', width: 'auto' }}
                              >
                                {SECTION_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '0 12px', textAlign: 'center' }}>
                              <button onClick={() => removeRow(row._id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cc-warn)', fontSize: 15, padding: 4 }}
                                title="Remove">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="chess-btn-ghost" onClick={() => setStep('event')}>
              ← Event Details
            </button>
            <button
              className="chess-btn-gold"
              onClick={handleGenerate}
              disabled={totalTournaments === 0}
              style={{ fontSize: 14, padding: '12px 28px', opacity: totalTournaments === 0 ? 0.5 : 1 }}
            >
              ♛ Generate {totalTournaments} Tournament{totalTournaments !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Generating step ── */}
      {step === 'generating' && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cc-text)', marginBottom: 8 }}>
            Creating tournaments…
          </div>
          <div style={{ fontSize: 13, color: 'var(--cc-muted)', marginBottom: 28 }}>
            Setting up {totalTournaments} tournament{totalTournaments !== 1 ? 's' : ''} — check the browser console if this takes more than 15 seconds
          </div>
          <button
            className="chess-btn-ghost"
            style={{ fontSize: 12, padding: '8px 20px', opacity: 0.6 }}
            onClick={() => {
              console.warn('[Import] User manually cancelled during generating step')
              setStep('preview')
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
