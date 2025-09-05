import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';

// Styled components
const LandingContainer = styled.div`
  min-height: 100vh;
  background-color: var(--background-dark);
  color: var(--text-primary);
  position: relative;
`;

const HeroSection = styled.section`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 0 2rem;
  padding-top: 180px;
  text-align: center;
  margin-top: 0;
  background-image: radial-gradient(circle at 70% 60%, rgba(54, 166, 186, 0.1), transparent 60%);
`;

const NavBar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 2rem;
  position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
  background: var(--background-dark);
  border-bottom: 1px solid var(--secondary);
`;

const Logo = styled.div`
  display: flex; align-items: center;
  img { height: 80px; width: auto; object-fit: contain; object-position: center; transition: height 0.3s ease; }
`;

const NavLinks = styled.div`
  display: flex; gap: 2rem;
  a { color: var(--text-primary); font-weight: 500; font-size: 1.05rem; text-decoration: none; transition: color 0.3s ease; position: relative; }
  a:after { content: ''; position: absolute; left: 0; bottom: -5px; width: 100%; height: 3px; background-color: var(--primary); transform: scaleX(0); transition: transform 0.3s ease; }
  a:hover { color: var(--primary); }
  a:hover:after { transform: scaleX(1); }
  @media (max-width: 768px) { display: none; }
`;

const HeroContent = styled.div`
  max-width: 800px; z-index: 5;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: var(--primary);
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  color: var(--text-secondary);
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Button = styled(motion.button)`
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  font-weight: 500;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.primary {
    background-color: var(--primary);
    color: #fff;
    border: none;
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 7px 14px rgba(54, 166, 186, 0.3);
    }
  }
  
  &.secondary {
    background-color: transparent;
    color: var(--primary);
    border: 2px solid var(--primary);
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 7px 14px rgba(54, 166, 186, 0.1);
    }
  }
`;

const Section = styled.section`
  padding: 8rem 2rem 6rem;
  position: relative;
  z-index: 1;
  
  h2 {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 3rem;
    color: var(--primary);
  }
`;

const AboutSection = styled(Section)`
  background-color: var(--background-card);
  padding-top: 8rem;
`;

const AboutContent = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  p {
    line-height: 1.8;
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }
`;

const PipelineSection = styled(Section)`
  background: linear-gradient(135deg, var(--background-dark) 0%, rgba(52, 152, 219, 0.05) 100%);
  padding-top: 8rem;

  h2 {
    color: var(--text-primary);
    font-size: 2.5rem;
    margin-bottom: 4rem;
    font-weight: 600;
  }
`;

const PipelineFlow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 4rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  .pipeline-step {
    flex: 1;
    min-width: 280px;
    max-width: 350px;

    .step-content {
      background: var(--background-card);
      border: 1px solid var(--secondary);
      border-radius: 12px;
      padding: 2rem;
      height: 100%;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--primary);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        transform: translateY(-5px);
      }

      h3 {
        color: var(--text-primary);
        font-size: 1.4rem;
        margin-bottom: 1rem;
        font-weight: 600;
      }

      .step-icon {
        font-size: 2.5rem;
        margin: 1rem 0;
        display: block;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }

      .step-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        span {
          background: rgba(52, 152, 219, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          color: var(--text-primary);
          display: inline-block;
          margin: 0.25rem 0;
        }
      }

      .phases-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 1.5rem;

        .phase-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: rgba(52, 152, 219, 0.05);
          border-radius: 8px;
          transition: all 0.3s ease;

          &:hover {
            background: rgba(52, 152, 219, 0.1);
          }

          .phase-number {
            width: 24px;
            height: 24px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
            flex-shrink: 0;
          }

          span {
            font-size: 0.85rem;
            color: var(--text-primary);
            line-height: 1.3;
          }
        }
      }
    }
  }

  .arrow {
    font-size: 3rem;
    color: var(--primary);
    font-weight: bold;
    margin: 0 1rem;

    @media (max-width: 768px) {
      transform: rotate(90deg);
      margin: 1rem 0;
    }
  }

  .pipeline-performance {
    margin-top: 4rem;
    text-align: center;

    .performance-title {
      font-size: 2rem;
      color: var(--text-primary);
      margin-bottom: 3rem;
      font-weight: 600;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;

      .metric-card {
        background: var(--background-card);
        border: 1px solid var(--secondary);
        border-radius: 16px;
        padding: 2rem;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--primary);
        }

        &:hover {
          border-color: var(--primary);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          transform: translateY(-5px);
        }

        .metric-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          display: block;
        }

        .metric-value {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
          margin-bottom: 1rem;

          .number {
            font-size: 3rem;
            font-weight: 700;
            color: var(--primary);
            line-height: 1;
          }

          .unit {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-secondary);
            margin-left: 0.25rem;
          }
        }

        .metric-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }

        .metric-desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        &.accuracy {
          &::before {
            background: linear-gradient(90deg, #27ae60, #2ecc71);
          }
        }

        &.speed {
          &::before {
            background: linear-gradient(90deg, #e74c3c, #c0392b);
          }
        }

        &.uptime {
          &::before {
            background: linear-gradient(90deg, #3498db, #2980b9);
          }
        }
      }
    }
  }

  .pipeline-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-top: 4rem;
    padding: 0 2rem;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 2rem;
      align-items: center;
    }

    .stat-item {
      text-align: center;
      background: var(--background-card);
      border: 1px solid var(--secondary);
      border-radius: 12px;
      padding: 2rem 1.5rem;
      min-width: 200px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary), rgba(52, 152, 219, 0.6));
      }

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        border-color: var(--primary);
      }

      .stat-number {
        font-size: 2.8rem;
        font-weight: 800;
        color: var(--primary);
        margin-bottom: 0.75rem;
        line-height: 1;
        position: relative;
        z-index: 2;
      }

      .stat-label {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-description {
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.4;
        font-weight: 400;
      }
    }
  }

  @media (max-width: 768px) {
    .pipeline-step {
      min-width: 100%;
      max-width: 100%;
    }

    .arrow {
      transform: rotate(90deg);
      margin: 2rem 0;
    }
  }
`;

const PricingSection = styled(Section)`
  background-color: var(--background-dark);
  padding-top: 8rem;
`;

const PricingPlans = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    max-width: 500px;
  }
`;

const PricingCard = styled(motion.div)`
  background-color: var(--background-card);
  border-radius: 10px;
  padding: 2.5rem 2rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }
  
  .price {
    font-size: 3rem;
    color: var(--primary);
    margin-bottom: 2rem;
    font-weight: 700;
    
    span {
      font-size: 1rem;
      opacity: 0.7;
    }
  }
  
  ul {
    list-style: none;
    margin-bottom: 2rem;
    
    li {
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
  
  &.featured {
    background: linear-gradient(135deg, var(--secondary), var(--background-card));
    transform: scale(1.05);
    
    @media (max-width: 992px) {
      transform: scale(1);
    }
  }
`;

// Animation elements
const WhaleBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.15;
  
  .whale-svg {
    position: absolute;
    bottom: -5%;
    right: -5%;
    width: 75%;
    height: auto;
    transform: scaleX(-1);
    path, circle {
      fill: var(--primary);
    }
  }
  
  .coin {
    position: absolute;
    width: 120px;
    height: 120px;
    background: linear-gradient(135deg, var(--primary), #2980b9);
    border-radius: 50%;
    box-shadow: 0 0 30px rgba(54, 166, 186, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-weight: bold;
    font-size: 2rem;
    top: 30%;
    right: 30%;
  }
`;

const FloatingElements = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Circle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, transparent 70%);
  opacity: 0.1;
`;

// Add a new styled component for the Screenshots section
const ScreenshotsSection = styled.section`
  padding: 4rem 2rem;
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--background-card);
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  
  h2 {
    color: var(--primary);
    margin-bottom: 2rem;
    font-size: 2.5rem;
  }
`;

const ScreenshotsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  
  h3 {
    font-size: 1.8rem;
    text-align: center;
    margin-bottom: 2rem;
    color: var(--text-secondary);
  }
`;

const ScreenshotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Screenshot = styled(motion.div)`
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  background-color: var(--background-dark);
  
  img {
    width: 100%;
    height: auto;
    display: block;
    border-bottom: 1px solid var(--secondary);
  }
  
  .caption {
    padding: 1rem;
    background-color: var(--background-dark);
    color: var(--text-secondary);
    font-size: 1rem;
  }
`;

// Add a styled button for the login
const NavButton = styled.button`
  background: none;
  border: none;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.3s ease;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -5px;
    width: 100%;
    height: 3px;
    background-color: var(--primary);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    color: var(--primary);
  }
  
  &:hover:after {
    transform: scaleX(1);
  }
`;

// Navigation function component for consistent styling
const NavLink = styled(NavButton)`
  /* Inherits all styles from NavButton */
`;

// New: Login button styled like the site Logout button
const LoginButton = styled.button`
  background: none;
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  &:hover { background-color: var(--primary); color: #fff; }
`;

// Add back the modal components
const Modal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 2rem;
`;

const FormContainer = styled(motion.div)`
  background-color: var(--background-card);
  padding: 2.5rem;
  border-radius: 10px;
  width: 100%;
  max-width: 500px;
  
  h3 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: var(--primary);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    font-size: 1rem;
    color: var(--text-secondary);
  }
  
  input {
    padding: 0.75rem;
    border-radius: 5px;
    border: 1px solid var(--secondary);
    background-color: rgba(30, 57, 81, 0.5);
    color: var(--text-primary);
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  
  button {
    padding: 0.75rem 1.5rem;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    
    &.submit {
      background-color: var(--primary);
      color: #fff;
      border: none;
      
      &:hover {
        background-color: rgba(54, 166, 186, 0.8);
      }
    }
    
    &.cancel {
      background-color: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--text-secondary);
      
      &:hover {
        color: var(--text-primary);
        border-color: var(--text-primary);
      }
    }
  }
`;

// New Orca 2.0 section
const AdvisorSection = styled.section`
  margin: 6rem auto 0; padding: 4rem 1.5rem; max-width: 1200px; position: relative;
  text-align: center;
`;

const AdvisorCard = styled.div`
  background: radial-gradient(800px 400px at 10% -10%, rgba(155,89,182,0.25), transparent 60%),
              radial-gradient(700px 350px at 110% 20%, rgba(241,196,15,0.15), transparent 60%),
              linear-gradient(180deg, #0d2134 0%, #0a1621 100%);
  border: 2px solid rgba(155,89,182,0.4);
  border-radius: 20px; 
  padding: 3rem 2rem; 
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(155,89,182,0.1) 50%, transparent 70%);
    animation: shimmer 3s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0%, 100% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }
`;

const AdvisorBadge = styled(motion.div)`
  display: inline-flex; 
  align-items: center; 
  gap: 0.8rem; 
  padding: 0.8rem 1.2rem;
  border-radius: 999px; 
  font-weight: 700; 
  letter-spacing: 0.5px;
  font-size: 1.1rem;
  color: #f1c40f; 
  background: rgba(241,196,15,0.2); 
  border: 2px solid rgba(241,196,15,0.5);
  box-shadow: 0 4px 20px rgba(241,196,15,0.3);
  margin-bottom: 1.5rem;
`;

const AdvisorTitle = styled(motion.h2)`
  font-size: 3.5rem; 
  margin: 1rem 0 0.5rem;
  font-weight: 800;
  background: linear-gradient(90deg, #9b59b6 0%, #f1c40f 50%, #36a6ba 100%);
  -webkit-background-clip: text; 
  background-clip: text; 
  color: transparent;
  text-shadow: 0 0 30px rgba(155,89,182,0.3);
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const AdvisorSub = styled(motion.p)`
  color: var(--text-secondary); 
  margin: 1rem 0 2rem; 
  font-size: 1.2rem;
  line-height: 1.6;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const WaitlistForm = styled(motion.form)`
  display: flex; 
  gap: 0.8rem; 
  justify-content: center; 
  margin-top: 1.5rem; 
  flex-wrap: wrap;
  
  input { 
    background: linear-gradient(180deg, rgba(13,33,52,1), rgba(10,22,33,1));
    color: var(--text-primary); 
    border: 2px solid var(--secondary);
    padding: 1rem 1.2rem; 
    border-radius: 999px; 
    min-width: 300px; 
    outline: none;
    font-size: 1rem;
    transition: all 0.3s ease;
  }
  
  input:focus { 
    border-color: #9b59b6; 
    box-shadow: 0 0 0 4px rgba(155,89,182,0.3);
    transform: translateY(-2px);
  }
  
  button { 
    background: linear-gradient(90deg, #9b59b6, #f1c40f);
    color: #0a1621; 
    border: none; 
    padding: 1rem 1.5rem; 
    border-radius: 999px; 
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(155,89,182,0.4);
  }
  
  button:hover { 
    filter: brightness(1.1); 
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(155,89,182,0.6);
  }
`;

const PillButton = styled.button`
  padding: 0.7rem 1.1rem; border-radius: 999px; border: 1px solid var(--primary);
  background: none; color: var(--primary); font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
  transition: all 0.25s ease; display: inline-flex; align-items: center; justify-content: center;
  &:hover { background: var(--primary); color: #0a1621; box-shadow: 0 6px 14px rgba(54,166,186,0.18); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
`;

const PrimaryPill = styled(PillButton)`
  background: linear-gradient(90deg, var(--primary), #36a6ba);
  color: #0a1621;
  border-color: transparent;
  &:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(54,166,186,0.22); }
`;

// Toasts
const ToastWrap = styled.div`
  position: fixed; inset: 0; z-index: 10001;
  display: flex; align-items: center; justify-content: center;
`;

const ToastCard = styled.div`
  min-width: 320px; max-width: 460px;
  padding: 1rem 1.1rem; border-radius: 14px;
  display: grid; grid-template-columns: 24px 1fr auto; gap: 0.7rem; align-items: center;
  border: 1px solid var(--secondary);
  background: var(--background-dark);
  box-shadow: 0 16px 40px rgba(0,0,0,0.45);
`;

const ToastIcon = ({ type }) => (
  type === 'success' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2ecc71"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#e74c3c"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
  )
);

const ToastText = styled.div`
  color: var(--text-primary);
  b { color: var(--text-primary); }
  small { display: block; color: var(--text-secondary); margin-top: 2px; }
`;

const ToastClose = styled.button`
  background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px;
  &:hover { color: var(--text-primary); }
`;

const Landing = () => {
  const navigate = useNavigate();
  // Add back the state variables for modal functionality
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [waitEmail, setWaitEmail] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupInfo, setSignupInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [lastSignupEmail, setLastSignupEmail] = useState('');
  const [resendAvailable, setResendAvailable] = useState(false);

  // Toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 4500);
    return () => clearTimeout(t);
  }, [toastVisible]);

  // cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 80) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Add form change handler
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Update login function to handle form submission
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      const user = data?.user;
      if (user && !user.email_confirmed_at) {
        await sb.auth.signOut();
        throw new Error('Please verify your email before logging in.');
      }
      showToast('Welcome back!', 'success');
      setShowLoginModal(false);
      navigate('/dashboard');
    } catch (err) {
      const msg = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (()=>{ try { return JSON.stringify(err) } catch { return '' } })())
      setLoginError(msg || 'Login failed');
      showToast(msg || 'Login failed', 'error');
    } finally {
      setLoginLoading(false);
    }
  };
  
  // Add signup handler
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupInfo('');
    setResendMsg('');
    setResendAvailable(false);
    if (!formData.email || !formData.password) {
      setSignupError('Email and password are required');
      showToast('Email and password are required', 'error');
      return;
    }
    if (formData.password.length < 8) {
      setSignupError('Password must be at least 8 characters');
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setSignupError('Passwords do not match');
      showToast('Passwords do not match', 'error');
      return;
    }
    try {
      setSignupLoading(true);
      const sb = supabaseBrowser();
      const redirectTo = (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || '')) + '/auth/callback';
      const { error } = await sb.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setLastSignupEmail(formData.email);
      const sentMsg = `Verification email sent to ${formData.email}.`;
      setSignupInfo('Check your inbox and follow the link to verify your email.');
      showToast(sentMsg, 'success');
      setShowSignupModal(false);
      setShowLoginModal(true);
    } catch (err) {
      const raw = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (()=>{ try { return JSON.stringify(err) } catch { return '' } })())
      const lower = (raw || '').toLowerCase();
      if (lower.includes('rate limit') || lower.includes('too many')) {
        setLastSignupEmail(formData.email);
        setResendCooldown(60);
        setResendAvailable(true);
        const m = 'We’ve sent too many emails recently. Please wait a moment or resend.';
        setSignupError(m);
        showToast(m, 'error');
      } else if (lower.includes('already registered')) {
        setLastSignupEmail(formData.email);
        setResendAvailable(true);
        const m = 'This email is already registered. Resend verification or try logging in.';
        setSignupError(m);
        showToast(m, 'error');
      } else {
        setSignupError(raw || 'Signup failed');
        showToast(raw || 'Signup failed', 'error');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendMsg('');
    setSignupError('');
    if (!lastSignupEmail) {
      const m = 'Enter your email to resend the verification.';
      setSignupError(m);
      showToast(m, 'error');
      return;
    }
    if (resendCooldown > 0) return;
    try {
      setResendLoading(true);
      const sb = supabaseBrowser();
      const redirectTo = (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || '')) + '/auth/callback';
      const { error } = await sb.auth.resend({ type: 'signup', email: lastSignupEmail, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      const m = `Verification email resent to ${lastSignupEmail}.`;
      setResendMsg('Verification email resent. Please check your inbox.');
      showToast(m, 'success');
      setResendCooldown(60);
    } catch (err) {
      const msg = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (()=>{ try { return JSON.stringify(err) } catch { return '' } })())
      setSignupError(msg || 'Resend failed');
      showToast(msg || 'Resend failed', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const joinWaitlist = async (e) => {
    e.preventDefault(); setWaitMsg('');
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: waitEmail }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setWaitMsg('You are on the Orca 2.0 waitlist!'); setWaitEmail('');
    } catch (err) { setWaitMsg(err.message || 'Something went wrong'); }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };
  
  const circles = [
    { size: 300, x: '10%', y: '20%', delay: 0 },
    { size: 200, x: '70%', y: '15%', delay: 0.5 },
    { size: 350, x: '80%', y: '60%', delay: 1 },
    { size: 250, x: '40%', y: '85%', delay: 0.2 },
    { size: 180, x: '25%', y: '55%', delay: 0.7 },
  ];
  
  const pricingCardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    },
    hover: {
      y: -10,
      transition: { duration: 0.3 }
    }
  };
  
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('login') === '1' || params.has('verified')) {
        setShowLoginModal(true)
      }
      const req = params.get('required')
      if (req) {
        setToastType('error')
        setToastMsg('Please log in to access that page.')
        setToastVisible(true)
      }
    } catch {}
  }, [])
  
  return (
    <LandingContainer>
      <NavBar>
        <Logo>
          <img src={`${process.env.PUBLIC_URL}/assets/logo2.png`} alt="Sonar Tracker - Crypto Tracker Sonar Platform Logo" />
        </Logo>
        <NavLinks>
          <NavLink onClick={() => {
            const element = document.getElementById('about');
            const navbarHeight = 100; // approximate height of navbar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }}>
            About
          </NavLink>

          <NavLink onClick={() => {
            const element = document.getElementById('screenshots');
            const navbarHeight = 100; // approximate height of navbar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }}>
            Features
          </NavLink>

          <NavLink onClick={() => navigate('/ai-advisor')} title="AI-powered crypto trading insights and recommendations">
            AI Advisor
          </NavLink>
          <NavLink onClick={() => navigate('/blog')} title="Crypto analytics guides and educational content">
            Blog
          </NavLink>
          <LoginButton onClick={() => setShowLoginModal(true)} title="Sign in to access premium features">
            Login
          </LoginButton>
        </NavLinks>
      </NavBar>
      
      <HeroSection>
        <WhaleBackground>
          <svg className="whale-svg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M40,70 C35,60 30,65 25,70 C20,75 15,80 15,90 C15,95 20,100 25,100 C30,100 30,95 35,95 C40,95 45,100 50,100 C55,100 60,95 65,90 C70,85 80,80 85,75 C90,70 95,65 150,50 L120,60 C75,65 70,70 65,75 C60,80 55,85 50,85 C45,85 40,80 40,70 Z" />
            <circle cx="30" cy="80" r="2" />
            <path d="M100,60 C110,50 120,45 130,45" stroke="currentColor" strokeWidth="3" fill="none" />
            <path d="M100,50 C115,40 130,35 145,35" stroke="currentColor" strokeWidth="3" fill="none" />
            <path d="M100,40 C120,30 140,25 160,25" stroke="currentColor" strokeWidth="3" fill="none" />
          </svg>
          <motion.div 
            className="coin"
            animate={{ 
              y: [0, -15, 0],
              rotate: 360,
            }}
            transition={{ 
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              rotate: { repeat: Infinity, duration: 8, ease: "linear" }
            }}
          >
            S
          </motion.div>
        </WhaleBackground>
        
        <FloatingElements>
          {circles.map((circle, index) => (
            <Circle
              key={index}
              style={{
                width: circle.size,
                height: circle.size,
                left: circle.x,
                top: circle.y
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.1, scale: 1 }}
              transition={{ duration: 2, delay: circle.delay, repeat: Infinity, repeatType: 'reverse' }}
            />
          ))}
        </FloatingElements>
        
        <HeroContent>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <HeroTitle variants={itemVariants}>
              Sonar Tracker: Advanced Crypto Tracker Sonar Platform
            </HeroTitle>
            
            <HeroSubtitle variants={itemVariants}>
              The leading crypto tracker sonar for real-time whale monitoring. 
              Sonar Tracker delivers professional blockchain analytics and crypto sonar tracker 
              technology for institutional traders and crypto investors.
            </HeroSubtitle>
            
            <ButtonGroup
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <Button
                className="primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLoginModal(true)}
                title="Sign up to access real-time crypto statistics and whale tracking"
              >
                Get Started
              </Button>
              <Button
                className="secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const element = document.getElementById('screenshots');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="See Sonar Tracker dashboard screenshots and features"
              >
                View Demo
              </Button>
            </ButtonGroup>
          </motion.div>
        </HeroContent>
      </HeroSection>
      
      <AboutSection id="about">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          Who We Are
        </motion.h2>
        
        <AboutContent>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <p>
              Sonar is a revolutionary cryptocurrency intelligence platform powered by advanced AI
              and real-time blockchain data processing. We've built a massive AI-assisted pipeline
              that continuously monitors and analyzes whale transactions across multiple blockchains
              with unprecedented accuracy and speed.
            </p>
            <p>
              Our proprietary system processes over 8 analysis phases, including pattern recognition,
              whale behavior analysis, transaction clustering, risk assessment, market sentiment
              analysis, volume correlation, temporal analysis, and predictive modeling. This
              multi-layered approach ensures you get the most comprehensive and actionable insights
              available in the crypto market.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <p>
              We pull real-time data directly from blockchain networks, processing millions of
              transactions to identify significant whale movements, market trends, and trading
              opportunities. Our AI algorithms continuously learn and adapt to market conditions,
              providing you with insights that evolve with the market itself.
            </p>
            <p>
              Whether you're a professional trader seeking institutional-grade analytics or an
              investor looking to understand market dynamics, Sonar delivers the intelligence
              you need to navigate the complex world of digital assets with confidence and precision.
            </p>
          </motion.div>
        </AboutContent>
      </AboutSection>

      <PipelineSection id="pipeline">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          How Our AI Pipeline Works
        </motion.h2>

        <PipelineFlow>
          {/* Data Ingestion */}
          <motion.div
            className="pipeline-step data-ingestion"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="step-content">
              <h3>Data Ingestion</h3>
              <div className="step-icon">📊</div>
              <p>Real-time data streams from multiple blockchain networks</p>
              <div className="step-details">
                <span>Millions of transactions processed daily</span>
                <span>Live blockchain connections</span>
                <span>Sub-second data refresh</span>
              </div>
            </div>
          </motion.div>

          {/* Arrow 1 */}
          <motion.div
            className="arrow"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            →
          </motion.div>

          {/* Analysis Phases */}
          <motion.div
            className="pipeline-step analysis-phases"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="step-content">
              <h3>AI Analysis Engine</h3>
              <div className="step-icon">🧠</div>
              <p>8 sophisticated analysis phases working in parallel</p>

              <div className="phases-grid">
                <div className="phase-item">
                  <div className="phase-number">1</div>
                  <span>Pattern Recognition</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">2</div>
                  <span>Whale Behavior Analysis</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">3</div>
                  <span>Transaction Clustering</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">4</div>
                  <span>Risk Assessment</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">5</div>
                  <span>Market Sentiment Analysis</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">6</div>
                  <span>Volume Correlation</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">7</div>
                  <span>Temporal Analysis</span>
                </div>
                <div className="phase-item">
                  <div className="phase-number">8</div>
                  <span>Predictive Modeling</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Arrow 2 */}
          <motion.div
            className="arrow"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            →
          </motion.div>

          {/* End Result */}
          <motion.div
            className="pipeline-step end-result"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="step-content">
              <h3>Intelligence Output</h3>
              <div className="step-icon">🎯</div>
              <p>Actionable insights delivered to your dashboard</p>
              <div className="step-details">
                <span>Real-time whale tracking</span>
                <span>Market sentiment analysis</span>
                <span>Risk assessments</span>
                <span>Trading opportunities</span>
              </div>
            </div>
          </motion.div>
        </PipelineFlow>


      </PipelineSection>

      <ScreenshotsSection id="screenshots">
        <h2>See the Dashboard in Action</h2>
        <ScreenshotsContainer>
          <h3>Powerful Analytics at Your Fingertips</h3>
          <ScreenshotGrid>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/stats-dashboard.png`} alt="Sonar Tracker Statistics Dashboard - Real-time crypto whale tracking and market analytics interface" loading="lazy" />
              <div className="caption">Real-time crypto transaction monitoring</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/top-coins.png`} alt="Sonar Tracker Top Coins Analysis - Cryptocurrency market trends and leaderboards" loading="lazy" />
              <div className="caption">Top buying and selling coin trends</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/price-filter.png`} alt="Sonar Tracker Price Filter - Customizable crypto transaction filters and thresholds" loading="lazy" />
              <div className="caption">Customizable price threshold filters</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/news-feed.png`} alt="Sonar Tracker News Feed - Latest cryptocurrency market news and trading updates" loading="lazy" />
              <div className="caption">Latest crypto news categorized by market activity</div>
            </Screenshot>
          </ScreenshotGrid>
        </ScreenshotsContainer>
      </ScreenshotsSection>
      
      <PricingSection id="pricing">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          Currently Free to Use
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
        >
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🎉 Demo Phase - No Credit Card Required</h3>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            We're currently in our demo phase, offering full access to all features completely free. 
            Experience the power of real-time whale tracking, advanced analytics, and AI insights without any cost.
          </p>
          
          <div style={{ 
            background: 'linear-gradient(135deg, var(--secondary), var(--background-card))', 
            padding: '2rem', 
            borderRadius: '15px',
            border: '2px solid var(--primary)',
            marginBottom: '2rem'
          }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>What You Get (100% Free):</h4>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem',
              textAlign: 'left'
            }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> Real-time whale transaction monitoring
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> Advanced filtering and analytics
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> Multi-chain support
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> Historical data access
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> AI-powered insights
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span> Priority support
              </li>
            </ul>
          </div>
          
          <Button 
            className="primary" 
            style={{ 
              width: 'auto', 
              padding: '1rem 2rem', 
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, var(--primary), #2ecc71)'
            }}
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowLoginModal(true);
            }}
          >
            Start Using Sonar Free
          </Button>
          
          <p style={{ 
            marginTop: '1rem', 
            color: 'var(--text-secondary)', 
            fontSize: '0.9rem',
            fontStyle: 'italic'
          }}>
            * Demo phase pricing. Future pricing will be announced with advance notice.
          </p>
        </motion.div>
      </PricingSection>
      
      <AdvisorSection id="advisor">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{ marginBottom: '3rem' }}
        >
          <h2 style={{ 
            fontSize: '2.5rem', 
            color: 'var(--text-primary)', 
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            The Future of Crypto Intelligence
          </h2>
          <p style={{ 
            fontSize: '1.3rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '700px', 
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Experience the next generation of AI-powered cryptocurrency analysis
          </p>
        </motion.div>
        
        <AdvisorCard>
          <AdvisorBadge initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <span role="img" aria-label="orca" style={{ fontSize: '1.3rem' }}>🐋</span> ORCA 2.0 — AI Crypto Advisor
          </AdvisorBadge>
          <AdvisorTitle initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Follow the Pods with SONAR Precision
          </AdvisorTitle>
          <AdvisorSub initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.15 }}>
            Personalized trading ideas from whale flows, risk-managed entries, and instant alerts. 
            Join the waitlist to get early access to the most advanced crypto intelligence platform.
          </AdvisorSub>
          <WaitlistForm onSubmit={joinWaitlist} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <input type="email" placeholder="Join the ORCA 2.0 waitlist — your@email.com" value={waitEmail} onChange={e=>setWaitEmail(e.target.value)} required />
            <button type="submit">Join Waitlist</button>
          </WaitlistForm>
          {waitMsg && <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{waitMsg}</p>}
        </AdvisorCard>
      </AdvisorSection>

      {/* Hidden SEO Content for Keyword Variations */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, fontSize: '1px' }}>
        <h1>Sonar Tracker - Crypto Tracker Sonar Platform</h1>
        <p>Crypto tracker sonar technology by Sonar Tracker. The leading sonar tracker for cryptocurrency whale monitoring. Professional crypto sonar tracker platform for blockchain analytics. Sonar crypto tracker with real-time whale tracking capabilities.</p>
        <p>Tracker sonar crypto solutions including whale tracker sonar, crypto tracking sonar, and sonar blockchain tracker features. Sonar whale tracker for institutional crypto trading.</p>
      </div>

      {/* Footer with Strategic Internal Links */}
      <footer style={{
        background: 'var(--background-dark)',
        padding: '3rem 2rem 1rem',
        borderTop: '1px solid var(--secondary)',
        marginTop: '4rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <img src={`${process.env.PUBLIC_URL}/assets/logo2.png`} alt="Sonar Tracker Logo" style={{ width: '120px', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Professional crypto whale tracking and blockchain analytics platform for institutional traders.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Platform</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>

              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/ai-advisor" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="AI-powered crypto trading insights">AI Advisor</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Resources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/blog" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Crypto analytics guides and educational content">Blog</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Frequently asked questions about crypto analytics">FAQ</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/tokens" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Token analysis and leaderboards">Tokens</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/whales" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Whale tracking and leaderboards">Whales</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Privacy policy and data protection">Privacy Policy</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                   title="Terms of service and usage guidelines">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--secondary)',
          marginTop: '2rem',
          paddingTop: '1rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          <p>© 2024 Sonar Tracker. Professional crypto analytics for institutional traders.</p>
        </div>
      </footer>

      {showLoginModal && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FormContainer
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Login to Your Account</h3>
            <Form onSubmit={handleLogin}>
              <FormGroup>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  required
                />
              </FormGroup>
              {loginError && <p style={{ color: 'tomato', margin: 0 }}>{loginError}</p>}
              <ButtonContainer>
                <PillButton type="button" onClick={() => setShowLoginModal(false)}>
                  Cancel
                </PillButton>
                <button type="submit" className="submit" disabled={loginLoading}>
                  {loginLoading ? 'Logging in…' : 'Login'}
                </button>
              </ButtonContainer>
              <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <NavButton
                  style={{ color: 'var(--primary)', display: 'inline', padding: 0 }}
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                  }}
                >
                  Sign up
                </NavButton>
              </p>
            </Form>
          </FormContainer>
        </Modal>
      )}
      
      {showSignupModal && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FormContainer
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Create an Account</h3>
            <Form onSubmit={handleSignup}>
              <FormGroup>
                <label htmlFor="signup-email">Email</label>
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  value={formData.email}
                  onChange={(e)=>{ setFormData({ ...formData, email: e.target.value }); setLastSignupEmail(e.target.value); }}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  name="password"
                  value={formData.password}
                  onChange={(e)=> setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor="confirm-password">Retype Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e)=> setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </FormGroup>
              {signupError && <p style={{ color: 'tomato', margin: 0 }}>{signupError}</p>}
              {signupInfo && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{signupInfo}</p>}
              {resendMsg && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{resendMsg}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <PillButton type="button" onClick={() => setShowSignupModal(false)}>
                  Cancel
                </PillButton>
                <PrimaryPill type="submit" disabled={signupLoading}>
                  {signupLoading ? 'Creating…' : 'Sign Up'}
                </PrimaryPill>
                {resendAvailable && (
                  <PillButton type="button" disabled={resendLoading || resendCooldown > 0} onClick={resendVerification}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : (resendLoading ? 'Resending…' : 'Resend email')}
                  </PillButton>
                )}
              </div>
            </Form>
          </FormContainer>
        </Modal>
      )}

      {/* Toasts */}
      {toastVisible && (
        <ToastWrap>
          <ToastCard $type={toastType} role="status" aria-live="polite">
            <ToastIcon type={toastType} />
            <ToastText>
              {toastMsg}
              {toastType === 'success' && <small>It can take a few seconds to arrive.</small>}
            </ToastText>
            <ToastClose onClick={() => setToastVisible(false)}>×</ToastClose>
          </ToastCard>
        </ToastWrap>
      )}
    </LandingContainer>
  );
};

export default Landing;