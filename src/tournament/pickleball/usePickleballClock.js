import { useEffect, useState } from 'react'

// The one ticking interval behind every timing status badge and countdown —
// each consumer takes `nowMs` as a value rather than running its own
// setInterval, so a page with several countdowns on it (dashboard banner +
// several list cards) still only has one timer running.
export function usePickleballClock(intervalMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return nowMs
}
