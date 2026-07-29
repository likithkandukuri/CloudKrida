import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL      = 'https://cloudkrida.com'
const DEFAULT_TITLE = 'Cloud Krida — Tournament Platform'
const DEFAULT_DESC  = 'Cloud Krida is a real-time tournament management platform for Chess, Tennis, and Darts. Create brackets, track live scores, and run competitions — no setup overhead required.'
const DEFAULT_URL   = SITE_URL

function setMetaContent(selector, content) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute('content', content)
}

function setCanonical(href) {
  const el = document.querySelector('link[rel="canonical"]')
  if (el) el.setAttribute('href', href)
}

// Every route gets its own canonical/og:url instead of the hardcoded homepage URL —
// pathname-only (no query/hash), matching standard canonical-URL convention.
function urlForPathname(pathname) {
  return pathname === '/' ? SITE_URL : `${SITE_URL}${pathname}`
}

export function usePageMeta({ title, description }) {
  const location = useLocation()

  useEffect(() => {
    const url = urlForPathname(location.pathname)
    document.title = title
    setMetaContent('meta[name="description"]',        description)
    setMetaContent('meta[property="og:title"]',       title)
    setMetaContent('meta[property="og:description"]', description)
    setMetaContent('meta[property="og:url"]',         url)
    setMetaContent('meta[name="twitter:title"]',      title)
    setMetaContent('meta[name="twitter:description"]',description)
    setCanonical(url)

    return () => {
      document.title = DEFAULT_TITLE
      setMetaContent('meta[name="description"]',        DEFAULT_DESC)
      setMetaContent('meta[property="og:title"]',       DEFAULT_TITLE)
      setMetaContent('meta[property="og:description"]', DEFAULT_DESC)
      setMetaContent('meta[property="og:url"]',         DEFAULT_URL)
      setMetaContent('meta[name="twitter:title"]',      DEFAULT_TITLE)
      setMetaContent('meta[name="twitter:description"]',DEFAULT_DESC)
      setCanonical(DEFAULT_URL)
    }
  }, [title, description, location.pathname])
}
