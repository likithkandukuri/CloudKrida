import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChess } from './ChessContext.jsx'
import { computeStandings, fmtPts } from './pointsUtils.js'
import { fetchTournament } from '../../lib/db.js'

const SECTION_ORDER = [
  'Kindergarten - 2nd Grade',
  '3rd Grade - 5th Grade',
  '6th Grade - 12th Grade',
  'Adults',
]

const MEDALS = ['🥇', '🥈', '🥉']

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function SectionStandings({ sectionData }) {
  if (!sectionData) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--cc-muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  const standings = computeStandings(sectionData.players, sectionData.matches)
  const round     = (sectionData.currentRound ?? 0) + 1
  const total     = sectionData.totalRounds
  const done      = sectionData.matches.filter(m => m.status === 'complete').length
  const totalM    = sectionData.matches.filter(m => m.status !== 'bye').length

  if (!standings.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--cc-muted)', fontSize: 13 }}>
        No matches yet
      </div>
    )
  }

  return (
    <>
      {/* Round progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--cc-muted)', marginBottom: 5, letterSpacing: '0.06em',
        }}>
          <span>Round {round}/{total}</span>
          <span>{sectionData.players.length} players · {done}/{totalM} complete</span>
        </div>
        {totalM > 0 && (
          <div style={{ height: 3, background: 'var(--cc-border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--cc-gold), #a07820)',
              width: `${Math.round((done / totalM) * 100)}%`,
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}
      </div>

      {/* Standings rows */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {standings.slice(0, 10).map((s, i) => (
            <tr key={s.name} style={{
              borderBottom: `1px solid var(--cc-sep)`,
              background: i < 3 ? 'var(--cc-sel)' : 'transparent',
            }}>
              <td style={{
                width: 32, padding: '8px 4px 8px 0', textAlign: 'center',
                fontSize: i < 3 ? 18 : 12,
                color: i < 3 ? 'var(--cc-gold)' : 'var(--cc-muted)',
                fontWeight: 800,
              }}>
                {i < 3 ? MEDALS[i] : i + 1}
              </td>
              <td style={{
                padding: '8px 6px',
                fontSize: 14, fontWeight: i < 3 ? 800 : 500,
                color: i < 3 ? 'var(--cc-text)' : 'var(--cc-sub)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
              }}>
                {s.name}
              </td>
              <td style={{
                width: 44, padding: '8px 0 8px 6px', textAlign: 'right',
                fontSize: 15, fontWeight: 900,
                color: 'var(--cc-gold)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtPts(s.points)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default function EventDisplay({ event, onClose }) {
  const { tournaments } = useChess()
  const [loaded, setLoaded] = useState({})

  const sections = tournaments
    .filter(t => t.eventId === event.id)
    .sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a.name)
      const bi = SECTION_ORDER.indexOf(b.name)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return (a.eventOrder ?? 0) - (b.eventOrder ?? 0)
    })

  // Seed from context cache, then fetch anything missing
  useEffect(() => {
    sections.forEach(s => {
      const cached = tournaments.find(t => t.id === s.id)
      if (cached?.players?.length > 0 || cached?.matches?.length > 0) {
        setLoaded(prev => ({ ...prev, [s.id]: cached }))
      } else {
        fetchTournament(s.id).then(t => {
          if (t) setLoaded(prev => ({ ...prev, [t.id]: t }))
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  // Sync when context loads data while display is open
  useEffect(() => {
    sections.forEach(s => {
      const cached = tournaments.find(t => t.id === s.id)
      if (cached?.players?.length > 0 || cached?.matches?.length > 0) {
        setLoaded(prev => ({ ...prev, [s.id]: cached }))
      }
    })
  }, [tournaments])

  const totalComplete = sections.every(s => {
    const d = loaded[s.id]
    return d && computeStandings(d.players, d.matches).length > 0
      && d.matches.filter(m => m.status === 'complete').length === d.matches.filter(m => m.status !== 'bye').length
      && d.matches.filter(m => m.status !== 'bye').length > 0
  })

  return (
    <motion.div
      className="event-display-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="event-display-panel"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="event-display-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              color: 'var(--cc-gold)', marginBottom: 6, textTransform: 'uppercase',
            }}>
              ♛ Chess Event
            </div>
            <div style={{
              fontSize: 26, fontWeight: 900, color: 'var(--cc-text)',
              lineHeight: 1.15, letterSpacing: '-0.015em',
            }}>
              🏆 {event.name}
            </div>
            {(event.date || event.location) && (
              <div style={{ fontSize: 13, color: 'var(--cc-sub)', marginTop: 6 }}>
                {event.date && fmtDate(event.date)}
                {event.date && event.location && ' · '}
                {event.location && `📍 ${event.location}`}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onClose}
              className="display-close"
              style={{ fontSize: 13, padding: '9px 20px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Close
            </button>
            <div style={{ fontSize: 11, color: 'var(--cc-muted)', textAlign: 'right' }}>
              {sections.length} section{sections.length !== 1 ? 's' : ''}
              {totalComplete && <span style={{ color: 'var(--cc-gold)', marginLeft: 6 }}>· Complete</span>}
            </div>
          </div>
        </div>

        {/* ── Section grid ── */}
        <div className="event-display-grid">
          {sections.map(s => (
            <div key={s.id} className="event-display-section">
              <div className="event-display-section-name">♟ {s.name}</div>
              <SectionStandings sectionData={loaded[s.id]} />
            </div>
          ))}

          {sections.length === 0 && (
            <div style={{
              gridColumn: '1/-1', textAlign: 'center', padding: '60px 0',
              color: 'var(--cc-muted)', fontSize: 15,
            }}>
              No sections found for this event.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
