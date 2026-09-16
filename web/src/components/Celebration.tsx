import { useEffect, useImperativeHandle, useState, type CSSProperties, type Ref } from 'react'
import { HABIT_COLORS } from '../lib/colors.ts'

export interface ConfettiHandle {
  fire: () => void
}

/** So "ngau nhien" co dinh theo chi so — component van thuan, moi lan render giong nhau. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const PIECES = Array.from({ length: 36 }, (_, i) => ({
  left: pseudoRandom(i + 1) * 100,
  delay: pseudoRandom(i + 101) * 0.5,
  duration: 1.6 + pseudoRandom(i + 201) * 1.2,
  rotate: pseudoRandom(i + 301) * 360,
  drift: (pseudoRandom(i + 401) - 0.5) * 160,
  color: HABIT_COLORS[i % HABIT_COLORS.length].value,
  round: i % 3 === 0,
}))

/**
 * Phao giay roi khi tick xong thoi quen cuoi cung trong ngay.
 * Ban bang lenh: confettiRef.current.fire() — giong cach goi cao phan ung.
 */
export function Confetti({ ref }: { ref?: Ref<ConfettiHandle> }) {
  const [burst, setBurst] = useState<number | null>(null)

  useImperativeHandle(ref, () => ({ fire: () => setBurst((n) => (n ?? 0) + 1) }), [])

  // Roi xong thi go khoi DOM
  useEffect(() => {
    if (burst === null) return
    const timer = window.setTimeout(() => setBurst(null), 3200)
    return () => window.clearTimeout(timer)
  }, [burst])

  if (burst === null) return null

  return (
    <div className="confetti" aria-hidden="true" key={burst}>
      {PIECES.map((p, i) => (
        <i
          key={i}
          className={p.round ? 'is-round' : ''}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--r': `${p.rotate}deg`,
              '--dx': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Vong tien do trong the hero. */
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 92
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = total > 0 ? done / total : 0

  return (
    <div className="ring" role="img" aria-label={`Đã xong ${done} trên ${total} thói quen hôm nay`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span className="ring-label">
        <strong>{done}</strong>/{total}
      </span>
    </div>
  )
}
