'use client'
import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';
import { FONT_SANS } from '@/src/styles/fontStacks';
import { NavLinkPill } from '@/src/components/nav/NavLinkPill';
import TokenSearchField from '@/src/components/nav/TokenSearchField';
import { isWalletTrackerPath } from '@/src/components/nav/navUtils';
import { LogoutButton, ProfileButton, UserIcon } from '@/src/components/nav/AuthButtons';

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--background-dark);
  border-bottom: 1px solid var(--secondary);
  font-family: ${FONT_SANS};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  img { height: 45px; width: auto; object-fit: contain; object-position: center; margin-right: 1rem; }
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

const MenuItem = NavLinkPill;

const MobileMenuButton = styled.button`
  display: none; font-size: 1.5rem; color: var(--text-primary);
  @media (max-width: 768px) { display: block; }
`;

const Navbar = ({ onLogout }) => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (!mounted) return null;

  const isActive = (path) => pathname === path;
  const isWalletTrackerSection = isWalletTrackerPath(pathname);
  const isOnLandingPage = pathname === '/';
  const isAuthenticated = !!(session || user);

  const menuVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } };

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try { await supabaseBrowser().auth.signOut(); } catch {}
    if (onLogout) onLogout();
    router.push('/');
  };

  return (
    <NavContainer>
      <Logo>
        <NextLink href="/"><img src="/logo2.png" alt="Sonar Logo" /></NextLink>
      </Logo>
      <MobileMenuButton onClick={toggleMenu} aria-label="Toggle menu">☰</MobileMenuButton>
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
              <MenuItem $active={isWalletTrackerSection} variants={itemVariants}>
                <NextLink href="/wallet-tracker">Whales</NextLink>
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
            <TokenSearchField />
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
            {isOnLandingPage && (
              <motion.div variants={menuVariants} initial="hidden" animate="visible">
                <MenuItem $active={false} variants={itemVariants}>
                  <NextLink href="/dashboard">Dashboard</NextLink>
                </MenuItem>
              </motion.div>
            )}
            <ProfileButton href="/profile" aria-label="Profile"><UserIcon /></ProfileButton>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </>
        )}
      </MenuItems>
    </NavContainer>
  );
};

export default Navbar;
