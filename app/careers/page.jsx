'use client'
import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

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
  max-width: 1200px;
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
  font-size: 1.2rem;
  margin-bottom: 4rem;
  line-height: 1.6;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`

const JobCard = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(54, 166, 186, 0.2);
  }
`

const JobHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const JobInfo = styled.div`
  flex: 1;

  h3 {
    color: var(--text-primary);
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }
`

const JobMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 8px;
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 500;

  svg {
    width: 16px;
    height: 16px;
  }
`

const ExpandButton = styled.button`
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(54, 166, 186, 0.4);
  }
`

const JobDetails = styled(motion.div)`
  padding-top: 2rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
  margin-top: 2rem;

  h4 {
    color: var(--primary);
    font-size: 1.25rem;
    margin: 2rem 0 1rem;
    font-weight: 600;
  }

  ul {
    padding-left: 2rem;
    margin: 1rem 0;
  }

  li {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.8;
  }

  strong {
    color: var(--text-primary);
  }
`

const ApplyButton = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(54, 166, 186, 0.4);
  transition: all 0.3s ease;
  margin-top: 2rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const BenefitsSection = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 3rem;
  margin-top: 4rem;

  h2 {
    color: var(--text-primary);
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
  }
`

const BenefitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
`

const Benefit = styled.div`
  text-align: center;

  svg {
    width: 48px;
    height: 48px;
    color: var(--primary);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--text-primary);
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
  }
`

export default function CareersPage() {
  const [expandedJob, setExpandedJob] = useState(null)

  const jobs = [
    {
      id: 'web3-expert',
      title: 'Web3 Expert',
      description: 'Lead our Web3 integration efforts and expand blockchain support across multiple chains.',
      location: 'Remote (UK/EU)',
      type: 'Full-Time',
      salary: '£60,000 - £90,000',
      responsibilities: [
        'Design and implement multi-chain whale transaction tracking',
        'Integrate with Web3 protocols and DeFi platforms',
        'Optimize smart contract interactions for gas efficiency',
        'Build scalable blockchain data pipelines',
        'Collaborate with data science team on whale detection algorithms',
        'Stay current with Web3 ecosystem developments'
      ],
      requirements: [
        '3+ years of Web3 development experience',
        'Expert knowledge of Ethereum, Solidity, and EVM chains',
        'Experience with ethers.js, web3.js, or viem',
        'Understanding of DeFi protocols and whale transaction patterns',
        'Proficiency in TypeScript/JavaScript and Python',
        'Experience with blockchain data APIs (Alchemy, Infura, Quicknode)',
        'Knowledge of Layer 2 solutions (Arbitrum, Optimism, Polygon)'
      ],
      niceToHave: [
        'Experience with Rust and Solana/Substrate',
        'Background in cryptocurrency trading or market analysis',
        'Open-source contributions to Web3 projects',
        'Understanding of MEV and transaction ordering',
        'Experience with The Graph protocol'
      ]
    },
    {
      id: 'blockchain-expert',
      title: 'Blockchain Data Engineer',
      description: 'Build robust infrastructure for real-time blockchain data ingestion and processing at scale.',
      location: 'Remote (UK/EU)',
      type: 'Full-Time',
      salary: '£55,000 - £85,000',
      responsibilities: [
        'Design and maintain high-throughput blockchain data pipelines',
        'Implement real-time transaction monitoring across multiple chains',
        'Optimize database schemas for whale transaction analytics',
        'Build data quality checks and anomaly detection',
        'Develop APIs for efficient data retrieval',
        'Monitor system performance and implement scaling solutions'
      ],
      requirements: [
        '3+ years of blockchain or data engineering experience',
        'Strong understanding of blockchain architecture and consensus mechanisms',
        'Experience with PostgreSQL, TimescaleDB, or similar databases',
        'Proficiency in Python, Node.js, or Go',
        'Knowledge of ETL/ELT processes and data warehousing',
        'Experience with cloud platforms (AWS, GCP, or Azure)',
        'Understanding of API design and RESTful services'
      ],
      niceToHave: [
        'Experience with real-time data streaming (Kafka, RabbitMQ)',
        'Knowledge of blockchain indexing solutions',
        'Background in financial data systems',
        'Experience with Kubernetes and Docker',
        'Familiarity with machine learning for fraud detection'
      ]
    }
  ]

  return (
    <PageContainer>
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Join Our Team
        </Title>
        <Subtitle>
          Help us build the future of cryptocurrency whale tracking and market intelligence
        </Subtitle>

        {jobs.map((job, index) => (
          <JobCard
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <JobHeader>
              <JobInfo>
                <h3>{job.title}</h3>
                <p>{job.description}</p>
                <JobMeta>
                  <Badge>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </Badge>
                  <Badge>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {job.type}
                  </Badge>
                  <Badge>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.salary}
                  </Badge>
                </JobMeta>
              </JobInfo>
              <ExpandButton onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}>
                {expandedJob === job.id ? 'Show Less' : 'View Details'}
              </ExpandButton>
            </JobHeader>

            <AnimatePresence>
              {expandedJob === job.id && (
                <JobDetails
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h4>Responsibilities</h4>
                  <ul>
                    {job.responsibilities.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <h4>Requirements</h4>
                  <ul>
                    {job.requirements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <h4>Nice to Have</h4>
                  <ul>
                    {job.niceToHave.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <ApplyButton
                    href={`/contact?subject=Application for ${job.title}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Apply for this Position
                  </ApplyButton>
                </JobDetails>
              )}
            </AnimatePresence>
          </JobCard>
        ))}

        <BenefitsSection>
          <h2>Why Join Sonar Tracker?</h2>
          <BenefitsGrid>
            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3>Remote First</h3>
              <p>Work from anywhere in the UK/EU with flexible hours and async communication.</p>
            </Benefit>

            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Competitive Salary</h3>
              <p>Market-leading compensation with equity options and performance bonuses.</p>
            </Benefit>

            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3>Cutting-Edge Tech</h3>
              <p>Work with the latest Web3 technologies, AI, and blockchain infrastructure.</p>
            </Benefit>

            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3>Growth & Learning</h3>
              <p>Conference allowance, learning budget, and mentorship from industry experts.</p>
            </Benefit>

            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3>Great Team</h3>
              <p>Join a passionate team building the future of crypto market intelligence.</p>
            </Benefit>

            <Benefit>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3>Health & Wellness</h3>
              <p>Comprehensive health insurance, generous PTO, and mental health support.</p>
            </Benefit>
          </BenefitsGrid>
        </BenefitsSection>
      </Content>
    </PageContainer>
  )
}

