import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

// Define Actions component first to avoid the reference before initialization
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(54, 166, 186, 0.2);
  
  ${Actions} {
    margin-top: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  
  img {
    height: 40px;
    margin-right: 1rem;
  }
  
  span.accent {
    color: var(--primary);
  }
`;

const SonarPulse = styled(motion.div)`
  position: relative;
  width: 20px;
  height: 20px;
  margin-left: 10px;
  
  &:before, &:after {
    content: '';
    position: absolute;
    border: 2px solid var(--primary);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  &:before {
    width: 8px;
    height: 8px;
    background-color: var(--primary);
  }
`;

// Use when specific actions are needed in the header
const PageHeader = ({ title, accentWord, children, pulseEffect = true }) => {
  // Split title to add accent to the last word if accentWord is not provided
  let titleStart = title;
  let titleAccent = '';
  
  if (!accentWord && title.includes(' ')) {
    const words = title.split(' ');
    titleAccent = words.pop();
    titleStart = words.join(' ') + ' ';
  } else if (accentWord) {
    titleAccent = accentWord;
  }
  
  return (
    <HeaderWrapper>
      <Title>
        <img src={logo} alt="Sonar Logo" />
        {titleStart}
        <span className="accent">{titleAccent}</span>
        {pulseEffect && (
          <SonarPulse
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          />
        )}
      </Title>
      <Actions>
        {children}
      </Actions>
    </HeaderWrapper>
  );
};

export default PageHeader; 