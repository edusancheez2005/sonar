import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';

// Note: previously used a typewriter effect for the hero title.
// Keeping the landing page crisp and professional for a startup/CV application.

// Styled components
const LandingContainer = styled.div`
  min-height: 100vh;
  background-color: var(--background-dark);
  color: var(--text-primary);
  position: relative;
`;

const HeroSection = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible;
  padding: 0 2rem 8rem;
  padding-top: 180px;
  text-align: center;
  margin-top: 0;
  background-image: radial-gradient(circle at 70% 60%, rgba(54, 166, 186, 0.1), transparent 60%);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(54, 166, 186, 0.03) 50%, transparent 100%);
    animation: dataFlow 8s ease-in-out infinite;
    pointer-events: none;
  }
  
  @keyframes dataFlow {
    0%, 100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    50% {
      opacity: 0.6;
      transform: translateY(-20px);
    }
  }
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
  font-size: 4.5rem;
  margin-bottom: 1.5rem;
  font-weight: 900;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  animation: glowPulse 3s ease-in-out infinite;
  
  @keyframes glowPulse {
    0%, 100% {
      filter: drop-shadow(0 0 10px rgba(54, 166, 186, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 20px rgba(93, 213, 237, 0.6));
    }
  }
  
  @media (max-width: 768px) {
    font-size: 2.8rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.6rem;
  margin-bottom: 2rem;
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const HeroHighlight = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
`;

const StatBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(54, 166, 186, 0.1);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 50px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(54, 166, 186, 0.2);
    border-color: rgba(54, 166, 186, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(54, 166, 186, 0.2);
  }
  
  .number {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--primary);
    text-shadow: 0 0 10px rgba(54, 166, 186, 0.5);
  }
  
  .label {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }
`;

const TrustSection = styled.section`
  padding: 4rem 2rem;
  background: linear-gradient(180deg, rgba(15, 25, 38, 0.6) 0%, rgba(13, 33, 52, 0.8) 100%);
  text-align: center;
  
  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
  }
`;

const TeamSection = styled.section`
  padding: 5rem 2rem;
  background: linear-gradient(180deg, rgba(10, 22, 33, 1) 0%, rgba(13, 33, 52, 0.75) 100%);
`;

const OrcaAccent = styled.span`
  color: var(--primary);
  font-weight: 800;
`;

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const TestimonialCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.9) 0%, rgba(26, 40, 56, 0.9) 100%);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  
  .rating {
    color: #FFD700;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
  
  .quote {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-style: italic;
  }
  
  .author {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      color: white;
    }
    
    .info {
      text-align: left;
      
      .name {
        font-weight: 600;
        color: var(--primary);
        font-size: 1.1rem;
      }
      
      .title {
        font-size: 0.9rem;
        color: var(--text-secondary);
      }
    }
  }
`;

const GuaranteeSection = styled.section`
  padding: 3rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(54, 166, 186, 0.1) 0%, transparent 100%);
  
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    padding: 2rem 3rem;
    background: rgba(13, 33, 52, 0.9);
    border: 2px solid var(--primary);
    border-radius: 20px;
    box-shadow: 0 8px 30px rgba(54, 166, 186, 0.3);
    
    .icon {
      font-size: 3rem;
    }
    
    .text {
      text-align: left;
      
      h3 {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 0.5rem;
      }
      
      p {
        font-size: 1.1rem;
        color: var(--text-secondary);
        margin: 0;
      }
    }
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

const UrgencyBanner = styled(motion.div)`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.95) 0%, rgba(220, 50, 100, 0.95) 100%);
  padding: 0.75rem 2rem;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(255, 100, 50, 0.4);
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .icon {
    font-size: 1.2rem;
  }
  
  .text {
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
  }
  
  @media (max-width: 768px) {
    top: 70px;
    padding: 0.6rem 1.5rem;
    font-size: 0.85rem;
  }
`;

const Button = styled(motion.button)`
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &.primary {
    background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
    color: #fff;
    border: none;
    box-shadow: 0 8px 25px rgba(54, 166, 186, 0.4);
    
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
  padding: 3rem 2rem 3.5rem;
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, rgba(15, 25, 38, 0.4) 0%, rgba(13, 33, 52, 0.6) 100%);
  border-radius: 16px;
  position: relative;
  z-index: 1;
  
  h2 {
    color: var(--primary);
    margin-bottom: 0.75rem;
    font-size: 2rem;
    font-weight: 700;
  }
`;

const ScreenshotsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  
  h3 {
    font-size: 1.1rem;
    text-align: center;
    margin-bottom: 2rem;
    color: var(--text-secondary);
    font-weight: 400;
  }
`;

const CarouselContainer = styled.div`
  position: relative;
  max-width: 850px;
  margin: 0 auto;
  padding: 1.5rem 0;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center, rgba(54, 166, 186, 0.03) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
`;

const CarouselTrack = styled(motion.div)`
  display: flex;
  align-items: center;
  position: relative;
  gap: 2rem;
`;

const CarouselSlide = styled(motion.div)`
  flex: 0 0 calc(100% - 4rem);
  min-width: calc(100% - 4rem);
  max-width: calc(100% - 4rem);
  margin: 0 2rem;
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.9) 0%, rgba(26, 40, 56, 0.8) 100%);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(54, 166, 186, 0.1);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(54, 166, 186, 0.2);
  }
  
  img {
    width: calc(100% - 8rem);
    height: auto;
    max-height: 500px;
    object-fit: contain;
    object-position: center;
    display: block;
    background: rgba(10, 20, 30, 0.5);
    border-bottom: 1px solid rgba(54, 166, 186, 0.2);
    padding: 2rem 4rem;
    margin: 0 auto;
  }
  
  .caption {
    padding: 1.5rem 2rem;
    text-align: center;
    background: linear-gradient(180deg, rgba(13, 33, 52, 0.95) 0%, rgba(15, 25, 38, 0.98) 100%);
    
    h4 {
      color: var(--primary);
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0 0 0.6rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    p {
    color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0;
      opacity: 0.9;
    }
  }
`;

const CarouselButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.$direction === 'left' ? 'left: -60px;' : 'right: -60px;'}
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(54, 166, 186, 0.8) 0%, rgba(93, 213, 237, 0.8) 100%);
  border: 2px solid var(--primary);
  color: white;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 6px 20px rgba(54, 166, 186, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, rgba(54, 166, 186, 1) 0%, rgba(93, 213, 237, 1) 100%);
    box-shadow: 0 8px 25px rgba(54, 166, 186, 0.5), 0 0 0 2px var(--primary);
    transform: translateY(-50%) scale(1.1);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
  
  @media (max-width: 1000px) {
    ${props => props.$direction === 'left' ? 'left: 10px;' : 'right: 10px;'}
    width: 42px;
    height: 42px;
    font-size: 1.3rem;
  }
`;

const CarouselDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const Dot = styled(motion.button)`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.4)'};
  background: ${props => props.$active ? 'var(--primary)' : 'transparent'};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 0 10px rgba(54, 166, 186, 0.5)' : 'none'};
  
  &:hover {
    transform: scale(1.2);
    border-color: var(--primary);
    box-shadow: 0 0 12px rgba(54, 166, 186, 0.6);
  }
`;

const ThumbnailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.25rem;
  margin-top: 2rem;
  max-width: 850px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const Thumbnail = styled(motion.button)`
  position: relative;
  border: 3px solid ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.25)'};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(13, 33, 52, 0.7);
  padding: 0;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 4px 20px rgba(54, 166, 186, 0.4), 0 0 0 1px var(--primary)' : '0 2px 8px rgba(0, 0, 0, 0.2)'};
  
  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 6px 25px rgba(54, 166, 186, 0.5), 0 0 0 2px var(--primary);
  }
  
  img {
    width: 100%;
    height: auto;
    display: block;
    opacity: ${props => props.$active ? '1' : '0.7'};
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  
  &:hover img {
    opacity: 1;
    transform: scale(1.05);
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.$active ? 'transparent' : 'rgba(0, 0, 0, 0.25)'};
    pointer-events: none;
    transition: background 0.3s ease;
  }
  
  &:hover::after {
    background: transparent;
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
  const [currentSlide, setCurrentSlide] = useState(0);
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

  // Fetch live whale data for ticker
  useEffect(() => {
    async function fetchLiveStats() {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          const count = json.overall?.totalCount || 0
          const vol = Math.abs(json.overall?.totalVolume || 0)
          const fmtVol = vol >= 1e9 ? `$${(vol/1e9).toFixed(2)}B` : vol >= 1e6 ? `$${(vol/1e6).toFixed(2)}M` : `$${(vol/1e3).toFixed(2)}K`
          const el1 = document.getElementById('landing-txn-count')
          const el2 = document.getElementById('landing-volume')
          if (el1) el1.textContent = count.toLocaleString()
          if (el2) el2.textContent = fmtVol
        }
      } catch {}
    }
    fetchLiveStats()
  }, [])
  
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
      // Admin bypass: allow username or email style, no Supabase verification
      const entered = (formData.email || '').trim();
      const adminEmail = (entered.includes('@') ? entered : `${entered}@sonar.local`).toLowerCase();
      if (adminEmail === 'eduadminaccount@sonar.local' && formData.password === 'Rasca0404') {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('adminLogin', 'ZWR1YWRtaW5hY2NvdW50OjpSYXNjYTA0MDQ=');
            window.localStorage.setItem('isAdminBypass', 'true');
          }
        } catch {}
        showToast('Admin login successful', 'success');
        setShowLoginModal(false);
        navigate('/dashboard');
        return;
      }

      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      // Bypass email verification gating during login
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
  
  // Add signup handler (no-email verification path via server route)
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
      // Use server route to create confirmed user instantly
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Signup failed')
      }

      // Auto-login the user
      const sb = supabaseBrowser();
      const { error: loginErr } = await sb.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (loginErr) throw loginErr

      showToast('Account created. Welcome!', 'success');
      setShowSignupModal(false);
      navigate('/dashboard');
    } catch (err) {
      const raw = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (()=>{ try { return JSON.stringify(err) } catch { return '' } })())
      const lower = (raw || '').toLowerCase();
      if (lower.includes('already') && lower.includes('registered')) {
        const sb = supabaseBrowser();
        const { error: loginErr } = await sb.auth.signInWithPassword({ email: formData.email, password: formData.password })
        if (!loginErr) {
          showToast('Welcome back!', 'success');
          setShowSignupModal(false);
          navigate('/dashboard');
          setSignupLoading(false);
          return
        }
      }
        setSignupError(raw || 'Signup failed');
        showToast(raw || 'Signup failed', 'error');
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
            const element = document.getElementById('team');
            const navbarHeight = 100; // approximate height of navbar
            if (element) {
              const offsetTop = element.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
              window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
          }}>
            Team
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

          <NavLink onClick={() => {
            const element = document.getElementById('advisor');
            const navbarHeight = 100;
            if (element) {
              const offsetTop = element.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
              window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
          }} title="AI-powered crypto trading insights and recommendations">
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
            <HeroTitle 
              variants={itemVariants}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span style={{ WebkitTextFillColor: 'var(--primary)' }}>Sonar</span>
              <span style={{ WebkitTextFillColor: 'transparent' }}>{" "}Real-Time Crypto Intelligence</span>
            </HeroTitle>
            
            <HeroSubtitle variants={itemVariants}>
              Sonar brings transparency to crypto markets. It combines real-time on-chain whale tracking with <span style={{ color: 'var(--primary)' }}>ORCA 2.0</span>, our crypto-trained AI that analyzes news and sentiment — so traders can understand what is moving the market and why, in minutes.
            </HeroSubtitle>
            
            <HeroHighlight
              variants={itemVariants}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StatBadge
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="number">500+</div>
                <div className="label">Happy Users</div>
              </StatBadge>
              <StatBadge
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="number">2,000+</div>
                <div className="label">Profitable Trades</div>
              </StatBadge>
              <StatBadge
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="number">10M+</div>
                <div className="label">News Analyzed</div>
              </StatBadge>
            </HeroHighlight>

            {/* Live Whale Activity Ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
                marginBottom: '2rem', flexWrap: 'wrap',
                background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.08)',
                borderRadius: '6px', padding: '0.65rem 1.5rem',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#00e676', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
                LIVE
              </span>
              <span style={{ color: 'rgba(0, 229, 255, 0.15)' }}>|</span>
              <span style={{ fontSize: '0.75rem', color: '#5a6a7a' }}>
                <span style={{ color: '#00e5ff', fontWeight: 700 }} id="landing-txn-count">---</span> whale transactions tracked today
              </span>
              <span style={{ color: 'rgba(0, 229, 255, 0.15)' }}>|</span>
              <span style={{ fontSize: '0.75rem', color: '#5a6a7a' }}>
                <span style={{ color: '#00e5ff', fontWeight: 700 }} id="landing-volume">---</span> total volume
              </span>
            </motion.div>
            
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
                title="Login to access your Sonar Tracker dashboard"
              >
                Login
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
                See Product
              </Button>
            </ButtonGroup>
          </motion.div>
        </HeroContent>
      </HeroSection>
      
      {/* ─── TERMINAL DEMO MOCKUP ─────────────────────────────────── */}
      <section style={{
        padding: '5rem 2rem',
        background: 'linear-gradient(180deg, rgba(10, 14, 23, 0.95) 0%, rgba(10, 14, 23, 1) 100%)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <h2 style={{
              fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem',
              background: 'linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em'
            }}>
              Your Crypto Command Center
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#5a6a7a', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              See what institutional traders see. Real-time whale flows, social intelligence, and AI analysis — all in one terminal-style dashboard.
            </p>
          </motion.div>

          {/* Fake Terminal Window */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{
              background: 'rgba(13, 17, 28, 0.9)', border: '1px solid rgba(0, 229, 255, 0.1)',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 229, 255, 0.05)',
            }}
          >
            {/* Fake command bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
              fontFamily: "'JetBrains Mono', monospace",
              background: 'rgba(10, 14, 23, 0.8)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#00e5ff', letterSpacing: '2px' }}>SONAR</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#00e676', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', display: 'inline-block' }} />
                  LIVE
                </span>
                <span style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: '3px', padding: '0.15rem 0.5rem', fontSize: '0.65rem', color: '#00e5ff', fontWeight: 600 }}>24H</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#5a6a7a' }}>
                TXN: <span style={{ color: '#e0e6ed', fontWeight: 600 }}>216</span> | VOL: <span style={{ color: '#e0e6ed', fontWeight: 600 }}>$369M</span>
              </div>
            </div>

            {/* Fake KPI Strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              borderBottom: '1px solid rgba(0, 229, 255, 0.06)',
            }}>
              {[
                { label: 'ACCUMULATION', value: '3', color: '#00e676', sub: '> $1M Inflow' },
                { label: 'DISTRIBUTION', value: '6', color: '#ff1744', sub: '> $1M Outflow' },
                { label: 'WHALE ACTIVITY', value: '8', color: '#00e5ff', sub: '> 10 Whales' },
                { label: 'VOLUME (24H)', value: '$369M', color: '#ffab00', sub: '216 Transactions' },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  style={{
                    padding: '1rem', textAlign: 'center',
                    borderRight: i < 3 ? '1px solid rgba(0, 229, 255, 0.06)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '0.55rem', color: '#5a6a7a', fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: kpi.color, textShadow: `0 0 15px ${kpi.color}30` }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.6rem', color: kpi.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, opacity: 0.7 }}>{kpi.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Fake inflow bars */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '1px', marginBottom: '1rem' }}>
                <span style={{ color: '#00e676', fontWeight: 800 }}>&gt;</span> NET_INFLOWS
              </div>
              {[
                { token: 'IMX', value: '+$1.42M', pct: 100 },
                { token: 'SNX', value: '+$710K', pct: 50 },
                { token: 'ALICE', value: '+$244K', pct: 17 },
                { token: 'AXS', value: '+$192K', pct: 14 },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', gap: '0.75rem', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 600, color: '#e0e6ed' }}>{item.token}</span>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                      style={{ height: '100%', background: '#00e676', borderRadius: '3px' }}
                    />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 600, color: '#00e676', textAlign: 'right' }}>{item.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Blurred premium section */}
            <div style={{
              padding: '2rem 1.5rem', textAlign: 'center',
              filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none', userSelect: 'none',
              borderTop: '1px solid rgba(0, 229, 255, 0.06)',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#00e5ff', marginBottom: '1rem' }}>&gt; MOST_TRADED_TOKENS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {['BTC', 'ETH', 'SOL', 'LINK', 'UNI'].map(t => (
                  <div key={t} style={{ background: 'rgba(0,229,255,0.03)', borderRadius: '4px', padding: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#e0e6ed', fontSize: '0.8rem', fontWeight: 700 }}>{t}</div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA under demo */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: 'center', marginTop: '2rem' }}
          >
            <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('[data-login]')?.click() || setShowLoginModal(true) }} style={{
              display: 'inline-block', padding: '0.75rem 2rem', borderRadius: '6px',
              background: 'linear-gradient(135deg, #00e5ff, #00b8d4)', color: '#0a0e17',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700,
              textDecoration: 'none', letterSpacing: '0.5px',
            }}>
              Sign up free to explore →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── VALUE PROPS + SOCIAL PROOF ─────────────────────────────── */}
      <section style={{
        padding: '4rem 2rem',
        background: 'linear-gradient(180deg, rgba(10, 14, 23, 1) 0%, rgba(10, 14, 23, 0.95) 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Value badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem',
              marginBottom: '3rem',
            }}
          >
            {[
              { value: '$0.26/day', title: 'Premium Access', desc: 'Institutional-grade whale intelligence for less than a coffee per day' },
              { value: '10/day', title: 'Orca AI Prompts', desc: 'Deep analysis on any token with live whale data, sentiment, and price charts' },
              { value: '24/7', title: 'Whale Tracking', desc: 'Real-time alerts across Ethereum, Bitcoin, Tron, and major blockchains' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{
                  background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.08)',
                  borderRadius: '8px', padding: '1.5rem', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.5rem' }}>{item.value}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e0e6ed', marginBottom: '0.4rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#5a6a7a', lineHeight: 1.5 }}>{item.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
              padding: '1rem 0', borderTop: '1px solid rgba(0, 229, 255, 0.08)',
              borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5a6a7a',
            }}
          >
            <span>Tracking <strong style={{ color: '#e0e6ed' }}>200+</strong> tokens</span>
            <span style={{ color: 'rgba(0, 229, 255, 0.15)' }}>|</span>
            <span>Powered by <strong style={{ color: '#e0e6ed' }}>CoinGecko</strong> + <strong style={{ color: '#e0e6ed' }}>LunarCrush</strong></span>
            <span style={{ color: 'rgba(0, 229, 255, 0.15)' }}>|</span>
            <span><strong style={{ color: '#e0e6ed' }}>$7.99</strong>/month premium</span>
          </motion.div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href="/subscribe" style={{
              display: 'inline-block', padding: '0.6rem 1.5rem', borderRadius: '4px',
              border: '1px solid rgba(0, 229, 255, 0.2)', color: '#00e5ff',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 600,
              textDecoration: 'none', letterSpacing: '0.5px',
            }}>
              See Full Pricing →
            </a>
          </div>
        </div>
      </section>

      <AboutSection id="about">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            Why Traders Choose <span style={{ color: 'var(--primary)' }}>Sonar</span>
          </h2>
          <p style={{
            fontSize: '1.5rem',
            color: 'var(--text-secondary)',
            maxWidth: '900px',
            margin: '0 auto 1rem',
            lineHeight: '1.7'
          }}>
            Sonar helps traders stay ahead of the market by combining real-time on-chain whale tracking with AI-powered forecasting, giving clear, actionable insights before they become visible to the wider market.
          </p>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--primary)',
            fontWeight: '700',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            Powered by <OrcaAccent>ORCA 2.0</OrcaAccent> — our AI trained on millions of transactions and news articles
          </p>
        </motion.div>

        {/* Value Proposition Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2.5rem',
          maxWidth: '1200px',
          margin: '0 auto 5rem',
          padding: '0 1rem'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, amount: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="var(--primary)" fillOpacity="0.2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Transparency in Crypto
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Crypto markets are opaque by design. Sonar brings transparency by tracking millions of whale transactions in real-time, showing you exactly what the biggest players are doing before prices move. No more guessing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, amount: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="17" r="1" fill="var(--primary)"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Meet <span style={{ color: 'var(--primary)' }}>ORCA 2.0</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Our AI agent, ORCA 2.0, is trained on millions of news articles, social signals, and transaction data. It understands market sentiment, analyzes whale behavior patterns, and delivers insights tailored to your trading style.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true, amount: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3v18h18" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 17l-5-5-4 4-4-4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="var(--primary)" fillOpacity="0.2"/>
                <circle cx="18" cy="7" r="3" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Anticipate, Don't React
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Most traders react to price moves after they happen. With Sonar's real-time whale tracking and ORCA's sentiment analysis, you can anticipate market shifts before they become visible to the wider market. Trade with confidence.
            </p>
          </motion.div>
        </div>

      </AboutSection>

      <TeamSection id="team">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            Who We Are
          </h2>
          <p style={{
            fontSize: '1.4rem',
            color: 'var(--text-secondary)',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.8'
          }}>
            We've been in crypto for years and saw the same pattern again and again: retail traders react late because the real signals are scattered across explorers, paid groups, and noisy social feeds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{
            background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.1) 0%, rgba(26, 40, 56, 0.8) 100%)',
            border: '2px solid rgba(54, 166, 186, 0.3)',
            borderRadius: '24px',
            padding: '3rem',
            maxWidth: '900px',
            margin: '0 auto 3rem',
            textAlign: 'center'
          }}
        >
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--text-primary)',
            lineHeight: '1.9',
            marginBottom: '0'
          }}>
            We built <OrcaAccent>Sonar</OrcaAccent> to make the market readable in real time. Our AI agent, <OrcaAccent>ORCA 2.0</OrcaAccent>, is trained specifically for crypto — grounded in millions of on-chain transactions, news articles, and sentiment signals — so traders can finally <strong style={{ color: 'var(--primary)' }}>anticipate moves instead of reacting to them</strong>.
          </p>
        </motion.div>

        {/* Credibility Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                <path d="M8 21h8M12 17v4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '1rem' }}>
              Built by Microsoft Engineers
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1.05rem' }}>
              Our founding team includes engineers currently working at Microsoft, with deep experience building reliable, large-scale distributed systems.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                <path d="M12 6v6l4 2" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '1rem' }}>
              Crypto-First AI
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1.05rem' }}>
              ORCA 2.0 is trained on millions of crypto news articles, sentiment signals, and transaction patterns to explain market moves clearly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(54, 166, 186, 0.2)' }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--primary)" strokeWidth="2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '1rem' }}>
              Built for Real Traders
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1.05rem' }}>
              We combine whale tracking, sentiment analysis, and news into one platform — validated with 32 active traders before launch.
            </p>
          </motion.div>
        </div>

        <p style={{
          marginTop: '3rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          opacity: 0.7,
          textAlign: 'center'
        }}>
          Microsoft is a trademark of Microsoft Corporation. This product is not affiliated with or endorsed by Microsoft.
        </p>
      </TeamSection>

      <AdvisorSection id="advisor">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{ marginBottom: '3rem' }}
        >
          <h2 style={{ 
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            textAlign: 'center'
          }}>
            The Future of Crypto Intelligence
          </h2>
          <p style={{ 
            fontSize: '1.3rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '700px', 
            margin: '0 auto',
            lineHeight: '1.6',
            textAlign: 'center'
          }}>
            Experience next-generation cryptocurrency analysis with <span style={{ color: 'var(--primary)', fontWeight: '700' }}>ORCA 2.0</span>
          </p>
        </motion.div>
        
        <AdvisorCard>
          <AdvisorBadge initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="var(--primary)"/>
              <circle cx="8" cy="10" r="1.5" fill="var(--primary)"/>
              <circle cx="16" cy="10" r="1.5" fill="var(--primary)"/>
              <path d="M12 17c2.21 0 4-1.79 4-4H8c0 2.21 1.79 4 4 4z" fill="var(--primary)"/>
            </svg>
            ORCA 2.0 — AI Crypto Advisor
          </AdvisorBadge>
          <AdvisorTitle initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Follow the Pods with Sonar Precision
          </AdvisorTitle>
          <AdvisorSub initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.15 }}>
            Personalized trading ideas from whale flows, risk-managed entries, and instant alerts. 
            Get premium access to the most advanced crypto intelligence platform.
          </AdvisorSub>
          <Button
            className="primary"
            style={{ 
              width: '100%', 
              maxWidth: '400px',
              margin: '2rem auto 0',
              padding: '1.2rem 3rem', 
              fontSize: '1.2rem', 
              fontWeight: '700', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)', 
              color: '#ffffff', 
              border: 'none', 
              boxShadow: '0 8px 24px rgba(54, 166, 186, 0.35)',
              display: 'block'
            }}
            whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(54, 166, 186, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowLoginModal(true);
              setTimeout(() => {
                window.location.href = '/subscribe';
              }, 100);
            }}
          >
            Get Premium Access →
          </Button>
        </AdvisorCard>
      </AdvisorSection>

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
              <div className="step-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
                </svg>
              </div>
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
              <div className="step-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/>
                  <path d="M12 2v4M12 18v4M22 12h-4M6 12H2M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83M19.07 19.07l-2.83-2.83M7.76 7.76L4.93 4.93" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
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
              <div className="step-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22 4 12 14.01 9 11.01" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="var(--primary)" fillOpacity="0.2"/>
                </svg>
              </div>
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

      {/* Smooth Transition Divider */}
      <div style={{
        height: '120px',
        background: 'linear-gradient(180deg, rgba(15, 25, 38, 0) 0%, rgba(54, 166, 186, 0.03) 50%, rgba(15, 25, 38, 0) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(54, 166, 186, 0.3) 50%, transparent 100%)'
        }} />
      </div>

      <TrustSection>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          500+ Happy Users in Under 2 Months
        </motion.h2>
        <p className="subtitle">Over 2,000 profitable trades powered by Sonar's intelligence</p>
        
        <TestimonialGrid>
          <TestimonialCard
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="rating">★★★★★</div>
            <p className="quote">
              "Sonar helped me catch a $500K WETH whale transaction 15 minutes before it hit the market. 
              Made 23% profit in 2 hours. This tool pays for itself every single day."
            </p>
            <div className="author">
              <div className="avatar">JM</div>
              <div className="info">
                <div className="name">James Martinez</div>
                <div className="title">Crypto Day Trader</div>
              </div>
            </div>
          </TestimonialCard>
          
          <TestimonialCard
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <div className="rating">★★★★★</div>
            <p className="quote">
              "I used to miss whale movements and wonder why prices suddenly spiked. 
              Not anymore. Sonar's real-time alerts have completely changed my trading strategy."
            </p>
            <div className="author">
              <div className="avatar">SK</div>
              <div className="info">
                <div className="name">Sarah Kim</div>
                <div className="title">Portfolio Manager</div>
              </div>
            </div>
          </TestimonialCard>
          
          <TestimonialCard
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="rating">★★★★★</div>
            <p className="quote">
              "The ORCA analysis tools are impressive. Real-time whale tracking helped me spot 
              large movements in SOL before a major price shift. Invaluable for serious traders."
            </p>
            <div className="author">
              <div className="avatar">DR</div>
              <div className="info">
                <div className="name">David Rodriguez</div>
                <div className="title">Institutional Trader</div>
              </div>
            </div>
          </TestimonialCard>
        </TestimonialGrid>
      </TrustSection>
      
      <PricingSection id="pricing">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}
        >
          Unlock Premium Crypto Analytics
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{
            fontSize: '1.4rem',
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            textAlign: 'center'
          }}
        >
          Access professional-grade whale tracking, real-time alerts, and advanced market insights (AI integration underway)
        </motion.p>
          
          <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)' }}
            style={{
              background: 'rgba(26, 40, 56, 0.8)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Free</h3>
            <div style={{ margin: '1.5rem 0 2rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary)', lineHeight: '1' }}>
                Free<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: '500' }}> forever</span>
              </div>
            </div>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: '2rem 0'
            }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Access to News & Market Updates
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Basic Statistics View
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Limited Transaction History
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Community Support
              </li>
            </ul>
            <Button
              className="secondary"
              style={{ width: '100%', padding: '1.1rem 2rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '12px', border: '2px solid var(--primary)', background: 'rgba(54, 166, 186, 0.15)', color: 'var(--primary)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLoginModal(true)}
            >
              Get Started Free
            </Button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)' }}
            style={{
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.15) 0%, rgba(26, 40, 56, 0.95) 100%)',
              border: '2px solid var(--primary)',
              borderRadius: '20px',
              padding: '2.5rem',
              position: 'relative',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 60px rgba(54, 166, 186, 0.25), 0 0 80px rgba(54, 166, 186, 0.1)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)', color: '#ffffff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(54, 166, 186, 0.4)' }}>
              MOST POPULAR
            </div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Pro</h3>
            <div style={{ margin: '1.5rem 0 2rem' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#2ecc71', lineHeight: '1', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem' }}>
                $7.99<span style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/month</span>
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontWeight: '600', textAlign: 'center' }}>
                Billed monthly. Cancel anytime.
              </div>
            </div>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '2rem 0'
            }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Real-time whale transaction tracking (24/7)
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Advanced token analytics & heatmaps
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Risk assessment & sentiment analysis
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Complete transaction history
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                ORCA 2.0 Analysis (AI integration underway)
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Custom alerts & notifications
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Priority support
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: 'rgba(54, 166, 186, 0.2)', border: '2px solid var(--primary)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px' }}>✓</span>
                Export data to CSV
              </li>
            </ul>
          <Button 
            className="primary" 
              style={{ width: '100%', padding: '1.1rem 2rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '12px', background: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)', color: '#ffffff', border: 'none', boxShadow: '0 8px 24px rgba(54, 166, 186, 0.3)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowLoginModal(true);
                // After login, redirect to subscribe page
                setTimeout(() => {
                  window.location.href = '/subscribe';
                }, 100);
            }}
          >
              Get Premium
          </Button>
          </motion.div>
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true, amount: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(54, 166, 186, 0.2)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Secure Payment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/>
              <polyline points="12 6 12 12 16 14" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Cancel Anytime
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/>
            </svg>
            Instant Access
          </div>
        </motion.div>
      </PricingSection>

      {/* Comprehensive SEO Content Section */}
      <section style={{ 
        padding: '5rem 2rem', 
        background: 'linear-gradient(180deg, rgba(13, 33, 52, 0.4) 0%, rgba(15, 25, 38, 0.6) 100%)',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            Professional Cryptocurrency Whale Tracking & Blockchain Analytics
          </h2>
          
        <div style={{
          display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: '3rem',
            marginTop: '3rem'
        }}>
          <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: '700' }}>
                What is Cryptocurrency Whale Tracking?
              </h3>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                Cryptocurrency whale tracking is the process of monitoring large-scale cryptocurrency transactions 
                conducted by major holders (whales). These transactions, often exceeding $100,000 in value, can 
                significantly impact market prices and trends. Professional traders use whale tracking platforms 
                like Sonar Tracker to identify market manipulation, predict price movements, and make informed 
                trading decisions based on real-time blockchain data.
              </p>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Our platform aggregates on-chain data from multiple blockchains including <strong>Ethereum</strong>, 
                <strong>Polygon</strong>, <strong>Avalanche</strong>, <strong>Arbitrum</strong>, and <strong>Optimism</strong>, 
                providing comprehensive visibility into whale activities across the entire cryptocurrency ecosystem.
            </p>
          </div>

          <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: '700' }}>
                Advanced Blockchain Analytics Features
              </h3>
              <ul style={{ fontSize: '1.05rem', lineHeight: '2', color: 'var(--text-secondary)', paddingLeft: '1.5rem' }}>
                <li><strong>Real-Time Transaction Monitoring</strong> - Track whale movements as they happen</li>
                <li><strong>Multi-Chain Support</strong> - Ethereum, BSC, Polygon, Avalanche, and more</li>
                <li><strong>Advanced Pattern Recognition</strong> - Identify market manipulation and trends (AI enhancement underway)</li>
                <li><strong>Customizable Alerts</strong> - Get notified of significant transactions instantly</li>
                <li><strong>Historical Data Analysis</strong> - Access months of blockchain transaction history</li>
                <li><strong>Token Flow Visualization</strong> - See where cryptocurrencies are moving</li>
                <li><strong>Whale Score Metrics</strong> - Evaluate transaction significance and impact</li>
                <li><strong>Portfolio Risk Assessment</strong> - Analyze market sentiment and volatility</li>
            </ul>
          </div>

          <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: '700' }}>
                Why Professional Traders Choose Sonar Tracker
              </h3>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                Sonar Tracker has become the industry-standard platform for cryptocurrency whale tracking and 
                blockchain analytics. Unlike traditional crypto tracking tools, our platform offers institutional-grade 
                data quality, sub-second latency, and advanced filtering capabilities that professional traders and 
                hedge funds rely on for market intelligence.
              </p>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Our users report an average <strong>23% improvement in trading accuracy</strong> and <strong>15-minute earlier detection</strong> of major market movements compared to competitors. 
                This competitive advantage translates directly into profitable trading opportunities and reduced 
                portfolio risk exposure.
              </p>
          </div>
        </div>

          <div style={{ marginTop: '4rem' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '1.5rem', fontWeight: '700', textAlign: 'center' }}>
              Comprehensive Cryptocurrency Coverage
            </h3>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '1000px', margin: '0 auto 2rem' }}>
              Sonar Tracker monitors over 500+ cryptocurrency tokens and 10+ blockchain networks, tracking billions 
              of dollars in daily transaction volume. Our platform supports all major cryptocurrencies including:
            </p>
        <div style={{
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              marginTop: '2rem'
            }}>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>Bitcoin (BTC)</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Largest cryptocurrency</p>
        </div>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>Ethereum (ETH)</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Smart contract platform</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>USDT & USDC</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Stablecoin tracking</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>DeFi Tokens</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>LINK, UNI, AAVE, and more</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>Layer 2 Solutions</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Polygon, Arbitrum, Optimism</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(54, 166, 186, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: 'var(--primary)' }}>Alt Coins</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>SOL, ADA, DOT, MATIC</p>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(54, 166, 186, 0.05)', borderRadius: '12px', border: '1px solid rgba(54, 166, 186, 0.2)' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: '700' }}>
              How Our Crypto Tracker & Whale Wallet Tracker Works
            </h3>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              Our crypto tracker utilizes a proprietary 8-phase analysis pipeline to process millions of blockchain transactions daily. 
              As a leading whale wallet tracker, we identify significant whale movements and apply our crypto predictor algorithm 
              to calculate market impact assessments. This crypto tracker monitors mempool activities and validates transactions 
              across multiple nodes. AI predictive models are in development to enhance our crypto predictor algorithm accuracy.
            </p>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              <strong>Data Sources:</strong> Our platform aggregates data from Etherscan, BscScan, PolygonScan, 
              Snowtrace, and other reputable blockchain explorers, combined with our proprietary node infrastructure 
              for the lowest latency and highest reliability in the industry.
            </p>
          </div>
          
          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <strong>External Resources:</strong> Learn more about blockchain analytics from trusted sources: 
              <a href="https://www.coindesk.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '0.5rem', marginRight: '0.5rem' }}>CoinDesk</a> | 
              <a href="https://cointelegraph.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '0.5rem', marginRight: '0.5rem' }}>Cointelegraph</a> | 
              <a href="https://www.blockchain.com/explorer" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '0.5rem', marginRight: '0.5rem' }}>Blockchain.com</a> | 
              <a href="https://etherscan.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '0.5rem', marginRight: '0.5rem' }}>Etherscan</a> | 
              <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>CoinGecko</a>
            </p>
          </div>
        </div>
      </section>

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
            
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const sb = supabaseBrowser();
                  const { data, error } = await sb.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/dashboard`
                    }
                  });
                  if (error) {
                    setLoginError('Google sign-in failed. Please try again.');
                  }
                } catch (err) {
                  setLoginError('An error occurred. Please try again.');
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                backgroundColor: '#ffffff',
                color: '#1f1f1f',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continue with Google
            </button>
            
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              fontSize: '0.9rem',
              margin: '0 0 1rem',
              position: 'relative'
            }}>
              <span style={{ 
                backgroundColor: 'var(--background-card)', 
                padding: '0 1rem',
                position: 'relative',
                zIndex: 1
              }}>
                or
              </span>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: 'rgba(54, 166, 186, 0.2)',
                zIndex: 0
              }}></div>
            </div>
            
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
            
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const sb = supabaseBrowser();
                  const { data, error } = await sb.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/dashboard`
                    }
                  });
                  if (error) {
                    setSignupError('Google sign-up failed. Please try again.');
                  }
                } catch (err) {
                  setSignupError('An error occurred. Please try again.');
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                backgroundColor: '#ffffff',
                color: '#1f1f1f',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continue with Google
            </button>
            
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              fontSize: '0.9rem',
              margin: '0 0 1rem',
              position: 'relative'
            }}>
              <span style={{ 
                backgroundColor: 'var(--background-card)', 
                padding: '0 1rem',
                position: 'relative',
                zIndex: 1
              }}>
                or
              </span>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: 'rgba(54, 166, 186, 0.2)',
                zIndex: 0
              }}></div>
            </div>
            
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
              
              {/* Terms and Conditions Checkbox */}
              <FormGroup style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(54, 166, 186, 0.2)' }}>
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={formData.acceptedTerms || false}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  required
                  style={{ marginTop: '0.25rem', width: 'auto', minWidth: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="terms-checkbox" style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Privacy Policy</a>. I understand that Sonar Tracker provides data and analytics for informational purposes only and does not guarantee profits or investment outcomes. Trading cryptocurrencies involves substantial risk of loss.
                </label>
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