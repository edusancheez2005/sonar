// Orbiting crypto logos on tilted elliptical rings around the globe.
// Sits in a div that overlays the globe canvas. Uses requestAnimationFrame.

function OrbitingLogos({ size = 560, motion = 'medium' }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const loop = (t) => {
      setTick(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const speedMult = motion === 'subtle' ? 0.4 : motion === 'cinematic' ? 1.6 : 1;
  const cx = size / 2;
  const cy = size / 2;

  // Three orbit rings with different radii, tilts, phases
  const rings = [
    { rx: size * 0.48, ry: size * 0.12, tilt: -18, speed: 0.08, coins: [window.COINS[0], window.COINS[2]] }, // BTC, SOL
    { rx: size * 0.58, ry: size * 0.15, tilt: 22,  speed: -0.06, coins: [window.COINS[1], window.COINS[4]] }, // ETH, BNB
    { rx: size * 0.68, ry: size * 0.18, tilt: -8,  speed: 0.05, coins: [window.COINS[3], window.COINS[5]] }, // XRP, DOGE
  ];

  const placements = [];
  rings.forEach((ring, ri) => {
    ring.coins.forEach((coin, i) => {
      const phase = (i / ring.coins.length) * Math.PI * 2;
      const angle = phase + (tick / 1000) * ring.speed * speedMult * Math.PI;
      const rad = (ring.tilt * Math.PI) / 180;
      // Ellipse param
      const ex = Math.cos(angle) * ring.rx;
      const ey = Math.sin(angle) * ring.ry;
      // Tilt rotation in 2D
      const x = ex * Math.cos(rad) - ey * Math.sin(rad);
      const y = ex * Math.sin(rad) + ey * Math.cos(rad);
      // z proxy for depth: sin(angle) — positive = in front
      const z = Math.sin(angle);
      placements.push({ x: cx + x, y: cy + y, z, coin, ri });
    });
  });

  // Sort by z so "front" logos render on top
  placements.sort((a, b) => a.z - b.z);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Orbit ring paths (SVG) */}
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
        const scale = 0.7 + (p.z + 1) * 0.25; // 0.7 .. 1.2
        const opacity = 0.55 + (p.z + 1) * 0.22;
        const Icon = p.coin.Icon;
        const iconSize = Math.round(44 * scale);
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
        );
      })}
    </div>
  );
}

window.OrbitingLogos = OrbitingLogos;
