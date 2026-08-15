import { useMemo, useState } from 'react'
import { runAllValidations } from './pickleballImportValidation.js'

function val(field) { return field && typeof field === 'object' && 'value' in field ? field.value : field }
function setVal(field, newValue) {
  return field && typeof field === 'object' && 'value' in field ? { ...field, value: newValue } : newValue
}

// A single extracted field, shown as its clean value with the literal
// document snippet (or "not specified") underneath — the provenance
// requirement: the reviewer should be able to see exactly what Cloud Krida
// understood from the PDF, not just a clean-looking final number that could
// be silently wrong or invented.
function RuleField({ label, field, onChange, type = 'text' }) {
  const value = val(field)
  const source = field?.sourceText
  const unspecified = value == null
  return (
    <div className="pb-field">
      <span className="pb-field-label">{label}</span>
      {onChange ? (
        <input
          className="pb-input"
          type={type}
          value={value ?? ''}
          placeholder="Not specified in document"
          onChange={e => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        />
      ) : (
        <div className="pb-import-rule-value">{unspecified ? 'Not specified in document' : String(value)}</div>
      )}
      <div className={`pb-import-rule-source ${unspecified ? 'pb-import-rule-source--unspecified' : ''}`}>
        {unspecified ? '— not stated anywhere in the document' : `Extracted from: "${source}"`}
      </div>
    </div>
  )
}

function issuesForPath(issues, path) {
  return issues.filter(i => i.path === path || i.path?.startsWith(`${path}.`) || i.path?.startsWith(`${path}[`))
}

export default function PickleballImportReview({ draft, onDraftChange, onBack, onCreate, creating, createError }) {
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false)

  const issues = useMemo(() => runAllValidations(draft), [draft])
  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warning')

  const totalTeams = draft.groups.reduce((sum, g) => sum + g.teams.length, 0)
  const totalMatches = draft.schedule.length

  const update = (path, value) => {
    const next = structuredClone(draft)
    path(next, value)
    onDraftChange(next)
  }

  const canCreate = errors.length === 0 && (warnings.length === 0 || warningsAcknowledged)

  return (
    <div className="pb-import-review">
      {/* ── Validation summary — shown first, it's the thing that gates everything else ── */}
      <div className={`pb-import-validation-summary ${errors.length ? 'pb-import-validation-summary--error' : warnings.length ? 'pb-import-validation-summary--warning' : 'pb-import-validation-summary--clean'}`}>
        <div className="pb-import-validation-counts">
          <span><strong>{totalTeams}</strong> teams detected</span>
          <span><strong>{totalMatches}</strong> matches detected</span>
          <span><strong>{draft.courts.length}</strong> courts detected</span>
          <span className={errors.length ? 'pb-import-count--error' : ''}><strong>{errors.length}</strong> errors</span>
          <span className={warnings.length ? 'pb-import-count--warning' : ''}><strong>{warnings.length}</strong> warnings</span>
        </div>
        {issues.length === 0 && (
          <div className="pb-import-validation-clean">✓ The document is internally consistent — nothing needs review.</div>
        )}
        {errors.length > 0 && (
          <ul className="pb-import-issue-list pb-import-issue-list--error">
            {errors.map((issue, i) => <li key={i}>❌ {issue.message}</li>)}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="pb-import-issue-list pb-import-issue-list--warning">
            {warnings.map((issue, i) => <li key={i}>⚠️ {issue.message}</li>)}
          </ul>
        )}
      </div>

      {/* ── Tournament overview ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">Tournament Overview</h3>
        <div className="pb-form-grid">
          <RuleField label="Name" field={draft.tournamentInfo.name}
            onChange={v => update((d, val) => { d.tournamentInfo.name = setVal(d.tournamentInfo.name, val) }, v)} />
          <RuleField label="Organizer" field={draft.tournamentInfo.organizer}
            onChange={v => update((d, val) => { d.tournamentInfo.organizer = setVal(d.tournamentInfo.organizer, val) }, v)} />
          <RuleField label="Date" field={draft.tournamentInfo.date} type="date"
            onChange={v => update((d, val) => { d.tournamentInfo.date = setVal(d.tournamentInfo.date, val) }, v)} />
          <RuleField label="Location" field={draft.tournamentInfo.location}
            onChange={v => update((d, val) => { d.tournamentInfo.location = setVal(d.tournamentInfo.location, val) }, v)} />
          <RuleField label="Courts" field={draft.tournamentInfo.courtCount} />
          <RuleField label="Duration" field={draft.tournamentInfo.durationText} />
        </div>
      </section>

      {/* ── Declared totals — where the team-count-mismatch error is resolved ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">Declared Totals</h3>
        <p className="pb-import-section-hint">
          If these don't match what was actually counted below, resolve it here or in the group rosters —
          Cloud Krida will never guess which one is right on your behalf.
        </p>
        <div className="pb-form-grid">
          <RuleField label="Total teams (as stated in the document)" field={draft.declaredTotals.totalTeams} type="number"
            onChange={v => update((d, val) => { d.declaredTotals.totalTeams = setVal(d.declaredTotals.totalTeams, val) }, v)} />
          <RuleField label="Total matches (as stated in the document)" field={draft.declaredTotals.totalMatches} type="number"
            onChange={v => update((d, val) => { d.declaredTotals.totalMatches = setVal(d.declaredTotals.totalMatches, val) }, v)} />
        </div>
      </section>

      {/* ── Rules ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">Rules</h3>
        <div className="pb-form-grid">
          {Object.entries(draft.rules.structured).map(([key, field]) => (
            <RuleField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} field={field} />
          ))}
        </div>
        <details className="pb-import-raw-text">
          <summary>View original rules text as printed</summary>
          <pre>{draft.rules.rawText}</pre>
        </details>
      </section>

      {/* ── Groups / Teams ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">Groups &amp; Teams</h3>
        {draft.groups.map((g, gi) => (
          <div key={g.label} className="pb-import-group">
            <div className="pb-import-group-head">Group {g.label} — {g.teams.length} teams</div>
            {g.teams.map((team, ti) => {
              const rowIssues = issuesForPath(issues, `groups.${g.label}.teams.${team.code}`)
              return (
                <div key={team.code} className={`pb-import-team-row ${rowIssues.some(i => i.level === 'error') ? 'pb-import-row--error' : rowIssues.length ? 'pb-import-row--warning' : ''}`}>
                  <span className="pb-tag">{team.code}</span>
                  <input
                    className="pb-input"
                    value={team.players.join(' & ')}
                    onChange={e => update((d) => {
                      d.groups[gi].teams[ti].players = e.target.value.split('&').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                  <button
                    className="pb-btn-ghost"
                    onClick={() => update((d) => { d.groups[gi].teams.splice(ti, 1) })}
                    title="Remove this team entry"
                  >Remove</button>
                </div>
              )
            })}
            <button
              className="pb-btn-ghost"
              onClick={() => update((d) => {
                const nextNum = d.groups[gi].teams.length + 1
                d.groups[gi].teams.push({ code: `${g.label}${nextNum}`, players: ['', ''] })
              })}
            >+ Add team to Group {g.label}</button>
          </div>
        ))}
      </section>

      {/* ── League schedule ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">League Schedule</h3>
        <p className="pb-import-section-hint">
          Rows at the same position within a time block are treated as concurrent across courts — a team or
          court appearing twice in the same block is flagged above.
        </p>
        <div className="pb-import-schedule-scroll">
          <table className="pb-import-schedule-table">
            <thead>
              <tr><th>Time</th><th>Court</th><th>Stage</th><th>Team 1</th><th>Team 2</th></tr>
            </thead>
            <tbody>
              {draft.schedule.map((row, i) => {
                const rowHasError = errors.some(e => e.path === `schedule[${i}].team1` || e.path === `schedule[${i}].team2`)
                return (
                  <tr key={i} className={rowHasError ? 'pb-import-row--error' : ''}>
                    <td>{val(row.timeSlot)}</td>
                    <td>
                      <input className="pb-input pb-import-cell-input" value={val(row.court)}
                        onChange={e => update((d) => { d.schedule[i].court = setVal(d.schedule[i].court, e.target.value) })} />
                    </td>
                    <td>{val(row.stage)}</td>
                    <td>
                      <input className="pb-input pb-import-cell-input" value={val(row.team1)}
                        onChange={e => update((d) => { d.schedule[i].team1 = setVal(d.schedule[i].team1, e.target.value) })} />
                    </td>
                    <td>
                      <input className="pb-input pb-import-cell-input" value={val(row.team2)}
                        onChange={e => update((d) => { d.schedule[i].team2 = setVal(d.schedule[i].team2, e.target.value) })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Knockout structure ── */}
      <section className="pb-card pb-import-section">
        <h3 className="pb-import-section-title">Knockout Structure</h3>
        <div className="pb-import-knockout-diagram">
          <span className="pb-tag">Groups {draft.groups.map(g => g.label).join('/')}</span>
          <span className="pb-import-knockout-arrow">↓</span>
          <span className="pb-tag">Quarterfinals</span>
          <span className="pb-import-knockout-arrow">↓</span>
          <span className="pb-tag">Semifinals</span>
          <span className="pb-import-knockout-arrow">↓</span>
          <span className="pb-tag">Final</span>
        </div>
        {draft.knockout.quarterfinals.map((qf, qi) => (
          <div key={qi} className="pb-import-qf-row">
            <span>QF {qi + 1}:</span>
            {['team1Ref', 'team2Ref'].map(key => (
              <span key={key} className="pb-import-qf-ref">
                Group
                <input className="pb-input pb-import-cell-input" style={{ width: 48 }} value={qf[key].group}
                  onChange={e => update((d) => { d.knockout.quarterfinals[qi][key].group = e.target.value })} />
                rank
                <input className="pb-input pb-import-cell-input" style={{ width: 48 }} type="number" value={qf[key].rank}
                  onChange={e => update((d) => { d.knockout.quarterfinals[qi][key].rank = Number(e.target.value) })} />
              </span>
            ))}
          </div>
        ))}
      </section>

      {createError && <div className="pb-error-list">{createError}</div>}

      <div className="pb-form-actions pb-import-final-actions">
        <button className="pb-btn-ghost" onClick={onBack} disabled={creating}>← Back</button>
        {warnings.length > 0 && errors.length === 0 && (
          <label className="pb-checkbox-row">
            <input type="checkbox" checked={warningsAcknowledged} onChange={e => setWarningsAcknowledged(e.target.checked)} />
            I reviewed the warnings and want to continue
          </label>
        )}
        <button className="pb-btn-primary" disabled={!canCreate || creating} onClick={onCreate}>
          {creating ? 'Creating…' : 'Create Tournament'}
        </button>
        {errors.length > 0 && <span className="pb-import-blocked-hint">Resolve all errors before creating this tournament.</span>}
      </div>
    </div>
  )
}
