import { useEffect, useState } from 'react'

function format(seconds: number) {
  if (seconds <= 0) return 'Ended'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${h}h left`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CountdownTimer({ secondsRemaining, className }: { secondsRemaining: number | null; className?: string }) {
  const [remaining, setRemaining] = useState(secondsRemaining ?? 0)

  useEffect(() => {
    setRemaining(secondsRemaining ?? 0)
  }, [secondsRemaining])

  useEffect(() => {
    if (secondsRemaining == null) return
    const id = setInterval(() => setRemaining((r) => Math.max(r - 1, 0)), 1000)
    return () => clearInterval(id)
  }, [secondsRemaining])

  if (secondsRemaining == null) return null
  const urgent = remaining < 3600
  return (
    <span className={`${className ?? ''} ${urgent ? 'text-marigold-dark' : 'text-ink-soft'} font-medium`}>
      {remaining < 86400 ? `Ends in ${format(remaining)}` : format(remaining)}
    </span>
  )
}
