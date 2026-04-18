'use client'
import React, { useRef, useEffect } from 'react'

export default function Globe({ style = 'holographic', motion: motionLevel = 'medium', size = 720 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const R = size * 0.36

    // Generate dense continent hotspots from ellipse-shaped blobs
    const hotspots = []
    const rng = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
    const r = rng(1337)
    const continents = [
      { cx: -100, cy: 48,  rx: 30, ry: 20, n: 320 },
      { cx: -88,  cy: 20,  rx: 10, ry: 10, n: 60 },
      { cx: -60,  cy: -15, rx: 14, ry: 26, n: 240 },
      { cx: 12,   cy: 52,  rx: 20, ry: 12, n: 160 },
      { cx: 18,   cy: 2,   rx: 18, ry: 28, n: 320 },
      { cx: 90,   cy: 48,  rx: 42, ry: 20, n: 420 },
      { cx: 78,   cy: 22,  rx: 10, ry: 14, n: 100 },
      { cx: 108,  cy: 5,   rx: 14, ry: 10, n: 80 },
      { cx: 135,  cy: -25, rx: 15, ry: 10, n: 140 },
      { cx: -40,  cy: 72,  rx: 12, ry: 8,  n: 50 },
      { cx: 18,   cy: 65,  rx: 12, ry: 7,  n: 60 },
      { cx: 138,  cy: 36,  rx: 4,  ry: 8,  n: 30 },
      { cx: 47,   cy: -20, rx: 3,  ry: 6,  n: 20 },
      { cx: 175,  cy: -42, rx: 5,  ry: 6,  n: 25 },
    ]
    continents.forEach(c => {
      let placed = 0, att = 0
      while (placed < c.n && att < c.n * 4) {
        att++
        const dx = (r() - 0.5) * 2 * c.rx
        const dy = (r() - 0.5) * 2 * c.ry
        if ((dx / c.rx) ** 2 + (dy / c.ry) ** 2 <= 1) {
          hotspots.push({ lat: c.cy + dy, lon: c.cx + dx })
          placed++
        }
      }
    })

    // Sonar pulses & data arcs
    const pulses = []
    const arcs = []
    const spawnArc = () => {
      const a = hotspots[Math.floor(Math.random() * hotspots.length)]
      const b = hotspots[Math.floor(Math.random() * hotspots.length)]
      if (a === b) return
      arcs.push({ a, b, t: 0, life: 2.2 })
    }
    const arcTimer = setInterval(spawnArc, motionLevel === 'subtle' ? 2000 : motionLevel === 'cinematic' ? 500 : 900)
    spawnArc(); spawnArc()

    const spawnPulse = () => {
      const h = hotspots[Math.floor(Math.random() * hotspots.length)]
      pulses.push({ lat: h.lat, lon: h.lon, t: 0, life: 1.8 })
    }
    const pulseInterval = motionLevel === 'subtle' ? 2200 : motionLevel === 'cinematic' ? 600 : 1100
    const pulseTimer = setInterval(spawnPulse, pulseInterval)
    spawnPulse()

    const tilt = -0.35
    const sinT = Math.sin(tilt), cosT = Math.cos(tilt)

    const project = (lat, lon, rotLon) => {
      const phi = (lat * Math.PI) / 180
      const theta = ((lon + rotLon) * Math.PI) / 180
      let x = Math.cos(phi) * Math.sin(theta)
      let y = -Math.sin(phi)
      let z = Math.cos(phi) * Math.cos(theta)
      const y2 = y * cosT - z * sinT
      const z2 = y * sinT + z * cosT
      return { x: cx + x * R, y: cy + y2 * R, z: z2 }
    }

    let t0 = performance.now()
    let lastT = t0

    const draw = (now) => {
      const dt = (now - lastT) / 1000
      lastT = now
      const rotSpeed = motionLevel === 'subtle' ? 3 : motionLevel === 'cinematic' ? 10 : 6
      const rotLon = ((now - t0) / 1000) * rotSpeed

      ctx.clearRect(0, 0, size, size)

      // Atmosphere glow
      const atmos = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.6)
      atmos.addColorStop(0, 'rgba(90, 210, 240, 0.28)')
      atmos.addColorStop(0.3, 'rgba(70, 180, 220, 0.12)')
      atmos.addColorStop(1, 'rgba(70, 200, 230, 0)')
      ctx.fillStyle = atmos
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2)
      ctx.fill()

      // Deep ocean base (matches page bg #0a1621)
      ctx.fillStyle = '#0a1621'
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      // Ocean gradient
      const ocean = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.05, cx, cy, R * 1.05)
      ocean.addColorStop(0, 'rgba(70, 170, 205, 0.5)')
      ocean.addColorStop(0.35, 'rgba(20, 80, 115, 0.4)')
      ocean.addColorStop(0.75, 'rgba(4, 20, 36, 0.1)')
      ocean.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = ocean
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()

      // Lat/lon grid
      if (style === 'wireframe' || style === 'holographic') {
        ctx.strokeStyle = style === 'holographic' ? 'rgba(130, 230, 250, 0.3)' : 'rgba(100, 200, 225, 0.22)'
        ctx.lineWidth = 1
        for (let lat = -75; lat <= 75; lat += 15) {
          ctx.beginPath()
          let started = false
          for (let lon = 0; lon <= 360; lon += 4) {
            const p = project(lat, lon, rotLon)
            if (p.z > -0.02) {
              if (!started) { ctx.moveTo(p.x, p.y); started = true }
              else ctx.lineTo(p.x, p.y)
            } else started = false
          }
          ctx.stroke()
        }
        for (let lon = 0; lon < 360; lon += 20) {
          ctx.beginPath()
          let started = false
          for (let lat = -90; lat <= 90; lat += 4) {
            const p = project(lat, lon, rotLon)
            if (p.z > -0.02) {
              if (!started) { ctx.moveTo(p.x, p.y); started = true }
              else ctx.lineTo(p.x, p.y)
            } else started = false
          }
          ctx.stroke()
        }
      }

      // Continent dots
      hotspots.forEach(h => {
        const p = project(h.lat, h.lon, rotLon)
        if (p.z > 0.02) {
          const lx = (p.x - cx) / R
          const ly = (p.y - cy) / R
          const lit = Math.max(0.28, 1 - (lx * 0.45 + ly * 0.45 + 0.25))
          const alpha = Math.min(1, (0.45 + p.z * 0.55) * lit)
          const rad = style === 'dotted' ? 2.0 : 1.7
          const hue = style === 'holographic' ? '160, 245, 255' : '130, 230, 250'
          ctx.fillStyle = `rgba(${hue}, ${alpha})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Terminator shadow
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      const shadow = ctx.createRadialGradient(cx + R * 0.4, cy + R * 0.45, R * 0.1, cx + R * 0.35, cy + R * 0.4, R * 1.15)
      shadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
      shadow.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)')
      shadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = shadow
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()

      // Holographic scanline
      if (style === 'holographic') {
        const scanY = cy - R + ((now / 25) % (R * 2))
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.clip()
        const scan = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10)
        scan.addColorStop(0, 'rgba(140, 245, 255, 0)')
        scan.addColorStop(0.5, 'rgba(140, 245, 255, 0.4)')
        scan.addColorStop(1, 'rgba(140, 245, 255, 0)')
        ctx.fillStyle = scan
        ctx.fillRect(cx - R, scanY - 10, R * 2, 20)
        ctx.restore()
      }

      // Data arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const ar = arcs[i]
        ar.t += dt
        if (ar.t > ar.life) { arcs.splice(i, 1); continue }
        const k = ar.t / ar.life
        const pa = project(ar.a.lat, ar.a.lon, rotLon)
        const pb = project(ar.b.lat, ar.b.lon, rotLon)
        if (pa.z < -0.2 && pb.z < -0.2) continue
        const mx = (pa.x + pb.x) / 2
        const my = (pa.y + pb.y) / 2
        const ddx = pb.x - pa.x, ddy = pb.y - pa.y
        const dist = Math.sqrt(ddx * ddx + ddy * ddy)
        const lift = Math.min(R * 0.6, dist * 0.35)
        const mcx = mx - cx, mcy = my - cy
        const mlen = Math.sqrt(mcx * mcx + mcy * mcy) || 1
        const cx2 = mx + (mcx / mlen) * lift
        const cy2 = my + (mcy / mlen) * lift
        const drawK = Math.min(1, k * 2)
        const fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2
        ctx.strokeStyle = `rgba(160, 240, 255, ${0.55 * fade})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        const steps = 30
        for (let s = 1; s <= steps * drawK; s++) {
          const u = s / steps
          const x = (1 - u) * (1 - u) * pa.x + 2 * (1 - u) * u * cx2 + u * u * pb.x
          const y = (1 - u) * (1 - u) * pa.y + 2 * (1 - u) * u * cy2 + u * u * pb.y
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        if (pa.z > 0) {
          ctx.fillStyle = `rgba(200, 250, 255, ${fade})`
          ctx.beginPath(); ctx.arc(pa.x, pa.y, 2, 0, Math.PI * 2); ctx.fill()
        }
        if (pb.z > 0 && drawK >= 1) {
          ctx.fillStyle = `rgba(200, 250, 255, ${fade})`
          ctx.beginPath(); ctx.arc(pb.x, pb.y, 2.5, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Sonar pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i]
        pu.t += dt
        if (pu.t > pu.life) { pulses.splice(i, 1); continue }
        const p = project(pu.lat, pu.lon, rotLon)
        if (p.z > 0) {
          const k = pu.t / pu.life
          ctx.strokeStyle = `rgba(160, 245, 255, ${(1 - k) * 0.95})`
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3 + k * 32, 0, Math.PI * 2)
          ctx.stroke()
          if (k < 0.35) {
            ctx.fillStyle = `rgba(200, 252, 255, ${1 - k * 2.8})`
            ctx.beginPath()
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Fresnel rim
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      const rim = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.01)
      rim.addColorStop(0, 'rgba(140, 235, 255, 0)')
      rim.addColorStop(0.75, 'rgba(140, 235, 255, 0.25)')
      rim.addColorStop(1, 'rgba(195, 250, 255, 0.7)')
      ctx.fillStyle = rim
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()

      // Outer rings
      ctx.strokeStyle = 'rgba(195, 250, 255, 0.6)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(125, 230, 245, 0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, R + 14, 0, Math.PI * 2)
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(pulseTimer)
      clearInterval(arcTimer)
    }
  }, [style, motionLevel, size])

  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block' }} />
}
