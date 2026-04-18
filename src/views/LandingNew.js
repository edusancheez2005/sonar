'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import styled, { keyframes } from 'styled-components'
import Globe from '@/src/components/landing/Globe'
import OrbitingLogos from '@/src/components/landing/OrbitingLogos'
import DashboardPreview from '@/src/components/landing/DashboardPreview'
import { COINS } from '@/src/components/landing/CryptoIcons'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/* ================================================================
   KEYFRAMES
   ================================================================ */
const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.6; }
`

const marqueeScroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`

/* ================================================================
   STYLED COMPONENTS
   ================================================================ */
const PageWrap = styled.div`
  min-height: 100vh;
  background: #050B14;
  color: #E6F7FB;
  font-family: 'Inter', system-ui, sans-serif;
  font-feature-settings: 'ss01', 'cv11';
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  position: relative;
`

const Stars = styled.div`
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(1px 1px at 13% 22%, rgba(200,240,255,0.5), transparent),
    radial-gradient(1px 1px at 78% 45%, rgba(200,240,255,0.4), transparent),
    radial-gradient(1px 1px at 42% 78%, rgba(200,240,255,0.35), transparent),
    radial-gradient(1px 1px at 91% 12%, rgba(200,240,255,0.3), transparent),
    radial-gradient(1px 1px at 22% 92%, rgba(200,240,255,0.25), transparent),
    radial-gradient(1px 1px at 68% 88%, rgba(200,240,255,0.3), transparent),
    radial-gradient(1px 1px at 8% 55%, rgba(200,240,255,0.2), transparent),
    radial-gradient(1px 1px at 55% 18%, rgba(200,240,255,0.35), transparent),
    radial-gradient(1px 1px at 35% 8%, rgba(200,240,255,0.2), transparent),
    radial-gradient(1px 1px at 88% 72%, rgba(200,240,255,0.25), transparent),
    radial-gradient(circle at 50% 40%, rgba(20, 80, 110, 0.35), transparent 70%),
    linear-gradient(180deg, #050B14 0%, #020610 60%, #050B14 100%);
`

/* ── NAV ── */
const Nav = styled.nav`
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 40px;
  backdrop-filter: blur(20px);
  background: rgba(5, 11, 20, 0.55);
  border-bottom: 1px solid rgba(120, 220, 240, 0.14);
  @media (max-width: 880px) { padding: 14px 20px; }
`

const NavLogo = styled.img`
  height: 28px; display: block; cursor: pointer;
`

const NavLinks = styled.div`
  display: flex; gap: 28px;
  a {
    color: rgba(220, 240, 250, 0.6); text-decoration: none;
    font-size: 13px; font-weight: 500; letter-spacing: 0.01em;
    transition: color 180ms;
    &:hover { color: #7FE3F5; }
  }
  @media (max-width: 880px) { display: none; }
`

const NavCta = styled.div`
  display: flex; gap: 10px;
`

/* ── BUTTONS ── */
const Btn = styled.button`
  border: none; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif; font-weight: 500;
  padding: ${({ $lg }) => $lg ? '14px 28px' : '10px 20px'};
  border-radius: 999px;
  font-size: ${({ $lg }) => $lg ? '14px' : '13px'};
  letter-spacing: 0.01em;
  transition: all 180ms;
  display: inline-flex; align-items: center; gap: 8px;
`

const BtnPrimary = styled(Btn)`
  background: linear-gradient(180deg, #8DE8F7 0%, #4EC5DB 100%);
  color: #02161F; font-weight: 600;
  box-shadow: 0 0 0 1px rgba(125, 230, 245, 0.5), 0 10px 30px -8px rgba(125, 230, 245, 0.5);
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 0 1px rgba(125, 230, 245, 0.7), 0 16px 40px -8px rgba(125, 230, 245, 0.6);
  }
`

const BtnGhost = styled(Btn)`
  background: transparent; color: #7FE3F5;
  border: 1px solid rgba(125, 230, 245, 0.35);
  &:hover { background: rgba(125, 230, 245, 0.08); border-color: rgba(125, 230, 245, 0.6); }
`

/* ── HERO ── */
const Hero = styled.section`
  position: relative; z-index: 1;
  min-height: calc(100vh - 70px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 20px 40px 40px;
  align-items: center;
  overflow: visible;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    padding: 40px 24px;
  }
`

const HeroRight = styled.div`
  display: flex; flex-direction: column; gap: 22px;
  align-self: center;
  position: relative; z-index: 2;
  max-width: 560px;
  @media (max-width: 1100px) {
    order: 1;
    max-width: 100%;
  }
`

const Eyebrow = styled.div`
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase;
  color: #7FE3F5;
  padding: 6px 12px;
  border: 1px solid rgba(125, 230, 245, 0.25);
  border-radius: 999px;
  background: rgba(125, 230, 245, 0.05);
  width: fit-content;
`

const PulseDot = styled.span`
  width: 6px; height: 6px; border-radius: 50%;
  background: #5DF0B0;
  box-shadow: 0 0 8px #5DF0B0;
  animation: ${pulse} 1.6s ease-in-out infinite;
`

const Headline = styled.h1`
  font-size: clamp(44px, 5.4vw, 80px);
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: #E6F7FB;
  margin: 0;
`

const Accent = styled.span`
  font-weight: 500;
  background: linear-gradient(180deg, #AFF0FA, #4EC5DB);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
`

const Sub = styled.p`
  font-size: 16px; line-height: 1.55;
  color: rgba(220, 240, 250, 0.6);
  max-width: 420px;
  margin: 0;
`

const CtaRow = styled.div`
  display: flex; gap: 12px;
  flex-wrap: wrap;
`

const TrustRow = styled.div`
  display: flex; gap: 8px; align-items: center;
  margin-top: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgba(180, 230, 245, 0.4);
  letter-spacing: 0.06em;
  flex-wrap: wrap;
`

const TrustChip = styled.span`
  padding: 6px 10px;
  border: 1px solid rgba(120, 220, 240, 0.14);
  border-radius: 6px;
  color: rgba(220, 240, 250, 0.6);
  background: rgba(8, 20, 32, 0.5);
  b { color: #7FE3F5; font-weight: 500; }
`

const HeroCenter = styled.div`
  position: relative;
  display: flex; align-items: center; justify-content: center;
  min-height: 640px;
  @media (max-width: 1100px) {
    order: 2;
    min-height: 520px;
  }
`

const GlobeWrap = styled.div`
  position: relative;
  width: 720px; height: 720px;
  margin-left: -160px;
  pointer-events: none;
  @media (max-width: 1100px) {
    margin-left: 0;
    width: 520px; height: 520px;
  }
  @media (max-width: 600px) {
    width: 360px; height: 360px;
  }
`

const GlobePedestal = styled.div`
  position: absolute; left: 50%; bottom: -40px;
  transform: translateX(-50%);
  width: 380px; height: 80px;
  background: radial-gradient(ellipse at center, rgba(125, 230, 245, 0.2), transparent 65%);
  filter: blur(10px);
  pointer-events: none;
`

/* ── MARQUEE ── */
const MarqueeWrap = styled.div`
  position: relative; z-index: 2;
  overflow: hidden;
  padding: 12px 0;
  border-top: 1px solid rgba(120, 220, 240, 0.14);
  border-bottom: 1px solid rgba(120, 220, 240, 0.14);
  background: rgba(5, 12, 20, 0.6);
`

const MarqueeTrack = styled.div`
  display: flex; gap: 50px; width: max-content;
  animation: ${marqueeScroll} 60s linear infinite;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: rgba(220, 240, 250, 0.6);
  span { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
  b { color: #7FE3F5; font-weight: 500; }
  .up { color: #5DF0B0; font-style: normal; }
  .down { color: #F5A86B; font-style: normal; }
`

/* ── DASHBOARD SECTION ── */
const DashSection = styled.section`
  position: relative; z-index: 1;
  padding: 80px 40px 120px;
  @media (max-width: 880px) { padding: 60px 20px 80px; }
`

const SectionLabel = styled.div`
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: rgba(180, 230, 245, 0.4);
  &::before {
    content: ''; width: 30px; height: 1px; background: #7FE3F5; opacity: 0.5;
  }
`

const SectionTitle = styled.h2`
  font-size: clamp(32px, 3vw, 48px); font-weight: 300;
  letter-spacing: -0.02em; line-height: 1.1;
  margin: 0 0 12px;
  max-width: 720px;
  color: #E6F7FB;
`

const SectionSub = styled.p`
  font-size: 16px; color: rgba(220, 240, 250, 0.6);
  max-width: 560px;
  margin: 0 0 40px;
`

/* ── FOOTER ── */
const FooterWrap = styled.footer`
  padding: 60px 40px 40px;
  border-top: 1px solid rgba(120, 220, 240, 0.14);
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  position: relative; z-index: 1;
  @media (max-width: 880px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`

const FooterBrand = styled.div`
  img { height: 28px; margin-bottom: 16px; }
  p { color: rgba(180, 230, 245, 0.4); font-size: 13px; line-height: 1.6; max-width: 300px; }
`

const FooterCol = styled.div`
  h4 {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: 1.6px;
    text-transform: uppercase; color: rgba(180, 230, 245, 0.4);
    margin: 0 0 14px; font-weight: 400;
  }
  a {
    display: block; color: rgba(220, 240, 250, 0.6); text-decoration: none;
    font-size: 13px; margin-bottom: 10px; transition: color 180ms;
    &:hover { color: #7FE3F5; }
  }
`

const FooterBottom = styled.div`
  grid-column: 1 / -1;
  padding-top: 30px; margin-top: 20px;
  border-top: 1px solid rgba(120, 220, 240, 0.14);
  display: flex; justify-content: space-between;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; color: rgba(180, 230, 245, 0.4);
  flex-wrap: wrap; gap: 12px;
`

/* ── AUTH MODALS ── */
const Modal = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
`

const ModalCard = styled.div`
  background: #0a1825;
  border: 1px solid rgba(120, 220, 240, 0.18);
  border-radius: 16px;
  padding: 36px 32px;
  max-width: 420px; width: 100%;
  position: relative;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
`

const ModalClose = styled.button`
  position: absolute; top: 14px; right: 14px;
  background: none; border: none;
  color: rgba(220, 240, 250, 0.5); font-size: 20px;
  cursor: pointer;
  &:hover { color: #E6F7FB; }
`

const ModalTitle = styled.h3`
  font-size: 22px; font-weight: 600; margin: 0 0 6px;
  color: #E6F7FB;
`

const ModalSub = styled.p`
  font-size: 13px; color: rgba(220, 240, 250, 0.5);
  margin: 0 0 24px;
`

const FormField = styled.div`
  margin-bottom: 16px;
  label {
    display: block; font-size: 12px; color: rgba(220, 240, 250, 0.5);
    margin-bottom: 6px; font-weight: 500;
  }
  input {
    width: 100%; padding: 10px 14px;
    background: rgba(8, 20, 32, 0.8);
    border: 1px solid rgba(120, 220, 240, 0.14);
    border-radius: 8px; color: #E6F7FB;
    font-size: 14px; outline: none;
    transition: border-color 180ms;
    &:focus { border-color: rgba(125, 230, 245, 0.5); }
  }
`

const SubmitBtn = styled.button`
  width: 100%; padding: 12px;
  border-radius: 999px; border: none;
  background: linear-gradient(180deg, #8DE8F7 0%, #4EC5DB 100%);
  color: #02161F; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 180ms;
  margin-top: 8px;
  &:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -8px rgba(125, 230, 245, 0.5); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const ErrorMsg = styled.p`
  color: #F5A86B; font-size: 13px; margin: 8px 0;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(245, 168, 107, 0.08);
  border: 1px solid rgba(245, 168, 107, 0.2);
`

const SwitchLink = styled.button`
  background: none; border: none;
  color: #7FE3F5; font-size: 13px; cursor: pointer;
  font-weight: 500;
  &:hover { text-decoration: underline; }
`

/* ================================================================
   MARQUEE DATA
   ================================================================ */
const TICKER_DATA = [
  { sym: 'BTC', price: '$108,420.50', delta: '+2.41%', up: true },
  { sym: 'ETH', price: '$4,120.85',   delta: '+1.88%', up: true },
  { sym: 'SOL', price: '$248.12',     delta: '+4.12%', up: true },
  { sym: 'XRP', price: '$3.41',       delta: '-0.62%', up: false },
  { sym: 'BNB', price: '$712.30',     delta: '+0.94%', up: true },
  { sym: 'DOGE', price: '$0.412',     delta: '+3.27%', up: true },
  { sym: 'ADA', price: '$1.24',       delta: '+2.05%', up: true },
  { sym: 'AVAX', price: '$54.12',     delta: '-1.18%', up: false },
  { sym: 'LINK', price: '$28.40',     delta: '+3.88%', up: true },
  { sym: 'TON', price: '$7.22',       delta: '+1.44%', up: true },
]

/* ================================================================
   COMPONENT
   ================================================================ */
const Landing = () => {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  /* ── auth handlers ── */
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const sb = supabaseBrowser()
      const { error } = await sb.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
      router.replace('/dashboard')
    } catch (err) {
      setAuthError(err.message || 'Login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const sb = supabaseBrowser()
      const { error } = await sb.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: { data: { full_name: signupName } },
      })
      if (error) throw error
      setAuthError('')
      setShowSignup(false)
      setShowLogin(true)
      setAuthError('Check your email to confirm your account.')
    } catch (err) {
      setAuthError(err.message || 'Signup failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const openLogin = () => { setShowSignup(false); setShowLogin(true); setAuthError('') }
  const openSignup = () => { setShowLogin(false); setShowSignup(true); setAuthError('') }

  return (
    <PageWrap>
      <Stars />

      {/* ─── NAV ─── */}
      <Nav>
        <NavLogo src="/assets/sonar-logo.png" alt="Sonar" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <NavLinks>
          <a href="/whale-tracker">Whales</a>
          <a href="/ai-crypto-signals">Signals</a>
          <a href="/pricing">Pricing</a>
          <a href="/news">News</a>
          <a href="/faq">FAQ</a>
        </NavLinks>
        <NavCta>
          <BtnGhost onClick={openLogin}>Sign in</BtnGhost>
          <BtnPrimary onClick={() => router.push('/dashboard')}>Launch app →</BtnPrimary>
        </NavCta>
      </Nav>

      {/* ─── HERO ─── */}
      <Hero>
        <HeroRight>
          <Eyebrow><PulseDot />Live · Tracking $12.4B in flows</Eyebrow>
          <Headline>
            <Accent>Sonar</Accent><br />
            <span style={{ fontWeight: 300 }}>Real-Time Crypto</span><br />
            Intelligence
          </Headline>
          <Sub>
            Your crypto market intelligence partner. Track whales. Read signals. Move first — across every chain, in real time.
          </Sub>
          <CtaRow>
            <BtnPrimary $lg onClick={() => router.push('/dashboard')}>Launch app →</BtnPrimary>
            <BtnGhost $lg onClick={() => {
              const el = document.getElementById('dashboard-preview')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}>See live demo</BtnGhost>
          </CtaRow>
          <TrustRow>
            <TrustChip><b>700+</b> traders</TrustChip>
            <TrustChip><b>2,000+</b> signals</TrustChip>
            <TrustChip><b>10M+</b> datapoints/day</TrustChip>
          </TrustRow>
        </HeroRight>

        <HeroCenter>
          <GlobeWrap>
            <Globe style="holographic" motion="medium" size={720} />
            <OrbitingLogos size={720} motion="medium" />
          </GlobeWrap>
          <GlobePedestal />
        </HeroCenter>
      </Hero>

      {/* ─── MARQUEE ─── */}
      <MarqueeWrap>
        <MarqueeTrack>
          {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
            <span key={i}>
              {t.sym} <b>{t.price}</b>{' '}
              <em className={t.up ? 'up' : 'down'}>{t.delta}</em>
            </span>
          ))}
        </MarqueeTrack>
      </MarqueeWrap>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <DashSection id="dashboard-preview">
        <SectionLabel>The product</SectionLabel>
        <SectionTitle>
          Every signal. <Accent>Every chain.</Accent><br />
          In one terminal.
        </SectionTitle>
        <SectionSub>
          Sonar aggregates on-chain movement, exchange flows, sentiment, and news into a single real-time view — so you act on data, not vibes.
        </SectionSub>
        <DashboardPreview />
      </DashSection>

      {/* ─── FOOTER ─── */}
      <FooterWrap>
        <FooterBrand>
          <img src="/assets/sonar-logo.png" alt="Sonar" />
          <p>Real-time crypto intelligence for traders, funds, and on-chain natives. Track whales, read signals, move first.</p>
        </FooterBrand>
        <FooterCol>
          <h4>Product</h4>
          <a href="/dashboard">Dashboard</a>
          <a href="/whale-tracker">Whale tracker</a>
          <a href="/ai-crypto-signals">Signals</a>
          <a href="/pricing">Pricing</a>
        </FooterCol>
        <FooterCol>
          <h4>Company</h4>
          <a href="/press">About</a>
          <a href="/pricing">Pricing</a>
          <a href="/careers">Careers</a>
          <a href="/blog">Blog</a>
        </FooterCol>
        <FooterCol>
          <h4>Resources</h4>
          <a href="/faq">FAQ</a>
          <a href="/help">Support</a>
          <a href="/contact">Contact</a>
          <a href="/terms">Terms</a>
        </FooterCol>
        <FooterBottom>
          <span>© 2026 SONAR LABS</span>
          <span>ALL SYSTEMS OPERATIONAL · <span style={{ color: '#5DF0B0' }}>●</span> LIVE</span>
        </FooterBottom>
      </FooterWrap>

      {/* ─── LOGIN MODAL ─── */}
      {showLogin && (
        <Modal onClick={() => setShowLogin(false)}>
          <ModalCard onClick={e => e.stopPropagation()}>
            <ModalClose onClick={() => setShowLogin(false)}>×</ModalClose>
            <ModalTitle>Welcome back</ModalTitle>
            <ModalSub>Sign in to your Sonar account</ModalSub>
            <form onSubmit={handleLogin}>
              <FormField>
                <label>Email</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required autoFocus />
              </FormField>
              <FormField>
                <label>Password</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </FormField>
              {authError && <ErrorMsg>{authError}</ErrorMsg>}
              <SubmitBtn type="submit" disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign in'}
              </SubmitBtn>
            </form>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(220,240,250,0.5)', marginTop: 16 }}>
              Don't have an account?{' '}
              <SwitchLink onClick={openSignup}>Create one</SwitchLink>
            </p>
          </ModalCard>
        </Modal>
      )}

      {/* ─── SIGNUP MODAL ─── */}
      {showSignup && (
        <Modal onClick={() => setShowSignup(false)}>
          <ModalCard onClick={e => e.stopPropagation()}>
            <ModalClose onClick={() => setShowSignup(false)}>×</ModalClose>
            <ModalTitle>Create account</ModalTitle>
            <ModalSub>Start tracking whales in minutes</ModalSub>
            <form onSubmit={handleSignup}>
              <FormField>
                <label>Full name</label>
                <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} required autoFocus />
              </FormField>
              <FormField>
                <label>Email</label>
                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
              </FormField>
              <FormField>
                <label>Password</label>
                <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
              </FormField>
              {authError && <ErrorMsg>{authError}</ErrorMsg>}
              <SubmitBtn type="submit" disabled={authLoading}>
                {authLoading ? 'Creating account...' : 'Start Tracking Whales'}
              </SubmitBtn>
            </form>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(220,240,250,0.5)', marginTop: 16 }}>
              Already have an account?{' '}
              <SwitchLink onClick={openLogin}>Sign in</SwitchLink>
            </p>
          </ModalCard>
        </Modal>
      )}
    </PageWrap>
  )
}

export default Landing
