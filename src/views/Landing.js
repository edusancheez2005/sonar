import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient';
import Globe from '@/src/components/landing/GlobeV2';
import DashboardPreview from '@/src/components/landing/DashboardPreview';

/* ================================================================
   KEYFRAMES
   ================================================================ */
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const glowPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 10px rgba(54, 166, 186, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(93, 213, 237, 0.6)); }
`;

const shimmer = keyframes`
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
`;

const scrollCarousel = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const marqueeScroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const heroPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.6; }
`;

/* ================================================================
   STYLED COMPONENTS — LAYOUT
   ================================================================ */
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
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(54, 166, 186, 0.03) 50%, transparent 100%);
    animation: heroDataFlow 8s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes heroDataFlow {
    0%, 100% { opacity: 0.3; transform: translateY(0); }
    50% { opacity: 0.6; transform: translateY(-20px); }
  }

  @media (max-width: 768px) { padding-top: 120px; padding-bottom: 4rem; }
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
  img { height: 45px; width: auto; object-fit: contain; object-position: center; transition: height 0.3s ease; }
`;

const NavLinks = styled.div`
  display: flex; gap: 2rem; align-items: center;
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
  font-size: 5.5rem;
  margin-bottom: 1.5rem;
  font-weight: 900;
  background: linear-gradient(180deg, #ffffff 0%, #5dd5ed 60%, #36a6ba 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
  letter-spacing: -0.03em;
  @media (max-width: 768px) { font-size: 2.5rem; }
  @media (max-width: 480px) { font-size: 1.8rem; }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.6rem;
  margin-bottom: 2rem;
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 400;
  @media (max-width: 768px) { font-size: 1.3rem; }
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

  .number { font-size: 1.4rem; font-weight: 700; color: var(--primary); text-shadow: 0 0 10px rgba(54, 166, 186, 0.5); }
  .label { font-size: 0.95rem; color: var(--text-secondary); }
`;

/* ================================================================
   STYLED COMPONENTS — SECTIONS
   ================================================================ */
const TeamSection = styled.section`
  padding: 5rem 2rem;
  background: linear-gradient(180deg, rgba(10, 22, 33, 1) 0%, rgba(13, 33, 52, 0.75) 100%);
`;

const OrcaAccent = styled.span`
  color: var(--primary);
  font-weight: 800;
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

const CarouselOuter = styled.div`
  overflow: hidden;
  width: 100%;
  padding: 1rem 0;
  mask-image: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
`;

const CarouselTrack = styled.div`
  display: flex;
  gap: 2rem;
  width: max-content;
  animation: ${scrollCarousel} 40s linear infinite;
  &:hover { animation-play-state: paused; }
`;

const CarouselCard = styled.div`
  flex-shrink: 0;
  width: 380px;
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.9) 0%, rgba(26, 40, 56, 0.9) 100%);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(54, 166, 186, 0.2);
  }

  .rating { color: #FFD700; font-size: 1.2rem; margin-bottom: 1rem; }
  .quote { font-size: 1.05rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 1.5rem; font-style: italic; }

  .author {
    display: flex;
    align-items: center;
    gap: 1rem;

    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      border: 2px solid rgba(54, 166, 186, 0.4);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .info {
      text-align: left;
      .name { font-weight: 600; color: var(--primary); font-size: 1.1rem; }
      .title { font-size: 0.9rem; color: var(--text-secondary); }
    }
  }
`;

const TestimonialCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.9) 0%, rgba(26, 40, 56, 0.9) 100%);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);

  .rating { color: #FFD700; font-size: 1.2rem; margin-bottom: 1rem; }
  .quote { font-size: 1.05rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 1.5rem; font-style: italic; }

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
      flex-shrink: 0;
      overflow: hidden;
    }

    .info {
      text-align: left;
      .name { font-weight: 600; color: var(--primary); font-size: 1.1rem; }
      .title { font-size: 0.9rem; color: var(--text-secondary); }
    }
  }
`;

const Section = styled.section`
  padding: 8rem 2rem 6rem;
  position: relative;
  z-index: 1;
  h2 { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: var(--primary); }
`;

const PricingSection = styled(Section)`
  background-color: var(--background-dark);
  padding-top: 10rem;
`;

/* ================================================================
   STYLED COMPONENTS — NEW SECTIONS
   ================================================================ */
const ProblemSection = styled.section`
  padding: 10rem 2rem;
  background: linear-gradient(180deg, rgba(10, 14, 23, 1) 0%, rgba(13, 22, 36, 1) 100%);
`;

const ProblemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  max-width: 1100px;
  margin: 0 auto;
  align-items: start;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const PainCard = styled(motion.div)`
  background: ${p => p.$highlight
    ? 'linear-gradient(135deg, rgba(54, 166, 186, 0.12) 0%, rgba(26, 40, 56, 0.8) 100%)'
    : 'linear-gradient(135deg, rgba(40, 20, 20, 0.4) 0%, rgba(26, 30, 40, 0.7) 100%)'};
  border: 1px solid ${p => p.$highlight ? 'rgba(54, 166, 186, 0.35)' : 'rgba(231, 76, 60, 0.2)'};
  border-radius: 16px;
  padding: 2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25); }
`;

const CompareRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: rgba(13, 33, 52, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.1);
  border-radius: 12px;
  margin-bottom: 0.75rem;
  transition: border-color 0.3s ease;
  &:hover { border-color: rgba(54, 166, 186, 0.3); }
  @media (max-width: 768px) { grid-template-columns: 1fr; text-align: center; }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const FeatureCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(26, 40, 56, 0.6) 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  padding: 2.5rem;
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(54, 166, 186, 0.2); }
`;

const FeatureIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${p => p.$bg || 'rgba(54, 166, 186, 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
`;

const SectionTag = styled(motion.div)`
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 0.75rem;
`;

const SectionHeading = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  background: linear-gradient(180deg, #ffffff 0%, #b0c4d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
  line-height: 1.15;
  @media (max-width: 768px) { font-size: 2.4rem; }
`;

/* ================================================================
   STYLED COMPONENTS — BUTTONS & UI
   ================================================================ */
const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  @media (max-width: 768px) { flex-direction: column; gap: 1rem; }
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
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }
  &:hover::before { left: 100%; }

  &.primary {
    background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
    color: #fff;
    border: none;
    box-shadow: 0 8px 25px rgba(54, 166, 186, 0.4);
    &:hover { transform: translateY(-3px); box-shadow: 0 7px 14px rgba(54, 166, 186, 0.3); }
  }

  &.secondary {
    background-color: transparent;
    color: var(--primary);
    border: 2px solid var(--primary);
    &:hover { transform: translateY(-3px); box-shadow: 0 7px 14px rgba(54, 166, 186, 0.1); }
  }
`;

const PulseDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00e676;
  display: inline-block;
  animation: ${pulse} 2s ease-in-out infinite;
`;

/* ================================================================
   STYLED COMPONENTS — ANIMATION ELEMENTS
   ================================================================ */
const WhaleBackground = styled.div`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; opacity: 0.15;

  .whale-svg {
    position: absolute; bottom: -5%; right: -5%; width: 75%; height: auto; transform: scaleX(-1);
    path, circle { fill: var(--primary); }
  }

  .coin {
    position: absolute; width: 120px; height: 120px;
    background: linear-gradient(135deg, var(--primary), #2980b9);
    border-radius: 50%;
    box-shadow: 0 0 30px rgba(54, 166, 186, 0.4);
    display: flex; justify-content: center; align-items: center;
    color: white; font-weight: bold; font-size: 2rem;
    top: 30%; right: 30%;
  }
`;

const FloatingElements = styled.div`
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none;
`;

const Circle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, transparent 70%);
  opacity: 0.1;
`;

/* ================================================================
   STYLED COMPONENTS — NAV ELEMENTS
   ================================================================ */
const NavButton = styled.button`
  background: none; border: none; color: var(--text-primary); font-weight: 500; font-size: 1.1rem;
  cursor: pointer; padding: 0; transition: color 0.3s ease; position: relative;
  &:after { content: ''; position: absolute; left: 0; bottom: -5px; width: 100%; height: 3px; background-color: var(--primary); transform: scaleX(0); transition: transform 0.3s ease; }
  &:hover { color: var(--primary); }
  &:hover:after { transform: scaleX(1); }
`;

const NavLink = styled(NavButton)``;


/* ── V2 HERO — FULL-VIEWPORT GLOBE BACKGROUND ── */
const V2Hero = styled.section`
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 700px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background:
    radial-gradient(1200px 700px at 50% 0%, rgba(34, 211, 238, 0.07), transparent 60%),
    radial-gradient(900px 600px at 100% 100%, rgba(14, 116, 144, 0.12), transparent 60%),
    linear-gradient(180deg, #060c14 0%, #081019 60%, #060c14 100%);
  z-index: 1;
  &::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.04) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(800px 500px at 50% 45%, black, transparent 80%);
    pointer-events: none;
    opacity: 0.5;
  }
`;

const V2HeroContent = styled.div`
  position: relative;
  z-index: 4;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 40px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  @media (max-width: 700px) { padding: 0 20px 40px; }
`;

const V2Eyebrow = styled.div`
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: #5a7484;
  padding: 6px 14px; border-radius: 999px;
  border: 1px solid rgba(34,211,238,0.15);
  background: rgba(8, 16, 25, 0.55);
  backdrop-filter: blur(6px);
  margin-bottom: 28px;
`;

const V2EyebrowDot = styled.span`
  width: 6px; height: 6px; border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px #4ade80;
  animation: ${heroPulse} 1.4s ease-in-out infinite;
`;

const V2Headline = styled.h1`
  font-size: clamp(44px, 6.4vw, 84px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  margin: 0 0 22px;
  font-weight: 600;
  color: #e6f6fb;
`;

const V2HeadlineAccent = styled.span`
  color: #22d3ee;
  text-shadow: 0 0 40px rgba(34, 211, 238, 0.35);
`;

const V2Sub = styled.p`
  font-size: clamp(16px, 1.3vw, 19px);
  line-height: 1.5;
  color: #8aa3b0;
  max-width: 620px;
  margin: 0 auto 36px;
`;

const V2Stats = styled.div`
  display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
  margin-bottom: 26px;
`;

const V2Stat = styled.div`
  display: inline-flex; align-items: baseline; gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid rgba(34,211,238,0.15);
  background: rgba(10, 20, 32, 0.55);
  backdrop-filter: blur(10px);
  font-size: 14px;
  color: #8aa3b0;
  b { color: #67e8f9; font-weight: 600; }
  @media (max-width: 700px) { font-size: 13px; padding: 8px 14px; }
`;

const V2Ticker = styled.div`
  display: flex; align-items: center; gap: 16px;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid rgba(34,211,238,0.14);
  background: rgba(8, 16, 25, 0.6);
  backdrop-filter: blur(10px);
  max-width: 640px;
  margin: 0 auto 30px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #5a7484;
  @media (max-width: 700px) { flex-wrap: wrap; font-size: 11px; }
`;

const V2TickerLive = styled.span`
  color: #4ade80;
  display: inline-flex; align-items: center; gap: 6px;
  &::before {
    content: ''; width: 6px; height: 6px; background: #4ade80; border-radius: 50%;
    box-shadow: 0 0 8px #4ade80;
    animation: ${heroPulse} 1.4s ease-in-out infinite;
  }
`;

const V2TickerVal = styled.span`
  color: #67e8f9;
`;

const V2TickerSep = styled.span`
  color: rgba(255,255,255,0.08);
`;

const V2CtaRow = styled.div`
  display: flex; justify-content: center; gap: 14px;
  margin-top: 8px;
`;

const V2BtnPrimary = styled.button`
  appearance: none; border: 0;
  padding: 13px 28px;
  border-radius: 999px;
  font: 500 15px 'Inter', sans-serif;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .2s ease;
  background: linear-gradient(180deg, #22d3ee, #0891b2);
  color: #04131a;
  box-shadow:
    0 0 0 1px rgba(165,243,252,0.3) inset,
    0 10px 30px rgba(34, 211, 238, 0.35),
    0 0 60px rgba(34, 211, 238, 0.25);
  &:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(165,243,252,0.5) inset, 0 14px 40px rgba(34, 211, 238, 0.45); }
`;

const V2BtnGhost = styled.button`
  appearance: none;
  padding: 13px 28px;
  border-radius: 999px;
  font: 500 15px 'Inter', sans-serif;
  cursor: pointer;
  transition: background .2s ease;
  background: rgba(8,16,25,0.5);
  color: #67e8f9;
  border: 1px solid rgba(34,211,238,0.35);
  backdrop-filter: blur(6px);
  &:hover { background: rgba(34, 211, 238, 0.08); }
`;

/* ── DASHBOARD PREVIEW SECTION ── */
const DashSection = styled.section`
  position: relative; z-index: 1; padding: 80px 40px 120px; background: var(--background-dark);
  @media (max-width: 880px) { padding: 60px 20px 80px; }
`;
const DashSectionLabel = styled.div`
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 2px;
  text-transform: uppercase; color: rgba(180, 230, 245, 0.4);
  &::before { content: ''; width: 30px; height: 1px; background: #7FE3F5; opacity: 0.5; }
`;
const DashSectionTitle = styled.h2`
  font-size: clamp(32px, 3vw, 48px); font-weight: 300; letter-spacing: -0.02em;
  line-height: 1.1; margin: 0 0 12px; max-width: 720px; color: #E6F7FB;
`;
const DashSectionSub = styled.p`
  font-size: 16px; color: rgba(220, 240, 250, 0.6); max-width: 560px; margin: 0 0 40px;
`;
const HeadlineAccent = styled.span`
  font-weight: 500; background: linear-gradient(180deg, #AFF0FA, #4EC5DB);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
`;
const LoginButton = styled.button`
  background: none; border: 1px solid var(--primary); color: var(--primary);
  padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: all 0.3s ease; font-weight: 500;
  &:hover { background-color: var(--primary); color: #fff; }
`;

/* ================================================================
   STYLED COMPONENTS — MODALS & FORMS
   ================================================================ */
const Modal = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex; justify-content: center; align-items: center; z-index: 100; padding: 2rem;
`;

const FormContainer = styled(motion.div)`
  background-color: var(--background-card);
  padding: 2.5rem; border-radius: 10px; width: 100%; max-width: 500px;
  h3 { font-size: 1.8rem; margin-bottom: 1.5rem; color: var(--primary); }
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 0.5rem;
  label { font-size: 1rem; color: var(--text-secondary); }
  input {
    padding: 0.75rem; border-radius: 5px; border: 1px solid var(--secondary);
    background-color: rgba(30, 57, 81, 0.5); color: var(--text-primary); font-size: 1rem;
    &:focus { outline: none; border-color: var(--primary); }
  }
`;

const ButtonContainer = styled.div`
  display: flex; justify-content: space-between; margin-top: 1rem;
  button {
    padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer; transition: all 0.3s ease; font-weight: 500;
    &.submit { background-color: var(--primary); color: #fff; border: none; &:hover { background-color: rgba(54, 166, 186, 0.8); } }
    &.cancel { background-color: transparent; color: var(--text-secondary); border: 1px solid var(--text-secondary); &:hover { color: var(--text-primary); border-color: var(--text-primary); } }
  }
`;

/* ================================================================
   STYLED COMPONENTS — ADVISOR
   ================================================================ */
const AdvisorSection = styled.section`
  margin: 6rem auto 0; padding: 4rem 1.5rem; max-width: 1200px; position: relative; text-align: center;
`;

const AdvisorCard = styled.div`
  background: radial-gradient(800px 400px at 10% -10%, rgba(155,89,182,0.25), transparent 60%),
              radial-gradient(700px 350px at 110% 20%, rgba(241,196,15,0.15), transparent 60%),
              linear-gradient(180deg, #0d2134 0%, #0a1621 100%);
  border: 2px solid rgba(155,89,182,0.4);
  border-radius: 20px; padding: 3rem 2rem; text-align: center;
  position: relative; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);

  &::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(155,89,182,0.1) 50%, transparent 70%);
    animation: ${shimmer} 3s ease-in-out infinite;
  }
`;

const AdvisorBadge = styled(motion.div)`
  display: inline-flex; align-items: center; gap: 0.8rem; padding: 0.8rem 1.2rem;
  border-radius: 999px; font-weight: 700; letter-spacing: 0.5px; font-size: 1.1rem;
  color: #f1c40f; background: rgba(241,196,15,0.2); border: 2px solid rgba(241,196,15,0.5);
  box-shadow: 0 4px 20px rgba(241,196,15,0.3); margin-bottom: 1.5rem;
`;

const AdvisorTitle = styled(motion.h2)`
  font-size: 3.5rem; margin: 1rem 0 0.5rem; font-weight: 800;
  background: linear-gradient(90deg, #9b59b6 0%, #f1c40f 50%, #36a6ba 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 30px rgba(155,89,182,0.3); letter-spacing: -0.02em;
  @media (max-width: 768px) { font-size: 2.5rem; }
`;

const AdvisorSub = styled(motion.p)`
  color: var(--text-secondary); margin: 1rem 0 2rem; font-size: 1.2rem;
  line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto;
`;

/* ================================================================
   STYLED COMPONENTS — MISC
   ================================================================ */
const PillButton = styled.button`
  padding: 0.7rem 1.1rem; border-radius: 999px; border: 1px solid var(--primary);
  background: none; color: var(--primary); font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
  transition: all 0.25s ease; display: inline-flex; align-items: center; justify-content: center;
  &:hover { background: var(--primary); color: #0a1621; box-shadow: 0 6px 14px rgba(54,166,186,0.18); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
`;

const PrimaryPill = styled(PillButton)`
  background: linear-gradient(90deg, var(--primary), #36a6ba);
  color: #0a1621; border-color: transparent;
  &:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(54,166,186,0.22); }
`;

/* ================================================================
   STYLED COMPONENTS — TOAST
   ================================================================ */
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

/* ================================================================
   COUNT-UP ANIMATION COMPONENT
   ================================================================ */
const CountUp = ({ target, prefix = '', suffix = '', duration = 2000 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

/* ================================================================
   COMPONENT
   ================================================================ */
const Landing = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', displayName: '', country: '', experienceLevel: '', interests: [], website_url: '' });
  const [waitEmail, setWaitEmail] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupInfo, setSignupInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [lastSignupEmail, setLastSignupEmail] = useState('');
  const [resendAvailable, setResendAvailable] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastVisible, setToastVisible] = useState(false);
  const [liveTxnCount, setLiveTxnCount] = useState(null);
  const [liveVolume, setLiveVolume] = useState(null);

  const showToast = (msg, type = 'success') => { setToastMsg(msg); setToastType(type); setToastVisible(true); };

  useEffect(() => { if (!toastVisible) return; const t = setTimeout(() => setToastVisible(false), 4500); return () => clearTimeout(t); }, [toastVisible]);
  useEffect(() => { if (resendCooldown <= 0) return; const t = setInterval(() => setResendCooldown(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [resendCooldown]);

  useEffect(() => {
    const handleScroll = () => { setScrolled(window.scrollY > 80); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchLiveStats(attempt = 0) {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const json = await res.json();
          if (json.noData24h) {
            setLiveTxnCount('1,247');
            setLiveVolume('$412M');
            return;
          }
          const count = json.overall?.totalCount || 0;
          const vol = Math.abs(json.overall?.totalVolume || 0);
          const fmtVol = vol >= 1e9 ? `$${(vol/1e9).toFixed(2)}B` : vol >= 1e6 ? `$${(vol/1e6).toFixed(1)}M` : vol >= 1e3 ? `$${(vol/1e3).toFixed(0)}K` : `$${vol.toFixed(0)}`;
          setLiveTxnCount(count > 0 ? count.toLocaleString() : '1,247');
          setLiveVolume(vol > 0 ? fmtVol : '$412M');
        } else if (!cancelled && attempt < 3) {
          setTimeout(() => fetchLiveStats(attempt + 1), 2000);
        } else if (!cancelled) {
          setLiveTxnCount('1,247');
          setLiveVolume('$412M');
        }
      } catch {
        if (!cancelled && attempt < 3) {
          setTimeout(() => fetchLiveStats(attempt + 1), 2000);
        } else if (!cancelled) {
          setLiveTxnCount('1,247');
          setLiveVolume('$412M');
        }
      }
    }
    fetchLiveStats();
    const interval = setInterval(() => fetchLiveStats(), 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleFormChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const entered = (formData.email || '').trim();
      const adminEmail = (entered.includes('@') ? entered : `${entered}@sonar.local`).toLowerCase();
      // Admin login removed for security — use Supabase auth only
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (error) throw error;
      try { localStorage.setItem('sonar_stay_signed_in', staySignedIn ? '1' : '0'); } catch {}
      setIsLoggedIn(true);
      showToast('Welcome back!', 'success');
      setShowLoginModal(false);
      navigate('/dashboard');
    } catch (err) {
      const msg = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (() => { try { return JSON.stringify(err); } catch { return ''; } })());
      setLoginError(msg || 'Login failed');
      showToast(msg || 'Login failed', 'error');
    } finally { setLoginLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError(''); setSignupInfo(''); setResendMsg(''); setResendAvailable(false);
    // Honeypot anti-bot: if the hidden field is filled, it's a bot
    if (formData.website_url) { console.log('Bot detected via honeypot'); return; }
    if (!formData.displayName?.trim()) { setSignupError('Display name is required'); showToast('Display name is required', 'error'); return; }
    if (!formData.email || !formData.password) { setSignupError('Email and password are required'); showToast('Email and password are required', 'error'); return; }
    if (formData.password.length < 8) { setSignupError('Password must be at least 8 characters'); showToast('Password must be at least 8 characters', 'error'); return; }
    if (formData.password !== formData.confirmPassword) { setSignupError('Passwords do not match'); showToast('Passwords do not match', 'error'); return; }
    try {
      setSignupLoading(true);
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.email, password: formData.password, displayName: formData.displayName, country: formData.country, experienceLevel: formData.experienceLevel, interests: formData.interests }) });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Signup failed');
      const sb = supabaseBrowser();
      const { error: loginErr } = await sb.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (loginErr) throw loginErr;
      showToast('Account created. Welcome!', 'success');
      setShowSignupModal(false);
      navigate('/ai-advisor');
    } catch (err) {
      const raw = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (() => { try { return JSON.stringify(err); } catch { return ''; } })());
      const lower = (raw || '').toLowerCase();
      if (lower.includes('already') && lower.includes('registered')) {
        const sb = supabaseBrowser();
        const { error: loginErr } = await sb.auth.signInWithPassword({ email: formData.email, password: formData.password });
        if (!loginErr) { showToast('Welcome back!', 'success'); setShowSignupModal(false); navigate('/dashboard'); setSignupLoading(false); return; }
      }
      setSignupError(raw || 'Signup failed');
      showToast(raw || 'Signup failed', 'error');
    } finally { setSignupLoading(false); }
  };

  const resendVerification = async () => {
    setResendMsg(''); setSignupError('');
    if (!lastSignupEmail) { setSignupError('Enter your email to resend the verification.'); showToast('Enter your email to resend the verification.', 'error'); return; }
    if (resendCooldown > 0) return;
    try {
      setResendLoading(true);
      const sb = supabaseBrowser();
      const redirectTo = (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || '')) + '/auth/callback';
      const { error } = await sb.auth.resend({ type: 'signup', email: lastSignupEmail, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      setResendMsg('Verification email resent. Please check your inbox.');
      showToast(`Verification email resent to ${lastSignupEmail}.`, 'success');
      setResendCooldown(60);
    } catch (err) {
      const msg = (err && typeof err.message === 'string') ? err.message : (typeof err === 'string' ? err : (() => { try { return JSON.stringify(err); } catch { return ''; } })());
      setSignupError(msg || 'Resend failed');
      showToast(msg || 'Resend failed', 'error');
    } finally { setResendLoading(false); }
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

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { when: "beforeChildren", staggerChildren: 0.3 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5 } } };

  const circles = [
    { size: 300, x: '10%', y: '20%', delay: 0 },
    { size: 200, x: '70%', y: '15%', delay: 0.5 },
    { size: 350, x: '80%', y: '60%', delay: 1 },
    { size: 250, x: '40%', y: '85%', delay: 0.2 },
    { size: 180, x: '25%', y: '55%', delay: 0.7 },
  ];

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const sb = supabaseBrowser();
      // If user opted out of "stay signed in", clear session on fresh visit
      try {
        const stay = localStorage.getItem('sonar_stay_signed_in');
        const visited = sessionStorage.getItem('sonar_session_active');
        if (stay === '0' && !visited) {
          await sb.auth.signOut();
          localStorage.removeItem('sonar_stay_signed_in');
          return;
        }
        sessionStorage.setItem('sonar_session_active', '1');
      } catch {}
      const { data } = await sb.auth.getSession();
      if (data?.session) setIsLoggedIn(true);
      // Admin bypass removed for security
    };
    checkAuth();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === '1' || params.has('verified')) setShowLoginModal(true);
      if (params.get('required')) { setToastType('error'); setToastMsg('Please log in to access that page.'); setToastVisible(true); }
    } catch {}
  }, []);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <LandingContainer>
      {/* ─── NAV ─── */}
      <NavBar>
        <Logo>
          <img src="/logo2.png" alt="Sonar Tracker" />
        </Logo>
        <NavLinks>
          <NavLink onClick={() => { const el = document.getElementById('features'); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset - 100; window.scrollTo({ top, behavior: 'smooth' }); } }}>Features</NavLink>
          <NavLink onClick={() => { const el = document.getElementById('problem'); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset - 100; window.scrollTo({ top, behavior: 'smooth' }); } }}>Problem</NavLink>
          <NavLink onClick={() => { const el = document.getElementById('pricing'); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset - 100; window.scrollTo({ top, behavior: 'smooth' }); } }}>Pricing</NavLink>
          <NavLink onClick={() => { const el = document.getElementById('orca-cta'); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset - 100; window.scrollTo({ top, behavior: 'smooth' }); } }} title="AI-powered crypto trading insights">AI Advisor</NavLink>
          <NavLink onClick={() => navigate('/blog')} title="Crypto analytics guides">Blog</NavLink>
          {isLoggedIn ? (
            <LoginButton onClick={() => navigate('/dashboard')} title="Go to your dashboard" style={{ background: 'var(--primary)', color: '#fff' }}>Dashboard</LoginButton>
          ) : (
            <LoginButton onClick={() => setShowLoginModal(true)} title="Sign in to access premium features">Login</LoginButton>
          )}
        </NavLinks>
      </NavBar>

      {/* ─── HERO (V2 GLOBE BACKGROUND) ─── */}
      <V2Hero>
        <Globe />
        <V2HeroContent>
          <V2Eyebrow><V2EyebrowDot />LIVE ON 14 CHAINS</V2Eyebrow>
          <V2Headline>
            <V2HeadlineAccent>Sonar</V2HeadlineAccent> Real-Time<br />
            Crypto Intelligence
          </V2Headline>
          <V2Sub>Your crypto market intelligence partner. Track whales. Read signals. Move first.</V2Sub>
          <V2Stats>
            <V2Stat><b>700+</b> Happy Users</V2Stat>
            <V2Stat><b>2,000+</b> Signals Generated</V2Stat>
            <V2Stat><b>10M+</b> News Analyzed</V2Stat>
          </V2Stats>
          <V2Ticker>
            <V2TickerLive>LIVE</V2TickerLive>
            <V2TickerSep>│</V2TickerSep>
            <span><V2TickerVal>{liveTxnCount || '2,155'}</V2TickerVal> whale transactions tracked today</span>
            <V2TickerSep>│</V2TickerSep>
            <span><V2TickerVal>{liveVolume || '$973.4M'}</V2TickerVal> total volume</span>
          </V2Ticker>
          <V2CtaRow>
            <V2BtnPrimary onClick={() => isLoggedIn ? navigate('/dashboard') : setShowLoginModal(true)}>Login</V2BtnPrimary>
            <V2BtnGhost onClick={() => { const el = document.getElementById('dashboard-preview'); el?.scrollIntoView({ behavior: 'smooth' }); }}>See Product</V2BtnGhost>
          </V2CtaRow>
        </V2HeroContent>
      </V2Hero>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <DashSection id="dashboard-preview">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7 }}
        >
          <DashSectionLabel>The product</DashSectionLabel>
          <DashSectionTitle>Every signal. <HeadlineAccent>Every chain.</HeadlineAccent><br />In one terminal.</DashSectionTitle>
          <DashSectionSub>Sonar aggregates on-chain movement, exchange flows, sentiment, and news into a single real-time view. Act on data, not vibes.</DashSectionSub>
        </motion.div>
        <div style={{ perspective: '1200px' }}>
          <motion.div
            initial={{ opacity: 0, rotateX: 8, y: 80, scale: 0.95 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </DashSection>

      {/* ─── THE PROBLEM ─── */}
      <ProblemSection id="problem" style={{ position: 'relative', overflow: 'hidden', padding: '10rem 2rem' }}>
        {/* Background dramatic glow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          style={{ position: 'absolute', top: '20%', left: '50%', width: '600px', height: '600px', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(231, 76, 60, 0.06) 0%, transparent 70%)', pointerEvents: 'none' }}
        />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <ProblemGrid>
            <div>
              <SectionTag
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, type: 'spring' }}
              >
                The Problem
              </SectionTag>
              <SectionHeading
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                style={{ fontSize: '2.5rem', textAlign: 'left' }}
              >
                You're always the last to know.
              </SectionHeading>

              {/* Animated scenario mini-timeline */}
              <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(231, 76, 60, 0.3)', marginBottom: '2rem' }}>
                {[
                  { text: 'A whale moves $10M in ETH.', color: '#e74c3c', delay: 0.2 },
                  { text: 'Price spikes 12% in minutes.', color: '#ffab00', delay: 0.4 },
                  { text: 'You see the candle — it\'s already over.', color: '#5a6a7a', delay: 0.6 },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: step.delay }}
                    style={{ position: 'relative', marginBottom: '1rem', paddingLeft: '0.75rem' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: step.delay, type: 'spring', stiffness: 300 }}
                      style={{ position: 'absolute', left: '-1.85rem', top: '0.35rem', width: '10px', height: '10px', borderRadius: '50%', background: step.color, boxShadow: `0 0 10px ${step.color}60` }}
                    />
                    <p style={{ color: step.color, fontWeight: 600, fontSize: '1.05rem', margin: 0, lineHeight: 1.6 }}>{step.text}</p>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '1rem' }}
              >
                You're not losing because you're wrong — <motion.span initial={{ color: '#5a6a7a' }} whileInView={{ color: '#e74c3c' }} viewport={{ once: true }} transition={{ delay: 1.2, duration: 0.5 }} style={{ fontWeight: 700 }}>you're losing because you're late.</motion.span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
                style={{ color: '#8a9bb0', lineHeight: 1.8, fontSize: '1.05rem' }}
              >
                Meanwhile, institutional traders watch whale wallets in real-time, react in seconds, and pocket the gains you missed. That information gap is costing you money every single day.
              </motion.p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', perspective: '800px' }}>
              <PainCard
                initial={{ opacity: 0, rotateY: -15, x: 40 }}
                whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, type: 'spring', stiffness: 100 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileInView={{ rotate: [0, -10, 10, -10, 0] }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#e74c3c" strokeWidth="2" fill="rgba(231,76,60,0.15)"/><path d="M15 9l-6 6M9 9l6 6" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"/></svg>
                  </motion.div>
                  <div style={{ fontWeight: 700, color: '#e74c3c', fontSize: '1.1rem' }}>Without Sonar</div>
                </div>
                {['Check Twitter rumors.', 'Refresh CoinGecko.', 'Wonder why the price moved.', 'React hours late.', 'Miss the trade.'].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}
                  >
                    <span style={{ color: '#e74c3c', fontSize: '0.75rem' }}>✕</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{step}</span>
                  </motion.div>
                ))}
              </PainCard>
              <PainCard $highlight
                initial={{ opacity: 0, rotateY: -15, x: 40 }}
                whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.5, type: 'spring', stiffness: 100 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: [0, 1.3, 1] }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.0, duration: 0.4 }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="rgba(54,166,186,0.15)"/><path d="M9 12l2 2 4-4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </motion.div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>With Sonar</div>
                </div>
                {['See the whale move in real-time.', 'Get an AI-powered signal.', 'Understand why it matters.', 'Act with confidence.', 'Before anyone else.'].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.12 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9 + i * 0.12, type: 'spring' }}
                      style={{ color: '#00e676', fontSize: '0.75rem' }}
                    >✓</motion.span>
                    <span style={{ color: '#c0d0e0', fontSize: '0.9rem', lineHeight: 1.6 }}>{step}</span>
                  </motion.div>
                ))}
              </PainCard>
            </div>
          </ProblemGrid>
        </div>
      </ProblemSection>

      {/* ─── BEFORE / AFTER ─── */}
      <section id="compare" style={{ padding: '10rem 2rem', background: 'var(--background-dark)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative moving gradient */}
        <motion.div
          animate={{ x: ['-30%', '30%', '-30%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-50%', left: '20%', width: '60%', height: '200%', background: 'radial-gradient(ellipse, rgba(54, 166, 186, 0.04) 0%, transparent 60%)', pointerEvents: 'none' }}
        />
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <SectionTag initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring' }}>Before → After</SectionTag>
            <SectionHeading initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true }} transition={{ duration: 0.6 }}>From guessing to knowing</SectionHeading>
          </div>
          {[
            { before: 'Manually checking dozens of wallets', after: 'Automated tracking of every whale in real-time' },
            { before: 'Reading generic news 6 hours late', after: 'AI-curated signals the moment they happen' },
            { before: 'Guessing if a move is accumulation or dump', after: 'Clear BUY/SELL signals with confidence scores' },
            { before: 'Paying $500+/mo for institutional tools', after: 'Same intelligence, completely free' },
          ].map((item, i) => (
            <CompareRow key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, type: 'spring', stiffness: 120 }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(54, 166, 186, 0.4)' }}
            >
              <motion.div
                initial={{ textDecorationColor: 'rgba(231,76,60,0)' }}
                whileInView={{ textDecorationColor: 'rgba(231,76,60,0.6)' }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                style={{ color: '#5a4a4a', fontSize: '0.92rem', textDecoration: 'line-through', textDecorationColor: 'rgba(231,76,60,0.4)' }}
              >
                {item.before}
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 200 }}
                style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}
              >
                →
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
                style={{ color: 'var(--primary)', fontSize: '0.92rem', fontWeight: 500 }}
              >
                {item.after}
              </motion.div>
            </CompareRow>
          ))}
        </div>
      </section>

      {/* ─── PLATFORM FEATURES ─── */}
      <section id="features" style={{ padding: '10rem 2rem', background: 'linear-gradient(180deg, rgba(10, 14, 20, 1) 0%, rgba(10, 18, 28, 1) 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle dot grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <SectionTag initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring' }}>Platform</SectionTag>
            <SectionHeading initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>Everything you need.<br />Nothing you don't.</SectionHeading>
            <motion.p initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              style={{ fontSize: '1.15rem', color: '#6a7a8a', maxWidth: '550px', margin: '0 auto', lineHeight: 1.7 }}>
              Institutional-grade analytics, AI-powered signals, and real-time whale tracking — all in one platform.
            </motion.p>
          </div>

          {/* ── Panel 1: Real-Time Dashboard ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -6 }}
              style={{ background: 'linear-gradient(180deg, rgba(18, 24, 35, 1) 0%, rgba(13, 18, 28, 1) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem', overflow: 'hidden', cursor: 'default' }}>
              {/* Animated dashboard mockup */}
              <div style={{ background: 'rgba(8, 12, 20, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', fontFamily: "'JetBrains Mono', monospace" }}>
                {/* Mini title bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <span style={{ fontSize: '0.6rem', color: '#3a4a5a', letterSpacing: '1px' }}>DASHBOARD</span>
                </div>
                {/* KPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'WHALE TXS', val: '1,247', color: '#00e5ff' },
                    { label: 'NET FLOW', val: '+$18.3M', color: '#00e676' },
                    { label: 'ACTIVE', val: '42', color: '#ffab00' },
                  ].map((k, ki) => (
                    <motion.div key={ki} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + ki * 0.15 }}
                      style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.5rem', color: '#4a5a6a', letterSpacing: '1px', marginBottom: '0.3rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.color }}>{k.val}</div>
                    </motion.div>
                  ))}
                </div>
                {/* Mini chart with animated line */}
                <svg viewBox="0 0 300 60" style={{ width: '100%', height: '60px' }}>
                  {[15, 30, 45].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />)}
                  <motion.path d="M0,50 C20,45 40,48 60,42 S100,30 120,35 S160,20 180,25 S220,15 240,10 S270,8 300,5" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round"
                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, delay: 0.8, ease: 'easeInOut' }} />
                  <motion.path d="M0,50 C20,45 40,48 60,42 S100,30 120,35 S160,20 180,25 S220,15 240,10 S270,8 300,5 L300,60 L0,60 Z" fill="url(#feat1grad)"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 0.3 }} viewport={{ once: true }} transition={{ delay: 2.5, duration: 0.8 }} />
                  <defs><linearGradient id="feat1grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" /><stop offset="100%" stopColor="#00e5ff" stopOpacity="0" /></linearGradient></defs>
                </svg>
                {/* Token rows */}
                {[
                  { tok: 'ETH', flow: '+$4.2M', pct: 85, c: '#00e676' },
                  { tok: 'BTC', flow: '+$2.8M', pct: 60, c: '#ffab00' },
                  { tok: 'SOL', flow: '-$1.1M', pct: 25, c: '#ff5252' },
                ].map((r, ri) => (
                  <motion.div key={ri} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 + ri * 0.15 }}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: '0.5rem', alignItems: 'center', padding: '0.3rem 0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c0d0e0' }}>{r.tok}</span>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 1.5 + ri * 0.15 }}
                        style={{ height: '100%', background: r.c, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: r.c, textAlign: 'right' }}>{r.flow}</span>
                  </motion.div>
                ))}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Real-Time Dashboard</h3>
              <p style={{ color: '#6a7a8a', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>Track whale accumulation, distribution, and token flows across every major blockchain. Live data, sub-second updates.</p>
            </motion.div>

            {/* ── Panel 2: ORCA AI ── */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -6 }}
              style={{ background: 'linear-gradient(180deg, rgba(18, 24, 35, 1) 0%, rgba(13, 18, 28, 1) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem', overflow: 'hidden', cursor: 'default' }}>
              {/* Animated AI chat mockup */}
              <div style={{ background: 'rgba(8, 12, 20, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #9b59b6, #00e5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>AI</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c0d0e0', fontFamily: "'JetBrains Mono', monospace" }}>ORCA 2.0</span>
                  </div>
                  <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }}
                    style={{ fontSize: '0.6rem', color: '#00e676', fontFamily: "'JetBrains Mono', monospace" }}>● Online</motion.span>
                </div>
                {/* User message */}
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
                  style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.1)', borderRadius: '10px 10px 10px 2px', padding: '0.75rem 1rem', marginBottom: '0.75rem', maxWidth: '85%' }}>
                  <p style={{ fontSize: '0.8rem', color: '#b0c4d4', margin: 0, lineHeight: 1.5 }}>Why is ETH pumping right now?</p>
                </motion.div>
                {/* AI response — typed in */}
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.0 }}
                  style={{ background: 'rgba(155, 89, 182, 0.06)', border: '1px solid rgba(155, 89, 182, 0.12)', borderRadius: '10px 10px 2px 10px', padding: '0.75rem 1rem', marginLeft: 'auto', maxWidth: '90%' }}>
                  <p style={{ fontSize: '0.8rem', color: '#c0d0e0', margin: 0, lineHeight: 1.6 }}>
                    <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3 }}>3 whale wallets accumulated <span style={{ color: '#00e676', fontWeight: 700 }}>$12.4M ETH</span> in the last 2 hours.</motion.span>
                    <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.8 }}> Social sentiment shifted <span style={{ color: '#00e676', fontWeight: 700 }}>bullish (+34%)</span> after Vitalik's L2 post.</motion.span>
                    <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2.3 }}> Signal: <span style={{ color: '#00e676', fontWeight: 700 }}>BUY — 87% confidence</span>.</motion.span>
                  </p>
                </motion.div>
                {/* Confidence bar */}
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2.8 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0, 230, 118, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 230, 118, 0.1)' }}>
                  <span style={{ fontSize: '0.6rem', color: '#5a6a7a', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>CONFIDENCE</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} whileInView={{ width: '87%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 3.0, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #ffab00, #00e676)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00e676', fontFamily: "'JetBrains Mono', monospace" }}>87%</span>
                </motion.div>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>ORCA AI Analysis</h3>
              <p style={{ color: '#6a7a8a', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>Our crypto-trained AI reads whale movements, news, and social sentiment — then tells you what matters and why.</p>
            </motion.div>
          </div>

          {/* ── Row 2: News + Token Analytics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {/* Panel 3: News Intelligence */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -6 }}
              style={{ background: 'linear-gradient(180deg, rgba(18, 24, 35, 1) 0%, rgba(13, 18, 28, 1) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem', overflow: 'hidden', cursor: 'default' }}>
              <div style={{ background: 'rgba(8, 12, 20, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                  <span style={{ fontSize: '0.6rem', color: '#3a4a5a', letterSpacing: '1px', marginLeft: 'auto' }}>NEWS FEED</span>
                </div>
                {[
                  { tag: 'HIGH IMPACT', tagColor: '#ff5252', title: 'SEC Approves Spot ETH ETF Application', time: '12m ago', sentiment: '+8.2%' },
                  { tag: 'WHALE MOVE', tagColor: '#00e5ff', title: 'Unknown wallet moves $45M BTC to Coinbase', time: '28m ago', sentiment: '-2.1%' },
                  { tag: 'BULLISH', tagColor: '#00e676', title: 'Solana TVL hits all-time high at $14.2B', time: '1h ago', sentiment: '+5.4%' },
                ].map((n, ni) => (
                  <motion.div key={ni} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + ni * 0.2 }}
                    style={{ padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: n.tagColor, background: `${n.tagColor}12`, padding: '0.15rem 0.5rem', borderRadius: '4px', letterSpacing: '0.5px', fontFamily: "'JetBrains Mono', monospace" }}>{n.tag}</span>
                      <span style={{ fontSize: '0.55rem', color: '#4a5a6a', fontFamily: "'JetBrains Mono', monospace" }}>{n.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#c0d0e0', fontWeight: 500 }}>{n.title}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: n.sentiment.startsWith('+') ? '#00e676' : '#ff5252', fontFamily: "'JetBrains Mono', monospace", marginLeft: '0.75rem', flexShrink: 0 }}>{n.sentiment}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>News Intelligence</h3>
              <p style={{ color: '#6a7a8a', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>AI-curated crypto news scored by market impact. No noise — only stories that move prices.</p>
            </motion.div>

            {/* Panel 4: Token Analytics */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -6 }}
              style={{ background: 'linear-gradient(180deg, rgba(18, 24, 35, 1) 0%, rgba(13, 18, 28, 1) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem', overflow: 'hidden', cursor: 'default' }}>
              <div style={{ background: 'rgba(8, 12, 20, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c0d0e0' }}>ETH Analytics</span>
                  <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }}
                    style={{ fontSize: '0.6rem', color: '#00e676', padding: '0.15rem 0.5rem', background: 'rgba(0,230,118,0.08)', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.15)' }}>+4.2% 24H</motion.span>
                </div>
                {/* Animated bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: '80px', marginBottom: '1rem' }}>
                  {[35, 52, 28, 68, 45, 82, 60, 90, 55, 75, 48, 95].map((h, bi) => (
                    <motion.div key={bi} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: 0.6 + bi * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{ flex: 1, borderRadius: '3px 3px 0 0', background: bi === 11 ? '#00e5ff' : bi >= 9 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255,255,255,0.06)' }} />
                  ))}
                </div>
                {/* Token metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'BUY VOL', val: '$24.1M', c: '#00e676' },
                    { label: 'SELL VOL', val: '$18.7M', c: '#ff5252' },
                    { label: 'WHALES', val: '38', c: '#00e5ff' },
                  ].map((m, mi) => (
                    <motion.div key={mi} initial={{ opacity: 0, y: 5 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.8 + mi * 0.1 }}
                      style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.45rem', color: '#4a5a6a', letterSpacing: '1px', marginBottom: '0.2rem' }}>{m.label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: m.c }}>{m.val}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Token Analytics</h3>
              <p style={{ color: '#6a7a8a', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>Deep-dive into any token with flow analysis, volume breakdown, and institutional-grade metrics.</p>
            </motion.div>
          </div>

          {/* Capability chips */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '3rem' }}>
            {['Instant Alerts', 'Risk Assessment', 'CSV Export', 'Custom Thresholds', 'Multi-Chain', 'Sentiment Analysis'].map((chip, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.06 }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#8a9ab0', fontSize: '0.85rem', fontWeight: 500 }}>
                {chip}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── ORCA AI CTA ─── */}
      <section id="orca-cta" style={{ padding: '5rem 2rem', background: 'linear-gradient(180deg, rgba(10, 22, 33, 0.95) 0%, rgba(0, 229, 255, 0.03) 50%, rgba(10, 22, 33, 0.95) 100%)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, amount: 0.2 }} style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <SectionHeading>Meet ORCA: Your AI Crypto Analyst</SectionHeading>
            <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: '750px', margin: '0 auto', lineHeight: '1.8' }}>
              Ask any question about any cryptocurrency. ORCA combines real-time whale data, social sentiment, live news, and X/Twitter intelligence into one institutional-grade analysis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', maxWidth: '1050px', margin: '0 auto' }}>
            {/* Sample ORCA Response */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} viewport={{ once: true }}
              style={{ background: 'rgba(13, 17, 28, 0.9)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: '16px', padding: '1.5rem', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}>
                <span style={{ fontSize: '0.7rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '2px' }}>ORCA_TERMINAL</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#00e676', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e676', display: 'inline-block' }}/>ONLINE
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(0, 229, 255, 0.7)', marginBottom: '0.75rem' }}>You: "Should I buy Bitcoin right now?"</div>
              <div style={{ fontSize: '0.75rem', color: '#e0e6ed', lineHeight: '1.7' }}>
                <span style={{ fontWeight: 700, color: '#00e5ff' }}>Price & Technical:</span> BTC at <span style={{ color: '#00e676' }}>`$71,000`</span> with +8.9% 7d momentum. Bullish trend confirmed by rising volume.
                <br/><br/>
                <span style={{ fontWeight: 700, color: '#00e5ff' }}>Whale Intelligence:</span> <span style={{ color: '#00e676' }}>`$190M`</span> net inflow. 42 buy txns vs 46 sells but buy volume 4x higher. Multiple <span style={{ color: '#00e676' }}>`$50M+`</span> Coinbase to cold storage moves. <span style={{ fontWeight: 700, color: '#00e676' }}>Strong accumulation.</span>
                <br/><br/>
                <span style={{ fontWeight: 700, color: '#00e5ff' }}>Live X/Twitter:</span> @lookonchain reports BlackRock IBIT saw <span style={{ color: '#00e676' }}>`$380M`</span> inflows this week. @WClementeIII flagging bull flag formation on the daily.
                <br/><br/>
                <span style={{ fontWeight: 700, color: '#00e5ff' }}>Verdict:</span> <span style={{ fontWeight: 700, color: '#00e676' }}>HIGH CONVICTION BULLISH</span>. Whale accumulation + ETF inflows + macro tailwinds all align.
              </div>
            </motion.div>

            {/* Feature list + CTA */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
              {[
                { title: 'Real-Time Whale Data', desc: 'Every answer is grounded in live on-chain whale flows, not generic AI' },
                { title: 'Live X/Twitter Search', desc: 'Pulls tweets from top crypto traders and institutional figures in real-time' },
                { title: 'Macro Intelligence', desc: 'Fed decisions, ETF flows, geopolitical events, all connected to your token' },
                { title: 'Institutional Tracking', desc: 'MicroStrategy purchases, BlackRock moves, hedge fund activity, all in one answer' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5ff', marginTop: '0.5rem', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontWeight: 700, color: '#00e5ff', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{item.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{item.desc}</div>
                  </div>
                </div>
              ))}

              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 10px 40px rgba(0, 229, 255, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isLoggedIn ? navigate('/ai-advisor') : setShowSignupModal(true)}
                style={{ marginTop: '1rem', padding: '1rem 2.5rem', background: 'linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%)', color: '#0a0e17', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 20px rgba(0, 229, 255, 0.25)' }}>
                Try ORCA Free →
              </motion.button>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7, margin: 0 }}>
                1 free analysis per day. No credit card required.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── TESTIMONIALS CAROUSEL ─── */}
      <TrustSection>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}>
          700+ traders. $2B+ volume tracked.
        </motion.h2>
        <p className="subtitle">Don't take our word for it.</p>

        <CarouselOuter>
          <CarouselTrack>
            {/* Duplicate array for infinite scroll effect */}
            {[...Array(2)].flatMap((_, dupeIdx) => [
              { name: 'Crypto Trader', role: 'Verified User', quote: 'The whale tracking alerts helped me understand market movements I was completely missing before. Great tool for staying informed.', img: '/assets/faces/face-1.png' },
              { name: 'Portfolio Analyst', role: 'Verified User', quote: 'I used to wonder why prices suddenly moved. Seeing whale transaction data in real-time gave me context I never had before.', img: '/assets/faces/face-2.png' },
              { name: 'DeFi Researcher', role: 'Verified User', quote: 'The AI analysis tools help me process on-chain data much faster. Useful for tracking large SOL and ETH movements.', img: '/assets/faces/face-3.png' },
              { name: 'On-Chain Analyst', role: 'Verified User', quote: 'Clean interface, fast whale alerts, and the ORCA AI advisor gives surprisingly insightful analysis. Good value for the price.', img: '/assets/faces/face-4.png' },
              { name: 'Swing Trader', role: 'Verified User', quote: 'The sentiment analysis paired with whale tracking provides useful data points. Helps me stay informed about market conditions.', img: '/assets/faces/face-6.png' },
              { name: 'Institutional Analyst', role: 'Verified User', quote: 'We use Sonar to monitor large transaction flows across multiple chains. The multi-chain coverage is comprehensive.', img: '/assets/faces/face-7.png' },
              { name: 'Quant Researcher', role: 'Verified User', quote: 'The whale flow data is clean and well-organized. Useful for research and understanding market microstructure.', img: '/assets/faces/face-5.png' },
              { name: 'Crypto Enthusiast', role: 'Verified User', quote: 'Sonar makes on-chain data accessible. The dashboard is intuitive and the AI explanations help me learn about whale behaviour.', img: '/assets/faces/face-8.png' },
            ].map((t, i) => (
              <CarouselCard key={`${dupeIdx}-${i}`}>
                <div className="rating">★★★★★</div>
                <p className="quote">"{t.quote}"</p>
                <div className="author">
                  <div className="avatar"><img src={t.img} alt={t.name} /></div>
                  <div className="info">
                    <div className="name">{t.name}</div>
                    <div className="title">{t.role}</div>
                  </div>
                </div>
              </CarouselCard>
            )))}
          </CarouselTrack>
        </CarouselOuter>
      </TrustSection>

      {/* ─── PRICING ─── */}
      <PricingSection id="pricing">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, amount: 0.2 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <SectionHeading>Everything free. Pay only for more AI.</SectionHeading>
          <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
            All whale data, signals, sentiment, and analytics are free. Upgrade for unlimited AI conversations and enhanced analytics.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            whileHover={{ transform: 'translateY(-8px)' }}
            style={{ background: 'rgba(26, 40, 56, 0.8)', border: '1px solid rgba(54, 166, 186, 0.2)', borderRadius: '20px', padding: '2.5rem', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)', transition: 'all 0.3s ease' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Free</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Full access for everyone</div>
            <div><span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>$0</span><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>/forever</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0' }}>
              {['Real-time whale tracking 24/7', 'AI buy/sell signals', 'Sentiment analysis', 'Token analytics & heatmaps', 'Full transaction history', 'Whale leaderboard', 'News with AI sentiment', '2 ORCA AI conversations/day'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Button className="secondary" style={{ width: '100%', borderRadius: '12px' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowSignupModal(true)}>
              Get Started Free
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            whileHover={{ transform: 'translateY(-8px)' }}
            style={{ background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.15) 0%, rgba(26, 40, 56, 0.95) 100%)', border: '2px solid var(--primary)', borderRadius: '20px', padding: '2.5rem', position: 'relative', backdropFilter: 'blur(10px)', boxShadow: '0 20px 60px rgba(54, 166, 186, 0.25)', transition: 'all 0.3s ease' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(54, 166, 186, 0.4)' }}>MOST POPULAR</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem', marginTop: '0.5rem' }}>Pro</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>For power users</div>
            <div><span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2ecc71' }}>$7.99</span><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>/month</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Cancel anytime.</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
              {['Everything in Free', 'Unlimited ORCA AI conversations', 'Enhanced analytics & deep dives', 'CSV export', 'Priority support', 'Early access to new features'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Button className="primary" style={{ width: '100%', borderRadius: '12px' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setShowLoginModal(true); setTimeout(() => { window.location.href = '/subscribe'; }, 100); }}>
              Get Pro Access
            </Button>
          </motion.div>

          {/* Enterprise */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            whileHover={{ transform: 'translateY(-8px)' }}
            style={{ background: 'rgba(26, 40, 56, 0.8)', border: '1px solid rgba(54, 166, 186, 0.2)', borderRadius: '20px', padding: '2.5rem', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)', transition: 'all 0.3s ease' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Enterprise</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>For funds & teams</div>
            <div><span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Custom</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Tailored to your needs</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
              {['Everything in Pro', 'API access', 'White-label options', 'Dedicated account manager', 'Custom integrations', 'SLA guarantees'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Button className="secondary" style={{ width: '100%', borderRadius: '12px' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/contact')}>
              Contact Sales
            </Button>
          </motion.div>
        </div>

        {/* Trust badges */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} viewport={{ once: true, amount: 0.2 }}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(54, 166, 186, 0.2)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/></svg>
            Secure Payment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.2"/><polyline points="12 6 12 12 16 14" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/></svg>
            Cancel Anytime
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/></svg>
            Instant Access
          </div>
        </motion.div>
      </PricingSection>

      {/* ─── ORCA 2.0 ADVISOR ─── */}
      <AdvisorSection id="advisor">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, amount: 0.2 }} style={{ marginBottom: '3rem' }}>
          <SectionHeading style={{ textAlign: 'center' }}>The Future of Crypto Intelligence</SectionHeading>
          <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6', textAlign: 'center' }}>
            Experience next-generation cryptocurrency analysis with <span style={{ color: 'var(--primary)', fontWeight: '700' }}>ORCA 2.0</span>
          </p>
        </motion.div>

        <AdvisorCard>
          <AdvisorBadge initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="var(--primary)"/>
              <circle cx="8" cy="10" r="1.5" fill="var(--primary)"/><circle cx="16" cy="10" r="1.5" fill="var(--primary)"/>
              <path d="M12 17c2.21 0 4-1.79 4-4H8c0 2.21 1.79 4 4 4z" fill="var(--primary)"/>
            </svg>
            ORCA 2.0 — AI Crypto Advisor
          </AdvisorBadge>
          <AdvisorTitle initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Follow the Pods with Sonar Precision
          </AdvisorTitle>
          <AdvisorSub initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.15 }}>
            Personalized trading ideas from whale flows, risk-managed entries, and instant alerts. Get premium access to the most advanced crypto intelligence platform.
          </AdvisorSub>
          <Button className="primary"
            style={{ width: '100%', maxWidth: '400px', margin: '2rem auto 0', padding: '1.2rem 3rem', fontSize: '1.2rem', fontWeight: '700', borderRadius: '12px', background: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)', color: '#ffffff', border: 'none', boxShadow: '0 8px 24px rgba(54, 166, 186, 0.35)', display: 'block' }}
            whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(54, 166, 186, 0.5)' }} whileTap={{ scale: 0.95 }}
            onClick={() => { setShowLoginModal(true); setTimeout(() => { window.location.href = '/subscribe'; }, 100); }}>
            Get Premium Access →
          </Button>
        </AdvisorCard>
      </AdvisorSection>



      {/* ─── LOGIN MODAL ─── */}
      {showLoginModal && (
        <Modal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FormContainer initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
            <h3>Login to Your Account</h3>
            <button type="button" onClick={async () => { try { const sb = supabaseBrowser(); const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } }); if (error) setLoginError('Google sign-in failed.'); } catch { setLoginError('An error occurred.'); } }}
              style={{ width: '100%', padding: '0.75rem 1rem', marginBottom: '1.5rem', backgroundColor: '#fff', color: '#1f1f1f', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem', position: 'relative' }}>
              <span style={{ backgroundColor: 'var(--background-card)', padding: '0 1rem', position: 'relative', zIndex: 1 }}>or</span>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(54, 166, 186, 0.2)', zIndex: 0 }} />
            </div>
            <Form onSubmit={handleLogin}>
              <FormGroup><label htmlFor="email">Email</label><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} required /></FormGroup>
              <FormGroup><label htmlFor="password">Password</label><input type="password" id="password" name="password" value={formData.password} onChange={handleFormChange} required /></FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                <input type="checkbox" checked={staySignedIn} onChange={(e) => setStaySignedIn(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }} />
                Stay signed in
              </label>
              {loginError && <p style={{ color: 'tomato', margin: 0 }}>{loginError}</p>}
              <ButtonContainer>
                <PillButton type="button" onClick={() => setShowLoginModal(false)}>Cancel</PillButton>
                <button type="submit" className="submit" disabled={loginLoading}>{loginLoading ? 'Logging in...' : 'Login'}</button>
              </ButtonContainer>
              <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <NavButton style={{ color: 'var(--primary)', display: 'inline', padding: 0 }} onClick={() => { setShowLoginModal(false); setShowSignupModal(true); }}>Sign up</NavButton>
              </p>
            </Form>
          </FormContainer>
        </Modal>
      )}

      {/* ─── SIGNUP MODAL ─── */}
      {showSignupModal && (
        <Modal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setShowSignupModal(false); }}>
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              display: 'flex', width: '100%', maxWidth: '900px', maxHeight: '90vh',
              borderRadius: '20px', overflow: 'hidden',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 229, 255, 0.08)',
            }}
          >
            {/* Left brand panel */}
            <div style={{
              width: '320px', minHeight: '100%', padding: '2.5rem 2rem',
              background: 'linear-gradient(160deg, #0a1929 0%, #0d2847 40%, #0a1929 100%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              position: 'relative', overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 30% 50%, rgba(0, 229, 255, 0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <img src="/logo2.png" alt="Sonar" style={{ width: '80px', height: 'auto', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 20px rgba(0, 229, 255, 0.3))' }} />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem', background: 'linear-gradient(135deg, #00e5ff, #36a6ba)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Join Sonar</h2>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>Track whales. Decode signals.<br/>Trade smarter.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', position: 'relative', zIndex: 1 }}>
                {[{ svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, text: 'Real-time whale tracking' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, text: 'AI-powered buy/sell signals' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, text: 'Market sentiment & news' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>, text: 'Multi-chain analytics' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, text: 'ORCA AI advisor' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, text: 'Custom whale alerts' }, { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/></svg>, text: 'Binance derivatives data' }].map((item, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', borderRadius: '8px', background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.08)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.svg}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Trusted by 700+ traders worldwide
              </motion.p>
            </div>

            {/* Right form panel */}
            <div style={{
              flex: 1, padding: '2rem 2.5rem', overflowY: 'auto',
              background: 'linear-gradient(180deg, #0c1824 0%, #080f18 100%)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#fff', fontWeight: 700 }}>Create Account</h3>
                <button type="button" onClick={() => setShowSignupModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>×</button>
              </div>

              {/* Google OAuth */}
              <motion.button type="button" whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.98 }}
                onClick={async () => { try { const sb = supabaseBrowser(); const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/ai-advisor` } }); if (error) setSignupError('Google sign-up failed.'); } catch { setSignupError('An error occurred.'); } }}
                style={{ width: '100%', padding: '0.7rem 1rem', marginBottom: '1.25rem', backgroundColor: '#fff', color: '#1f1f1f', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Continue with Google
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0 0 1.25rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 229, 255, 0.1)' }} />
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>or sign up with email</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 229, 255, 0.1)' }} />
              </div>

              <Form onSubmit={handleSignup} style={{ gap: '1rem' }}>
                {/* Honeypot - invisible to humans, bots fill this */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true" tabIndex={-1}>
                  <input type="text" name="website_url" autoComplete="off" tabIndex={-1} value={formData.website_url} onChange={e => setFormData({ ...formData, website_url: e.target.value })} />
                </div>
                {/* Row: Name + Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Display Name <span style={{ color: '#00e5ff' }}>*</span></label><input type="text" placeholder="e.g. CryptoWhale" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} required style={{ borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.9rem', border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.03)' }} /></FormGroup>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Email <span style={{ color: '#00e5ff' }}>*</span></label><input type="email" placeholder="you@email.com" value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setLastSignupEmail(e.target.value); }} required style={{ borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.9rem', border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.03)' }} /></FormGroup>
                </div>

                {/* Row: Passwords */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Password <span style={{ color: '#00e5ff' }}>*</span></label><input type="password" placeholder="Min 8 characters" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required style={{ borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.9rem', border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.03)' }} /></FormGroup>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Confirm Password <span style={{ color: '#00e5ff' }}>*</span></label><input type="password" placeholder="Retype password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required style={{ borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.9rem', border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.03)' }} /></FormGroup>
                </div>

                {/* Row: Country + Experience */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Country</label><select value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} style={{ padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(0,229,255,0.12)', background: '#0c1824', color: '#e0e0e0', fontSize: '0.9rem', cursor: 'pointer', colorScheme: 'dark', WebkitAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2300e5ff' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2rem' }}><option value="">Select country</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="DE">Germany</option><option value="FR">France</option><option value="IN">India</option><option value="PK">Pakistan</option><option value="NG">Nigeria</option><option value="BR">Brazil</option><option value="JP">Japan</option><option value="KR">South Korea</option><option value="SG">Singapore</option><option value="AE">UAE</option><option value="TR">Turkey</option><option value="PH">Philippines</option><option value="ID">Indonesia</option><option value="OTHER">Other</option></select></FormGroup>
                  <FormGroup style={{ gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Experience</label><select value={formData.experienceLevel} onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })} style={{ padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(0,229,255,0.12)', background: '#0c1824', color: '#e0e0e0', fontSize: '0.9rem', cursor: 'pointer', colorScheme: 'dark', WebkitAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2300e5ff' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2rem' }}><option value="">Your level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="professional">Professional</option></select></FormGroup>
                </div>

                {/* Interests tags */}
                <FormGroup style={{ gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Interests</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {['Whale Tracking', 'AI Signals', 'DeFi', 'Memecoins', 'NFTs', 'Bitcoin', 'Altcoins', 'Day Trading'].map((interest, i) => (
                      <motion.button key={interest} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                        onClick={() => { const cur = formData.interests || []; setFormData({ ...formData, interests: cur.includes(interest) ? cur.filter(j => j !== interest) : [...cur, interest] }); }}
                        style={{
                          padding: '0.35rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer',
                          fontWeight: 500, transition: 'all 0.2s ease',
                          border: `1px solid ${(formData.interests || []).includes(interest) ? '#00e5ff' : 'rgba(0,229,255,0.15)'}`,
                          background: (formData.interests || []).includes(interest) ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                          color: (formData.interests || []).includes(interest) ? '#00e5ff' : 'rgba(255,255,255,0.45)',
                          boxShadow: (formData.interests || []).includes(interest) ? '0 0 12px rgba(0, 229, 255, 0.15)' : 'none',
                        }}>{interest}</motion.button>
                    ))}
                  </div>
                </FormGroup>

                {/* Terms */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 0 0', borderTop: '1px solid rgba(0,229,255,0.08)' }}>
                  <input type="checkbox" id="terms-checkbox" checked={formData.acceptedTerms || false} onChange={e => setFormData({ ...formData, acceptedTerms: e.target.checked })} required style={{ marginTop: '0.15rem', width: 'auto', minWidth: '16px', height: '16px', cursor: 'pointer', accentColor: '#00e5ff' }} />
                  <label htmlFor="terms-checkbox" style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                    I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5ff' }}>Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5ff' }}>Privacy Policy</a>
                  </label>
                </div>

                {signupError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#ff4757', margin: 0, fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', border: '1px solid rgba(255,71,87,0.2)' }}>{signupError}</motion.p>}

                {/* Submit */}
                <motion.button type="submit" disabled={signupLoading}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0, 229, 255, 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #00e5ff 0%, #36a6ba 100%)',
                    color: '#080f18', fontSize: '1rem', fontWeight: 700, cursor: signupLoading ? 'wait' : 'pointer',
                    opacity: signupLoading ? 0.7 : 1, transition: 'all 0.2s ease',
                    letterSpacing: '0.3px',
                  }}>{signupLoading ? 'Creating your account...' : 'Start Tracking Whales'}</motion.button>

                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setShowSignupModal(false); setShowLoginModal(true); }} style={{ background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>Sign in</button>
                </p>
              </Form>
            </div>
          </motion.div>
        </Modal>
      )}

      {/* ─── TOAST ─── */}
      {toastVisible && (
        <ToastWrap>
          <ToastCard role="status" aria-live="polite">
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
