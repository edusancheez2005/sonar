import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';

// Typewriter Effect Component
const TypeWriter = ({ text, delay = 100 }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return <span>{currentText}</span>;
};

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
              <TypeWriter text="Sonar Tracker: Real-Time Crypto Whale Intelligence" delay={50} />
            </HeroTitle>
            
            <HeroSubtitle variants={itemVariants}>
              Professional blockchain analytics platform for tracking large cryptocurrency transactions. 
              Monitor whale movements, detect market trends, and analyze on-chain data across Ethereum, 
              Polygon, Avalanche, and more. Trusted by professional traders worldwide.
            </HeroSubtitle>
            
            <motion.div
              style={{
                background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.15) 0%, rgba(54, 166, 186, 0.15) 100%)',
                border: '2px solid rgba(46, 204, 113, 0.4)',
                borderRadius: '12px',
                padding: '1rem 2rem',
                marginBottom: '2rem',
                display: 'inline-block'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2ecc71' }}>
                🎉 DEMO PHASE - FREE ACCESS FOR ALL USERS!
              </span>
            </motion.div>
            
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
                <div className="number">$2.4B+</div>
                <div className="label">Tracked Daily</div>
              </StatBadge>
              <StatBadge
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="number">100+</div>
                <div className="label">Users in 3 Weeks</div>
              </StatBadge>
              <StatBadge
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="number">24/7</div>
                <div className="label">Live Monitoring</div>
              </StatBadge>
            </HeroHighlight>
            
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
                View Demo
              </Button>
            </ButtonGroup>
          </motion.div>
        </HeroContent>
      </HeroSection>
      
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
            Why Elite Traders Choose Sonar
          </h2>
          <p style={{
            fontSize: '1.5rem',
            color: 'var(--text-secondary)',
            maxWidth: '900px',
            margin: '0 auto 1rem',
            lineHeight: '1.7'
          }}>
            Stop losing money to market manipulators. Track every whale move in real-time and trade with confidence.
          </p>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--primary)',
            fontWeight: '700',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            Join 100+ early adopters in 3 weeks of launch - no publicity, just organic growth
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
              Real-Time Precision
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Monitor millions of transactions across multiple blockchains in real-time. Our advanced pipeline processes whale movements with sub-second latency, ensuring you never miss a critical opportunity. AI integration is underway to enhance prediction accuracy.
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
              8-Phase AI Analysis
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Our proprietary system employs pattern recognition, whale behavior analysis, transaction clustering, risk assessment, sentiment analysis, volume correlation, temporal analysis, and predictive modeling for unmatched accuracy.
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
              Actionable Intelligence
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              Transform raw blockchain data into actionable insights. Our adaptive AI learns market conditions in real-time, delivering intelligence that evolves with the market to keep you ahead of the curve.
            </p>
          </motion.div>
        </div>

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

      <ScreenshotsSection id="screenshots">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          See the Dashboard in Action
        </motion.h2>
        <ScreenshotsContainer>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Powerful Analytics at Your Fingertips
          </motion.h3>
          
          <CarouselContainer>
            <CarouselTrack
              animate={{ x: `-${currentSlide * (100 + 2)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <CarouselSlide style={{ maxWidth: '500px', margin: '0 auto' }}>
                <img src={`${process.env.PUBLIC_URL}/screenshots/orca-analysis.png`} alt="Sonar ORCA AI Analysis" loading="lazy" />
                <div className="caption">
                  <h4>ORCA 2.0 Investment Analysis</h4>
                  <p>Get actionable investment recommendations from ORCA 2.0. Advanced AI integration is underway to deliver predictive analytics based on whale flows and market sentiment.</p>
                </div>
              </CarouselSlide>
              
              <CarouselSlide>
                <img src={`${process.env.PUBLIC_URL}/screenshots/dashboard-main.png`} alt="Sonar Tracker Dashboard" loading="lazy" />
                <div className="caption">
                  <h4>Real-Time Market Intelligence</h4>
                  <p>Monitor live cryptocurrency transactions with advanced whale tracking and comprehensive market analytics. Get instant insights into major market movements.</p>
                </div>
              </CarouselSlide>
              
              <CarouselSlide>
                <img src={`${process.env.PUBLIC_URL}/screenshots/top-buys-sells.png`} alt="Sonar Tracker Top Buys & Sells" loading="lazy" />
                <div className="caption">
                  <h4>Token Performance Leaderboards</h4>
                  <p>Discover the hottest tokens with our dynamic leaderboards showing top buying and selling trends across all major blockchains.</p>
                </div>
              </CarouselSlide>
              
              <CarouselSlide>
                <img src={`${process.env.PUBLIC_URL}/screenshots/whale-activity.png`} alt="Sonar Tracker Whale Activity Heatmap" loading="lazy" />
                <div className="caption">
                  <h4>Whale Activity Heatmap</h4>
                  <p>Track whale movements with our interactive heatmap showing the most active tokens and real-time flow analysis across all blockchains.</p>
                </div>
              </CarouselSlide>
              
              <CarouselSlide>
                <img src={`${process.env.PUBLIC_URL}/screenshots/news-crypto.png`} alt="Sonar Tracker Crypto News" loading="lazy" />
                <div className="caption">
                  <h4>Curated Crypto News</h4>
                  <p>Stay informed with our AI-curated news feed, categorized by market impact and enriched with real-time price data and analysis.</p>
                </div>
              </CarouselSlide>
            </CarouselTrack>
            
            <CarouselButton
              $direction="left"
              onClick={() => setCurrentSlide(prev => (prev > 0 ? prev - 1 : 4))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Previous slide"
            >
              ‹
            </CarouselButton>
            
            <CarouselButton
              $direction="right"
              onClick={() => setCurrentSlide(prev => (prev < 4 ? prev + 1 : 0))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Next slide"
            >
              ›
            </CarouselButton>
          </CarouselContainer>
          
          <CarouselDots>
            {[0, 1, 2, 3, 4].map(index => (
              <Dot
                key={index}
                $active={currentSlide === index}
                onClick={() => setCurrentSlide(index)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </CarouselDots>
          
          <ThumbnailGrid>
            <Thumbnail
              $active={currentSlide === 0}
              onClick={() => setCurrentSlide(0)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/orca-analysis.png`} alt="ORCA AI Analysis" />
            </Thumbnail>
            
            <Thumbnail
              $active={currentSlide === 1}
              onClick={() => setCurrentSlide(1)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/dashboard-main.png`} alt="Dashboard" />
            </Thumbnail>
            
            <Thumbnail
              $active={currentSlide === 2}
              onClick={() => setCurrentSlide(2)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/top-buys-sells.png`} alt="Top Buys & Sells" />
            </Thumbnail>
            
            <Thumbnail
              $active={currentSlide === 3}
              onClick={() => setCurrentSlide(3)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/whale-activity.png`} alt="Whale Activity" />
            </Thumbnail>
            
            <Thumbnail
              $active={currentSlide === 4}
              onClick={() => setCurrentSlide(4)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/news-crypto.png`} alt="Crypto News" />
            </Thumbnail>
          </ThumbnailGrid>
        </ScreenshotsContainer>
      </ScreenshotsSection>
      
      <TrustSection>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          100+ Users in Just 3 Weeks - Zero Publicity
        </motion.h2>
        <p className="subtitle">See why traders are switching to Sonar for real-time whale tracking</p>
        
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
                £0<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/month</span>
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
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#2ecc71', lineHeight: '1', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem', textDecoration: 'line-through', opacity: 0.6 }}>
                £5<span style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/month</span>
              </div>
              <div style={{ fontSize: '2rem', color: '#2ecc71', marginTop: '0.5rem', fontWeight: '800' }}>
                FREE DURING DEMO
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
            Experience next-generation cryptocurrency analysis - AI predictive models coming soon
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
            Follow the Pods with SONAR Precision
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
              // After login, redirect to subscribe page
              setTimeout(() => {
                window.location.href = '/subscribe';
              }, 100);
            }}
          >
            Get Premium Access →
          </Button>
        </AdvisorCard>
      </AdvisorSection>

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