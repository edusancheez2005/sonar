'use client'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'

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
  max-width: 900px;
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
  margin-bottom: 3rem;
`

const Section = styled(motion.section)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;

  h2 {
    color: var(--primary);
    font-size: 1.75rem;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  h3 {
    color: var(--text-primary);
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem;
    font-weight: 600;
  }

  p, li {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 2rem;
    margin-bottom: 1rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
`

const LastUpdated = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 2rem;
`

export default function TermsOfService() {
  return (
    <PageContainer>
      <Navbar />
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Terms of Service
        </Title>
        <Subtitle>Please read these terms carefully before using Sonar Tracker</Subtitle>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Sonar Tracker ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, you should not use the Service.
          </p>
          <p>
            Sonar Tracker is a cryptocurrency whale transaction tracking and analytics platform. The Service is intended for informational purposes only and does not constitute financial advice.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>2. Description of Service</h2>
          <p>
            Sonar Tracker provides real-time tracking and analysis of large cryptocurrency transactions ("whale activity") across various blockchains. The Service includes:
          </p>
          <ul>
            <li>Real-time whale transaction monitoring</li>
            <li>AI-powered market sentiment analysis (Orca 2.0)</li>
            <li>Token-specific analytics and metrics</li>
            <li>Cryptocurrency news aggregation</li>
            <li>Market statistics and visualization tools</li>
          </ul>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time without prior notice.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2>3. User Accounts and Subscriptions</h2>
          <h3>3.1 Account Registration</h3>
          <p>
            To access certain features of the Service, you must create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
          </p>
          <h3>3.2 Account Security</h3>
          <p>
            You are responsible for safeguarding your account password and for any activities or actions under your account. You must notify us immediately of any unauthorized use of your account.
          </p>
          <h3>3.3 Premium Subscriptions</h3>
          <p>
            Premium features are available through paid subscription plans. Subscriptions are billed monthly at the rate specified at the time of purchase. You may cancel your subscription at any time through your account settings or the Stripe customer portal.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2>4. Data and Information Disclaimer</h2>
          <h3>4.1 No Financial Advice</h3>
          <p>
            <strong>The information provided by Sonar Tracker is for informational purposes only and does not constitute financial, investment, trading, or other types of advice.</strong> You should not treat any of the Service's content as such.
          </p>
          <h3>4.2 Data Accuracy</h3>
          <p>
            While we strive to provide accurate and up-to-date information, we make no warranties or representations about the accuracy, completeness, or timeliness of the data provided. Blockchain data, market prices, and sentiment analysis may contain errors or delays.
          </p>
          <h3>4.3 Investment Risk</h3>
          <p>
            Cryptocurrency trading and investment carry substantial risk of loss. You should conduct your own research and consult with qualified financial advisors before making any investment decisions. Past performance is not indicative of future results.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2>5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Attempt to gain unauthorized access to any portion of the Service</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Use any automated systems (bots, scrapers) to access the Service without our express written permission</li>
            <li>Resell, redistribute, or commercially exploit the Service or its data</li>
            <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h2>6. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by Sonar Tracker and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p>
            Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <h2>7. Payment and Refunds</h2>
          <h3>7.1 Billing</h3>
          <p>
            All fees are quoted in GBP (£) and are non-refundable except as required by law or as explicitly stated in these terms. Payment processing is handled securely by Stripe.
          </p>
          <h3>7.2 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Upon cancellation, you will continue to have access to premium features until the end of your current billing period. No refunds will be provided for partial months.
          </p>
          <h3>7.3 Price Changes</h3>
          <p>
            We reserve the right to change our subscription fees at any time. We will provide reasonable notice of any fee changes, and such changes will take effect at the start of your next billing cycle.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2>8. Limitation of Liability</h2>
          <p>
            <strong>To the maximum extent permitted by law, Sonar Tracker shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:</strong>
          </p>
          <ul>
            <li>Your use or inability to use the Service</li>
            <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
            <li>Any interruption or cessation of transmission to or from the Service</li>
            <li>Any bugs, viruses, trojan horses, or the like that may be transmitted to or through the Service</li>
            <li>Any errors or omissions in any content or for any loss or damage incurred as a result of your use of any content posted, emailed, transmitted, or otherwise made available through the Service</li>
            <li>Any investment decisions made based on data or analysis provided by the Service</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <h2>9. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive termination.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
          </p>
          <p>
            By continuing to access or use the Service after any revisions become effective, you agree to be bound by the revised terms.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions.
          </p>
          <p>
            Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:sonartracker@gmail.com" style={{ color: 'var(--primary)' }}>sonartracker@gmail.com</a>
          </p>
        </Section>

        <LastUpdated>Last Updated: October 18, 2025</LastUpdated>
      </Content>
      <Footer />
    </PageContainer>
  )
}
