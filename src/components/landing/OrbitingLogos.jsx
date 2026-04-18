'use client'
import React, { useState, useEffect } from 'react'
import { COINS } from './CryptoIcons'

export default function OrbitingLogos({ size = 720, motion: motionLevel = 'medium' }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let raf
    const loop = (t) => {
      setTick(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const speedMult = motionLevel === 'subtle' ? 0.4 : motionLevel === 'cinematic' ? 1.6 : 1
  const cx = size / 2
  const cy = size / 2

  const rings = [
    { rx: size * 0.48, ry: size * 0.12, tilt: -18, speed: 0.08, coins: [COINS[0], COINS[2]] },
    { rx: size * 0.58, ry: size * 0.15, tilt: 22,  speed: -0.06, coins: [COINS[1], COINS[4]] },
    { rx: size * 0.68, ry: size * 0.18, tilt: -8,  speed: 0.05, coins: [COINS[3], COINS[5]] },
  ]

  const placements = []
  rings.forEach((ring) => {
    ring.coins.forEach((coin, i) => {
      const phase = (i / ring.coins.length) * Math.PI * 2
      const angle = phase + (tick / 1000) * ring.speed * speedMult * Math.PI
      const rad = (ring.tilt * Math.PI) / 180
      const ex = Math.cos(angle) * ring.rx
      const ey = Math.sin(angle) * ring.ry
      const x = ex * Math.cos(rad) - ey * Math.sin(rad)
      const y = ex * Math.sin(rad) + ey * Math.cos(rad)
      const z = Math.sin(angle)
      placements.push({ x: cx + x, y: cy + y, z, coin })
    })
  })

  placements.sort((a, b) => a.z - b.z)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {rings.map((ring, i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            stroke="rgba(120, 220, 240, 0.14)"
            strokeWidth="1"
            strokeDasharray="2 4"
            transform={`rotate(${ring.tilt} ${cx} ${cy})`}
          />
        ))}
      </svg>
      {placements.map((p, i) => {
        const scale = 0.7 + (p.z + 1) * 0.25
        const opacity = 0.55 + (p.z + 1) * 0.22
        const Icon = p.coin.Icon
        const iconSize = Math.round(44 * scale)
        return (
          <div
            key={p.coin.id + '-' + i}
            style={{
              position: 'absolute',
              left: p.x - iconSize / 2,
              top: p.y - iconSize / 2,
              opacity,
              color: '#7FE3F5',
              filter: `drop-shadow(0 0 10px rgba(100, 220, 245, ${0.2 + p.z * 0.3}))`,
              transition: 'none',
            }}
          >
            <Icon size={iconSize} />
          </div>
        )
      })}
    </div>
  )
}
