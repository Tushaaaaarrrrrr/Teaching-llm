'use client'

import { useEffect, useRef, useState } from 'react'

export interface HeroSlide {
  image: string
  alt: string
  href: string
}

interface Props {
  slides: HeroSlide[]
  intervalMs?: number
}

export default function HomeHeroSlider({ slides, intervalMs = 4500 }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef(0)

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), intervalMs)
    return () => clearInterval(t)
  }, [paused, slides.length, intervalMs])

  if (slides.length === 0) return null

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
    setPaused(true)
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }
  function onTouchEnd() {
    const dx = touchDeltaX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0) setIndex(i => (i + 1) % slides.length)
      else setIndex(i => (i - 1 + slides.length) % slides.length)
    }
    touchStartX.current = null
    touchDeltaX.current = 0
    setTimeout(() => setPaused(false), 1500)
  }

  function handleSlideClick(href: string) {
    try {
      const w = window.open(href, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = href
    } catch {
      window.location.href = href
    }
  }

  return (
    <div
      style={{ marginBottom: '24px' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide viewport */}
      <div style={{
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 18px 36px -12px rgba(15, 23, 42, 0.25), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
        background: '#0f172a',
      }}>
        {/* Stacked slides — translateX based on index for smooth slide animation */}
        <div style={{
          display: 'flex',
          width: `${slides.length * 100}%`,
          height: '100%',
          transform: `translateX(-${index * (100 / slides.length)}%)`,
          transition: 'transform 0.45s cubic-bezier(0.65, 0, 0.35, 1)',
        }}>
          {slides.map((s, i) => (
            <button
              key={s.image}
              onClick={() => handleSlideClick(s.href)}
              aria-label={s.alt}
              style={{
                flex: `0 0 ${100 / slides.length}%`,
                position: 'relative',
                height: '100%',
                padding: 0, border: 'none', cursor: 'pointer',
                background: 'transparent',
                overflow: 'hidden',
              }}
            >
              <img
                src={s.image}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === index ? '24px' : '6px',
                height: '6px', borderRadius: '50px',
                background: i === index ? '#3636e8' : '#cbd5e1',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
