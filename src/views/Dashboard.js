'use client'
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import OrcaTutorial from '@/components/onboarding/OrcaTutorial'
import SocialPulse from '@/components/SocialPulse'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import TokenIcon from '@/components/TokenIcon'
import WhaleAlertsCard from '../components/WhaleAlertsCard';
import PremiumGate from '@/components/PremiumGate'
import { SkeletonKPIStrip, SkeletonBarRows } from '@/components/SkeletonLoader'

import { Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
const COLORS = {
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff1744',
  amber: '#ffab00',
  textPrimary: '#e0e6ed',
  textMuted: '#5a6a7a',
  panelBg: 'rgba(13, 17, 28, 0.8)',
  borderSubtle: 'rgba(0, 229, 255, 0.08)',
  gridLine: 'rgba(255, 255, 255, 0.03)',
}

// ─── ANIMATIONS ───────────────────────────────────────────────────────────────
const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #00e676; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #00e676, 0 0 16px rgba(0, 230, 118, 0.3); }
`

const scrollTicker = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────────
const DashboardShell = styled.div`
  min-height: 100vh;
  background: #0a0e17;
  position: relative;
  overflow-x: hidden;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0, 229, 255, 0.008) 2px, rgba(0, 229, 255, 0.008) 4px
    );
    pointer-events: none;
    z-index: 0;
  }
`

const DashboardContainer = styled.div`
  padding: 0 2rem 4rem 2rem;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  @media (max-width: 768px) { padding: 0 1rem 3rem 1rem; }
`;

const CommandBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 48px;
  background: rgba(10, 14, 23, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 229, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  font-family: ${MONO_FONT};
  gap: 1rem;
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    height: auto;
    min-height: 48px;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`

const CommandBarLeft = styled.div`
  display: flex; align-items: center; gap: 1rem; flex-shrink: 0;
  @media (max-width: 768px) { gap: 0.5rem; }
`
const CommandBarCenter = styled.div`
  display: flex; align-items: center; gap: 1.5rem; font-size: 0.8rem; color: ${COLORS.textMuted};
  @media (max-width: 768px) { gap: 0.75rem; font-size: 0.7rem; order: 3; width: 100%; justify-content: center; }
`
const CommandBarRight = styled.div`
  display: flex; align-items: center; gap: 1rem; flex-shrink: 0;
  @media (max-width: 768px) { gap: 0.5rem; }
`

const TerminalLogo = styled.span`
  font-weight: 800; font-size: 0.85rem; letter-spacing: 2px; color: ${COLORS.cyan}; text-transform: uppercase;
`

const LiveDot = styled.span`
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem; font-weight: 600; color: ${COLORS.green};
  text-transform: uppercase; letter-spacing: 1px;
  &::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: ${COLORS.green}; animation: ${pulseGlow} 2s ease-in-out infinite;
  }
`

const StatChip = styled.span`
  color: ${COLORS.textPrimary}; font-family: ${MONO_FONT}; font-size: 0.8rem; font-weight: 600;
  .label { color: ${COLORS.textMuted}; margin-right: 0.35rem; font-weight: 400; }
`

const TimeBadge = styled.span`
  background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 4px; padding: 0.2rem 0.6rem; font-size: 0.7rem;
  font-weight: 600; color: ${COLORS.cyan}; letter-spacing: 0.5px;
`

const UserChip = styled.span`
  font-size: 0.75rem; color: ${COLORS.textMuted}; font-weight: 400;
  strong { color: #8a9ab0; font-weight: 600; }
`

const TutorialBtn = styled.button`
  background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 4px; padding: 0.25rem 0.65rem; color: ${COLORS.cyan};
  font-size: 0.75rem; font-weight: 600; cursor: pointer; font-family: ${MONO_FONT};
  transition: all 0.15s ease; display: flex; align-items: center; gap: 0.35rem;
  &:hover { background: rgba(0, 229, 255, 0.15); border-color: rgba(0, 229, 255, 0.3); }
`

const CmdDivider = styled.span`color: rgba(0, 229, 255, 0.15); font-size: 0.9rem;`

// ─── PREMIUM OVERLAY ────────────────────────────────────────────────────────
const PremiumOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 14, 23, 0.92); backdrop-filter: blur(16px);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 2rem;
`;

const PremiumCard = styled(motion.div)`
  background: rgba(13, 17, 28, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 16px; padding: 3rem 2.5rem; max-width: 560px; width: 100%;
  box-shadow: 0 0 60px rgba(0, 229, 255, 0.08); text-align: center; position: relative;
`;

const PremiumIcon = styled.div`font-size: 3.5rem; margin-bottom: 1.5rem;`;

const PremiumTitle = styled.h2`
  font-size: 2rem; font-weight: 700; font-family: ${SANS_FONT}; color: ${COLORS.textPrimary};
  margin-bottom: 1rem;
  background: linear-gradient(135deg, ${COLORS.cyan} 0%, #00b8d4 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
`;

const PremiumDescription = styled.p`
  font-size: 1rem; color: ${COLORS.textMuted}; margin-bottom: 2rem; line-height: 1.6; font-family: ${SANS_FONT};
`;

const PremiumFeatureList = styled.ul`
  list-style: none; padding: 0; margin: 2rem 0; text-align: left;
  li {
    display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0;
    color: #8a9ab0; font-size: 0.95rem; font-family: ${SANS_FONT};
    &::before { content: '▸'; color: ${COLORS.cyan}; font-weight: bold; flex-shrink: 0; }
  }
`;

const PremiumButton = styled(motion.button)`
  background: linear-gradient(135deg, ${COLORS.cyan} 0%, #00b8d4 100%);
  color: #0a0e17; border: none; border-radius: 8px; padding: 1rem 2.5rem;
  font-size: 1.1rem; font-weight: 700; cursor: pointer; font-family: ${SANS_FONT};
  box-shadow: 0 4px 24px rgba(0, 229, 255, 0.25); transition: all 0.2s ease;
  &:hover { box-shadow: 0 8px 32px rgba(0, 229, 255, 0.4); }
`;

const BlurredContent = styled.div`
  filter: ${props => props.$isPremium ? 'none' : 'blur(8px)'};
  pointer-events: ${props => props.$isPremium ? 'auto' : 'none'};
  user-select: ${props => props.$isPremium ? 'auto' : 'none'};
  transition: filter 0.3s ease;
`;

// ─── PANEL (GLASS CARD) ──────────────────────────────────────────────────────
const Panel = styled.div`
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px; padding: 1.5rem;
  transition: border-color 0.2s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.12); }
`

const PanelHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;
`

const TerminalPrompt = styled.h2`
  font-family: ${MONO_FONT}; font-size: 0.85rem; font-weight: 700; color: ${COLORS.cyan};
  letter-spacing: 1px; text-transform: uppercase; margin: 0;
  display: flex; align-items: center; gap: 0.5rem;
  &::before { content: '>'; color: ${COLORS.green}; font-weight: 800; }
`

const PanelBadge = styled.span`
  background: rgba(0, 229, 255, 0.06); border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px; padding: 0.2rem 0.65rem; font-size: 0.7rem; font-weight: 600;
  color: ${COLORS.textMuted}; font-family: ${MONO_FONT}; letter-spacing: 0.5px; text-transform: uppercase;
`

const PanelSubtext = styled.p`
  font-size: 0.8rem; color: ${COLORS.textMuted}; margin: 0.25rem 0 0 1.1rem; font-family: ${SANS_FONT};
`

// ─── KPI STRIP ──────────────────────────────────────────────────────────────
const KPIStrip = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
`

const KPICell = styled.div`
  padding: 1.25rem 1.5rem; text-align: center; position: relative;
  &:not(:last-child)::after {
    content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px;
    background: ${COLORS.borderSubtle};
  }
  @media (max-width: 768px) {
    &:nth-child(2)::after { display: none; }
    &:nth-child(1), &:nth-child(2) { border-bottom: 1px solid ${COLORS.borderSubtle}; }
  }
`

const KPILabel = styled.div`
  font-size: 0.65rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
  color: ${COLORS.textMuted}; margin-bottom: 0.5rem; font-family: ${SANS_FONT};
`

const KPIValue = styled.div`
  font-size: 1.8rem; font-weight: 800; font-family: ${MONO_FONT};
  color: ${props => props.$color || COLORS.textPrimary};
  text-shadow: 0 0 20px ${props => (props.$color || COLORS.cyan) + '30'};
  line-height: 1; margin-bottom: 0.3rem;
`

const KPISub = styled.div`
  font-size: 0.7rem; color: ${props => props.$color || COLORS.textMuted};
  font-family: ${MONO_FONT}; font-weight: 500;
`

// ─── LAYOUTS ────────────────────────────────────────────────────────────────
const GridContainer = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const DashboardWithSidebar = styled.div`
  display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`

const SidebarColumn = styled.div`
  @media (max-width: 1024px) { display: none; }
`

const StickyWatchlist = styled.div`
  position: sticky; top: 60px;
`

const SectionGap = styled.div`margin-bottom: 1.5rem;`

// ─── DATA TABLE ─────────────────────────────────────────────────────────────
const DataTable = styled.div`
  width: 100%; overflow-x: auto;
  table { width: 100%; border-collapse: collapse; font-family: ${MONO_FONT}; }
  thead th {
    padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600;
    color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid rgba(0, 229, 255, 0.06); background: rgba(0, 229, 255, 0.02);
    white-space: nowrap; font-family: ${SANS_FONT};
  }
  thead th.right { text-align: right; }
  thead th.center { text-align: center; }
  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    transition: background 0.15s ease; cursor: pointer;
  }
  tbody tr:hover { background: rgba(0, 229, 255, 0.04); }
  tbody td {
    padding: 0.75rem 1rem; font-size: 0.85rem; color: ${COLORS.textPrimary}; white-space: nowrap;
  }
  tbody td.right { text-align: right; }
  tbody td.center { text-align: center; }
  tbody td.muted { color: ${COLORS.textMuted}; }
`

// ─── HORIZONTAL BAR ROW ────────────────────────────────────────────────────
const HBarRow = styled.div`
  display: grid; grid-template-columns: 120px 1fr 80px; gap: 0.75rem; align-items: center;
  padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  transition: background 0.15s ease;
  &:hover { background: rgba(0, 229, 255, 0.03); }
  &:last-child { border-bottom: none; }
  @media (max-width: 768px) { grid-template-columns: 80px 1fr 60px; }
`

const HBarLabel = styled.div`
  display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
  font-weight: 600; color: ${COLORS.textPrimary}; font-family: ${MONO_FONT};
`

const HBarTrack = styled.div`
  height: 6px; background: rgba(255, 255, 255, 0.04); border-radius: 3px; overflow: hidden;
`

const HBarFill = styled(motion.div)`
  height: 100%; border-radius: 3px; background: ${props => props.$color || COLORS.cyan};
`

const HBarValue = styled.div`
  font-size: 0.8rem; font-weight: 600; color: ${props => props.$color || COLORS.textPrimary};
  font-family: ${MONO_FONT}; text-align: right;
`

// ─── PRESSURE ROW ───────────────────────────────────────────────────────────
const PressureRow = styled.div`
  display: grid; grid-template-columns: 32px 80px 1fr 50px; gap: 0.75rem;
  align-items: center; padding: 0.55rem 0.5rem; border-radius: 4px;
  border-left: 2px solid transparent; transition: all 0.15s ease;
  &:nth-child(even) { background: rgba(0, 229, 255, 0.015); }
  &:hover {
    border-left-color: ${props => props.$accent || COLORS.cyan};
    background: rgba(0, 229, 255, 0.04);
  }
`

const PressureBar = styled.div`
  height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.04); overflow: hidden;
`

const PressureFill = styled.div`
  height: 100%; border-radius: 2px;
  background: ${props => props.$color || COLORS.cyan}; transition: width 0.4s ease;
`

// ─── MINI BAR ───────────────────────────────────────────────────────────────
const MiniBar = styled.div`
  display: flex; height: 4px; border-radius: 2px; overflow: hidden;
  background: rgba(255, 255, 255, 0.04); width: ${props => props.$width || '80px'};
`

const MiniBarFill = styled.div`
  height: 100%; background: ${props => props.$color || COLORS.green}; transition: width 0.3s ease;
`

const FlowDot = styled.span`
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: ${props => props.$color || COLORS.textMuted}; flex-shrink: 0;
`

const RankBadge = styled.div`
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%; font-weight: 800;
  font-size: 0.75rem; font-family: ${MONO_FONT}; flex-shrink: 0;
  background: ${p => p.$rank === 1 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
    p.$rank === 2 ? 'linear-gradient(135deg, #C0C0C0, #808080)' :
    p.$rank === 3 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' : 'rgba(0, 229, 255, 0.1)'};
  color: ${p => p.$rank <= 3 ? '#0a0e17' : COLORS.textMuted};
  border: 1px solid ${p => p.$rank === 1 ? 'rgba(255, 215, 0, 0.4)' :
    p.$rank === 2 ? 'rgba(192, 192, 192, 0.4)' :
    p.$rank === 3 ? 'rgba(205, 127, 50, 0.4)' : 'rgba(0, 229, 255, 0.1)'};
`

const TokenPill = styled.span`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.5rem;
  background: rgba(0, 229, 255, 0.06); border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px; font-size: 0.7rem; font-weight: 600; color: ${COLORS.cyan};
  font-family: ${MONO_FONT};
`

const EmptyState = styled.div`
  text-align: center; padding: 3rem 1rem; color: ${COLORS.textMuted};
  font-family: ${SANS_FONT}; font-size: 0.9rem;
`

// ─── LIVE WHALE FEED (Scrolling Ticker) ─────────────────────────────────────
const TickerStrip = styled.div`
  overflow: hidden; white-space: nowrap; position: relative;
  background: rgba(0, 229, 255, 0.02); border-bottom: 1px solid ${COLORS.borderSubtle};
  padding: 0.5rem 0; margin-bottom: 1.5rem; border-radius: 6px;
  &::before, &::after {
    content: ''; position: absolute; top: 0; bottom: 0; width: 60px; z-index: 2; pointer-events: none;
  }
  &::before { left: 0; background: linear-gradient(to right, #0a0e17, transparent); }
  &::after { right: 0; background: linear-gradient(to left, #0a0e17, transparent); }
`

const TickerTrack = styled.div`
  display: inline-flex; gap: 2.5rem; animation: ${scrollTicker} ${props => props.$duration || 30}s linear infinite;
  &:hover { animation-play-state: paused; }
`

const TickerItem = styled.a`
  display: inline-flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
  font-family: ${MONO_FONT}; font-size: 0.75rem; color: ${COLORS.textPrimary};
  text-decoration: none; cursor: pointer; transition: color 0.15s ease;
  &:hover { color: ${COLORS.cyan}; }
`

const TickerDot = styled.span`
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: ${props => props.$color || COLORS.cyan};
`

// ─── SMART MONEY CONSENSUS GAUGE ────────────────────────────────────────────
const ConsensusPanel = styled.div`
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px; padding: 1.5rem;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 260px;
`

const GaugeContainer = styled.div`
  position: relative; width: 200px; height: 110px; margin-bottom: 1rem;
`

const GaugeArc = styled.svg`
  width: 200px; height: 110px; overflow: visible;
`

const ConsensusLabel = styled.div`
  font-family: ${MONO_FONT}; font-size: 1rem; font-weight: 800;
  color: ${props => props.$color || COLORS.cyan}; letter-spacing: 1px;
  margin-bottom: 0.5rem;
`

const ConsensusStats = styled.div`
  display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center;
`

const ConsensusStat = styled.div`
  text-align: center;
  .label { font-family: ${SANS_FONT}; font-size: 0.65rem; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-family: ${MONO_FONT}; font-size: 0.9rem; font-weight: 700; color: ${props => props.$color || COLORS.textPrimary}; }
`

// ─── MARKET PULSE CHART ─────────────────────────────────────────────────────
const ChartWrapper = styled.div`
  height: 220px; position: relative;
  @media (max-width: 768px) { height: 180px; }
`

// ─── TROPHY TRANSACTIONS ────────────────────────────────────────────────────
const TrophyRow = styled.div`
  display: grid; grid-template-columns: 30px 90px 60px 1fr 90px 70px; gap: 0.75rem;
  align-items: center; padding: 0.65rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.02);
  transition: background 0.15s ease; cursor: pointer;
  &:hover { background: rgba(0, 229, 255, 0.04); }
  &:last-child { border-bottom: none; }
  @media (max-width: 768px) { grid-template-columns: 30px 70px 50px 1fr 70px; }
`

const TrophyRank = styled.span`
  font-family: ${MONO_FONT}; font-weight: 800; font-size: 0.8rem;
  color: ${props => props.$rank === 1 ? '#FFD700' : props.$rank === 2 ? '#C0C0C0' : props.$rank === 3 ? '#CD7F32' : COLORS.textMuted};
`

// ─── NEWS ITEM ──────────────────────────────────────────────────────────────
const NewsItem = styled.a`
  display: flex; flex-direction: column; gap: 0.25rem; padding: 0.65rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.02); text-decoration: none;
  transition: background 0.15s ease;
  &:hover { background: rgba(0, 229, 255, 0.03); }
  &:last-child { border-bottom: none; }
`

const NewsHeadline = styled.div`
  font-family: ${SANS_FONT}; font-size: 0.8rem; font-weight: 600;
  color: ${COLORS.textPrimary}; line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
`

const NewsMeta = styled.div`
  display: flex; align-items: center; gap: 0.5rem; font-size: 0.65rem; font-family: ${MONO_FONT};
`

const SentimentBadge = styled.span`
  padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.6rem; font-weight: 700;
  font-family: ${MONO_FONT}; letter-spacing: 0.5px;
  color: ${props => props.$sentiment === 'bullish' ? COLORS.green : props.$sentiment === 'bearish' ? COLORS.red : COLORS.amber};
  background: ${props => props.$sentiment === 'bullish' ? 'rgba(0,230,118,0.08)' : props.$sentiment === 'bearish' ? 'rgba(255,23,68,0.08)' : 'rgba(255,171,0,0.08)'};
  border: 1px solid ${props => props.$sentiment === 'bullish' ? 'rgba(0,230,118,0.15)' : props.$sentiment === 'bearish' ? 'rgba(255,23,68,0.15)' : 'rgba(255,171,0,0.15)'};
`

const BreakingTag = styled.span`
  padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.55rem; font-weight: 800;
  font-family: ${MONO_FONT}; letter-spacing: 1px; color: #ff1744;
  background: rgba(255,23,68,0.1); border: 1px solid rgba(255,23,68,0.2);
`

// ─── HELPERS ────────────────────────────────────────────────────────────────
const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const formatCompact = (n) => {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(num/1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(num/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(num/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(num/1e3).toFixed(2)}K`;
  return `${Math.round(num)}`;
}

// Count-up hook for animated numbers
const useCountUp = (target, duration = 800) => {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)
  useEffect(() => {
    if (target === prevTarget.current) return
    const start = prevTarget.current
    const diff = target - start
    const startTime = performance.now()
    prevTarget.current = target
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setValue(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])
  return value
}

const AnimatedNumber = ({ value, prefix = '', suffix = '' }) => {
  const animated = useCountUp(Number(value) || 0)
  return <>{prefix}{formatNumber(animated)}{suffix}</>
}

// ─── MOTION VARIANTS ────────────────────────────────────────────────────────
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: 'beforeChildren', staggerChildren: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }
}
const rowVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.25, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Dashboard = ({ isPremium = false }) => {
  console.log('🔍 Dashboard isPremium:', isPremium)

  const [transactions, setTransactions] = useState([]);
  const [topBuys, setTopBuys] = useState([]);
  const [topSells, setTopSells] = useState([]);
  const [blockchainData, setBlockchainData] = useState({ labels: [], data: [] });
  const [tokenTradeCounts, setTokenTradeCounts] = useState([]);
  const [noData24h, setNoData24h] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('now');

  // User greeting state
  const [userName, setUserName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  // Watchlist
  const [watchlist, setWatchlist] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  
  // Refs for tutorial targeting
  const marketPulseRef = useRef(null);
  const inflowsRef = useRef(null);
  const outflowsRef = useRef(null);
  const tradedTokensRef = useRef(null);
  const topWhalesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [algoActive, setAlgoActive] = useState(true);
  
     // New state for enhanced insights
   const [marketSentiment, setMarketSentiment] = useState({ ratio: 0, trend: 'neutral' });
   const [whaleActivity, setWhaleActivity] = useState([]);
   const [riskMetrics, setRiskMetrics] = useState({ highValueCount: 0, avgTransactionSize: 0 });
  const [topHighValueTxs, setTopHighValueTxs] = useState([])
   const [marketMomentum, setMarketMomentum] = useState({ volumeChange: 0, activityChange: 0 });
  const [timeSeries, setTimeSeries] = useState({ labels: [], volume: [], count: [] })
  const [tokenLeaders, setTokenLeaders] = useState([])
  const [tokenInflows, setTokenInflows] = useState([])
  const [tokenOutflows, setTokenOutflows] = useState([])
  const [overall, setOverall] = useState({ totalCount: 0, totalVolume: 0, buyCount: 0, sellCount: 0, buyVolume: 0, sellVolume: 0 })

  // News + signals state for dashboard V2
  const [newsArticles, setNewsArticles] = useState([])
  const [signals, setSignals] = useState([])

  // Fetch user info and check tutorial state
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (session?.user) {
          const displayName = session.user.user_metadata?.full_name 
            || session.user.user_metadata?.name 
            || session.user.email?.split('@')[0]
            || 'there'
          setUserName(displayName)
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err)
      }
    }
    
    // Check if tutorial should show
    const hasSeenTutorial = localStorage.getItem('sonar_tutorial_completed')
    if (!hasSeenTutorial) {
      // Small delay to let dashboard render first
      setTimeout(() => setShowTutorial(true), 1000)
    }
    
    fetchUserInfo()

    // Fetch watchlist with enriched price data
    async function fetchWatchlist() {
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (!session) { setWatchlistLoading(false); return }
        const res = await fetch('/api/watchlist', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
        if (res.ok) {
          const { watchlist: wl } = await res.json()
          if (wl && wl.length > 0) {
            const enriched = await Promise.all(wl.map(async (item) => {
              try {
                const priceRes = await fetch(`/api/token/price?symbol=${item.symbol}`)
                if (priceRes.ok) {
                  const p = await priceRes.json()
                  return { ...item, price: p.price, change24h: p.change24h, name: p.name }
                }
              } catch {}
              return { ...item, price: null, change24h: null, name: null }
            }))
            setWatchlist(enriched)
          }
        }
      } catch {}
      finally { setWatchlistLoading(false) }
    }
    fetchWatchlist()
  }, [])

  useEffect(() => {
    let timer
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
        const json = await res.json()
        if (res.ok) {
          const recent = json.recent || []
          setTransactions(recent.map(r => {
            const rawUsd = Math.floor(r.usd_value || 0)
            return {
              id: r.transaction_hash || `${r.time}-${r.coin}-${r.usd_value}`,
              time: new Date(r.time).toLocaleTimeString(),
              coin: r.coin || '—',
              action: r.action || 'TRANSFER',
              blockchain: r.blockchain || '—',
              rawUsd,
              usdValue: formatNumber(rawUsd),
              hash: r.transaction_hash || '—',
              from_address: r.from_address || '—',
              to_address: r.to_address || '—',
              whale_score: r.whale_score || 0,
            }
          }))
                     setTopBuys(json.topBuys || [])
           setTopSells(json.topSells || [])
           setBlockchainData(json.blockchainVolume || { labels: [], data: [] })
           
           // Set enhanced insights data from API
           setMarketSentiment(json.marketSentiment || { ratio: 0, trend: 'neutral' });
           setRiskMetrics(json.riskMetrics || { highValueCount: 0, avgTransactionSize: 0 });
           setMarketMomentum(json.marketMomentum || { volumeChange: 0, activityChange: 0 });
           setWhaleActivity(json.whaleActivity || []);
          setTopHighValueTxs(json.topHighValueTxs || [])
          setTimeSeries(json.timeSeries || { labels: [], volume: [], count: [] })
          setTokenLeaders(json.tokenLeaders || [])
          setTokenInflows(json.tokenInflows || [])
          setTokenOutflows(json.tokenOutflows || [])
          setOverall(json.overall || { totalCount: 0, totalVolume: 0, buyCount: 0, sellCount: 0, buyVolume: 0, sellVolume: 0 })
          // Normalize tokenTradeCounts to an array of { token, count }
          const ttc = json.tokenTradeCounts
          let normalized = []
          if (Array.isArray(ttc)) {
            // Could be array of objects or tuples
            normalized = ttc.map((item) => {
              if (Array.isArray(item)) {
                const [tok, cnt] = item
                return { token: String(tok || '').trim().toUpperCase(), count: Number(cnt || 0) }
              }
              const token = String(item?.token || item?.symbol || '').trim().toUpperCase()
              const count = Number(item?.count ?? item?.txCount ?? 0)
              return { token, count }
            })
          } else if (ttc && typeof ttc === 'object') {
            normalized = Object.entries(ttc).map(([token, count]) => ({ token: String(token || '').trim().toUpperCase(), count: Number(count || 0) }))
          }
          // Clean, sort, top 10
          let cleaned = (normalized || [])
            .filter((x) => x && x.token && !Number.isNaN(x.count) && x.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
          // Fallback: derive counts from inflow/outflow aggregates if needed
          if (!cleaned.length) {
            const fallbackMap = new Map()
            const inflows = Array.isArray(json.tokenInflows) ? json.tokenInflows : []
            const outflows = Array.isArray(json.tokenOutflows) ? json.tokenOutflows : []
            ;[...inflows, ...outflows].forEach((t) => {
              const token = String(t?.token || '').trim().toUpperCase()
              const cnt = Number(t?.txCount || 0)
              if (token && cnt > 0) fallbackMap.set(token, (fallbackMap.get(token) || 0) + cnt)
            })
            const fb = Array.from(fallbackMap.entries()).map(([token, count]) => ({ token, count }))
              .filter((x) => x && x.token && !Number.isNaN(x.count) && x.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
            cleaned = fb
          }
          setTokenTradeCounts(cleaned)
          let noData = Boolean(json.noData24h)
          // Fallback: if API says no data, try computing from /api/trades
          if (noData) {
            try {
              const tradesRes = await fetch('/api/trades?sinceHours=24&limit=1000', { cache: 'no-store' })
              const tradesJson = await tradesRes.json()
              const trades = Array.isArray(tradesJson?.data) ? tradesJson.data : []
              if (trades.length > 0) {
                // Build minimal aggregates to unlock UI
                const byToken = new Map()
                trades.forEach(t => {
                  const sym = String(t.token_symbol || '—').trim().toUpperCase()
                  byToken.set(sym, (byToken.get(sym) || 0) + 1)
                })
                const top = Array.from(byToken.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12)
                setTokenTradeCounts(top.map(([token, count]) => ({ token, count })))
                noData = false
              }
            } catch {}
          }
          setNoData24h(noData);
          
          setLastUpdate('just now')
        }
      } catch {}
      finally { setLoading(false); hasLoadedOnce.current = true }
    }
    
                     // All enhanced insights data is now fetched from the enhanced /api/dashboard/summary endpoint
    
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/social/feed?limit=8&sort=recent', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setNewsArticles((json.posts || json.data || []).slice(0, 8))
        }
      } catch {}
    }

    const fetchSignals = async () => {
      try {
        const res = await fetch('/api/signals', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          const sigs = (json.signals || json.data || json || [])
          setSignals(Array.isArray(sigs) ? sigs.slice(0, 4) : [])
        }
      } catch {}
    }

    const pollAlgo = async () => {
      try {
        const res = await fetch('/api/health/algorithm', { cache: 'no-store' })
        const j = await res.json()
        if (res.ok) setAlgoActive(Boolean(j.active))
      } catch {}
    }
    
         fetchSummary(); 
     fetchNews();
     fetchSignals();
     pollAlgo()
     timer = setInterval(() => { 
       fetchSummary(); 
       fetchNews();
       pollAlgo() 
     }, 15000)
    return () => clearInterval(timer)
  }, [])

  const filteredTransactions = transactions;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      <DashboardShell>
        {/* ─── COMMAND BAR ───────────────────────────────────────────── */}
        <CommandBar>
          <CommandBarLeft>
            <TerminalLogo>SONAR</TerminalLogo>
            <LiveDot>{algoActive ? 'LIVE' : 'OFFLINE'}</LiveDot>
            <TimeBadge>24H WINDOW</TimeBadge>
          </CommandBarLeft>

          <CommandBarCenter>
            <StatChip>
              <span className="label">TXN:</span>
              <AnimatedNumber value={overall.totalCount || 0} />
            </StatChip>
            <CmdDivider>|</CmdDivider>
            <StatChip>
              <span className="label">VOL:</span>
              ${formatCompact(Math.abs(overall.totalVolume || 0))}
            </StatChip>
            <CmdDivider>|</CmdDivider>
            <StatChip>
              <span className="label">BUYS:</span>
              <span style={{ color: COLORS.green }}>{overall.buyCount || 0}</span>
            </StatChip>
            <StatChip>
              <span className="label">SELLS:</span>
              <span style={{ color: COLORS.red }}>{overall.sellCount || 0}</span>
            </StatChip>
          </CommandBarCenter>

          <CommandBarRight>
            {userName && (
              <UserChip>
                Welcome, <strong>{userName}</strong>
              </UserChip>
            )}
            {!isPremium && (
              <a href="/subscribe" style={{
                background: 'linear-gradient(135deg, #00e5ff, #00b8d4)', color: '#0a0e17',
                fontFamily: MONO_FONT, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.5px',
                padding: '0.2rem 0.6rem', borderRadius: '3px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              }}>
                UPGRADE
              </a>
            )}
            <TutorialBtn onClick={() => {
              localStorage.removeItem('sonar_tutorial_completed')
              setShowTutorial(true)
            }}>
              ▶ Tutorial
            </TutorialBtn>
          </CommandBarRight>
        </CommandBar>

        {/* ─── LIVE WHALE FEED (Scrolling Ticker) ──────────────────── */}
        {transactions.length > 0 && (
          <TickerStrip>
            <TickerTrack $duration={transactions.length > 5 ? 40 : 25}>
              {[...transactions, ...transactions].map((tx, i) => {
                const side = (tx.action || '').toUpperCase()
                const color = side === 'BUY' ? COLORS.green : side === 'SELL' ? COLORS.red : COLORS.amber
                const icon = side === 'BUY' ? '▲' : side === 'SELL' ? '▼' : '↔'
                const timeAgo = (() => {
                  try {
                    const t = tx.time
                    if (!t) return ''
                    const parsed = typeof t === 'string' && t.includes(':') ? new Date(`1970-01-01T${t}`) : new Date(t)
                    if (isNaN(parsed.getTime())) return ''
                    // If time-only string, just show the time
                    if (typeof t === 'string' && !t.includes('-') && !t.includes('/') && !t.includes('T')) return t
                    const diff = Date.now() - parsed.getTime()
                    if (diff < 0 || diff > 86400000 * 7) return ''
                    const mins = Math.floor(diff / 60000)
                    if (mins < 1) return 'just now'
                    if (mins < 60) return `${mins}m ago`
                    return `${Math.floor(mins / 60)}h ago`
                  } catch { return '' }
                })()
                const addr = tx.from_address || ''
                const label = tx.whale_entity || (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '')
                return (
                  <TickerItem key={`${tx.id}-${i}`} href={`/token/${encodeURIComponent(tx.coin)}`}>
                    <TickerDot $color={color} />
                    <span style={{ color, fontWeight: 700 }}>{icon} {side}</span>
                    <span style={{ fontWeight: 700 }}>{tx.coin}</span>
                    <span style={{ color: COLORS.cyan, fontWeight: 700 }}>${tx.usdValue}</span>
                    {label && <span style={{ color: COLORS.textMuted, fontSize: '0.7rem' }}>· {label}</span>}
                    {timeAgo && <span style={{ color: COLORS.textMuted, fontSize: '0.65rem' }}>· {timeAgo}</span>}
                  </TickerItem>
                )
              })}
            </TickerTrack>
          </TickerStrip>
        )}

        <DashboardContainer>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              style={{ paddingTop: '1.5rem' }}
            >

              {/* ─── KPI TICKER STRIP (MARKET PULSE) ─────────────────── */}
              <motion.div variants={fadeUp} ref={marketPulseRef} data-tutorial="market-pulse">
                {loading && !hasLoadedOnce.current && <SkeletonKPIStrip />}
                <KPIStrip style={{ display: loading && !hasLoadedOnce.current ? 'none' : undefined }}>
                  <KPICell>
                    <KPILabel>Strong Accumulation</KPILabel>
                    <KPIValue $color={COLORS.green}>
                      <AnimatedNumber value={tokenInflows.filter(t => (t.netUsdRobust || 0) > 1000000).length} />
                    </KPIValue>
                    <KPISub $color={COLORS.green}>&gt; $1M Net Inflow</KPISub>
                  </KPICell>

                  <KPICell>
                    <KPILabel>Heavy Distribution</KPILabel>
                    <KPIValue $color={COLORS.red}>
                      <AnimatedNumber value={tokenOutflows.filter(t => Math.abs(t.netUsdRobust || 0) > 1000000).length} />
                    </KPIValue>
                    <KPISub $color={COLORS.red}>&gt; $1M Net Outflow</KPISub>
                  </KPICell>

                  <KPICell>
                    <KPILabel>High Whale Activity</KPILabel>
                    <KPIValue $color={COLORS.cyan}>
                      <AnimatedNumber value={whaleActivity.filter(t => (t.uniqueWhales || 0) > 10).length} />
                    </KPIValue>
                    <KPISub $color={COLORS.cyan}>&gt; 10 Unique Whales</KPISub>
                  </KPICell>

                  <KPICell>
                    <KPILabel>24H Whale Volume</KPILabel>
                    <KPIValue $color={COLORS.amber}>
                      ${formatCompact(Math.abs(overall.totalVolume || 0))}
                    </KPIValue>
                    <KPISub $color={COLORS.amber}>
                      {overall.totalCount || 0} Transactions
                    </KPISub>
                  </KPICell>
                </KPIStrip>
              </motion.div>

              {/* Free user conversion banner */}
              {!isPremium && (
                <div style={{
                  textAlign: 'center', padding: '0.75rem 1rem', marginBottom: '1.5rem',
                  background: COLORS.panelBg, border: `1px solid ${COLORS.borderSubtle}`,
                  borderRadius: '8px', fontFamily: SANS_FONT,
                }}>
                  <span style={{ fontSize: '0.8rem', color: COLORS.textMuted }}>
                    <span style={{ fontFamily: MONO_FONT, fontWeight: 700, color: COLORS.cyan }}>
                      {overall.totalCount || 0}
                    </span> whale transactions tracked today.{' '}
                    <a href="/subscribe" style={{ color: COLORS.cyan, fontWeight: 600, textDecoration: 'underline' }}>
                      Upgrade to see full analysis — $7.99/mo
                    </a>
                  </span>
                </div>
              )}

              {/* ─── NET INFLOWS / OUTFLOWS ───────────────────────────── */}
              <motion.div variants={fadeUp} ref={inflowsRef} data-tutorial="inflows-outflows">
                <SectionGap>
                  <GridContainer>
                    {/* Inflows Panel */}
                    <Panel>
                      <PanelHeader>
                        <TerminalPrompt>NET_INFLOWS</TerminalPrompt>
                        <PanelBadge>24H</PanelBadge>
                      </PanelHeader>
                      {tokenInflows.length === 0 ? (
                        loading ? <SkeletonBarRows count={5} /> :
                        <EmptyState>No inflow data in the past 24 hours.</EmptyState>
                      ) : (
                        <div>
                          {tokenInflows.map((t, idx) => {
                            const maxVal = Math.abs(tokenInflows[0]?.netUsdRobust || 1)
                            const pct = Math.min(100, (Math.abs(t.netUsdRobust || 0) / maxVal) * 100)
                            return (
                              <Link key={t.token} href={`/statistics?token=${encodeURIComponent(t.token)}&sinceHours=24`} style={{ textDecoration: 'none' }}>
                                <HBarRow>
                                  <HBarLabel>
                                    <TokenIcon symbol={t.token} size={18} />
                                    {t.token}
                                  </HBarLabel>
                                  <HBarTrack>
                                    <HBarFill
                                      $color={COLORS.green}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.6, delay: idx * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    />
                                  </HBarTrack>
                                  <HBarValue $color={COLORS.green}>
                                    +${formatCompact(t.netUsdRobust || 0)}
                                  </HBarValue>
                                </HBarRow>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </Panel>

                    {/* Outflows Panel */}
                    <Panel>
                      <PanelHeader>
                        <TerminalPrompt>NET_OUTFLOWS</TerminalPrompt>
                        <PanelBadge>24H</PanelBadge>
                      </PanelHeader>
                      {tokenOutflows.length === 0 ? (
                        loading ? <SkeletonBarRows count={5} /> :
                        <EmptyState>No outflow data in the past 24 hours.</EmptyState>
                      ) : (
                        <div>
                          {tokenOutflows.map((t, idx) => {
                            const maxVal = Math.abs(tokenOutflows[0]?.netUsdRobust || 1)
                            const pct = Math.min(100, (Math.abs(t.netUsdRobust || 0) / maxVal) * 100)
                            return (
                              <Link key={t.token} href={`/statistics?token=${encodeURIComponent(t.token)}&sinceHours=24`} style={{ textDecoration: 'none' }}>
                                <HBarRow>
                                  <HBarLabel>
                                    <TokenIcon symbol={t.token} size={18} />
                                    {t.token}
                                  </HBarLabel>
                                  <HBarTrack>
                                    <HBarFill
                                      $color={COLORS.red}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.6, delay: idx * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    />
                                  </HBarTrack>
                                  <HBarValue $color={COLORS.red}>
                                    -${formatCompact(Math.abs(t.netUsdRobust || 0))}
                                  </HBarValue>
                                </HBarRow>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </Panel>
                  </GridContainer>
                </SectionGap>
              </motion.div>

              {/* ─── PREMIUM SECTIONS (gated with PremiumGate) ──────── */}
                  {/* ─── BUY / SELL PRESSURE ───────────────────────────── */}
                  <PremiumGate isPremium={isPremium} feature="Buy/Sell Pressure Analysis">
                  <motion.div variants={fadeUp}>
                    <SectionGap>
                      <GridContainer>
                        <Panel>
                          <PanelHeader>
                            <TerminalPrompt>BUY_PRESSURE</TerminalPrompt>
                          </PanelHeader>
                          {topBuys.map((item, index) => (
                            <Link key={`buy-${item.coin}-${index}`} href={`/statistics?token=${encodeURIComponent(item.coin)}&sinceHours=24`} style={{ textDecoration: 'none' }}>
                              <PressureRow $accent={COLORS.green}>
                                <TokenIcon symbol={item.coin} size={18} />
                                <span style={{ fontFamily: MONO_FONT, fontWeight: 600, color: COLORS.textPrimary, fontSize: '0.85rem' }}>
                                  {item.coin}
                                </span>
                                <PressureBar>
                                  <PressureFill $color={COLORS.green} style={{ width: `${item.percentage}%` }} />
                                </PressureBar>
                                <span style={{ fontFamily: MONO_FONT, fontWeight: 700, color: COLORS.green, fontSize: '0.8rem', textAlign: 'right' }}>
                                  {item.percentage.toFixed(1)}%
                                </span>
                              </PressureRow>
                            </Link>
                          ))}
                        </Panel>

                        <Panel>
                          <PanelHeader>
                            <TerminalPrompt>SELL_PRESSURE</TerminalPrompt>
                          </PanelHeader>
                          {topSells.map((item, index) => (
                            <Link key={`sell-${item.coin}-${index}`} href={`/statistics?token=${encodeURIComponent(item.coin)}&sinceHours=24`} style={{ textDecoration: 'none' }}>
                              <PressureRow $accent={COLORS.red}>
                                <TokenIcon symbol={item.coin} size={18} />
                                <span style={{ fontFamily: MONO_FONT, fontWeight: 600, color: COLORS.textPrimary, fontSize: '0.85rem' }}>
                                  {item.coin}
                                </span>
                                <PressureBar>
                                  <PressureFill $color={COLORS.red} style={{ width: `${item.percentage}%` }} />
                                </PressureBar>
                                <span style={{ fontFamily: MONO_FONT, fontWeight: 700, color: COLORS.red, fontSize: '0.8rem', textAlign: 'right' }}>
                                  {item.percentage.toFixed(1)}%
                                </span>
                              </PressureRow>
                            </Link>
                          ))}
                        </Panel>
                      </GridContainer>
                    </SectionGap>
                  </motion.div>
                  </PremiumGate>

                  {/* ─── MOST TRADED TOKENS — DATA TABLE ───────────────── */}
                  <motion.div variants={fadeUp} ref={tradedTokensRef} data-tutorial="traded-tokens">
                    <SectionGap>
                      <Panel>
                        <PanelHeader>
                          <div>
                            <TerminalPrompt>MOST_TRADED_TOKENS</TerminalPrompt>
                            <PanelSubtext>Top tokens by institutional whale transaction volume — 24H</PanelSubtext>
                          </div>
                          <PanelBadge>LAST 24H</PanelBadge>
                        </PanelHeader>

                        {noData24h || tokenLeaders.length === 0 ? (
                          <EmptyState>No trading data available for the past 24 hours.</EmptyState>
                        ) : (
                          <DataTable>
                            <table>
                              <thead>
                                <tr>
                                  <th style={{ width: '50px' }}>#</th>
                                  <th>Token</th>
                                  <th className="right">Trades</th>
                                  <th className="right">Volume</th>
                                  <th className="center" style={{ width: '100px' }}>Buy / Sell</th>
                                  <th className="center" style={{ width: '120px' }}>Flow</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tokenLeaders.slice(0, isPremium ? 12 : 5).map((t, idx) => {
                                  const totalTrades = (t.buys || 0) + (t.sells || 0)
                                  const buyRatio = totalTrades > 0 ? ((t.buys || 0) / totalTrades) * 100 : 50
                                  const isBuyHeavy = buyRatio > 60
                                  const isSellHeavy = buyRatio < 40
                                  const flowColor = isBuyHeavy ? COLORS.green : isSellHeavy ? COLORS.red : COLORS.amber

                                  return (
                                    <motion.tr
                                      key={t.token}
                                      custom={idx}
                                      variants={rowVariant}
                                      initial="hidden"
                                      animate="visible"
                                      onClick={() => window.location.href = `/token/${encodeURIComponent(t.token)}?sinceHours=24`}
                                    >
                                      <td className="muted" style={{ fontWeight: 700 }}>{idx + 1}</td>
                                      <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                          <TokenIcon symbol={t.token} size={22} />
                                          <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{t.token}</span>
                                          <FlowDot $color={flowColor} />
                                        </div>
                                      </td>
                                      <td className="right" style={{ fontWeight: 700, color: COLORS.cyan }}>{t.txCount || 0}</td>
                                      <td className="right" style={{ fontWeight: 600 }}>${formatCompact(t.volume || 0)}</td>
                                      <td className="center">
                                        <span style={{ fontSize: '0.75rem', color: isBuyHeavy ? COLORS.green : isSellHeavy ? COLORS.red : COLORS.textMuted }}>
                                          {buyRatio.toFixed(0)}/{(100 - buyRatio).toFixed(0)}
                                        </span>
                                      </td>
                                      <td className="center">
                                        <MiniBar $width="100%">
                                          <MiniBarFill $color={COLORS.green} style={{ width: `${buyRatio}%` }} />
                                          <MiniBarFill $color={COLORS.red} style={{ width: `${100 - buyRatio}%` }} />
                                        </MiniBar>
                                      </td>
                                    </motion.tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </DataTable>
                        )}
                        {!isPremium && tokenLeaders.length > 5 && (
                          <div style={{
                            textAlign: 'center', padding: '0.75rem', marginTop: '0.5rem',
                            background: 'rgba(0, 229, 255, 0.03)', border: `1px solid ${COLORS.borderSubtle}`,
                            borderRadius: '4px', fontFamily: SANS_FONT, fontSize: '0.8rem', color: COLORS.textMuted
                          }}>
                            Showing top 5 of {tokenLeaders.length} tokens.{' '}
                            <a href="/subscribe" style={{ color: COLORS.cyan, fontWeight: 600, textDecoration: 'underline' }}>
                              Upgrade for full table + Buy/Sell Pressure
                            </a>
                          </div>
                        )}
                      </Panel>
                    </SectionGap>
                  </motion.div>

                  {/* ─── TOP 10 WHALES ──────────────────────────────────── */}
                  <PremiumGate isPremium={isPremium} feature="Top Whale Wallets">
                  <motion.div variants={fadeUp}>
                    <div ref={topWhalesRef} data-tutorial="top-whales">
                      <TopWhalesSection />
                    </div>
                  </motion.div>
                  </PremiumGate>

              {/* Whale Alerts */}
              <PremiumGate isPremium={isPremium} feature="Real-Time Whale Alerts">
              <motion.div variants={fadeUp}>
                <WhaleAlertsCard isPremium={isPremium} />
              </motion.div>
              </PremiumGate>

            </motion.div>
        </DashboardContainer>
      </DashboardShell>

      {/* Social Intelligence Pulse */}
      <SocialPulse />

      {/* Orca Onboarding Tutorial */}
      <OrcaTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        refs={{
          marketPulse: marketPulseRef,
          inflowsOutflows: inflowsRef,
          tradedTokens: tradedTokensRef,
          topWhales: topWhalesRef
        }}
      />
    </>
  )
}



// ═══════════════════════════════════════════════════════════════════════════════
// TOP WHALES SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const TopWhalesSection = () => {
  const [whales, setWhales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopWhales = async () => {
      try {
        const res = await fetch('/api/whales/top-7day')
        const data = await res.json()
        setWhales(data?.whales || [])
      } catch (err) {
        console.error('Failed to fetch top whales:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTopWhales()
  }, [])

  const formatUSD = (value) => {
    const num = Number(value)
    const abs = Math.abs(num)
    const sign = num >= 0 ? '+' : ''
    
    if (abs >= 1e9) return `${sign}$${(num / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(num / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(num / 1e3).toFixed(2)}K`
    return `${sign}$${num.toFixed(2)}`
  }

  const timeAgo = (timestamp) => {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <SectionGap>
      <Panel>
        <PanelHeader>
          <div>
            <TerminalPrompt>TOP_WHALES</TerminalPrompt>
            <PanelSubtext>Most active whale wallets in the past 7 days</PanelSubtext>
          </div>
          <PanelBadge>7-DAY ACTIVITY</PanelBadge>
        </PanelHeader>

        {loading ? (
          <EmptyState>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontFamily: MONO_FONT }}
            >
              Loading top whales...
            </motion.div>
          </EmptyState>
        ) : whales.length === 0 ? (
          <EmptyState>
            <div style={{ opacity: 0.4, fontSize: '2.5rem', marginBottom: '1rem' }}>⊘</div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#8a9ab0' }}>No Whale Activity</div>
            No significant whale transactions detected in the past 7 days.
          </EmptyState>
        ) : (
          <DataTable>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Rank</th>
                  <th>Address</th>
                  <th className="right">Net Flow (7d)</th>
                  <th className="center" style={{ width: '90px' }}>Buy/Sell</th>
                  <th>Top Tokens</th>
                  <th className="right">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {whales.map((whale, idx) => {
                  const rank = idx + 1
                  const buyPct = parseInt(whale.buySellRatio?.split('/')[0]) || 50

                  return (
                    <motion.tr
                      key={whale.address}
                      custom={idx}
                      variants={rowVariant}
                      initial="hidden"
                      animate="visible"
                      onClick={() => window.location.href = `/whale/${encodeURIComponent(whale.address)}`}
                    >
                      <td>
                        <RankBadge $rank={rank}>{rank}</RankBadge>
                      </td>
                      <td>
                        <Link
                          href={`/whale/${encodeURIComponent(whale.address)}`}
                          style={{
                            color: COLORS.cyan,
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontFamily: MONO_FONT,
                            fontSize: '0.85rem',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {whale.address.slice(0, 6)}…{whale.address.slice(-4)}
                        </Link>
                      </td>
                      <td className="right">
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: whale.netUsd > 0 ? COLORS.green : whale.netUsd < 0 ? COLORS.red : COLORS.textPrimary,
                          fontFamily: MONO_FONT,
                        }}>
                          {formatUSD(whale.netUsd)}
                        </span>
                      </td>
                      <td className="center">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontFamily: MONO_FONT,
                            fontWeight: 600,
                            color: buyPct > 65 ? COLORS.green : buyPct < 35 ? COLORS.red : COLORS.amber,
                          }}>
                            {whale.buySellRatio}
                          </span>
                          <MiniBar $width="60px">
                            <MiniBarFill $color={COLORS.green} style={{ width: `${buyPct}%` }} />
                            <MiniBarFill $color={COLORS.red} style={{ width: `${100 - buyPct}%` }} />
                          </MiniBar>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {(whale.tokens || []).slice(0, 3).map(token => (
                            <TokenPill key={token}>
                              <TokenIcon symbol={token} size={14} />
                              {token}
                            </TokenPill>
                          ))}
                          {(whale.tokens || []).length > 3 && (
                            <TokenPill>+{whale.tokens.length - 3}</TokenPill>
                          )}
                        </div>
                      </td>
                      <td className="right muted" style={{ fontSize: '0.8rem', fontFamily: MONO_FONT }}>
                        {whale.lastSeen ? timeAgo(whale.lastSeen) : '—'}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </Panel>
    </SectionGap>
  )
}

export default Dashboard;