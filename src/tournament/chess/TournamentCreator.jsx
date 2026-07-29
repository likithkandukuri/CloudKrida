import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uid, parseCSV, nextPow2, buildBracket } from './utils.js'
import { generateSwissPairings } from './pointsUtils.js'

const slide = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.22 } },
}

const FORMATS = [
  { id: 'single_elimination', icon: '🏆', name: 'Single Elimination',
    desc: 'Classic knockout — one loss and you\'re out. Fast, decisive, easy to follow.' },
  { id: 'points_tournament',  icon: '📊', name: 'Points Tournament',
    desc: 'Swiss-style — every player competes every round, ranked by accumulated points.' },
]

const OPTIONAL_FIELDS = [
  { id: 'grade', label: 'Grade',      icon: '🎓', placeholder: 'e.g. 5',    desc: 'School grade or class level', inputType: 'text'   },
  { id: 'age',   label: 'Age',        icon: '🎂', placeholder: 'e.g. 12',   desc: 'Player age in years',         inputType: 'number' },
  { id: 'elo',   label: 'ELO Rating', icon: '⭐', placeholder: 'e.g. 1500', desc: 'Chess rating or skill level', inputType: 'number' },
]

// ── Step progress ─────────────────────────────────────────────────────────────
function StepProgress({ step }) {
  return (
    <div className="step-progress">
      {['Setup', 'Players', 'Review'].map((label, i) => {
        const num = i + 1; const done = step > num; const active = step === num
        return (
          <div key={label} className="step-item">
            <div className={`step-circle ${active ? 'active' : ''} ${done ? 'done' : ''}`}>{done ? '✓' : num}</div>
            <span className={`step-label ${active ? 'active' : ''} ${done ? 'done' : ''}`}>{label}</span>
            {i < 2 && <div className="step-line" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Field toggle button ───────────────────────────────────────────────────────
function FieldToggle({ field, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(field.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 16px', borderRadius: 8, fontFamily: 'inherit',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        background: selected ? 'var(--cc-sel)' : 'var(--cc-surface)',
        border: `1px solid ${selected ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
        color: selected ? 'var(--cc-gold)' : 'var(--cc-muted)',
      }}
    >
      <span style={{ fontSize: 15 }}>{selected ? '☑' : '☐'}</span>
      <span>{field.icon} {field.label}</span>
    </button>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ format, setFormat, name, setName, roundCount, setRoundCount, playerFields, setPlayerFields, onNext }) {
  const [touched, setTouched] = useState(false)
  const [customR,  setCustomR]  = useState('')
  const nameOk = name.trim().length > 0
  const PRESET_ROUNDS = [3, 5, 7, 9]
  const effectiveR = customR ? (parseInt(customR) || roundCount) : roundCount

  const toggleField = (id) => {
    setPlayerFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  const handleNext = () => { setTouched(true); if (nameOk) onNext() }

  return (
    <motion.div variants={slide} initial="hidden" animate="visible" exit="exit">
      {/* Tournament name */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 8 }}>
          TOURNAMENT NAME *
        </label>
        <input
          className="chess-input"
          placeholder="e.g. Club Championship 2025"
          value={name}
          onChange={e => { setName(e.target.value); setTouched(false) }}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          maxLength={60}
          style={{ borderColor: touched && !nameOk ? 'rgba(248,113,113,0.6)' : undefined }}
          autoFocus
        />
        {touched && !nameOk && <div style={{ fontSize: 12, color: 'var(--cc-warn)', marginTop: 6 }}>Please enter a tournament name.</div>}
      </div>

      {/* Format */}
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 12 }}>
        FORMAT
      </label>
      <div className="format-grid" style={{ marginBottom: 24 }}>
        {FORMATS.map(f => (
          <div key={f.id} className={`format-card ${format === f.id ? 'selected' : ''}`} onClick={() => setFormat(f.id)}>
            <div className="format-card-icon">{f.icon}</div>
            <div className="format-card-name">{f.name}</div>
            <div className="format-card-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Round count (Points Tournament only) */}
      <AnimatePresence>
        {format === 'points_tournament' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden', marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 12 }}>
              NUMBER OF ROUNDS
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_ROUNDS.map(n => (
                <button key={n} onClick={() => { setRoundCount(n); setCustomR('') }} style={{
                  padding: '8px 18px', borderRadius: 8, fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  background: effectiveR === n && !customR ? 'var(--cc-sel)' : 'var(--cc-surface)',
                  border: `1px solid ${effectiveR === n && !customR ? 'var(--cc-border2)' : 'var(--cc-border)'}`,
                  color: effectiveR === n && !customR ? 'var(--cc-gold)' : 'var(--cc-sub)',
                }}>{n}</button>
              ))}
              <input className="chess-input chess-input-sm" placeholder="Custom" type="number" min="1" max="20"
                value={customR} style={{ width: 90 }}
                onChange={e => { setCustomR(e.target.value); const n = parseInt(e.target.value); if (n >= 1 && n <= 20) setRoundCount(n) }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player fields selector */}
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cc-gold)', marginBottom: 12 }}>
        COLLECT PLAYER INFORMATION
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {/* Name: always required */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px', borderRadius: 8,
          background: 'var(--cc-sel)', border: '1px solid var(--cc-border2)',
          fontSize: 13, fontWeight: 600, color: 'var(--cc-gold)',
        }}>
          ✓ Name <span style={{ fontSize: 11, color: 'var(--cc-sub)', fontWeight: 400 }}>(always required)</span>
        </div>
        {OPTIONAL_FIELDS.map(f => (
          <FieldToggle key={f.id} field={f} selected={playerFields.includes(f.id)} onToggle={toggleField} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--cc-muted)', marginBottom: 28 }}>
        {playerFields.length === 0
          ? 'Name only — no additional information will be collected.'
          : `Collecting: Name + ${playerFields.map(id => OPTIONAL_FIELDS.find(f => f.id === id)?.label).filter(Boolean).join(' + ')}`
        }
      </div>

      <div className="step-nav">
        <div />
        <button className="chess-btn-gold" onClick={handleNext}>
          Next: Add Players
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function Step2({ players, setPlayers, playerFields, onNext, onBack }) {
  const [tab,       setTab]    = useState('manual')
  const [inputName, setInput]  = useState('')
  const [inputGrade, setGrade] = useState('')
  const [inputAge,   setAge]   = useState('')
  const [inputElo,   setElo]   = useState('')
  const [drag,      setDrag]   = useState(false)
  const [triedNext, setTried]  = useState(false)
  const fileRef = useRef()

  const activeOptional = OPTIONAL_FIELDS.filter(f => playerFields.includes(f.id))
  const hasExtra = activeOptional.length > 0

  const getInputValue = (id) => id === 'grade' ? inputGrade : id === 'age' ? inputAge : inputElo
  const setInputValue = (id, v) => id === 'grade' ? setGrade(v) : id === 'age' ? setAge(v) : setElo(v)

  const addPlayer = () => {
    const n = inputName.trim()
    if (!n) return
    const p = { id: uid(), name: n }
    if (playerFields.includes('elo')   && inputElo.trim())   { const v = parseInt(inputElo);   if (!isNaN(v)) { p.elo = v; p.rating = v } }
    if (playerFields.includes('grade') && inputGrade.trim()) { p.grade = inputGrade.trim() }
    if (playerFields.includes('age')   && inputAge.trim())   { const v = parseInt(inputAge);   if (!isNaN(v)) p.age = v }
    setPlayers(prev => [...prev, p])
    setInput(''); setGrade(''); setAge(''); setElo(''); setTried(false)
  }

  const removePlayer = (id) => setPlayers(prev => prev.filter(p => p.id !== id))

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result, ['name', ...playerFields])
      if (parsed.length) setPlayers(prev => [...prev, ...parsed])
    }
    reader.readAsText(file)
  }

  const handleNext = () => { setTried(true); if (players.length >= 2) onNext() }

  const size   = nextPow2(Math.max(players.length, 2))
  const rounds = Math.log2(size)
  const byes   = size - players.length

  // Column headers for player field display
  const csvColumns = ['Name', ...activeOptional.map(f => f.label)]

  const PlayerSubInfo = ({ p }) => {
    const parts = []
    if (playerFields.includes('elo')   && (p.elo ?? p.rating)) parts.push(`ELO ${p.elo ?? p.rating}`)
    if (playerFields.includes('grade') && p.grade)              parts.push(`Grade ${p.grade}`)
    if (playerFields.includes('age')   && p.age)                parts.push(`Age ${p.age}`)
    if (!parts.length) return null
    return <span className="player-row-sub">{parts.join(' • ')}</span>
  }

  return (
    <motion.div variants={slide} initial="hidden" animate="visible" exit="exit">
      <div className="player-input-tabs">
        <button className={`player-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>✏️ Manual Entry</button>
        <button className={`player-tab ${tab === 'csv'    ? 'active' : ''}`} onClick={() => setTab('csv')}>📁 Import CSV</button>
      </div>

      {/* Manual entry */}
      {tab === 'manual' && (
        <div style={{ marginBottom: 16 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: `1fr${activeOptional.length > 0 ? ' '.repeat(activeOptional.length) + activeOptional.map(() => ' auto').join('') : ''} auto`, gap: 8, alignItems: 'center', marginBottom: hasExtra ? 0 : 0 }}>
            <input className="chess-input" placeholder="Player name *" value={inputName}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (hasExtra ? null : addPlayer())}
              autoFocus />
            {activeOptional.map(f => (
              <input key={f.id} className="chess-input chess-input-sm" placeholder={f.label}
                type={f.inputType} min={f.inputType === 'number' ? 0 : undefined}
                value={getInputValue(f.id)} onChange={e => setInputValue(f.id, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                style={{ width: f.id === 'grade' ? 80 : 80 }} />
            ))}
            <button className="chess-btn-gold" onClick={addPlayer} disabled={!inputName.trim()}>+ Add</button>
          </div>
          {activeOptional.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginTop: 5 }}>
              Collecting: Name{activeOptional.map(f => ` · ${f.label}`).join('')} · Press Enter to add
            </div>
          )}
        </div>
      )}

      {/* CSV import */}
      {tab === 'csv' && (
        <div className={`csv-drop-zone ${drag ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <div className="csv-drop-icon">📂</div>
          <div className="csv-drop-text">Drop CSV or click to browse</div>
          <div className="csv-drop-sub">
            Expected columns: <strong>{csvColumns.join(', ')}</strong>
            {playerFields.includes('elo') && ' (ELO / Rating column name)'}
          </div>
        </div>
      )}

      {triedNext && players.length < 2 && (
        <div style={{ fontSize: 12, color: 'var(--cc-warn)', marginTop: 10 }}>Add at least 2 players to continue.</div>
      )}

      {/* Player list */}
      {players.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--cc-gold)' }}>
              PLAYERS ({players.length})
            </span>
            <span style={{ fontSize: 12, color: 'var(--cc-muted)' }}>
              {rounds} round{rounds !== 1 ? 's' : ''} · bracket of {size}
              {byes > 0 ? ` · ${byes} bye${byes > 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <div className="player-list-scroll">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div key={p.id} className="player-row"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}>
                  <span className="player-row-num">#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="player-row-name">{p.name}</span>
                    <PlayerSubInfo p={p} />
                  </div>
                  <button className="player-row-remove" onClick={() => removePlayer(p.id)} title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="step-nav">
        <button className="chess-btn-ghost" onClick={onBack}>← Back</button>
        <button className="chess-btn-gold" onClick={handleNext}>
          Review Tournament
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({ name, format, players, playerFields, roundCount, onBack, onConfirm, generating }) {
  const isPoints  = format === 'points_tournament'
  const size      = nextPow2(players.length)
  const rounds    = isPoints ? roundCount : Math.log2(size)
  const byes      = isPoints ? 0 : size - players.length
  const fmtLabel  = isPoints ? `Points Tournament — ${roundCount} rounds` : 'Single Elimination'
  const totalGames = isPoints ? Math.floor(players.length / 2) * roundCount : players.length - 1
  const activeOptional = OPTIONAL_FIELDS.filter(f => playerFields.includes(f.id))

  return (
    <motion.div variants={slide} initial="hidden" animate="visible" exit="exit">
      <div className="review-block">
        <div className="review-label">Tournament Name</div>
        <div className="review-value">{name}</div>
      </div>
      <div className="review-block">
        <div className="review-label">Format</div>
        <div className="review-value">{fmtLabel}</div>
      </div>
      <div className="review-block">
        <div className="review-label">Player Information</div>
        <div className="review-value">Name{activeOptional.length > 0 ? ` + ${activeOptional.map(f => f.label).join(' + ')}` : ' only'}</div>
        {activeOptional.length === 0 && (
          <div className="review-sub">No ELO, Grade, or Age will be collected.</div>
        )}
      </div>
      <div className="review-block">
        <div className="review-label">Structure</div>
        <div className="review-value">{players.length} players · {rounds} round{rounds !== 1 ? 's' : ''}</div>
        <div className="review-sub">
          {isPoints ? `${totalGames} games total · standings determine winner`
                    : `Bracket of ${size}${byes > 0 ? ` · ${byes} bye${byes > 1 ? 's' : ''}` : ''}`}
        </div>
      </div>
      <div className="review-block">
        <div className="review-label">Player List</div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {players.map(p => {
            const parts = []
            if (playerFields.includes('elo')   && (p.elo ?? p.rating)) parts.push(`ELO ${p.elo ?? p.rating}`)
            if (playerFields.includes('grade') && p.grade)              parts.push(p.grade)
            if (playerFields.includes('age')   && p.age)                parts.push(`Age ${p.age}`)
            return (
              <span key={p.id} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 12, color: 'var(--cc-text)',
                background: 'var(--cc-surface)', border: '1px solid var(--cc-border)',
              }}>
                {p.name}{parts.length ? ` (${parts.join(' · ')})` : ''}
              </span>
            )
          })}
        </div>
      </div>

      <div className="step-nav">
        <button className="chess-btn-ghost" onClick={onBack} disabled={generating}>← Back</button>
        <button className="chess-btn-gold" onClick={onConfirm} disabled={generating}
          style={{ fontSize: 14, padding: '12px 28px', opacity: generating ? 0.7 : 1 }}>
          {generating ? '⏳ Generating…' : '♛ Generate Tournament'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TournamentCreator({ onComplete }) {
  const [step,         setStep]         = useState(1)
  const [format,       setFormat]       = useState('single_elimination')
  const [name,         setName]         = useState('')
  const [players,      setPlayers]      = useState([])
  const [roundCount,   setRoundCount]   = useState(7)
  const [playerFields, setPlayerFields] = useState([])   // empty = name only
  const [generating,   setGenerating]   = useState(false)

  const handleConfirm = () => {
    if (players.length < 2) { alert('Add at least 2 players before generating.'); return }
    setGenerating(true)
    setTimeout(() => {
      try {
        const allFields = ['name', ...playerFields]

        if (format === 'single_elimination') {
          const matches     = buildBracket(players)
          const size        = nextPow2(Math.max(players.length, 2))
          const totalRounds = Math.max(Math.log2(size), 1)
          onComplete({ name: name.trim(), format, players, matches, totalRounds, currentRound: 0, playerFields: allFields })

        } else {
          const seedStandings = [...players]
            .filter(p => p?.name)
            .sort((a, b) => ((b.elo ?? b.rating ?? 0) - (a.elo ?? a.rating ?? 0)))
            .map(p => ({
              name: p.name, rating: p.elo ?? p.rating ?? 0,
              elo: p.elo ?? p.rating ?? null, grade: p.grade ?? null, age: p.age ?? null,
              points: 0, wins: 0, draws: 0, losses: 0, byes: 0,
              opponentsPlayed: [], colorHistory: [], gamesPlayed: 0,
            }))
          const matches = generateSwissPairings(seedStandings, 0)
          onComplete({ name: name.trim(), format, players, matches, totalRounds: roundCount, currentRound: 0, playerFields: allFields })
        }
      } catch (err) {
        console.error('Tournament generation error:', err)
        setGenerating(false)
        alert(`Failed to generate tournament: ${err.message || 'Unknown error'}. Please check your player list and try again.`)
      }
    }, 80)
  }

  return (
    <div className="chess-section">
      <div className="chess-section-head">
        <div className="chess-eyebrow">New Tournament</div>
        <h2 className="chess-heading">Create Tournament</h2>
        <p className="chess-subhead">Three steps to your first round.</p>
      </div>

      <div className="creator-container">
        <StepProgress step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1 key="s1"
              format={format} setFormat={setFormat}
              name={name} setName={setName}
              roundCount={roundCount} setRoundCount={setRoundCount}
              playerFields={playerFields} setPlayerFields={setPlayerFields}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2 key="s2"
              players={players} setPlayers={setPlayers}
              playerFields={playerFields}
              onNext={() => setStep(3)} onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3 key="s3"
              name={name} format={format} players={players}
              playerFields={playerFields} roundCount={roundCount}
              onBack={() => setStep(2)} onConfirm={handleConfirm} generating={generating}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
