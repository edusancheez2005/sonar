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
  margin: 4rem auto 0; padding: 3rem 1.5rem; max-width: 1100px; position: relative;
`;

const AdvisorCard = styled.div`
  background: radial-gradient(800px 400px at 10% -10%, rgba(155,89,182,0.25), transparent 60%),
              radial-gradient(700px 350px at 110% 20%, rgba(241,196,15,0.15), transparent 60%),
              linear-gradient(180deg, #0d2134 0%, #0a1621 100%);
  border: 1px solid rgba(155,89,182,0.25);
  border-radius: 12px; padding: 2rem; text-align: center;
`;

const AdvisorBadge = styled(motion.div)`
  display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.85rem;
  border-radius: 999px; font-weight: 600; letter-spacing: 0.4px;
  color: #f1c40f; background: rgba(241,196,15,0.15); border: 1px solid rgba(241,196,15,0.35);
`;

const AdvisorTitle = styled(motion.h2)`
  font-size: 2.2rem; margin: 0.75rem 0 0.25rem;
  background: linear-gradient(90deg, #9b59b6 0%, #f1c40f 50%, #36a6ba 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
`;

const AdvisorSub = styled(motion.p)`
  color: var(--text-secondary); margin: 0.5rem 0 1rem; font-size: 1.05rem;
`;

const WaitlistForm = styled(motion.form)`
  display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; flex-wrap: wrap;
  input { background: linear-gradient(180deg, rgba(13,33,52,1), rgba(10,22,33,1));
          color: var(--text-primary); border: 1px solid var(--secondary);
          padding: 0.7rem 0.9rem; border-radius: 999px; min-width: 260px; outline: none; }
  input:focus { border-color: #9b59b6; box-shadow: 0 0 0 3px rgba(155,89,182,0.2); }
  button { background: linear-gradient(90deg, #9b59b6, #f1c40f);
           color: #0a1621; border: none; padding: 0.7rem 1.1rem; border-radius: 999px; font-weight: 600; }
  button:hover { filter: brightness(1.05); transform: translateY(-1px); }
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
  
  return (
    <LandingContainer>
      <NavBar>
        <Logo>
          <img src={`${process.env.PUBLIC_URL}/assets/logo2.png`} alt="Sonar Logo" />
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
            Results
          </NavLink>
          <NavLink onClick={() => {
            const element = document.getElementById('advisor');
            const navbarHeight = 100; // approximate height of navbar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }}>
            Orca 2.0
          </NavLink>
          <LoginButton onClick={() => setShowLoginModal(true)}>
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
              Track Cryptocurrency Markets in Real-Time
            </HeroTitle>
            
            <HeroSubtitle variants={itemVariants}>
              Sonar provides powerful tools to monitor cryptocurrency transactions, 
              analyze market trends, and stay updated with the latest news.
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
                onClick={() => {
                  setShowLoginModal(true);
                }}
              >
                Get Started
              </Button>
              <Button 
                className="secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowLoginModal(true);
                }}
              >
                Get Demo
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
              Sonar is a cutting-edge platform designed for cryptocurrency traders and enthusiasts.
              We provide real-time monitoring of market activities, comprehensive statistical analysis,
              and curated news to help you make informed decisions.
            </p>
            <p>
              Our team consists of blockchain experts, data analysts, and software engineers who are
              passionate about cryptocurrency and dedicated to developing powerful tools that make
              trading more accessible and data-driven.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <p>
              Founded in 2023, Sonar has quickly grown to become a trusted resource in the crypto
              community. We believe in transparency, accuracy, and providing actionable insights
              that cut through the noise of the volatile cryptocurrency market.
            </p>
            <p>
              Whether you're a day trader looking for real-time transaction data or an investor
              seeking to understand market trends, Sonar gives you the visibility you need to
              navigate the complex world of digital assets with confidence.
            </p>
          </motion.div>
        </AboutContent>
      </AboutSection>
      
      <ScreenshotsSection id="screenshots">
        <h2>See the Dashboard in Action</h2>
        <ScreenshotsContainer>
          <h3>Powerful Analytics at Your Fingertips</h3>
          <ScreenshotGrid>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/stats-dashboard.png`} alt="Statistics Dashboard" />
              <div className="caption">Real-time crypto transaction monitoring</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/top-coins.png`} alt="Top Coins Analysis" />
              <div className="caption">Top buying and selling coin trends</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/price-filter.png`} alt="Price Filter" />
              <div className="caption">Customizable price threshold filters</div>
            </Screenshot>
            <Screenshot
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={`${process.env.PUBLIC_URL}/screenshots/news-feed.png`} alt="News Feed" />
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
          Pricing Plans
        </motion.h2>
        
        <PricingPlans>
          <PricingCard
            variants={pricingCardVariants}
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true, amount: 0.1 }}
          >
            <h3>Basic</h3>
            <div className="price">$19<span>/month</span></div>
            <ul>
              <li>Real-time market data</li>
              <li>Transaction filtering</li>
              <li>Basic statistics</li>
              <li>Daily news updates</li>
              <li>Email support</li>
            </ul>
            <Button 
              className="primary" 
              style={{ width: '100%' }}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowLoginModal(true);
              }}
            >
              Get Started
            </Button>
          </PricingCard>
          
          <PricingCard
            className="featured"
            variants={pricingCardVariants}
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.2 }}
          >
            <h3>Pro</h3>
            <div className="price">$49<span>/month</span></div>
            <ul>
              <li>All Basic features</li>
              <li>Advanced statistical tools</li>
              <li>Custom alerts</li>
              <li>Historical data (3 months)</li>
              <li>API access</li>
              <li>Priority support</li>
            </ul>
            <Button 
              className="primary" 
              style={{ width: '100%' }}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowLoginModal(true);
              }}
            >
              Get Started
            </Button>
          </PricingCard>
          
          <PricingCard
            variants={pricingCardVariants}
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Enterprise</h3>
            <div className="price">$99<span>/month</span></div>
            <ul>
              <li>All Pro features</li>
              <li>Unlimited historical data</li>
              <li>Advanced API access</li>
              <li>Custom integrations</li>
              <li>Dedicated account manager</li>
              <li>24/7 premium support</li>
            </ul>
            <Button 
              className="primary" 
              style={{ width: '100%' }}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowLoginModal(true);
              }}
            >
              Get Started
            </Button>
          </PricingCard>
        </PricingPlans>
      </PricingSection>
      
      <AdvisorSection id="advisor">
        <AdvisorCard>
          <AdvisorBadge initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <span role="img" aria-label="orca">🐋</span> Orca 2.0 — AI Crypto Advisor
          </AdvisorBadge>
          <AdvisorTitle initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Coming Soon: Follow the Pods with SONAR Precision
          </AdvisorTitle>
          <AdvisorSub initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.15 }}>
            Personalized ideas from whale flows, risk-managed entries, and instant alerts. Join the waitlist to get early access.
          </AdvisorSub>
          <WaitlistForm onSubmit={joinWaitlist} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <input type="email" placeholder="Join the Orca 2.0 waitlist — your@email.com" value={waitEmail} onChange={e=>setWaitEmail(e.target.value)} required />
            <button type="submit">Join Waitlist</button>
          </WaitlistForm>
          {waitMsg && <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{waitMsg}</p>}
        </AdvisorCard>
      </AdvisorSection>

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