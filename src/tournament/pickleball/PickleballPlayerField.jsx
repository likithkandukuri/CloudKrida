import { useState, useEffect, useRef } from 'react'
import { searchPickleballPlayers, findPlayersByExactName, createPickleballPlayer } from '../services/pickleballDb.js'

// One "member slot" in the entrant form — search existing players as you
// type, pick one, or type a brand-new name. If the typed name exactly
// matches an existing player that wasn't explicitly picked, warns before
// creating a duplicate rather than silently creating one.
export default function PickleballPlayerField({ label, value, onChange }) {
  const [query, setQuery]           = useState(value?.name ?? '')
  const [results, setResults]       = useState([])
  const [showResults, setShowResults] = useState(false)
  const [dupWarning, setDupWarning] = useState(null) // matching existing player, if any
  const debounceRef = useRef(null)

  useEffect(() => {
    if (value?.playerId) { setQuery(value.name ?? ''); return }
  }, [value?.playerId])

  const handleQueryChange = (v) => {
    setQuery(v)
    setDupWarning(null)
    onChange({ playerId: null, name: v }) // typing clears any prior selection
    clearTimeout(debounceRef.current)
    if (!v.trim()) { setResults([]); setShowResults(false); return }
    debounceRef.current = setTimeout(async () => {
      const r = await searchPickleballPlayers(v)
      setResults(r)
      setShowResults(true)
    }, 220)
  }

  const pickExisting = (player) => {
    setQuery(player.name)
    setShowResults(false)
    setDupWarning(null)
    onChange({ playerId: player.id, name: player.name })
  }

  // A genuinely new name (zero exact matches) is auto-created here — this is
  // the fix for the bug found during the Track B smoke test: previously,
  // typing a brand-new name did nothing on blur (only the dupWarning ->
  // "Create new anyway" path ever called createPickleballPlayer), so
  // playerId stayed null and entrant submission failed even though both
  // name fields were visibly filled in.
  const checkForDuplicateBeforeCreate = async () => {
    if (!query.trim() || value?.playerId) return
    const matches = await findPlayersByExactName(query)
    if (matches.length > 0) {
      setDupWarning(matches[0])
    } else {
      const player = await createPickleballPlayer({ name: query.trim() })
      onChange({ playerId: player.id, name: player.name })
    }
  }

  const createNewAnyway = async () => {
    const player = await createPickleballPlayer({ name: query.trim() })
    setDupWarning(null)
    onChange({ playerId: player.id, name: player.name })
  }

  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      <input
        className="pb-input"
        value={query}
        placeholder="Search or type a new player name…"
        onChange={e => handleQueryChange(e.target.value)}
        onBlur={() => { setTimeout(() => setShowResults(false), 150); checkForDuplicateBeforeCreate() }}
        onFocus={() => query.trim() && setShowResults(true)}
      />
      {value?.playerId && (
        <div style={{ fontSize: 11.5, color: 'var(--sport-pickleball)', marginTop: 4 }}>✓ Existing player selected</div>
      )}

      {showResults && results.length > 0 && (
        <div className="pb-autocomplete">
          {results.map(p => (
            <button type="button" key={p.id} className="pb-autocomplete-item" onMouseDown={() => pickExisting(p)}>
              {p.name}{p.skillRating ? ` · ${p.skillRating}` : ''}
            </button>
          ))}
        </div>
      )}

      {dupWarning && !value?.playerId && (
        <div className="pb-dup-warning">
          <span>A player named "{dupWarning.name}" already exists.</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" className="pb-btn-small" onClick={() => pickExisting(dupWarning)}>Use existing</button>
            <button type="button" className="pb-btn-small pb-btn-small--ghost" onClick={createNewAnyway}>Create new anyway</button>
          </div>
        </div>
      )}
    </div>
  )
}
