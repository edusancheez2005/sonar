'use client'
import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--background-dark);
  border-bottom: 1px solid var(--secondary);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  img { height: 48px; width: auto; object-fit: contain; margin-right: 1rem; transition: opacity 0.2s ease; }
  &:hover img { opacity: 0.85; }
`;

const MenuItems = styled.div`
  display: flex;
  gap: 1.25rem;
  align-items: center;
  @media (max-width: 768px) {
    display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
    flex-direction: column; position: absolute; top: 80px; left: 0; right: 0; background-color: var(--background-dark);
    padding: 1rem 0; z-index: 10; border-bottom: 1px solid var(--secondary);
  }
`;

const MenuItem = styled(motion.div)`
  a {
    color: ${({ $active }) => ($active ? 'var(--primary)' : 'var(--text-primary)')};
    font-weight: ${({ $active }) => ($active ? '500' : '400')};
    font-size: 1.1rem; position: relative; display: inline-flex; align-items: center; gap: 0.4rem;
    &:after { content: ''; position: absolute; left: 0; bottom: -5px; width: 100%; height: 3px; background-color: var(--primary); transform: scaleX(${({ $active }) => ($active ? '1' : '0')}); transition: transform 0.3s ease; }
    &:hover:after { transform: scaleX(1); }
  }
`;

const MobileMenuButton = styled.button`
  display: none; font-size: 1.5rem; color: var(--text-primary);
  @media (max-width: 768px) { display: block; }
`;

const LogoutButton = styled.button`
  background: none; border: 1px solid var(--primary); color: var(--primary);
  padding: 0.6rem 1.1rem; border-radius: 999px; cursor: pointer; transition: all 0.25s ease; font-weight: 600; letter-spacing: 0.2px;
  &:hover { background: var(--primary); color: #0a1621; box-shadow: 0 6px 14px rgba(54,166,186,0.18); transform: translateY(-1px); }
`;

const ProfileButton = styled(NextLink)`
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--secondary);
  color: var(--text-primary); text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease;
  &:hover { background: rgba(255,255,255,0.06); border-color: var(--primary); }
`;

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"/>
  </svg>
);

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  min-width: 240px;
  max-width: 320px;
  @media (max-width: 768px) { width: 100%; min-width: 0; }
  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 0.95rem;
    padding: 0.2rem 0.4rem;
  }
  /* removed Enter hint */
`;

const Suggestions = styled.ul`
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  list-style: none;
  padding: 0.25rem;
  margin: 0.3rem 0 0;
  z-index: 20;
  max-height: 240px;
  overflow: auto;
  li { padding: 0.5rem 0.6rem; cursor: pointer; display: flex; justify-content: space-between; }
  li:hover { background: rgba(255,255,255,0.05); }
  .sym { font-weight: 600; color: var(--text-primary); }
  .meta { color: var(--text-secondary); font-size: 0.85rem; }
`;

const Navbar = ({ onLogout }) => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [adminBypass, setAdminBypass] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null));
    try { if (typeof window !== 'undefined') setAdminBypass(localStorage.getItem('isAdminBypass') === 'true'); } catch {}
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);
  if (!mounted) return null;

  const isActive = (path) => pathname === path;
  const isOnLandingPage = pathname === '/';
  const isAuthenticated = !!(session || user || adminBypass);

  const menuVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } };

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try { await supabaseBrowser().auth.signOut(); } catch {}
    try { if (typeof window !== 'undefined') { window.localStorage.removeItem('adminLogin'); window.localStorage.removeItem('isAdminBypass'); } } catch {}
    if (onLogout) onLogout();
    router.push('/');
  };

  // Top 100 tokens by market cap (for search suggestions)
  const TOP_TOKENS = [
    'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'DOGE', 'ADA', 'TRX',
    'AVAX', 'SHIB', 'DOT', 'LINK', 'MATIC', 'UNI', 'LTC', 'BCH', 'NEAR', 'LEO',
    'DAI', 'ATOM', 'ETC', 'XLM', 'ICP', 'FIL', 'HBAR', 'APT', 'VET', 'OP',
    'ARB', 'STX', 'IMX', 'MKR', 'AAVE', 'ALGO', 'INJ', 'RNDR', 'GRT', 'CRO',
    'SAND', 'MANA', 'FTM', 'SNX', 'RUNE', 'THETA', 'AXS', 'EOS', 'XTZ', 'FLOW',
    'KAVA', 'ZEC', 'XMR', 'DASH', 'NEO', 'WAVES', 'ONE', 'CELO', 'ROSE', 'GLMR',
    'EGLD', 'TFUEL', 'HT', 'KCS', 'OKB', 'KLAY', 'ZIL', 'BAT', 'ENJ', 'LRC',
    'CHZ', '1INCH', 'COMP', 'SUSHI', 'CRV', 'YFI', 'ZRX', 'OMG', 'ANKR', 'NMR',
    'ALICE', 'FET', 'OCEAN', 'BLUR', 'PEPE', 'FLOKI', 'GALA', 'APE', 'LDO', 'RPL',
    'SUI', 'SEI', 'TIA', 'WLD', 'PYTH', 'BONK', 'ORDI', 'JTO', 'ONDO', 'PENDLE'
  ];

  // Token search — combines top tokens with Supabase whale data
  const fetchSuggestions = async (text) => {
    const t = (text || '').trim().toUpperCase();
    if (!t) { setSuggestions([]); return; }
    try {
      setLoadingSug(true);
      
      // First, filter top tokens
      const topMatches = TOP_TOKENS
        .filter(sym => sym.startsWith(t))
        .slice(0, 5)
        .map(sym => ({ token: sym, count: 0, isTop: true }));
      
      // Then query Supabase for whale activity
      const sinceIso = new Date(Date.now() - 24*60*60*1000).toISOString();
      const sb = supabaseBrowser();
      const { data, error } = await sb
        .from('whale_transactions')
        .select('token_symbol, blockchain', { count: 'exact' })
        .ilike('token_symbol', `${t}%`)
        .gte('timestamp', sinceIso)
        .limit(20);
      
      const map = new Map();
      if (!error && data) {
        for (const r of data) {
          const sym = String(r.token_symbol || '').trim().toUpperCase();
          if (!sym) continue;
          map.set(sym, (map.get(sym) || 0) + 1);
        }
      }
      
      const whaleMatches = Array.from(map.entries())
        .sort((a,b)=> b[1]-a[1])
        .slice(0, 5)
        .map(([sym, cnt]) => ({ token: sym, count: cnt, isTop: false }));
      
      // Combine and deduplicate (prefer whale data if available)
      const combined = new Map();
      for (const match of whaleMatches) {
        combined.set(match.token, match);
      }
      for (const match of topMatches) {
        if (!combined.has(match.token)) {
          combined.set(match.token, match);
        }
      }
      
      const list = Array.from(combined.values()).slice(0, 10);
      setSuggestions(list);
    } finally {
      setLoadingSug(false);
    }
  };

  const onChangeQuery = (e) => {
    const v = e.target.value.toUpperCase();
    setQuery(v);
    setShowSug(true);
    fetchSuggestions(v);
  };

  const goToToken = (token) => {
    if (!token) return;
    router.push(`/token/${encodeURIComponent(token)}?sinceHours=24`);
    setShowSug(false);
  };

  const onSubmitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) goToToken(query.trim().toUpperCase());
  };

  return (
    <NavContainer>
      <Logo onClick={() => {
        if (pathname === '/' || pathname === '/dashboard') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          router.push('/');
        }
      }}>
        <img src="/logo.svg" alt="Sonar Logo" />
      </Logo>
      <MobileMenuButton onClick={toggleMenu}>☰</MobileMenuButton>
      <MenuItems isOpen={isOpen}>
        {!isOnLandingPage && (
          <>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/dashboard')} variants={itemVariants}>
                <NextLink href="/dashboard">Dashboard</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/statistics')} variants={itemVariants}>
                <NextLink href="/statistics">Statistics</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/trending')} variants={itemVariants}>
                <NextLink href="/trending">Trending</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/news')} variants={itemVariants}>
                <NextLink href="/news">News</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/community')} variants={itemVariants}>
                <NextLink href="/community">Social</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/ai-advisor')} variants={itemVariants}>
                <NextLink href="/ai-advisor">Orca 2.0</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/subscribe')} variants={itemVariants}>
                <NextLink href="/subscribe">Pricing</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/help')} variants={itemVariants}>
                <NextLink href="/help">Help</NextLink>
              </MenuItem>
            </motion.div>
            <form onSubmit={onSubmitSearch} style={{ display: 'flex', alignItems: 'center' }}>
              <SearchBox>
                <input
                  aria-label="Search token"
                  placeholder="Search token (e.g., BTC, ETH)"
                  value={query}
                  onChange={onChangeQuery}
                  onFocus={() => setShowSug(true)}
                />
                
                {showSug && suggestions.length > 0 && (
                  <Suggestions onMouseLeave={() => setShowSug(false)}>
                    {suggestions.map((s) => (
                      <li key={s.token} onClick={() => goToToken(s.token)}>
                        <span className="sym">{s.token}</span>
                        <span className="meta">
                          {s.count > 0 ? `${s.count} whale txs` : 'Top Token'}
                        </span>
                      </li>
                    ))}
                  </Suggestions>
                )}
                {showSug && !loadingSug && suggestions.length === 0 && query && (
                  <Suggestions><li><span className="meta">No matches</span></li></Suggestions>
                )}
              </SearchBox>
            </form>
          </>
        )}
        {isOnLandingPage && (
          <>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={false} variants={itemVariants}>
                <a href="/#screenshots">Results</a>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={false} variants={itemVariants}>
                <a 
                  href="#advisor" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('advisor')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Orca 2.0
                </a>
              </MenuItem>
            </motion.div>
          </>
        )}
        {isAuthenticated && (
          <>
            <ProfileButton href="/profile" aria-label="Profile"><UserIcon /></ProfileButton>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </>
        )}
      </MenuItems>
    </NavContainer>
  );
};

export default Navbar; 