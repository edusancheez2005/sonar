'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
`

const swim = keyframes`
  0%, 100% { transform: translateX(0) scaleX(1); }
  25% { transform: translateX(5px) scaleX(1); }
  75% { transform: translateX(-5px) scaleX(1); }
`

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(54, 166, 186, 0.4); }
  50% { box-shadow: 0 0 0 15px rgba(54, 166, 186, 0); }
`

const sparkle = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
`

// Styled Components
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(10, 22, 33, 0.85);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Spotlight = styled(motion.div)`
  position: fixed;
  border: 3px solid var(--primary);
  border-radius: 12px;
  animation: ${pulse} 2s ease-in-out infinite;
  z-index: 10001;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`

const TutorialContainer = styled(motion.div)`
  position: fixed;
  z-index: 10002;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 420px;
  
  @media (max-width: 768px) {
    max-width: 90vw;
    padding: 0 1rem;
  }
`

const OrcaMascot = styled(motion.div)`
  width: 100px;
  height: 100px;
  animation: ${float} 3s ease-in-out infinite;
  filter: drop-shadow(0 8px 16px rgba(54, 166, 186, 0.4));
  
  svg {
    width: 100%;
    height: 100%;
    animation: ${swim} 4s ease-in-out infinite;
  }
`

const SpeechBubble = styled(motion.div)`
  background: linear-gradient(135deg, rgba(26, 40, 56, 0.98) 0%, rgba(15, 25, 38, 0.98) 100%);
  border: 1px solid rgba(54, 166, 186, 0.4);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-top: 1rem;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(54, 166, 186, 0.15);
  backdrop-filter: blur(20px);
  
  &::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid rgba(54, 166, 186, 0.4);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid rgba(26, 40, 56, 0.98);
  }
`

const BubbleTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const BubbleText = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
`

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
  flex-wrap: wrap;
  justify-content: center;
`

const Button = styled(motion.button)`
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  &.primary {
    background: linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
    
    &:hover {
      box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
    }
  }
  
  &.secondary {
    background: rgba(54, 166, 186, 0.15);
    color: var(--primary);
    border: 1px solid rgba(54, 166, 186, 0.3);
    
    &:hover {
      background: rgba(54, 166, 186, 0.25);
    }
  }
  
  &.skip {
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
    
    &:hover {
      color: var(--text-primary);
    }
  }
`

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`

const ProgressDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.3)'};
  transition: all 0.3s ease;
  
  ${props => props.$active && `
    width: 24px;
    border-radius: 4px;
  `}
`

const ProgressText = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
`

const CelebrationContainer = styled(motion.div)`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10003;
`

const Sparkle = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--primary);
  border-radius: 50%;
  animation: ${sparkle} 1s ease-in-out infinite;
`

// Orca SVG Component
const OrcaSVG = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="orcaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#36a6ba" />
        <stop offset="100%" stopColor="#1a2838" />
      </linearGradient>
      <linearGradient id="orcaBelly" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e0e0e0" />
      </linearGradient>
    </defs>
    {/* Main body */}
    <ellipse cx="50" cy="50" rx="35" ry="25" fill="url(#orcaGradient)" />
    {/* Belly */}
    <ellipse cx="50" cy="55" rx="25" ry="15" fill="url(#orcaBelly)" />
    {/* Dorsal fin */}
    <path d="M50 25 L55 40 L45 40 Z" fill="#1a2838" />
    {/* Tail */}
    <path d="M85 50 Q95 45 90 38 Q85 45 85 50" fill="#1a2838" />
    <path d="M85 50 Q95 55 90 62 Q85 55 85 50" fill="#1a2838" />
    {/* Side fin */}
    <ellipse cx="40" cy="60" rx="10" ry="5" fill="#1a2838" transform="rotate(-20 40 60)" />
    {/* Eye */}
    <circle cx="25" cy="48" r="5" fill="white" />
    <circle cx="24" cy="48" r="3" fill="#1a2838" />
    <circle cx="23" cy="47" r="1" fill="white" />
    {/* Eye patch (orca marking) */}
    <ellipse cx="30" cy="45" rx="8" ry="4" fill="white" opacity="0.3" />
    {/* Smile */}
    <path d="M18 55 Q22 60 28 58" stroke="#1a2838" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
)

// Tutorial steps configuration
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Sonar! 🐋',
    content: "Hey there! I'm Orca, your crypto whale tracking companion. Let me show you around the dashboard!",
    target: null, // No target for welcome
    position: 'center'
  },
  {
    id: 'market-pulse',
    title: 'Market Pulse',
    content: "This section shows you the big picture — tokens being accumulated, distributed, and overall whale activity. It's your quick health check on the market!",
    target: 'marketPulse',
    position: 'below'
  },
  {
    id: 'inflows-outflows',
    title: 'Net Inflows & Outflows',
    content: "Green means whales are buying (accumulating), red means they're selling (distributing). Follow the smart money to spot trends early!",
    target: 'inflowsOutflows',
    position: 'below'
  },
  {
    id: 'traded-tokens',
    title: 'Most Traded Tokens',
    content: "These are the hottest tokens by whale transaction count. Click any card to dive deeper into that token's analytics and see the full picture.",
    target: 'tradedTokens',
    position: 'above'
  },
  {
    id: 'top-whales',
    title: 'Top 10 Whales',
    content: "Track the biggest players in the market! See their net positions, favorite tokens, and when they were last active. These are the wallets moving millions.",
    target: 'topWhales',
    position: 'above'
  },
  {
    id: 'orca-ai',
    title: 'Ask Orca AI',
    content: "Need help? I'm always here in the bottom-right corner! Ask me anything about crypto, market trends, or how to use Sonar. I've got you covered!",
    target: null,
    position: 'center'
  },
  {
    id: 'complete',
    title: "You're All Set! 🎉",
    content: "Happy whale watching! Pro tip: Check back often — whale movements can signal big market moves. You can restart this tutorial anytime from the dashboard.",
    target: null,
    position: 'center',
    isFinal: true
  }
]

const OrcaTutorial = ({ isOpen, onClose, refs }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [mounted, setMounted] = useState(false)

  const step = TUTORIAL_STEPS[currentStep]
  const totalSteps = TUTORIAL_STEPS.length

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update spotlight position when step changes
  useEffect(() => {
    if (!step.target || !refs) {
      setTargetRect(null)
      return
    }

    const ref = refs[step.target]
    if (ref?.current) {
      const rect = ref.current.getBoundingClientRect()
      setTargetRect({
        top: rect.top - 10,
        left: rect.left - 10,
        width: rect.width + 20,
        height: rect.height + 20
      })
      
      // Smooth scroll to element
      ref.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      })
    }
  }, [currentStep, step.target, refs])

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep, totalSteps])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleComplete = useCallback(() => {
    setShowCelebration(true)
    localStorage.setItem('sonar_tutorial_completed', 'true')
    
    setTimeout(() => {
      setShowCelebration(false)
      onClose()
    }, 2000)
  }, [onClose])

  const handleSkip = useCallback(() => {
    localStorage.setItem('sonar_tutorial_completed', 'true')
    onClose()
  }, [onClose])

  // Calculate tutorial container position
  const getContainerPosition = () => {
    if (!targetRect || step.position === 'center') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const padding = 20
    
    if (step.position === 'below') {
      return {
        top: targetRect.top + targetRect.height + padding,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translateX(-50%)'
      }
    }
    
    if (step.position === 'above') {
      return {
        bottom: window.innerHeight - targetRect.top + padding,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translateX(-50%)'
      }
    }

    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Spotlight on target element */}
          {targetRect && (
            <Spotlight
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height
              }}
              transition={{ duration: 0.4 }}
            />
          )}

          {/* Tutorial content */}
          <TutorialContainer
            style={getContainerPosition()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <OrcaMascot
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <OrcaSVG />
            </OrcaMascot>

            <SpeechBubble
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <BubbleTitle>
                {step.title}
              </BubbleTitle>
              <BubbleText>{step.content}</BubbleText>

              <ButtonContainer>
                {currentStep > 0 && !step.isFinal && (
                  <Button
                    className="secondary"
                    onClick={handlePrevious}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ← Back
                  </Button>
                )}
                
                <Button
                  className="primary"
                  onClick={handleNext}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.isFinal ? "Let's Go! 🚀" : 'Next →'}
                </Button>
                
                {!step.isFinal && currentStep === 0 && (
                  <Button
                    className="skip"
                    onClick={handleSkip}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Skip tutorial
                  </Button>
                )}
              </ButtonContainer>

              {!step.isFinal && (
                <ProgressContainer>
                  {TUTORIAL_STEPS.filter(s => !s.isFinal).map((_, idx) => (
                    <ProgressDot 
                      key={idx} 
                      $active={idx === currentStep}
                    />
                  ))}
                  <ProgressText>
                    {currentStep + 1} of {totalSteps - 1}
                  </ProgressText>
                </ProgressContainer>
              )}
            </SpeechBubble>
          </TutorialContainer>

          {/* Celebration effect */}
          {showCelebration && (
            <CelebrationContainer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(20)].map((_, i) => (
                <Sparkle
                  key={i}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    background: ['#36a6ba', '#2ecc71', '#f39c12', '#e74c3c'][Math.floor(Math.random() * 4)]
                  }}
                />
              ))}
            </CelebrationContainer>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default OrcaTutorial
