import { useEffect } from 'react'

const DEFAULT_TITLE = 'Cloud Krida — Tournament Platform'
const DEFAULT_DESC  = 'Cloud Krida is a real-time tournament management platform for Chess, Tennis, and Darts. Create brackets, track live scores, and run competitions — no setup overhead required.'

function setMetaContent(selector, content) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute('content', content)
}

export function usePageMeta({ title, description }) {
  useEffect(() => {
    document.title = title
    setMetaContent('meta[name="description"]',        description)
    setMetaContent('meta[property="og:title"]',       title)
    setMetaContent('meta[property="og:description"]', description)
    setMetaContent('meta[name="twitter:title"]',      title)
    setMetaContent('meta[name="twitter:description"]',description)

    return () => {
      document.title = DEFAULT_TITLE
      setMetaContent('meta[name="description"]',        DEFAULT_DESC)
      setMetaContent('meta[property="og:title"]',       DEFAULT_TITLE)
      setMetaContent('meta[property="og:description"]', DEFAULT_DESC)
      setMetaContent('meta[name="twitter:title"]',      DEFAULT_TITLE)
      setMetaContent('meta[name="twitter:description"]',DEFAULT_DESC)
    }
  }, [title, description])
}
