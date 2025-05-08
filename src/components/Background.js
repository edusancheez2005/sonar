import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
`;

const WhaleElement = styled(motion.div)`
  position: absolute;
  bottom: -25vh;
  right: -15vw;
  width: 80vw;
  height: 80vh;
  opacity: 0.04;
  
  svg {
    width: 100%;
    height: 100%;
    
    path, circle {
      fill: var(--primary);
    }
  }
`;

const WavesContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.05;
`;

const Wave = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 10%;
  background: radial-gradient(
    ellipse at center,
    var(--primary) 0%,
    transparent 70%
  );
  border-radius: 50%;
  transform: scale(1.8, 0.3);
  opacity: 0.3;
`;

const Bubble = styled(motion.div)`
  position: absolute;
  background-color: var(--primary);
  border-radius: 50%;
  opacity: 0.15;
`;

const WhaleBackground = ({ intensity = 'medium' }) => {
  // Generate bubbles based on intensity
  const bubbleCount = intensity === 'high' ? 15 : intensity === 'medium' ? 10 : 5;
  const bubbles = Array.from({ length: bubbleCount }).map((_, i) => ({
    id: i,
    size: Math.random() * 40 + 10,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
  }));
  
  // Generate waves based on intensity
  const waveCount = intensity === 'high' ? 4 : intensity === 'medium' ? 3 : 2;
  
  return (
    <BackgroundContainer>
      <WhaleElement
        initial={{ y: 50 }}
        animate={{ 
          y: [50, 20, 50],
          rotate: [0, 1, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <path d="M340,270 C335,260 330,265 325,270 C320,275 315,280 315,290 C315,295 320,300 325,300 C330,300 330,295 335,295 C340,295 345,300 350,300 C355,300 360,295 365,290 C370,285 380,280 385,275 C390,270 395,265 450,250 L420,260 C375,265 370,270 365,275 C360,280 355,285 350,285 C345,285 340,280 340,270 Z" />
          <circle cx="330" cy="280" r="4" />
          <path d="M400,260 C410,250 420,245 430,245" stroke="currentColor" strokeWidth="6" fill="none" />
          <path d="M400,250 C415,240 430,235 445,235" stroke="currentColor" strokeWidth="6" fill="none" />
          <path d="M400,240 C420,230 440,225 460,225" stroke="currentColor" strokeWidth="6" fill="none" />
        </svg>
      </WhaleElement>
      
      <WavesContainer>
        {Array.from({ length: waveCount }).map((_, index) => (
          <Wave
            key={index}
            style={{ 
              bottom: `${index * 8}%`,
              opacity: 0.2 - index * 0.04,
            }}
            animate={{
              scaleX: [1.8, 2.1, 1.8],
              scaleY: [0.3, 0.4, 0.3],
            }}
            transition={{
              duration: 8 + index * 2,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: index * 1.5,
            }}
          />
        ))}
      </WavesContainer>
      
      {bubbles.map(bubble => (
        <Bubble
          key={bubble.id}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            bottom: `-${bubble.size}px`,
          }}
          animate={{
            y: [`0vh`, `-${bubble.y}vh`],
            x: (bubble.id % 2 === 0) ? ['0%', '2%', '-2%', '0%'] : ['0%', '-2%', '2%', '0%'],
          }}
          transition={{
            y: {
              duration: bubble.duration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: bubble.delay,
            },
            x: {
              duration: bubble.duration / 2,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: bubble.delay,
            }
          }}
        />
      ))}
    </BackgroundContainer>
  );
};

export default WhaleBackground; 