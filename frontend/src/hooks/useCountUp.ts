import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  start?: number
  end: number
  duration?: number
  suffix?: string
}

export function useCountUp({ start = 0, end, duration = 2000, suffix = '' }: UseCountUpOptions) {
  const [count, setCount] = useState(start)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return

    const startTime = performance.now()
    const range = end - start

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(start + range * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [hasStarted, start, end, duration])

  return { ref, value: count, display: `${count.toLocaleString()}${suffix}` }
}
