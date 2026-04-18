// Terminal Globe Background — dotted rotating globe with blockchain logos & signal arcs
(function() {
  const canvas = document.getElementById('globe-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Land mask: a low-res grid of booleans approximating continents. ---
  // Each entry is [lat, lonStart, lonEnd] — rough continent blobs drawn by lat bands.
  // This produces a recognizable but low-fi "terminal map" look.
  const LAND_BANDS = [
    // lat, [lon ranges]
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
    [-72,[[-120,120]]], // antarctic band
    [-80,[[-180,180]]],
  ];
  function isLand(lat, lon) {
    // find nearest band
    let best = LAND_BANDS[0];
    let bd = Infinity;
    for (const b of LAND_BANDS) {
      const d = Math.abs(b[0] - lat);
      if (d < bd) { bd = d; best = b; }
    }
    for (const [a,b] of best[1]) {
      if (lon >= a && lon <= b) return true;
    }
    return false;
  }

  // Pre-generate a cloud of surface points (lat, lon) on land, plus full-sphere sparse grid
  const LAND_PTS = [];
  const GRID_PTS = [];
  for (let lat = -80; lat <= 80; lat += 4) {
    const step = Math.max(4, 4 / Math.cos(lat * Math.PI/180));
    for (let lon = -180; lon <= 180; lon += step) {
      if (isLand(lat, lon)) LAND_PTS.push([lat, lon]);
    }
  }
  for (let lat = -80; lat <= 80; lat += 8) {
    const step = Math.max(8, 8 / Math.cos(lat * Math.PI/180));
    for (let lon = -180; lon <= 180; lon += step) {
      GRID_PTS.push([lat, lon]);
    }
  }

  // City pins (for signal arcs)
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
  ];

  // Blockchain tokens (drawn as circular glyphs — original abstract marks, not copied logos)
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
  ];

  // Generate orbits for tokens
  const orbits = TOKENS.map((t, i) => ({
    token: t,
    radius: 0, // computed each frame
    rFactor: 1.08 + (i % 3) * 0.14 + Math.random()*0.05,
    speed: 0.06 + Math.random()*0.05,
    phase: Math.random() * Math.PI * 2,
    tilt: (Math.random() - 0.5) * 0.9, // inclination
    yaw: Math.random() * Math.PI * 2,
  }));

  // Project (lat, lon) on a sphere rotated by `rotY` to 2D screen at (cx, cy, R)
  function project(lat, lon, rotY, cx, cy, R) {
    const phi = lat * Math.PI/180;
    const lam = lon * Math.PI/180 + rotY;
    // x east, y up, z out of screen
    const x = Math.cos(phi) * Math.sin(lam);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(lam);
    // slight axial tilt for style
    const tilt = -0.35;
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
    const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
    return {
      x: cx + x * R,
      y: cy - y2 * R,
      z: z2, // >0 = front facing
    };
  }

  // Signal arc state: a list of active arcs with lifecycle
  const arcs = [];
  function spawnArc() {
    const a = CITIES[Math.floor(Math.random()*CITIES.length)];
    let b = CITIES[Math.floor(Math.random()*CITIES.length)];
    if (b === a) b = CITIES[(CITIES.indexOf(a)+1) % CITIES.length];
    arcs.push({ a, b, t: 0, dur: 1800 + Math.random()*1200, born: performance.now() });
  }

  // Ping rings at cities
  const pings = [];
  function spawnPing() {
    const c = CITIES[Math.floor(Math.random()*CITIES.length)];
    pings.push({ c, born: performance.now(), dur: 1400 });
  }

  let lastArc = 0, lastPing = 0;

  // Shooting packets that travel along an arc
  function arcPoint(a, b, t, rotY, cx, cy, R, lift = 0.25) {
    // Great-circle-ish interpolation via 3D slerp-lite
    const pa = toVec(a.lat, a.lon);
    const pb = toVec(b.lat, b.lon);
    const dot = pa.x*pb.x + pa.y*pb.y + pa.z*pb.z;
    const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinO = Math.sin(omega) || 1;
    const w1 = Math.sin((1-t)*omega)/sinO;
    const w2 = Math.sin(t*omega)/sinO;
    let x = pa.x*w1 + pb.x*w2;
    let y = pa.y*w1 + pb.y*w2;
    let z = pa.z*w1 + pb.z*w2;
    // lift above surface: bell curve
    const lifted = 1 + lift * Math.sin(t * Math.PI);
    x *= lifted; y *= lifted; z *= lifted;
    // apply rotY
    const lam = Math.atan2(x, z) + rotY;
    const rad = Math.sqrt(x*x + z*z);
    const xr = Math.sin(lam) * rad;
    const zr = Math.cos(lam) * rad;
    // tilt
    const tilt = -0.35;
    const yr = y * Math.cos(tilt) - zr * Math.sin(tilt);
    const zr2 = y * Math.sin(tilt) + zr * Math.cos(tilt);
    return { x: cx + xr * R, y: cy - yr * R, z: zr2 };
  }
  function toVec(lat, lon) {
    const phi = lat * Math.PI/180;
    const lam = lon * Math.PI/180;
    return {
      x: Math.cos(phi)*Math.sin(lam),
      y: Math.sin(phi),
      z: Math.cos(phi)*Math.cos(lam),
    };
  }

  // Main render loop
  const START = performance.now();
  function frame(now) {
    const t = (now - START) / 1000;
    ctx.clearRect(0, 0, W, H);

    // Center & radius — anchor right-ish if wide, center if narrow
    const TW = window.__SONAR_TWEAKS || {};
    const sizeMult = (TW.globeSize || 100) / 100;
    const sigMult = (TW.signalDensity != null ? TW.signalDensity : 100) / 100;
    const cx = W * 0.5;
    const cy = H * 0.5;
    const R = Math.min(W, H) * 0.38 * sizeMult;

    const rotY = t * 0.08;

    // Backdrop glow uses current primary color
    const primary = (window.__SONAR_COLORS && window.__SONAR_COLORS.primary) || '#22d3ee';
    const secondary = (window.__SONAR_COLORS && window.__SONAR_COLORS.secondary) || '#67e8f9';
    const accent = (window.__SONAR_COLORS && window.__SONAR_COLORS.accent) || '#4ade80';
    const pr = hexToRgb(primary);
    const sr = hexToRgb(secondary);
    const ar = hexToRgb(accent);

    // --- Backdrop glow ---
    const grad = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R*1.6);
    grad.addColorStop(0, `rgba(${pr}, 0.08)`);
    grad.addColorStop(0.5, `rgba(${pr}, 0.03)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Meridians & parallels (back hemisphere first) ---
    drawGraticule(rotY, cx, cy, R, false, pr); // back
    // --- Land dots (back) ---
    drawLand(rotY, cx, cy, R, false, sr);

    // Tokens on far side
    if (TW.tokens !== false) drawTokens(t, cx, cy, R, false);

    // Front graticule
    drawGraticule(rotY, cx, cy, R, true, pr);

    // Front land dots
    drawLand(rotY, cx, cy, R, true, sr);

    // Signal arcs
    if (sigMult > 0) {
      const arcInterval = 600 / Math.max(0.1, sigMult);
      const pingInterval = 900 / Math.max(0.1, sigMult);
      if (now - lastArc > arcInterval) { spawnArc(); lastArc = now; }
      if (now - lastPing > pingInterval) { spawnPing(); lastPing = now; }
    }

    drawArcs(now, rotY, cx, cy, R, sr);
    drawPings(now, rotY, cx, cy, R, ar);

    // Tokens on near side
    if (TW.tokens !== false) drawTokens(t, cx, cy, R, true);

    // Sonar sweep (a faint rotating wedge)
    if (TW.sweep !== false) drawSweep(t, cx, cy, R, pr);

    // Corner HUD text (terminal)
    if (TW.hud !== false) drawHUD(now, cx, cy, R, pr);

    requestAnimationFrame(frame);
  }

  function drawGraticule(rotY, cx, cy, R, front, pr) {
    pr = pr || '34, 211, 238';
    ctx.lineWidth = 1;
    // parallels
    for (let lat = -60; lat <= 60; lat += 20) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = project(lat, lon, rotY, cx, cy, R);
        const isFront = p.z > 0;
        if (isFront !== front) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = front ? `rgba(${pr}, 0.12)` : `rgba(${pr}, 0.05)`;
      ctx.stroke();
    }
    // meridians
    for (let lon = -180; lon < 180; lon += 20) {
      ctx.beginPath();
      let started = false;
      for (let lat = -80; lat <= 80; lat += 4) {
        const p = project(lat, lon, rotY, cx, cy, R);
        const isFront = p.z > 0;
        if (isFront !== front) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = front ? `rgba(${pr}, 0.10)` : `rgba(${pr}, 0.04)`;
      ctx.stroke();
    }
    // equator & prime meridian, slightly brighter
    if (front) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = project(0, lon, rotY, cx, cy, R);
        if (p.z <= 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${pr}, 0.25)`;
      ctx.stroke();
    }
    // limb
    if (front) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${pr}, 0.22)`;
      ctx.stroke();
    }
  }

  function drawLand(rotY, cx, cy, R, front, sr) {
    sr = sr || '103, 232, 249';
    for (const [lat, lon] of LAND_PTS) {
      const p = project(lat, lon, rotY, cx, cy, R);
      const isFront = p.z > 0;
      if (isFront !== front) continue;
      const alpha = front ? (0.35 + p.z * 0.45) : (0.10 + (p.z + 1) * 0.05);
      const size = front ? (1.2 + p.z * 0.8) : 0.9;
      ctx.fillStyle = `rgba(${sr}, ${alpha})`;
      ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
    }
  }

  function drawTokens(t, cx, cy, R, front) {
    for (const o of orbits) {
      const ang = t * o.speed + o.phase;
      const r = R * o.rFactor;
      // orbit in a tilted plane
      let x = Math.cos(ang) * r;
      let y = Math.sin(ang) * r * Math.cos(o.tilt);
      let z = Math.sin(ang) * r * Math.sin(o.tilt);
      // yaw
      const xr = x * Math.cos(o.yaw) + z * Math.sin(o.yaw);
      const zr = -x * Math.sin(o.yaw) + z * Math.cos(o.yaw);
      const isFront = zr > 0;
      if (isFront !== front) continue;
      const px = cx + xr;
      const py = cy + y * 0.6; // squash vertically for perspective
      const scale = 1 + (zr / r) * 0.3;
      const alpha = front ? 0.9 : 0.25;

      // token chip
      const size = 22 * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      // halo
      const halo = ctx.createRadialGradient(px, py, 0, px, py, size*1.6);
      halo.addColorStop(0, hexToRgba(o.token.color, 0.35));
      halo.addColorStop(1, hexToRgba(o.token.color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(px, py, size*1.6, 0, Math.PI*2);
      ctx.fill();
      // chip bg
      ctx.fillStyle = 'rgba(10, 20, 32, 0.85)';
      ctx.beginPath();
      ctx.arc(px, py, size*0.75, 0, Math.PI*2);
      ctx.fill();
      // ring
      ctx.strokeStyle = hexToRgba(o.token.color, 0.65);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // glyph
      ctx.fillStyle = o.token.color;
      ctx.font = `600 ${Math.round(size*0.85)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.token.sym, px, py + 1);
      // ticker label
      if (front && scale > 0.95) {
        ctx.fillStyle = 'rgba(165, 243, 252, 0.55)';
        ctx.font = `500 10px ui-monospace, Menlo, monospace`;
        ctx.fillText(o.token.name, px, py + size*0.95 + 6);
      }
      ctx.restore();
    }
  }

  function drawArcs(now, rotY, cx, cy, R, sr) {
    sr = sr || '103, 232, 249';
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      const age = now - a.born;
      const tt = age / a.dur;
      if (tt >= 1) { arcs.splice(i, 1); continue; }

      // Draw arc as a fading trail of points
      const steps = 40;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let moved = false;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        if (u > tt) break;
        const p = arcPoint(a.a, a.b, u, rotY, cx, cy, R, 0.25);
        if (p.z < -0.1) { moved = false; continue; }
        if (!moved) { ctx.moveTo(p.x, p.y); moved = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${sr}, ${0.55 * (1 - tt*0.3)})`;
      ctx.stroke();

      // leading packet
      if (tt < 1) {
        const p = arcPoint(a.a, a.b, tt, rotY, cx, cy, R, 0.25);
        if (p.z > -0.1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
          ctx.fill();
          // glow
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
          g.addColorStop(0, `rgba(${sr}, 0.55)`);
          g.addColorStop(1, `rgba(${sr}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
  }

  function drawPings(now, rotY, cx, cy, R, ar) {
    ar = ar || '74, 222, 128';
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      const age = now - p.born;
      const tt = age / p.dur;
      if (tt >= 1) { pings.splice(i, 1); continue; }
      const pos = project(p.c.lat, p.c.lon, rotY, cx, cy, R);
      if (pos.z < 0) continue;
      // expanding ring
      const rr = 2 + tt * 18;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rr, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${ar}, ${0.7 * (1 - tt)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // core
      ctx.fillStyle = `rgba(${ar}, 0.9)`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.6, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawSweep(t, cx, cy, R, pr) {
    pr = pr || '34, 211, 238';
    const ang = t * 0.6;
    const g = ctx.createConicGradient ? ctx.createConicGradient(ang, cx, cy) : null;
    if (g) {
      g.addColorStop(0, `rgba(${pr}, 0.14)`);
      g.addColorStop(0.05, `rgba(${pr}, 0.0)`);
      g.addColorStop(1, `rgba(${pr}, 0.0)`);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(cx - R, cy - R, R*2, R*2);
      ctx.restore();
    }
  }

  function drawHUD(now, cx, cy, R, pr) {
    pr = pr || '103, 232, 249';
    ctx.save();
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.fillStyle = `rgba(${pr}, 0.45)`;
    ctx.textAlign = 'left';
    const lines = [
      `NODE  ${Math.floor(12 + (now/1000)%18)}/64`,
      `LAT   40.71°N`,
      `LON   -74.01°W`,
      `FEED  ●● ACTIVE`,
    ];
    const x = 20, y = H - 80;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i*14);
    }
    ctx.textAlign = 'right';
    const r = [
      `SIGNALS  ${String(Math.floor(2000 + (now/50)%400)).padStart(4,'0')}`,
      `WHALES   ${String(Math.floor(82 + (now/300)%60)).padStart(3,'0')}`,
      `UPTIME   99.98%`,
    ];
    for (let i = 0; i < r.length; i++) {
      ctx.fillText(r[i], W - 20, y + i*14);
    }
    ctx.restore();
  }

  function hexToRgba(hex, a) {
    const h = hex.replace('#','');
    const n = parseInt(h, 16);
    const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
    return `rgba(${r},${g},${b},${a})`;
  }
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    const n = parseInt(h, 16);
    const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
    return `${r}, ${g}, ${b}`;
  }

  requestAnimationFrame(frame);
})();
