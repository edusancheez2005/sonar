'use client'
import React, { useRef, useEffect } from 'react'

export default function GlobeBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set default tweaks
    window.__SONAR_TWEAKS = { globeSize: 102, signalDensity: 169, tokens: true, hud: false, sweep: false }
    window.__SONAR_COLORS = { primary: '#22d3ee', secondary: '#67e8f9', accent: '#4ade80' }

    const ctx = canvas.getContext('2d')
    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2)
    let rafId = 0

    function resize() {
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * DPR
      canvas.height = H * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    window.addEventListener('resize', resize)
    resize()

    // Land mask bands
    const LAND_BANDS = [
      [72, [[-60,-20],[30,90],[100,170]]],
      [64, [[-150,-60],[-50,-10],[10,180]]],
      [56, [[-140,-55],[-10,60],[70,180]]],
      [48, [[-130,-60],[-10,45],[60,145]]],
      [40, [[-125,-72],[-10,50],[70,140]]],
      [32, [[-118,-80],[-10,55],[70,130],[130,145]]],
      [24, [[-110,-95],[-85,-70],[-18,50],[60,90],[100,130]]],
      [16, [[-105,-88],[-75,-60],[-18,52],[70,100],[120,128]]],
      [8,  [[-90,-75],[-78,-50],[-15,48],[95,125]]],
      [0,  [[-80,-50],[10,42],[100,120],[130,150]]],
      [-8, [[-78,-38],[10,40],[105,118],[130,150]]],
      [-16,[[-75,-38],[12,38],[115,145]]],
      [-24,[[-70,-40],[14,36],[115,150]]],
      [-32,[[-72,-55],[16,32],[115,152]]],
      [-40,[[-74,-62],[18,28],[140,150],[165,178]]],
      [-48,[[-75,-70]]],
      [-56,[]],
      [-64,[]],
      [-72,[[-120,120]]],
      [-80,[[-180,180]]],
    ]
    function isLand(lat, lon) {
      let best = LAND_BANDS[0], bd = Infinity
      for (const b of LAND_BANDS) {
        const d = Math.abs(b[0] - lat)
        if (d < bd) { bd = d; best = b }
      }
      for (const [a,b] of best[1]) {
        if (lon >= a && lon <= b) return true
      }
      return false
    }

    const LAND_PTS = []
    for (let lat = -80; lat <= 80; lat += 4) {
      const step = Math.max(4, 4 / Math.cos(lat * Math.PI/180))
      for (let lon = -180; lon <= 180; lon += step) {
        if (isLand(lat, lon)) LAND_PTS.push([lat, lon])
      }
    }

    const CITIES = [
      { name:'NYC', lat:40.7, lon:-74.0 },
      { name:'SF',  lat:37.8, lon:-122.4 },
      { name:'LDN', lat:51.5, lon:-0.1 },
      { name:'SGP', lat:1.3,  lon:103.8 },
      { name:'TKY', lat:35.7, lon:139.7 },
      { name:'HK',  lat:22.3, lon:114.2 },
      { name:'DXB', lat:25.2, lon:55.3 },
      { name:'BER', lat:52.5, lon:13.4 },
      { name:'SEO', lat:37.6, lon:126.9 },
      { name:'SAO', lat:-23.5,lon:-46.6 },
      { name:'SYD', lat:-33.9,lon:151.2 },
      { name:'MUM', lat:19.1, lon:72.9 },
    ]

    const TOKENS = [
      { sym:'₿',  name:'BTC',  color:'#f7931a' },
      { sym:'Ξ',  name:'ETH',  color:'#8a92b2' },
      { sym:'◎',  name:'SOL',  color:'#14f195' },
      { sym:'₮',  name:'USDT', color:'#26a17b' },
      { sym:'◆',  name:'BNB',  color:'#f0b90b' },
      { sym:'✕',  name:'XRP',  color:'#cfd8dc' },
      { sym:'₳',  name:'ADA',  color:'#3cc8c8' },
      { sym:'Ð',  name:'DOGE', color:'#c3a634' },
      { sym:'▲',  name:'AVAX', color:'#e84142' },
      { sym:'●',  name:'DOT',  color:'#e6007a' },
    ]

    const orbits = TOKENS.map((t, i) => ({
      token: t,
      rFactor: 1.08 + (i % 3) * 0.14 + Math.random()*0.05,
      speed: 0.06 + Math.random()*0.05,
      phase: Math.random() * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 0.9,
      yaw: Math.random() * Math.PI * 2,
    }))

    function project(lat, lon, rotY, cx, cy, R) {
      const phi = lat * Math.PI/180
      const lam = lon * Math.PI/180 + rotY
      const x = Math.cos(phi) * Math.sin(lam)
      const y = Math.sin(phi)
      const z = Math.cos(phi) * Math.cos(lam)
      const tilt = -0.35
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt)
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt)
      return { x: cx + x * R, y: cy - y2 * R, z: z2 }
    }

    const arcs = []
    function spawnArc() {
      const a = CITIES[Math.floor(Math.random()*CITIES.length)]
      let b = CITIES[Math.floor(Math.random()*CITIES.length)]
      if (b === a) b = CITIES[(CITIES.indexOf(a)+1) % CITIES.length]
      arcs.push({ a, b, t: 0, dur: 1800 + Math.random()*1200, born: performance.now() })
    }

    const pings = []
    function spawnPing() {
      const c = CITIES[Math.floor(Math.random()*CITIES.length)]
      pings.push({ c, born: performance.now(), dur: 1400 })
    }

    let lastArc = 0, lastPing = 0

    function toVec(lat, lon) {
      const phi = lat * Math.PI/180, lam = lon * Math.PI/180
      return { x: Math.cos(phi)*Math.sin(lam), y: Math.sin(phi), z: Math.cos(phi)*Math.cos(lam) }
    }

    function arcPoint(a, b, t, rotY, cx, cy, R, lift = 0.25) {
      const pa = toVec(a.lat, a.lon), pb = toVec(b.lat, b.lon)
      const dot = pa.x*pb.x + pa.y*pb.y + pa.z*pb.z
      const omega = Math.acos(Math.max(-1, Math.min(1, dot)))
      const sinO = Math.sin(omega) || 1
      const w1 = Math.sin((1-t)*omega)/sinO, w2 = Math.sin(t*omega)/sinO
      let x = pa.x*w1 + pb.x*w2, y = pa.y*w1 + pb.y*w2, z = pa.z*w1 + pb.z*w2
      const lifted = 1 + lift * Math.sin(t * Math.PI)
      x *= lifted; y *= lifted; z *= lifted
      const lam = Math.atan2(x, z) + rotY
      const rad = Math.sqrt(x*x + z*z)
      const xr = Math.sin(lam) * rad, zr = Math.cos(lam) * rad
      const tiltA = -0.35
      const yr = y * Math.cos(tiltA) - zr * Math.sin(tiltA)
      const zr2 = y * Math.sin(tiltA) + zr * Math.cos(tiltA)
      return { x: cx + xr * R, y: cy - yr * R, z: zr2 }
    }

    function hexToRgba(hex, a) {
      const h = hex.replace('#',''), n = parseInt(h, 16)
      return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`
    }
    function hexToRgb(hex) {
      const h = hex.replace('#',''), n = parseInt(h, 16)
      return `${(n>>16)&255}, ${(n>>8)&255}, ${n&255}`
    }

    const START = performance.now()

    function frame(now) {
      const t = (now - START) / 1000
      ctx.clearRect(0, 0, W, H)
      const TW = window.__SONAR_TWEAKS || {}
      const sizeMult = (TW.globeSize || 100) / 100
      const sigMult = (TW.signalDensity != null ? TW.signalDensity : 100) / 100
      const cx = W * 0.5, cy = H * 0.5
      const R = Math.min(W, H) * 0.38 * sizeMult
      const rotY = t * 0.08
      const pr = '34, 211, 238', sr = '103, 232, 249', ar = '74, 222, 128'

      // Backdrop glow
      const grad = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R*1.6)
      grad.addColorStop(0, `rgba(${pr}, 0.08)`)
      grad.addColorStop(0.5, `rgba(${pr}, 0.03)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      drawGraticule(rotY, cx, cy, R, false, pr)
      drawLand(rotY, cx, cy, R, false, sr)
      if (TW.tokens !== false) drawTokens(t, cx, cy, R, false)
      drawGraticule(rotY, cx, cy, R, true, pr)
      drawLand(rotY, cx, cy, R, true, sr)

      if (sigMult > 0) {
        const arcInterval = 600 / Math.max(0.1, sigMult)
        const pingInterval = 900 / Math.max(0.1, sigMult)
        if (now - lastArc > arcInterval) { spawnArc(); lastArc = now }
        if (now - lastPing > pingInterval) { spawnPing(); lastPing = now }
      }

      drawArcs(now, rotY, cx, cy, R, sr)
      drawPings(now, rotY, cx, cy, R, ar)
      if (TW.tokens !== false) drawTokens(t, cx, cy, R, true)
      if (TW.sweep !== false) drawSweep(t, cx, cy, R, pr)

      rafId = requestAnimationFrame(frame)
    }

    function drawGraticule(rotY, cx, cy, R, front, pr) {
      ctx.lineWidth = 1
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath(); let started = false
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lat, lon, rotY, cx, cy, R)
          if ((p.z > 0) !== front) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = front ? `rgba(${pr}, 0.12)` : `rgba(${pr}, 0.05)`
        ctx.stroke()
      }
      for (let lon = -180; lon < 180; lon += 20) {
        ctx.beginPath(); let started = false
        for (let lat = -80; lat <= 80; lat += 4) {
          const p = project(lat, lon, rotY, cx, cy, R)
          if ((p.z > 0) !== front) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = front ? `rgba(${pr}, 0.10)` : `rgba(${pr}, 0.04)`
        ctx.stroke()
      }
      if (front) {
        ctx.beginPath(); let started = false
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = project(0, lon, rotY, cx, cy, R)
          if (p.z <= 0) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = `rgba(${pr}, 0.25)`; ctx.stroke()
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(${pr}, 0.22)`; ctx.stroke()
      }
    }

    function drawLand(rotY, cx, cy, R, front, sr) {
      for (const [lat, lon] of LAND_PTS) {
        const p = project(lat, lon, rotY, cx, cy, R)
        if ((p.z > 0) !== front) continue
        const alpha = front ? (0.35 + p.z * 0.45) : (0.10 + (p.z + 1) * 0.05)
        const size = front ? (1.2 + p.z * 0.8) : 0.9
        ctx.fillStyle = `rgba(${sr}, ${alpha})`
        ctx.fillRect(p.x - size/2, p.y - size/2, size, size)
      }
    }

    function drawTokens(t, cx, cy, R, front) {
      for (const o of orbits) {
        const ang = t * o.speed + o.phase
        const r = R * o.rFactor
        let x = Math.cos(ang) * r, y = Math.sin(ang) * r * Math.cos(o.tilt), z = Math.sin(ang) * r * Math.sin(o.tilt)
        const xr = x * Math.cos(o.yaw) + z * Math.sin(o.yaw)
        const zr = -x * Math.sin(o.yaw) + z * Math.cos(o.yaw)
        if ((zr > 0) !== front) continue
        const px = cx + xr, py = cy + y * 0.6
        const scale = 1 + (zr / r) * 0.3
        const alpha = front ? 0.9 : 0.25
        const size = 22 * scale
        ctx.save(); ctx.globalAlpha = alpha
        const halo = ctx.createRadialGradient(px, py, 0, px, py, size*1.6)
        halo.addColorStop(0, hexToRgba(o.token.color, 0.35))
        halo.addColorStop(1, hexToRgba(o.token.color, 0))
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px, py, size*1.6, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = 'rgba(10, 20, 32, 0.85)'; ctx.beginPath(); ctx.arc(px, py, size*0.75, 0, Math.PI*2); ctx.fill()
        ctx.strokeStyle = hexToRgba(o.token.color, 0.65); ctx.lineWidth = 1.2; ctx.stroke()
        ctx.fillStyle = o.token.color
        ctx.font = `600 ${Math.round(size*0.85)}px ui-monospace, Menlo, monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.token.sym, px, py + 1)
        if (front && scale > 0.95) {
          ctx.fillStyle = 'rgba(165, 243, 252, 0.55)'
          ctx.font = '500 10px ui-monospace, Menlo, monospace'
          ctx.fillText(o.token.name, px, py + size*0.95 + 6)
        }
        ctx.restore()
      }
    }

    function drawArcs(now, rotY, cx, cy, R, sr) {
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i]; const age = now - a.born; const tt = age / a.dur
        if (tt >= 1) { arcs.splice(i, 1); continue }
        ctx.lineWidth = 1.2; ctx.beginPath(); let moved = false
        for (let s = 0; s <= 40; s++) {
          const u = s / 40; if (u > tt) break
          const p = arcPoint(a.a, a.b, u, rotY, cx, cy, R, 0.25)
          if (p.z < -0.1) { moved = false; continue }
          if (!moved) { ctx.moveTo(p.x, p.y); moved = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = `rgba(${sr}, ${0.55 * (1 - tt*0.3)})`; ctx.stroke()
        if (tt < 1) {
          const p = arcPoint(a.a, a.b, tt, rotY, cx, cy, R, 0.25)
          if (p.z > -0.1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2); ctx.fill()
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10)
            g.addColorStop(0, `rgba(${sr}, 0.55)`); g.addColorStop(1, `rgba(${sr}, 0)`)
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill()
          }
        }
      }
    }

    function drawPings(now, rotY, cx, cy, R, ar) {
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i]; const age = now - p.born; const tt = age / p.dur
        if (tt >= 1) { pings.splice(i, 1); continue }
        const pos = project(p.c.lat, p.c.lon, rotY, cx, cy, R)
        if (pos.z < 0) continue
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 2 + tt * 18, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(${ar}, ${0.7 * (1 - tt)})`; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = `rgba(${ar}, 0.9)`; ctx.beginPath(); ctx.arc(pos.x, pos.y, 1.6, 0, Math.PI*2); ctx.fill()
      }
    }

    function drawSweep(t, cx, cy, R, pr) {
      const ang = t * 0.6
      const g = ctx.createConicGradient ? ctx.createConicGradient(ang, cx, cy) : null
      if (g) {
        g.addColorStop(0, `rgba(${pr}, 0.14)`); g.addColorStop(0.05, `rgba(${pr}, 0.0)`); g.addColorStop(1, `rgba(${pr}, 0.0)`)
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip()
        ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R*2, R*2); ctx.restore()
      }
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
