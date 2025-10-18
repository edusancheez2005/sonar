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

  a {
    color: var(--primary);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
`

const LastUpdated = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 2rem;
`

export default function PrivacyPolicy() {
  return (
    <PageContainer>
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Privacy Policy
        </Title>
        <Subtitle>Your privacy is important to us. Learn how we protect your data.</Subtitle>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2>1. Introduction</h2>
          <p>
            Welcome to Sonar Tracker ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cryptocurrency whale tracking platform.
          </p>
          <p>
            If you have any questions or concerns about this Privacy Policy or our practices regarding your personal information, please contact us at <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a>.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide to Us</h3>
          <p>We collect information that you voluntarily provide when you:</p>
          <ul>
            <li><strong>Register for an account:</strong> Email address and password</li>
            <li><strong>Subscribe to premium services:</strong> Payment information (processed securely by Stripe)</li>
            <li><strong>Contact us:</strong> Name, email address, and any information included in your message</li>
            <li><strong>Use our services:</strong> Search queries, filter preferences, and usage patterns</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <p>When you access our Service, we automatically collect certain information, including:</p>
          <ul>
            <li><strong>Log Data:</strong> IP address, browser type, operating system, referring URLs, and pages visited</li>
            <li><strong>Device Information:</strong> Device type, unique device identifiers, and mobile network information</li>
            <li><strong>Usage Data:</strong> Time spent on pages, features used, and interaction patterns</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies to enhance user experience and analyze usage patterns</li>
          </ul>

          <h3>2.3 Third-Party Data</h3>
          <p>We may receive information from third-party services:</p>
          <ul>
            <li><strong>Authentication Providers:</strong> Supabase authentication data</li>
            <li><strong>Payment Processors:</strong> Stripe transaction and subscription status</li>
            <li><strong>Market Data Providers:</strong> CoinGecko, CryptoPanic for public cryptocurrency data</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information for various purposes:</p>
          <ul>
            <li><strong>Provide and Maintain Services:</strong> To deliver the Sonar Tracker platform and its features</li>
            <li><strong>Process Transactions:</strong> To process your subscription payments and manage your account</li>
            <li><strong>Improve Our Services:</strong> To understand usage patterns and enhance user experience</li>
            <li><strong>Communicate with You:</strong> To send service updates, security alerts, and support messages</li>
            <li><strong>Personalization:</strong> To customize content and recommendations based on your preferences</li>
            <li><strong>Security:</strong> To detect, prevent, and address technical issues, fraud, or illegal activities</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            <li><strong>Analytics:</strong> To analyze trends, track user behavior, and generate statistical insights</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2>4. Data Sharing and Disclosure</h2>
          <h3>4.1 We May Share Your Information With:</h3>
          <ul>
            <li>
              <strong>Service Providers:</strong> Third-party companies that help us operate our platform (hosting, payment processing, analytics). These providers are contractually obligated to protect your data.
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose your information if required by law, court order, or governmental regulation, or to protect the rights, property, or safety of Sonar Tracker, our users, or others.
            </li>
          </ul>

          <h3>4.2 We Do NOT:</h3>
          <ul>
            <li>Sell your personal information to third parties</li>
            <li>Share your personal information with advertisers without your consent</li>
            <li>Use your email for unsolicited marketing (you can opt out of promotional emails anytime)</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information:
          </p>
          <ul>
            <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using SSL/TLS</li>
            <li><strong>Password Security:</strong> Passwords are hashed and salted using industry-standard algorithms</li>
            <li><strong>Access Controls:</strong> Limited access to personal data with role-based permissions</li>
            <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
            <li><strong>Secure Infrastructure:</strong> Hosted on secure cloud infrastructure (Vercel, Supabase)</li>
          </ul>
          <p>
            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h2>6. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          
          <h3>6.1 General Rights</h3>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
            <li><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was the basis</li>
          </ul>

          <h3>6.2 GDPR Rights (EU Users)</h3>
          <p>If you are located in the European Economic Area (EEA), you have additional rights under GDPR:</p>
          <ul>
            <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
            <li><strong>Right to Restriction:</strong> Request restriction of processing of your personal data</li>
            <li><strong>Right to Lodge a Complaint:</strong> Lodge a complaint with your local data protection authority</li>
          </ul>

          <h3>6.3 Exercising Your Rights</h3>
          <p>
            To exercise any of these rights, please contact us at <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a>. We will respond to your request within 30 days.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <h2>7. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
          </p>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after account closure</li>
            <li><strong>Transaction Data:</strong> Retained for at least 7 years for accounting and tax purposes</li>
            <li><strong>Usage Data:</strong> Typically retained for 12-24 months for analytics purposes</li>
            <li><strong>Cookies:</strong> Session cookies expire when you close your browser; persistent cookies expire after the period specified in the cookie</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2>8. Cookies and Tracking Technologies</h2>
          <p>We use cookies and similar tracking technologies to:</p>
          <ul>
            <li>Keep you signed in to your account</li>
            <li>Remember your preferences and settings</li>
            <li>Understand how you use our Service</li>
            <li>Improve our Service based on usage patterns</li>
          </ul>
          <p>
            You can control cookies through your browser settings. However, disabling cookies may affect the functionality of certain features.
          </p>
          <p>
            <strong>Types of Cookies We Use:</strong>
          </p>
          <ul>
            <li><strong>Essential Cookies:</strong> Required for basic site functionality and security</li>
            <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our site</li>
          </ul>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <h2>9. Third-Party Services</h2>
          <p>Our Service integrates with third-party services that have their own privacy policies:</p>
          <ul>
            <li><strong>Supabase:</strong> Authentication and database services - <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Stripe:</strong> Payment processing - <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Vercel:</strong> Hosting and deployment - <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>CoinGecko:</strong> Cryptocurrency market data - <a href="https://www.coingecko.com/en/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>CryptoPanic:</strong> Cryptocurrency news - <a href="https://cryptopanic.com/about/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
          </ul>
          <p>
            We encourage you to review the privacy policies of these third-party services to understand how they collect, use, and protect your information.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <h2>10. Children's Privacy</h2>
          <p>
            Sonar Tracker is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <h2>11. International Data Transfers</h2>
          <p>
            Your information may be transferred to and maintained on servers located outside of your country, where data protection laws may differ. By using Sonar Tracker, you consent to the transfer of your information to these locations.
          </p>
          <p>
            We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Policy.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <h2>12. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          <p>
            For material changes, we will provide more prominent notice (such as an email notification) at least 30 days before the new policy takes effect.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a>
          </p>
          <p>
            <strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours.
          </p>
        </Section>

        <LastUpdated>Last Updated: October 18, 2025</LastUpdated>
      </Content>
    </PageContainer>
  )
}
