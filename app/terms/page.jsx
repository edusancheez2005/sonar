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
          transition={{ delay: 0.05, duration: 0.5 }}
          style={{ 
            background: 'rgba(255, 87, 34, 0.1)', 
            borderColor: 'rgba(255, 87, 34, 0.5)',
            borderWidth: '2px'
          }}
        >
          <h2 style={{ color: '#ff5722' }}>⚠️ IMPORTANT DISCLAIMER - NO PROFIT GUARANTEE</h2>
          <p>
            <strong style={{ color: '#ff5722', fontSize: '1.1rem' }}>
              SONAR TRACKER PROVIDES DATA AND ANALYTICS FOR INFORMATIONAL PURPOSES ONLY. WE DO NOT GUARANTEE PROFITS, INVESTMENT SUCCESS, OR ANY SPECIFIC FINANCIAL OUTCOMES.
            </strong>
          </p>
          <p>
            <strong>You acknowledge and agree that:</strong>
          </p>
          <ul>
            <li><strong>Trading cryptocurrencies involves substantial risk of loss</strong> and is not suitable for all investors.</li>
            <li><strong>Past performance is not indicative of future results.</strong> Historical data and whale activity patterns do not guarantee future price movements.</li>
            <li><strong>You may lose some or all of your invested capital.</strong> Only invest what you can afford to lose.</li>
            <li><strong>Our data and analysis are not financial advice.</strong> Always conduct your own research and consult with qualified financial advisors before making investment decisions.</li>
            <li><strong>Market conditions can change rapidly.</strong> Whale transactions do not always predict price movements.</li>
            <li><strong>You are solely responsible for your trading decisions.</strong> Sonar Tracker is not liable for any losses incurred from decisions made based on our platform data.</li>
          </ul>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            By using this service, you confirm that you understand these risks and accept full responsibility for your trading and investment decisions.
          </p>
        </Section>

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
          <h3>2.1 Platform Overview</h3>
          <p>
            Sonar Tracker provides tracking and analysis of large cryptocurrency transactions ("whale activity") across various blockchains. The Service includes:
          </p>
          <ul>
            <li>Whale transaction monitoring and analytics</li>
            <li>ORCA — an AI-powered data analysis tool (see Section 2.2)</li>
            <li>Token-specific analytics and metrics</li>
            <li>Cryptocurrency news aggregation with sentiment analysis</li>
            <li>Market statistics and visualisation tools</li>
            <li>Derivatives market data (funding rates, open interest, positioning data)</li>
          </ul>
          <h3>2.2 ORCA AI — Data Analysis Tool</h3>
          <p>
            ORCA is Sonar Tracker's AI-powered <strong>data analysis and summarisation tool</strong>. ORCA processes on-chain whale transaction data, market sentiment, news, and derivatives positioning to generate summaries and market context in plain English. <strong>ORCA is not a financial advisor, investment manager, or regulated person.</strong> ORCA does not provide personalised investment advice, portfolio management, or recommendations to buy, sell, or hold any financial instrument. All ORCA outputs are for informational and educational purposes only and should not be relied upon as the basis for any investment decision.
          </p>
          <h3>2.3 Regulatory Status</h3>
          <p>
            <strong>Sonar Tracker is not authorised, registered, or regulated by the Financial Conduct Authority (FCA) or any other financial regulatory body in any jurisdiction.</strong> The Service does not constitute a regulated activity under the Financial Services and Markets Act 2000 (FSMA). Sonar Tracker does not provide investment advice, portfolio management, or any other activity that would require FCA authorisation. Users located in jurisdictions where the use of cryptocurrency analytics tools is restricted or prohibited should not use this Service.
          </p>
          <h3>2.4 No Custody</h3>
          <p>
            Sonar Tracker does not hold, store, transmit, or have access to any user's cryptocurrency, digital assets, private keys, or wallet credentials. The Service is purely an analytics and data platform. We never ask for wallet passwords or seed phrases.
          </p>
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
          <h3>3.3 Account Deletion</h3>
          <p>
            You may delete your account at any time by contacting us at <a href="mailto:eduardo@sonartracker.io" style={{ color: 'var(--primary)' }}>eduardo@sonartracker.io</a>. Upon deletion, all personally identifiable information associated with your account will be permanently removed within 30 days. Anonymised analytics data (e.g., aggregate usage statistics) may be retained.
          </p>
          <h3>3.4 Premium Subscriptions</h3>
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
            <strong>The information provided by Sonar Tracker is for informational purposes only and does not constitute financial, investment, trading, legal, tax or accounting advice.</strong> You should not treat any of the Service's content as such. Nothing on the Service is an offer, solicitation, recommendation, endorsement, or inducement to buy, sell, hold, or transact in any cryptoasset, security, derivative, or other financial instrument.
          </p>
          <h3>4.2 Data Accuracy and Third-Party Sources</h3>
          <p>
            The Service aggregates and analyses data sourced from public blockchains and from third-party providers including (without limitation) CoinGecko, CryptoPanic, LunarCrush, Supabase, Stripe, Vercel, xAI and OpenAI. <strong>We do not warrant that any data displayed on the Service is accurate, complete, current, or free from error or omission.</strong> Blockchain reorganisations, indexer lag, oracle failures, third-party API outages, mis-labelled wallets, mis-classified transactions, sentiment-model drift and AI hallucinations may all cause the Service to display data that is wrong. You acknowledge that you act on data displayed by the Service entirely at your own risk.
          </p>
          <h3>4.3 AI-Generated Output (ORCA, signals, summaries)</h3>
          <p>
            ORCA, the signal engine, sentiment scoring, news classification, transaction classification and any other features that use machine-learning models (collectively, the "<strong>AI Features</strong>") are <strong>experimental, probabilistic and frequently wrong</strong>. AI Features may produce outputs that are factually incorrect, internally inconsistent, biased, out-of-date, or fabricated ("hallucinated"). AI Features may produce different outputs for the same input. <strong>You must not rely on any AI Feature output as the sole or primary basis for any decision, financial or otherwise.</strong> AI Features are not a substitute for advice from a qualified, licensed professional. Sonar Tracker does not warrant that AI Feature outputs are fit for any particular purpose, and to the maximum extent permitted by law disclaims all liability arising from any use of, or reliance on, AI Feature outputs.
          </p>
          <h3>4.4 Investment Risk</h3>
          <p>
            Cryptoasset trading and investment carry a substantial risk of loss, including the total loss of capital. Cryptoassets are highly volatile and largely unregulated. You should conduct your own research and consult a qualified, licensed financial adviser before making any investment decision. Past performance, historical signals and back-tests are not indicative of future results.
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
            All fees are quoted in GBP (£). Payment processing is handled securely by Stripe.
          </p>
          <h3>7.2 Cooling-Off Period</h3>
          <p>
            In accordance with the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have the right to cancel your subscription within 14 days of purchase for a full refund, provided you have not consumed the digital content (i.e. you have not used premium features beyond the initial sign-up). To exercise this right, contact us at <a href="mailto:eduardo@sonartracker.io" style={{ color: 'var(--primary)' }}>eduardo@sonartracker.io</a> within the 14-day period.
          </p>
          <h3>7.3 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Upon cancellation, you will continue to have access to premium features until the end of your current billing period. After the 14-day cooling-off period, no refunds will be provided for partial months.
          </p>
          <h3>7.4 Price Changes</h3>
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
            Nothing in these Terms excludes or limits any liability that cannot lawfully be excluded or limited, including (in the United Kingdom) liability for death or personal injury caused by negligence and liability for fraud or fraudulent misrepresentation.
          </p>
          <p>
            <strong>Subject to the paragraph above, and to the maximum extent permitted by law, Sonar Tracker (and its officers, directors, employees, agents, suppliers and licensors) shall not be liable to you for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenues, business, goodwill, opportunity, data or anticipated savings, whether incurred directly or indirectly, arising out of or in connection with:</strong>
          </p>
          <ul>
            <li>your use of, or inability to use, the Service;</li>
            <li>any reliance placed by you on data, signals, AI Features, sentiment, news classifications, transaction classifications, watchlists or any other content displayed on the Service;</li>
            <li>any investment, trading or financial decision you make, whether or not informed by the Service;</li>
            <li>any unauthorised access to or use of our servers and/or any personal information stored on them;</li>
            <li>any interruption, suspension or cessation of the Service;</li>
            <li>any bugs, viruses, trojan horses or other harmful code that may be transmitted to or through the Service by any third party;</li>
            <li>any errors or omissions in any content, or any loss or damage incurred as a result of your use of any content posted, transmitted or otherwise made available through the Service;</li>
            <li>any act or omission of any third-party data provider, AI provider, payment processor, hosting provider, exchange, blockchain, oracle, or other third party.</li>
          </ul>
          <h3>8.1 Aggregate Cap</h3>
          <p>
            <strong>Without prejudice to the exclusions above, our total aggregate liability to you in connection with the Service, whether in contract, tort (including negligence), breach of statutory duty or otherwise, shall in no event exceed the greater of (a) the total amount of subscription fees actually paid by you to Sonar Tracker in the twelve (12) months immediately preceding the event giving rise to the claim, and (b) one hundred British Pounds (£100).</strong> This cap is an essential element of the basis of the bargain between you and Sonar Tracker; the Service would not be made available to you on the same terms without it.
          </p>
          <h3>8.2 Free Tier</h3>
          <p>
            If you use the Service without paying any subscription fee, our total aggregate liability to you shall in no event exceed one hundred British Pounds (£100).
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
        >
          <h2>8A. Indemnification</h2>
          <p>
            <strong>To the maximum extent permitted by law, you agree to indemnify, defend and hold harmless Sonar Tracker and its officers, directors, employees, agents, suppliers and licensors from and against any and all claims, liabilities, damages, losses, costs and expenses (including reasonable legal fees) arising out of or in any way connected with:</strong>
          </p>
          <ul>
            <li>your access to or use of the Service;</li>
            <li>your violation of these Terms;</li>
            <li>your violation of any third-party right, including any intellectual property right, publicity right, confidentiality right, property right or privacy right;</li>
            <li>any investment, trading or financial decision you make, whether or not informed by the Service, and any loss of capital you suffer in connection with any such decision;</li>
            <li>your use of any AI Feature output, including any republication, redistribution or onward reliance by any third party;</li>
            <li>your breach of applicable law, including securities, commodities, anti-money-laundering, counter-terrorist-financing, sanctions or tax laws.</li>
          </ul>
          <p>
            We reserve the right, at our own expense, to assume the exclusive defence and control of any matter otherwise subject to indemnification by you, in which case you will cooperate with our defence of that matter.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.88, duration: 0.5 }}
        >
          <h2>8B. Eligibility and Sanctions</h2>
          <p>
            By accessing or using the Service you represent and warrant that:
          </p>
          <ul>
            <li>you are at least 18 years old and have the legal capacity to enter into binding contracts in your jurisdiction;</li>
            <li>you are not located in, ordinarily resident in, or a national of any jurisdiction subject to comprehensive sanctions administered by the US Office of Foreign Assets Control (OFAC), HM Treasury (UK), the European Union or the United Nations Security Council, including (without limitation) Cuba, Iran, North Korea, Syria, the Crimea, Donetsk and Luhansk regions of Ukraine, the Russian Federation and Belarus;</li>
            <li>you are not listed on the OFAC Specially Designated Nationals and Blocked Persons List, the UK HM Treasury Consolidated List of Financial Sanctions Targets, the EU Consolidated List of Sanctions, or any equivalent list maintained by any government or supranational body;</li>
            <li>your use of the Service does not violate any applicable law or regulation in your jurisdiction;</li>
            <li>you will not use the Service to facilitate any unlawful activity, including money laundering, terrorist financing, market manipulation, insider dealing, or tax evasion.</li>
          </ul>
          <p>
            We may refuse, suspend or terminate access to the Service at any time, without notice, on the basis of any actual or suspected violation of this Section 8B.
          </p>
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
          <h2>10. Communications and Marketing</h2>
          <h3>10.1 Consent to Receive Communications</h3>
          <p>
            By creating an account on Sonar Tracker, you agree to receive electronic communications from us, including but not limited to:
          </p>
          <ul>
            <li><strong>Service-related emails</strong> — account confirmations, security alerts, billing updates, and important notices about changes to the Service or these Terms.</li>
            <li><strong>Marketing and promotional emails</strong> — product updates, new features, educational content, newsletters, special offers, and other information we think may be of interest to you.</li>
            <li><strong>Whale alerts and market notifications</strong> — real-time or periodic updates about whale activity, market movements, and AI-generated insights (where enabled).</li>
          </ul>
          <h3>10.2 Opting Out</h3>
          <p>
            You may opt out of marketing and promotional emails at any time by clicking the "unsubscribe" link included in every marketing email, or by contacting us at <a href="mailto:eduardo@sonartracker.io" style={{ color: 'var(--primary)' }}>eduardo@sonartracker.io</a>. Please note that even if you opt out of marketing communications, we may still send you essential service-related messages that are necessary for the operation of your account.
          </p>
          <h3>10.3 Communication Preferences</h3>
          <p>
            We process your personal data for marketing purposes based on the consent you provide when creating your account, in accordance with the UK General Data Protection Regulation (UK GDPR) and the Privacy and Electronic Communications Regulations (PECR). For more details on how we handle your data, please refer to our <a href="/privacy" style={{ color: 'var(--primary)' }}>Privacy Policy</a>.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <h2>11. Changes to Terms</h2>
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
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <h2>12. Governing Law and Dispute Resolution</h2>
          <h3>12.1 Governing Law</h3>
          <p>
            These Terms, and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with them or their subject matter or formation, shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict-of-law principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply to these Terms.
          </p>
          <h3>12.2 Informal Resolution</h3>
          <p>
            Before filing a claim against Sonar Tracker, you agree to try to resolve the dispute informally by contacting <a href="mailto:legal@sonartracker.io" style={{ color: 'var(--primary)' }}>legal@sonartracker.io</a> with a written description of your claim and the relief you seek. We will try to resolve the dispute informally within sixty (60) days of receiving your notice. If we cannot resolve the dispute within that period, either party may bring a formal proceeding.
          </p>
          <h3>12.3 Exclusive Jurisdiction</h3>
          <p>
            Subject to Section 12.2, you and Sonar Tracker irrevocably agree that the courts of England and Wales shall have <strong>exclusive jurisdiction</strong> to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with these Terms or their subject matter or formation. Nothing in this Section 12.3 limits any non-waivable right that a consumer resident in the European Union may have to bring proceedings in the courts of their country of habitual residence under Article 18 of Regulation (EU) No 1215/2012.
          </p>
          <h3>12.4 Class Action Waiver (where lawful)</h3>
          <p>
            <strong>To the extent permitted by applicable law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated or representative action.</strong> If for any reason a claim proceeds in court rather than as an individual proceeding, you and Sonar Tracker each waive any right to a jury trial. This Section 12.4 does not apply where it is prohibited by law (including the laws of England and Wales as they apply to consumers).
          </p>
          <h3>12.5 Time Bar</h3>
          <p>
            Any claim against Sonar Tracker arising out of or relating to the Service or these Terms must be commenced within one (1) year after the cause of action accrues, except where a longer period is required by mandatory applicable law. After such period, the claim is permanently barred.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.5 }}
        >
          <h2>12A. Severability and Entire Agreement</h2>
          <p>
            If any provision of these Terms is held to be invalid, illegal or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect, and the invalid, illegal or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal and enforceable while preserving the parties' original intent. These Terms, together with the Privacy Policy and any other policies referenced in them, constitute the entire agreement between you and Sonar Tracker concerning the Service and supersede all prior or contemporaneous communications, whether electronic, oral or written.
          </p>
          <p>
            No failure or delay by Sonar Tracker in exercising any right under these Terms shall operate as a waiver of that right.
          </p>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <h2>13. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:eduardo@sonartracker.io" style={{ color: 'var(--primary)' }}>eduardo@sonartracker.io</a>
          </p>
        </Section>

        <LastUpdated>Last Updated: April 21, 2026</LastUpdated>
      </Content>
    </PageContainer>
  )
}
