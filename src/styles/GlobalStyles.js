import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    /* Geist loaded via <link> in app/layout.jsx (next/font Geist requires Next 15+) */
    --font-geist-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
    --font-geist-mono: 'Geist Mono', ui-monospace, monospace;
    --font-sans: var(--font-geist-sans);
    --font-mono: var(--font-geist-mono);
    --background-dark: #0a1621;
    --background-card: #0d2134;
    --primary: #36a6ba;
    --secondary: #1e3951;
    --text-primary: #ffffff;
    --text-secondary: #a0b2c6;
    --buy-color: #36a6ba;
    --sell-color: #e74c3c;
    --transfer-color: #3498db;
    --chart-blue: #36a6ba;
    --chart-dark-blue: #1e3951;
    --chart-green: #2ecc71;
    --chart-purple: #9b59b6;
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-pill: 999px;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.3);
    /* Landing page tokens */
    --landing-border: rgba(120, 220, 240, 0.14);
    /* V2 landing / demo neon cyan (see Landing.js V2Hero, HeroTitle) */
    --neon-bright: #7af8ff;
    --neon-cyan: #22d3ee;
    --neon-mid: #5dd5ed;
    --neon-deep: #0e7490;
    --shell-deep-a: #060c14;
    --shell-deep-b: #081019;
    --neon-line: rgba(34, 211, 238, 0.32);
    --neon-border: rgba(34, 211, 238, 0.16);
    --neon-fill: rgba(34, 211, 238, 0.1);
    --neon-fill-strong: rgba(34, 211, 238, 0.16);
    --neon-glow: rgba(34, 211, 238, 0.45);
  }

  html { scroll-behavior: smooth; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-sans); background-color: var(--background-dark); color: var(--text-primary); line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  code, kbd, pre, samp { font-family: var(--font-mono); }

  h1, h2, h3, h4, h5, h6 { font-weight: 500; margin-bottom: 1rem; }
  a { text-decoration: none; color: var(--primary); transition: color 0.3s ease; }
  a:hover { color: var(--text-primary); }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }

  .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
  .card { background-color: var(--background-card); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }

  .buy { color: var(--buy-color); background-color: rgba(54, 166, 186, 0.15); border-radius: 4px; padding: 0.25rem 0.5rem; font-weight: 500; }
  .sell { color: var(--sell-color); background-color: rgba(231, 76, 60, 0.15); border-radius: 4px; padding: 0.25rem 0.5rem; font-weight: 500; }
  .transfer { color: var(--transfer-color); background-color: rgba(52, 152, 219, 0.15); border-radius: 4px; padding: 0.25rem 0.5rem; font-weight: 500; }

  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  table th, table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--secondary); }
  table th { color: var(--text-secondary); font-weight: 500; }
  table tr:last-child td { border-bottom: none; }

  .fade-in { opacity: 0; animation: fadeIn 0.5s forwards; }
  .slide-in { transform: translateY(20px); opacity: 0; animation: slideIn 0.5s forwards; }
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideIn { to { transform: translateY(0); opacity: 1; } }
  @keyframes sonar-spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.25rem; }
    h3 { font-size: 1.1rem; }
  }
`;

export default GlobalStyles; 