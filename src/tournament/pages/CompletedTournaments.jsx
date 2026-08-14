import { useEffect, useState } from 'react'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { fetchCompletedTournaments } from '../services/completedTournaments.js'
import CompletedTournamentCard from '../components/CompletedTournamentCard.jsx'
import './CompletedTournaments.css'

export default function CompletedTournaments() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  usePageMeta({
    title: 'Completed Tournaments — Cloud Krida',
    description: 'Browse completed Chess and Pickleball tournaments on Cloud Krida and revisit their photo galleries.',
  })

  useEffect(() => {
    let cancelled = false
    fetchCompletedTournaments()
      .then(list => { if (!cancelled) setItems(list) })
      .catch(err => { if (!cancelled) { console.error('[Krida] fetchCompletedTournaments:', err); setError(err) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="ct-page">
      <div className="ct-bg-layer" aria-hidden="true">
        <div className="ct-orb ct-orb-a" />
        <div className="ct-orb ct-orb-b" />
        <div className="ct-vignette" />
      </div>

      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Tournament Management', path: '/tournaments' }, { label: 'Completed Tournaments' }]} />

      <section className="ct-hero">
        <span className="ct-eyebrow">TOURNAMENT ARCHIVE</span>
        <h1 className="ct-title">Completed Tournaments</h1>
        <p className="ct-subtitle">
          Every finished Cloud Krida tournament, with its photos and memories, all in one place.
        </p>
      </section>

      <section className="ct-content">
        {loading ? (
          <div className="ct-state" role="status" aria-live="polite">
            <div className="ct-spinner" />
            <div className="ct-state-sub">Loading completed tournaments…</div>
          </div>
        ) : error ? (
          <div className="ct-state" role="alert">
            <div className="ct-state-icon">⚠</div>
            <div className="ct-state-title">Couldn't load completed tournaments</div>
            <div className="ct-state-sub">Check your connection and refresh the page.</div>
          </div>
        ) : items.length === 0 ? (
          <div className="ct-state">
            <div className="ct-state-icon">🏆</div>
            <div className="ct-state-title">No completed tournaments yet</div>
            <div className="ct-state-sub">Finished tournaments will be showcased here once they wrap up.</div>
          </div>
        ) : (
          <div className="ct-grid">
            {items.map((item, i) => <CompletedTournamentCard key={item.id} item={item} index={i} />)}
          </div>
        )}
      </section>

      <GlobalFooter />
    </div>
  )
}
