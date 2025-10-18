'use client'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Content = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 8rem 2rem 4rem;
  position: relative;
  z-index: 1;
`

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 4rem;
  line-height: 1.6;
`

const Section = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;

  h2 {
    color: var(--primary);
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 2rem;
    margin: 1rem 0;
  }

  li {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  strong {
    color: var(--text-primary);
  }

  a {
    color: var(--primary);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
`

const AssetCard = styled(motion.a)`
  background: rgba(13, 33, 52, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(54, 166, 186, 0.2);
  }

  svg {
    width: 48px;
    height: 48px;
    color: var(--primary);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--text-primary);
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
  }
`

const ColorGrid = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`

const ColorSwatch = styled.div`
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 150px;
  text-align: center;
`

const Button = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(54, 166, 186, 0.4);
  transition: all 0.3s ease;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

export default function PressKit() {
  return (
    <PageContainer>
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Press Kit
        </Title>
        <Subtitle>
          Brand assets, media resources, and company information for press and partners
        </Subtitle>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2>About Sonar Tracker</h2>
          <p>
            <strong>Mission:</strong> Sonar Tracker empowers crypto traders with real-time whale transaction monitoring and AI-powered market intelligence.
          </p>
          <p><strong>Founded:</strong> 2024</p>
          <p><strong>Headquarters:</strong> United Kingdom</p>
          <p><strong>Key Features:</strong></p>
          <ul>
            <li>Real-time tracking of cryptocurrency whale transactions over $50,000</li>
            <li>AI-powered market sentiment analysis with Orca 2.0</li>
            <li>Advanced token analytics and risk assessment</li>
            <li>15-minute data refresh rate for institutional-grade accuracy</li>
            <li>Support for Ethereum with expansion to additional blockchains</li>
            <li>Premium analytics and CSV data export capabilities</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>Brand Assets</h2>
          <p>Download our logos, brand colors, and visual identity guidelines</p>
          <Grid>
            <AssetCard href="/logo.png" download whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3>Logo (PNG)</h3>
              <p>Primary logo</p>
            </AssetCard>
            <AssetCard href="/logo2.png" download whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3>Icon</h3>
              <p>App icon</p>
            </AssetCard>
            <AssetCard href="/screenshots/stats-dashboard.png" download whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3>Dashboard</h3>
              <p>Screenshot</p>
            </AssetCard>
          </Grid>

          <h2 style={{ marginTop: '2rem' }}>Brand Colors</h2>
          <ColorGrid>
            <ColorSwatch style={{ background: '#36a6ba', color: 'white' }}>
              Primary<br />#36a6ba
            </ColorSwatch>
            <ColorSwatch style={{ background: '#2ecc71', color: 'white' }}>
              Success<br />#2ecc71
            </ColorSwatch>
            <ColorSwatch style={{ background: '#0a1621', border: '1px solid #36a6ba', color: 'white' }}>
              Background<br />#0a1621
            </ColorSwatch>
            <ColorSwatch style={{ background: 'rgba(54, 166, 186, 0.2)', border: '1px solid #36a6ba', color: 'var(--primary)' }}>
              Accent<br />rgba(54, 166, 186, 0.2)
            </ColorSwatch>
          </ColorGrid>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2>Media Contact</h2>
          <p>For press inquiries, interviews, and partnership opportunities:</p>
          <p>
            <strong>Email:</strong> <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a>
          </p>
          <p><strong>Response Time:</strong> 24-48 hours</p>
          <Button href="/contact" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Us
          </Button>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2>Key Statistics</h2>
          <ul>
            <li><strong>10,000+</strong> Active Users</li>
            <li><strong>500M+</strong> Transactions Tracked</li>
            <li><strong>24/7</strong> Real-Time Monitoring</li>
            <li><strong>15-Minute</strong> Data Refresh Rate</li>
            <li><strong>$50,000</strong> Minimum Transaction Threshold</li>
            <li><strong>Ethereum</strong> Primary Blockchain (More Coming Soon)</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2>Boilerplate</h2>
          <p>
            Sonar Tracker is a leading cryptocurrency whale transaction monitoring platform that provides real-time analytics and AI-powered market intelligence. Founded in 2024 and headquartered in the United Kingdom, Sonar Tracker empowers traders with institutional-grade data, tracking whale transactions over $50,000 across major blockchains. With features including real-time monitoring, advanced sentiment analysis, and the AI advisor Orca 2.0, Sonar Tracker has become the go-to platform for serious crypto traders seeking competitive advantages in volatile markets.
          </p>
        </Section>
      </Content>
    </PageContainer>
  )
}

