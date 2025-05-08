import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

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
  
  img {
    height: 60px;
    width: auto;
    object-fit: contain;
    object-position: center;
    margin-right: 1rem;
  }
`;

const MenuItems = styled.div`
  display: flex;
  gap: 2rem;
  
  @media (max-width: 768px) {
    display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
    flex-direction: column;
    position: absolute;
    top: 80px;
    left: 0;
    right: 0;
    background-color: var(--background-dark);
    padding: 1rem 0;
    z-index: 10;
    border-bottom: 1px solid var(--secondary);
  }
`;

const MenuItem = styled(motion.div)`
  a {
    color: ${({ active }) => (active ? 'var(--primary)' : 'var(--text-primary)')};
    font-weight: ${({ active }) => (active ? '500' : '400')};
    font-size: 1.1rem;
    position: relative;
    
    &:after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -5px;
      width: 100%;
      height: 3px;
      background-color: var(--primary);
      transform: scaleX(${({ active }) => (active ? '1' : '0')});
      transition: transform 0.3s ease;
    }
    
    &:hover:after {
      transform: scaleX(1);
    }
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  font-size: 1.5rem;
  color: var(--text-primary);
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const LogoutButton = styled.button`
  background: none;
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    background-color: var(--primary);
    color: #fff;
  }
`;

const Navbar = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path) => location.pathname === path;
  const isOnLandingPage = location.pathname === '/';
  
  const menuVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback if no onLogout prop is provided
      localStorage.setItem('isAuthenticated', 'false');
    }
    navigate('/');
  };
  
  return (
    <NavContainer>
      <Logo>
        <img src={logo} alt="Sonar Logo" />
      </Logo>
      
      <MobileMenuButton onClick={toggleMenu}>
        ☰
      </MobileMenuButton>
      
      <MenuItems isOpen={isOpen}>
        {!isOnLandingPage && (
          <>
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
            >
              <MenuItem 
                active={isActive('/dashboard')}
                variants={itemVariants}
              >
                <Link to="/dashboard">Dashboard</Link>
              </MenuItem>
            </motion.div>
            
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
            >
              <MenuItem 
                active={isActive('/statistics')}
                variants={itemVariants}
              >
                <Link to="/statistics">Statistics</Link>
              </MenuItem>
            </motion.div>
            
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
            >
              <MenuItem 
                active={isActive('/news')}
                variants={itemVariants}
              >
                <Link to="/news">News</Link>
              </MenuItem>
            </motion.div>
            
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
            >
              <LogoutButton onClick={handleLogout}>
                Logout
              </LogoutButton>
            </motion.div>
          </>
        )}
        
        {isOnLandingPage && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
          >
            <MenuItem 
              active={location.hash === '#screenshots'}
              variants={itemVariants}
            >
              <Link to="/#screenshots">Results</Link>
            </MenuItem>
          </motion.div>
        )}
      </MenuItems>
    </NavContainer>
  );
};

export default Navbar; 