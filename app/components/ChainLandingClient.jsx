'use client'
import React, { useRef } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { motion, useInView } from 'framer-motion'

/* ================================================================
   KEYFRAMES
   ================================================================ */
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const gridMove = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(40px); }
`

/* ================================================================
   STYLED COMPONENTS
   ================================================================ */
const PageContainer = styled.div`
  min-height: 100vh;
  background: #080f18;
  color: #e8edf2;
  overflow-x: hidden;
  position: relative;
`

const GridBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: 
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: ${gridMove} 20s linear infinite;
`

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 2rem 80px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 140%;
    height: 140%;
    background: radial-gradient(ellipse at center, ${p => p.$glowColor || 'rgba(54, 166, 186, 0.12)'} 0%, transparent 60%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(to top, #080f18, transparent);
    pointer-events: none;
    z-index: 2;
  }
`

const HeroContent = styled.div`
  position: relative;
  z-index: 3;
  max-width: 900px;
`

const ChainBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  background: ${p => p.$bg || 'rgba(54, 166, 186, 0.1)'};
  border: 1px solid ${p => p.$border || 'rgba(54, 166, 186, 0.3)'};
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${p => p.$color || '#36a6ba'};
  margin-bottom: 2rem;
`

const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color || '#00e676'};
  animation: ${pulse} 2s ease-in-out infinite;
`

const HeroTitle = styled(motion.h1)`
  font-size: 4.5rem;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
  background: ${p => p.$gradient || 'linear-gradient(180deg, #ffffff 0%, #5dd5ed 60%, #36a6ba 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) { font-size: 2.8rem; }
  @media (max-width: 480px) { font-size: 2.2rem; }
`

const HeroSubtitle = styled(motion.p)`
  font-size: 1.35rem;
  color: #8a9bb0;
  line-height: 1.7;
  margin-bottom: 2.5rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) { font-size: 1.1rem; }
`

const StatRow = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
`

const StatBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 50px;
  font-size: 0.9rem;
  color: #8a9bb0;

  strong {
    color: ${p => p.$accent || '#36a6ba'};
    font-weight: 700;
  }
`

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.2rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.05rem;
  text-decoration: none;
  background: ${p => p.$bg || 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)'};
  color: ${p => p.$textColor || '#fff'};
  box-shadow: 0 8px 25px ${p => p.$shadow || 'rgba(54, 166, 186, 0.35)'};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top:0; left:-100%; width:100%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }
  &:hover::before { left: 100%; }
  &:hover { transform: translateY(-3px); box-shadow: 0 12px 35px ${p => p.$shadow || 'rgba(54, 166, 186, 0.45)'}; }
`

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.2rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.05rem;
  text-decoration: none;
  background: transparent;
  color: ${p => p.$color || '#36a6ba'};
  border: 2px solid ${p => p.$border || 'rgba(54, 166, 186, 0.4)'};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${p => p.$color || '#36a6ba'};
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }
`

/* Sections */
const SectionWrapper = styled.section`
  position: relative;
  z-index: 1;
  padding: 7rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
`

const SectionTag = styled(motion.div)`
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${p => p.$color || '#36a6ba'};
  margin-bottom: 0.75rem;
`

const SectionTitle = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin-bottom: 1.2rem;
  background: linear-gradient(180deg, #ffffff 0%, #b0c4d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) { font-size: 2.2rem; }
`

const SectionSubtitle = styled(motion.p)`
  font-size: 1.15rem;
  color: #6b7d8f;
  line-height: 1.7;
  max-width: 650px;
  margin-bottom: 3.5rem;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`

const FeatureCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 2.5rem;
  backdrop-filter: blur(10px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: ${p => p.$accent || 'linear-gradient(90deg, #36a6ba, transparent)'};
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    transform: translateY(-8px);
    border-color: ${p => p.$hoverBorder || 'rgba(54, 166, 186, 0.3)'};
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px ${p => p.$glow || 'rgba(54, 166, 186, 0.08)'};

    &::before { opacity: 1; }
  }
`

const IconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: ${p => p.$bg || 'rgba(54, 166, 186, 0.12)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`

const FeatureTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: #e8edf2;
  margin-bottom: 0.75rem;
`

const FeatureDesc = styled.p`
  font-size: 0.95rem;
  color: #6b7d8f;
  line-height: 1.7;
`

/* How it works */
const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  max-width: 700px;
  margin: 0 auto;

  &::before {
    content: '';
    position: absolute;
    left: 28px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, ${p => p.$lineColor || '#36a6ba'}, transparent);
    opacity: 0.3;
  }
`

const StepItem = styled(motion.div)`
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  padding: 2rem 0;
`

const StepNumber = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${p => p.$bg || 'rgba(54, 166, 186, 0.12)'};
  border: 2px solid ${p => p.$border || 'rgba(54, 166, 186, 0.3)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
  color: ${p => p.$color || '#36a6ba'};
  flex-shrink: 0;
  position: relative;
  z-index: 2;
`

const StepContent = styled.div`
  h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #e8edf2;
    margin-bottom: 0.5rem;
  }
  p {
    font-size: 0.95rem;
    color: #6b7d8f;
    line-height: 1.7;
  }
`

/* Comparison table */
const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
`

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    padding: 1rem 1.25rem;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #6b7d8f;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    white-space: nowrap;
  }

  td {
    padding: 1rem 1.25rem;
    font-size: 0.95rem;
    color: #8a9bb0;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    white-space: nowrap;
  }

  tr:last-child td { border-bottom: none; }

  .highlight {
    color: ${p => p.$accent || '#36a6ba'};
    font-weight: 700;
  }

  .check { color: #2ecc71; font-weight: 700; }
  .cross { color: #444; }
`

/* FAQ */
const FAQContainer = styled.div`
  max-width: 750px;
  margin: 0 auto;
`

const FAQItem = styled(motion.div)`
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 1.5rem 0;

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #e8edf2;
    margin-bottom: 0.75rem;
  }

  p {
    font-size: 0.95rem;
    color: #6b7d8f;
    line-height: 1.7;
  }
`

/* CTA */
const CTASection = styled.section`
  position: relative;
  z-index: 1;
  padding: 8rem 2rem;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: 100%;
    background: radial-gradient(ellipse at center, ${p => p.$glow || 'rgba(54, 166, 186, 0.08)'} 0%, transparent 70%);
    pointer-events: none;
  }
`

const CTATitle = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
  background: ${p => p.$gradient || 'linear-gradient(135deg, #36a6ba, #5dd5ed)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) { font-size: 2.4rem; }
`

const CTASubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: #6b7d8f;
  margin-bottom: 2.5rem;
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
`

/* Floating orbs */
const FloatingOrb = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: ${p => p.$bg || 'radial-gradient(circle, rgba(54,166,186,0.15), transparent)'};
  filter: blur(${p => p.$blur || '60px'});
  pointer-events: none;
  z-index: 0;
`

/* ================================================================
   ANIMATION VARIANTS
   ================================================================ */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } }
}

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.12 } }
}

/* ================================================================
   ANIMATED SECTION WRAPPER
   ================================================================ */
function AnimatedSection({ children, className, ...props }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerChildren}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function ChainLandingClient({
  chain,          // 'solana' | 'ethereum' | 'bitcoin'
  chainName,      // 'Solana' | 'Ethereum' | 'Bitcoin'
  ticker,         // 'SOL' | 'ETH' | 'BTC'
  accentColor,    // '#9945FF' | '#627EEA' | '#F7931A'
  secondaryColor, // '#14F195' | '#36a6ba' | '#FFD93D'
  heroTitle,
  heroSubtitle,
  stats,          // [{ value, label }]
  features,       // [{ icon, title, desc }]
  steps,          // [{ title, desc }]
  whyTrack,       // [{ title, desc }]
  comparisons,    // [{ feature, sonar, tool2, tool3 }]
  compToolNames,  // [string, string]
  faqs,           // [{ q, a }]
  blogSlug,
}) {
  const accentRgba = (a) => {
    const hex = accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${a})`
  }

  return (
    <PageContainer>
      <GridBackground />

      {/* Floating orbs */}
      <FloatingOrb
        $bg={`radial-gradient(circle, ${accentRgba(0.15)}, transparent)`}
        $blur="80px"
        style={{ width: 500, height: 500, top: '10%', right: '-10%' }}
        animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <FloatingOrb
        $bg={`radial-gradient(circle, ${accentRgba(0.08)}, transparent)`}
        $blur="100px"
        style={{ width: 400, height: 400, bottom: '20%', left: '-5%' }}
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ===================== HERO ===================== */}
      <HeroSection $glowColor={accentRgba(0.1)}>
        <HeroContent>
          <ChainBadge
            $bg={accentRgba(0.08)}
            $border={accentRgba(0.25)}
            $color={accentColor}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PulseDot $color={secondaryColor} />
            {chainName} Whale Intelligence
          </ChainBadge>

          <HeroTitle
            $gradient={`linear-gradient(180deg, #ffffff 0%, ${accentColor} 80%, ${secondaryColor} 100%)`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {heroTitle}
          </HeroTitle>

          <HeroSubtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {heroSubtitle}
          </HeroSubtitle>

          <StatRow
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            {stats.map((s, i) => (
              <StatBadge key={i} $accent={accentColor}>
                <strong>{s.value}</strong> {s.label}
              </StatBadge>
            ))}
          </StatRow>

          <ButtonGroup
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <PrimaryButton
              href="/subscribe"
              $bg={`linear-gradient(135deg, ${accentColor}, ${secondaryColor})`}
              $textColor={chain === 'bitcoin' ? '#0a1621' : '#fff'}
              $shadow={accentRgba(0.35)}
            >
              Track {ticker} Whales — $7.99/mo
            </PrimaryButton>
            <SecondaryButton
              href="/dashboard"
              $color={accentColor}
              $border={accentRgba(0.4)}
            >
              View Live Dashboard →
            </SecondaryButton>
          </ButtonGroup>
        </HeroContent>
      </HeroSection>

      {/* ===================== FEATURES ===================== */}
      <SectionWrapper>
        <AnimatedSection>
          <SectionTag variants={fadeUp} $color={accentColor}>
            What You Get
          </SectionTag>
          <SectionTitle variants={fadeUp}>
            {chainName} Whale Tracking,{' '}
            <span style={{ WebkitTextFillColor: accentColor }}>Powered by AI</span>
          </SectionTitle>
          <SectionSubtitle variants={fadeUp}>
            Every tool you need to monitor {ticker} whale movements — real-time dashboards,
            AI-powered classification, and ORCA analysis that tells you what each move means.
          </SectionSubtitle>

          <FeatureGrid>
            {features.map((f, i) => (
              <FeatureCard
                key={i}
                variants={fadeUp}
                $accent={`linear-gradient(90deg, ${accentColor}, transparent)`}
                $hoverBorder={accentRgba(0.3)}
                $glow={accentRgba(0.08)}
              >
                <IconWrap $bg={accentRgba(0.12)}>{f.icon}</IconWrap>
                <FeatureTitle>{f.title}</FeatureTitle>
                <FeatureDesc>{f.desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </FeatureGrid>
        </AnimatedSection>
      </SectionWrapper>

      {/* ===================== HOW IT WORKS ===================== */}
      <SectionWrapper>
        <AnimatedSection>
          <SectionTag variants={fadeUp} $color={accentColor}>
            How It Works
          </SectionTag>
          <SectionTitle variants={fadeUp}>
            From Raw Data to{' '}
            <span style={{ WebkitTextFillColor: accentColor }}>Actionable Intelligence</span>
          </SectionTitle>
          <SectionSubtitle variants={fadeUp}>
            Sonar Tracker processes millions of {chainName} transactions and delivers
            what matters in seconds — not hours.
          </SectionSubtitle>

          <StepsContainer $lineColor={accentColor}>
            {steps.map((s, i) => (
              <StepItem key={i} variants={fadeUp}>
                <StepNumber
                  $bg={accentRgba(0.1)}
                  $border={accentRgba(0.3)}
                  $color={accentColor}
                >
                  {i + 1}
                </StepNumber>
                <StepContent>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </StepContent>
              </StepItem>
            ))}
          </StepsContainer>
        </AnimatedSection>
      </SectionWrapper>

      {/* ===================== WHY TRACK ===================== */}
      <SectionWrapper>
        <AnimatedSection>
          <SectionTag variants={fadeUp} $color={accentColor}>
            Why {chainName}?
          </SectionTag>
          <SectionTitle variants={fadeUp}>
            Why {ticker} Whale Tracking{' '}
            <span style={{ WebkitTextFillColor: accentColor }}>Matters</span>
          </SectionTitle>

          <FeatureGrid>
            {whyTrack.map((w, i) => (
              <FeatureCard
                key={i}
                variants={fadeUp}
                $accent={`linear-gradient(90deg, ${accentColor}, transparent)`}
                $hoverBorder={accentRgba(0.25)}
                $glow={accentRgba(0.06)}
              >
                <FeatureTitle>{w.title}</FeatureTitle>
                <FeatureDesc>{w.desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </FeatureGrid>
        </AnimatedSection>
      </SectionWrapper>

      {/* ===================== COMPARISON ===================== */}
      <SectionWrapper>
        <AnimatedSection>
          <SectionTag variants={fadeUp} $color={accentColor}>
            Comparison
          </SectionTag>
          <SectionTitle variants={fadeUp}>
            How Sonar{' '}
            <span style={{ WebkitTextFillColor: accentColor }}>Compares</span>
          </SectionTitle>
          <SectionSubtitle variants={fadeUp}>
            Same institutional data. Fraction of the cost. Plus an AI analyst no one else has.
          </SectionSubtitle>

          <motion.div variants={fadeUp}>
            <TableWrapper>
              <ComparisonTable $accent={accentColor}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th style={{ color: accentColor }}>Sonar Tracker</th>
                    <th>{compToolNames[0]}</th>
                    <th>{compToolNames[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr key={i}>
                      <td style={{ color: '#e8edf2' }}>{c.feature}</td>
                      <td className="check">{c.sonar}</td>
                      <td>{c.tool2}</td>
                      <td>{c.tool3}</td>
                    </tr>
                  ))}
                </tbody>
              </ComparisonTable>
            </TableWrapper>
          </motion.div>
        </AnimatedSection>
      </SectionWrapper>

      {/* ===================== BLOG LINK ===================== */}
      <SectionWrapper style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: `linear-gradient(135deg, ${accentRgba(0.06)}, rgba(255,255,255,0.02))`,
            border: `1px solid ${accentRgba(0.15)}`,
            borderRadius: 20,
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#e8edf2', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Want the full deep dive?
          </p>
          <p style={{ color: '#6b7d8f', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Read our comprehensive {chainName} whale tracking guide — tools, strategies, and top wallets to watch.
          </p>
          <Link
            href={`/blog/${blogSlug}`}
            style={{ color: accentColor, fontWeight: 700, textDecoration: 'none', fontSize: '1.05rem' }}
          >
            Read the Full Guide →
          </Link>
        </motion.div>
      </SectionWrapper>

      {/* ===================== FAQ ===================== */}
      <SectionWrapper>
        <AnimatedSection>
          <SectionTag variants={fadeUp} $color={accentColor}>
            FAQ
          </SectionTag>
          <SectionTitle variants={fadeUp}>
            Common Questions
          </SectionTitle>

          <FAQContainer>
            {faqs.map((faq, i) => (
              <FAQItem key={i} variants={fadeUp}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </FAQItem>
            ))}
          </FAQContainer>
        </AnimatedSection>
      </SectionWrapper>

      {/* ===================== FINAL CTA ===================== */}
      <CTASection $glow={accentRgba(0.08)}>
        <CTATitle
          $gradient={`linear-gradient(135deg, ${accentColor}, ${secondaryColor})`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          Stop Trading Blind
        </CTATitle>
        <CTASubtitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          Join traders who see {ticker} whale movements before they hit the charts.
          Institutional intelligence for $7.99/month.
        </CTASubtitle>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <PrimaryButton
            href="/subscribe"
            $bg={`linear-gradient(135deg, ${accentColor}, ${secondaryColor})`}
            $textColor={chain === 'bitcoin' ? '#0a1621' : '#fff'}
            $shadow={accentRgba(0.35)}
          >
            Start Tracking {ticker} Whales — Free →
          </PrimaryButton>
        </motion.div>
      </CTASection>
    </PageContainer>
  )
}
