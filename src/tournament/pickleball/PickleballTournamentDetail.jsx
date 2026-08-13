import { useState, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { usePickleball } from './PickleballContext.jsx'
import { computePickleballStandings } from './pickleballStandings.js'
import PickleballEntrantsTab from './PickleballEntrantsTab.jsx'
import PickleballPoolsTab from './PickleballPoolsTab.jsx'
import PickleballBracketTab from './PickleballBracketTab.jsx'
import PickleballScheduleTab from './PickleballScheduleTab.jsx'
import PickleballGalleryView from './PickleballGalleryView.jsx'
import PickleballTournamentForm from './PickleballTournamentForm.jsx'
import {
  STATUS_LABELS, EVENT_TYPE_LABELS, FORMAT_LABELS,
  formatGames, entrantLabel, formatDate,
} from './pickleballDisplay.js'

const READ_ONLY_TABS = [
  { id: 'pools',     label: 'Pools' },
  { id: 'bracket',   label: 'Bracket' },
  { id: 'schedule',  label: 'Schedule' },
  { id: 'standings', label: 'Standings' },
  { id: 'history',   label: 'History' },
  { id: 'gallery',   label: 'Gallery' },
]

function EmptyTab({ icon, title, sub }) {
  return (
    <div className="pb-state">
      <div className="pb-state-icon">{icon}</div>
      <div className="pb-state-title">{title}</div>
      <div className="pb-state-sub">{sub}</div>
    </div>
  )
}

export default function PickleballTournamentDetail({ tournamentId, onBack }) {
  const { activeTournament, detailLoading, updateTournament } = usePickleball()
  const { isSuperAdmin, canUploadPhotos, canDeletePhotos, userId, role } = useAuth()
  const [tab, setTab] = useState('pools')
  const [editing, setEditing] = useState(false)

  const TABS = isSuperAdmin ? [{ id: 'entrants', label: 'Entrants' }, ...READ_ONLY_TABS] : READ_ONLY_TABS

  const isHydrated = !!(activeTournament?.entrants || activeTournament?.matches)

  const standings = useMemo(() => {
    if (!isHydrated) return []
    return computePickleballStandings(activeTournament.entrants, activeTournament.matches)
  }, [isHydrated, activeTournament])

  if (!activeTournament) {
    return (
      <div className="pb-section pb-container">
        <button className="pb-back" onClick={onBack}>← Back to Tournaments</button>
        <div className="pb-state" role="status" aria-live="polite">
          <div className="pb-spinner" />
          <div className="pb-state-sub">Loading tournament…</div>
        </div>
      </div>
    )
  }

  const t = activeTournament
  const entrants = t.entrants ?? []
  const matches  = t.matches ?? []

  const historyMatches = matches
    .filter(m => m.status === 'complete' || m.status === 'bye')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  return (
    <>
      <div className="pb-detail-header pb-container">
        <button className="pb-back" onClick={onBack}>← Back to Tournaments</button>
        <div className="pb-detail-title-row">
          <div>
            <div className="pb-detail-title">{t.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {EVENT_TYPE_LABELS[t.eventType] ?? t.eventType} · {FORMAT_LABELS[t.format] ?? t.format}
              {t.skillDivision ? ` · ${t.skillDivision}` : ''}
              {t.ageBand ? ` · ${t.ageBand}` : ''}
              {t.location ? ` · ${t.location}` : ''}
              {t.date ? ` · ${formatDate(new Date(t.date).getTime())}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`pb-status pb-status--${t.status}`}>{STATUS_LABELS[t.status] ?? t.status}</span>
            {isSuperAdmin && !editing && (
              <button className="pb-btn-small pb-btn-small--ghost" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
        </div>

        {!editing && (
          <div className="pb-tabs" role="tablist" aria-label="Tournament sections">
            {TABS.map(tb => (
              <button
                key={tb.id}
                role="tab"
                aria-selected={tab === tb.id}
                className={`pb-tab ${tab === tb.id ? 'pb-tab--active' : ''}`}
                onClick={() => setTab(tb.id)}
              >
                {tb.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pb-section pb-container">
        {editing ? (
          <PickleballTournamentForm
            initial={t}
            onSubmit={async (data) => { await updateTournament(t.id, data); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
        <div className="pb-tab-panel" role="tabpanel">
          {detailLoading && !isHydrated ? (
            <div className="pb-state" role="status" aria-live="polite">
              <div className="pb-spinner" />
              <div className="pb-state-sub">Loading tournament details…</div>
            </div>
          ) : (
            <>
              {tab === 'entrants' && isSuperAdmin && (
                <PickleballEntrantsTab tournament={t} />
              )}

              {tab === 'pools' && <PickleballPoolsTab tournament={t} />}

              {tab === 'bracket' && <PickleballBracketTab tournament={t} />}

              {tab === 'schedule' && <PickleballScheduleTab tournament={t} />}

              {tab === 'standings' && (
                standings.length === 0 ? (
                  <EmptyTab icon="📊" title="No standings yet" sub="Standings will appear once matches have been played." />
                ) : (
                  <div className="pb-table-wrap">
                    <table className="pb-table">
                      <thead>
                        <tr>
                          <th>Entrant</th>
                          <th>W</th>
                          <th>L</th>
                          <th>Games</th>
                          <th>Pt Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map(s => (
                          <tr key={s.id}>
                            <td>{s.displayName}{s.status === 'withdrawn' ? ' (withdrawn)' : ''}</td>
                            <td>{s.wins}</td>
                            <td>{s.losses}</td>
                            <td>{s.gamesWon}-{s.gamesLost}</td>
                            <td>{s.pointsFor - s.pointsAgainst > 0 ? '+' : ''}{s.pointsFor - s.pointsAgainst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {tab === 'history' && (
                historyMatches.length === 0 ? (
                  <EmptyTab icon="🕘" title="No completed matches yet" sub="Finished matches will appear here as the tournament progresses." />
                ) : (
                  historyMatches.map(m => (
                    <div className="pb-history-row" key={m.id}>
                      <span>{entrantLabel(m.entrant1)} vs {entrantLabel(m.entrant2)}</span>
                      <span className="pb-history-games">{m.status === 'bye' ? 'BYE' : formatGames(m.games)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(m.completedAt)}</span>
                    </div>
                  ))
                )
              )}

              {tab === 'gallery' && (
                <PickleballGalleryView
                  tournament={t}
                  canUpload={canUploadPhotos}
                  canDelete={canDeletePhotos}
                  currentUserId={userId}
                  currentUserRole={role}
                />
              )}
            </>
          )}
        </div>
        )}

        {!editing && entrants.length > 0 && (
          <div style={{ marginTop: 40, fontSize: 12, color: 'var(--text-muted)' }}>
            {entrants.length} entrant{entrants.length !== 1 ? 's' : ''} registered
          </div>
        )}
      </div>
    </>
  )
}
