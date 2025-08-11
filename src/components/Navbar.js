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
  img { height: 80px; width: auto; object-fit: contain; object-position: center; margin-right: 1rem; }
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
              <MenuItem $active={isActive('/news')} variants={itemVariants}>
                <NextLink href="/news">News</NextLink>
              </MenuItem>
            </motion.div>
            <motion.div variants={menuVariants} initial="hidden" animate="visible">
              <MenuItem $active={isActive('/ai-advisor')} variants={itemVariants}>
                <NextLink href="/ai-advisor">Orca 2.0</NextLink>
              </MenuItem>
            </motion.div>
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
              <MenuItem $active={isActive('/ai-advisor')} variants={itemVariants}>
                <NextLink href="/ai-advisor">Orca 2.0</NextLink>
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