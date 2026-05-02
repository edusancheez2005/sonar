'use client'
/**
 * /help/wallet-security
 *
 * Public-facing security & privacy explainer for the wallet sign-in flow.
 *
 * Authoring guidelines (do NOT loosen without legal review):
 *  - Describe ONLY what the product actually does. No marketing fluff that
 *    could be construed as a security guarantee or financial advice.
 *  - Use active voice and plain language. The reader is a retail trader,
 *    not a lawyer.
 *  - Always link Terms (/terms) and Privacy (/privacy) for the legally
 *    binding text. This page is a plain-English summary, not a substitute.
 *  - Include the standard "informational only / not investment advice"
 *    disclaimer block at the bottom (matches /legal and Footer).
 *  - When listing data we collect, match exactly what walletAuth.ts and
 *    /api/auth/wallet/verify actually persist (wallet address, chain,
 *    signature artifacts, attestation timestamps, IP + UA at signup).
 *  - When listing what we DO NOT do, only claim things that are
 *    architecturally impossible (we cannot sign transactions because we
 *    never receive a private key — true). Avoid claims like "we never get
 *    hacked" which we cannot guarantee.
 */

import React from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'

/* ---------------------------------------------------------------- styles */

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
`

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(60% 40% at 20% 0%, rgba(0, 229, 255, 0.08), transparent 60%),
    radial-gradient(40% 30% at 80% 10%, rgba(124, 58, 237, 0.10), transparent 60%),
    linear-gradient(180deg, #07090f 0%, #0a1024 100%);
  color: #e6edf7;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 96px 24px 80px;
`
const Wrap = styled.div`
  max-width: 880px;
  margin: 0 auto;
`

const Crumbs = styled.nav`
  font-size: 12.5px;
  color: #64748b;
  margin-bottom: 18px;
  a { color: #94a3b8; text-decoration: none; }
  a:hover { color: #00e5ff; }
  span { margin: 0 8px; opacity: 0.6; }
`

const HeroBadge = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 230, 118, 0.08);
  border: 1px solid rgba(0, 230, 118, 0.25);
  color: #6ee7b7;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 16px;
`
const ShieldHero = styled(motion.div)`
  width: 64px; height: 64px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(124,58,237,0.22));
  border: 1px solid rgba(0,229,255,0.3);
  color: #00e5ff;
  margin-bottom: 18px;
  animation: ${float} 4s ease-in-out infinite;
`
const H1 = styled.h1`
  font-size: 40px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 60%, #00e5ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`
const Lead = styled.p`
  font-size: 17px;
  line-height: 1.55;
  color: #cbd5e1;
  margin: 0 0 36px;
  max-width: 680px;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 28px 0 36px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`
const Card = styled.div`
  padding: 18px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
`
const CardHead = styled.div`
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 12px;
  h3 { margin: 0; font-size: 15px; font-weight: 700; color: #fff; }
`
const Pill = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${(p) =>
    p.$kind === 'do'
      ? 'background: rgba(0,230,118,0.10); color: #6ee7b7; border: 1px solid rgba(0,230,118,0.3);'
      : 'background: rgba(255,122,144,0.08); color: #ffb3c1; border: 1px solid rgba(255,122,144,0.3);'}
`
const Bullet = styled.li`
  list-style: none;
  display: flex; align-items: flex-start; gap: 10px;
  padding: 6px 0;
  color: #cbd5e1;
  font-size: 13.5px;
  line-height: 1.5;
  svg { flex: 0 0 16px; margin-top: 2px; }
`
const BulletList = styled.ul` margin: 0; padding: 0; `

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 40px 0 12px;
  letter-spacing: -0.01em;
`
const Body = styled.p`
  font-size: 14.5px;
  line-height: 1.65;
  color: #cbd5e1;
  margin: 0 0 14px;
`
const InlineCode = styled.code`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
  padding: 2px 6px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  color: #00e5ff;
`

const StepGrid = styled.ol`
  list-style: none;
  counter-reset: step;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  gap: 12px;
`
const Step = styled.li`
  counter-increment: step;
  position: relative;
  padding: 14px 16px 14px 56px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  &::before {
    content: counter(step);
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    width: 30px; height: 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    color: #0a0e17;
    background: linear-gradient(135deg, #00e5ff, #7c3aed);
  }
  h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #fff; }
  p { margin: 0; font-size: 13px; line-height: 1.55; color: #94a3b8; }
`

const Faq = styled.details`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px 18px;
  margin: 10px 0;
  &[open] { background: rgba(0,229,255,0.04); border-color: rgba(0,229,255,0.2); }
  summary {
    cursor: pointer;
    font-weight: 600;
    color: #fff;
    list-style: none;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 14.5px;
    &::-webkit-details-marker { display: none; }
    &::after { content: '+'; color: #00e5ff; font-size: 18px; transition: transform .2s; }
  }
  &[open] summary::after { content: '−'; }
  div.body { color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin-top: 10px; }
`

const Disclaimer = styled.section`
  margin-top: 50px;
  padding: 18px 20px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  font-size: 12.5px;
  line-height: 1.6;
  color: #94a3b8;
  h3 { margin: 0 0 8px; color: #cbd5e1; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  a { color: #00e5ff; text-decoration: underline; text-underline-offset: 3px; }
  p + p { margin-top: 8px; }
`

const Cta = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-top: 28px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(0,229,255,0.10), rgba(124,58,237,0.12));
  border: 1px solid rgba(0,229,255,0.25);
  flex-wrap: wrap;
  h3 { margin: 0; font-size: 16px; font-weight: 700; color: #fff; }
  p { margin: 4px 0 0; color: #cbd5e1; font-size: 13px; }
  a {
    text-decoration: none;
    padding: 11px 16px;
    background: linear-gradient(135deg, #00e5ff, #7c3aed);
    color: #0a0e17;
    border-radius: 10px;
    font-weight: 700;
    font-size: 13.5px;
  }
`

/* ---------------------------------------------------------------- icons */
const Shield = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v7c0 4.97 3.4 9.36 8 10 4.6-.64 8-5.03 8-10V5l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)
const Check = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5L20 7" />
  </svg>
)
const X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

/* ---------------------------------------------------------------- page */

export default function WalletSecurityClient() {
  return (
    <Page>
      <Wrap>
        <Crumbs aria-label="Breadcrumb">
          <Link href="/help">Help</Link>
          <span>/</span>
          <span style={{ color: '#cbd5e1' }}>Wallet security &amp; privacy</span>
        </Crumbs>

        <ShieldHero
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {Shield}
        </ShieldHero>

        <HeroBadge>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#34d399', display: 'inline-block' }} />
          Non-custodial · Read-only by design
        </HeroBadge>

        <H1>How Sonar Tracker keeps your wallet safe</H1>
        <Lead>
          Sonar Tracker is a <b>non-custodial</b> analytics product. We never take possession
          of your funds, we never request transaction approvals, and we never see your
          seed phrase. This page explains exactly what the wallet sign-in does, what we
          store, and how to stay safe when connecting any wallet to any web app.
        </Lead>

        {/* DO / DO NOT */}
        <TwoCol>
          <Card>
            <CardHead>
              <Pill $kind="do">What we do</Pill>
            </CardHead>
            <BulletList>
              <Bullet>{Check}<span>Ask your wallet to sign a short, human-readable text message to prove you control the address.</span></Bullet>
              <Bullet>{Check}<span>Read your <b>public on-chain balances</b> through standard JSON-RPC providers (Alchemy, Helius, mempool.space).</span></Bullet>
              <Bullet>{Check}<span>Personalize your dashboard around the tokens you actually hold.</span></Bullet>
              <Bullet>{Check}<span>Let you remove any linked wallet from your account at any time.</span></Bullet>
            </BulletList>
          </Card>
          <Card>
            <CardHead>
              <Pill $kind="dont">What we never do</Pill>
            </CardHead>
            <BulletList>
              <Bullet>{X}<span>Ask for, transmit, or store your <b>seed phrase or private key</b> — ever.</span></Bullet>
              <Bullet>{X}<span>Request <b>token approvals</b>, <code>setApprovalForAll</code>, or any allowance.</span></Bullet>
              <Bullet>{X}<span>Initiate a transaction, transfer, swap, or contract call from your wallet.</span></Bullet>
              <Bullet>{X}<span>Sell, rent, or share your wallet address with advertisers.</span></Bullet>
            </BulletList>
          </Card>
        </TwoCol>

        {/* HOW IT WORKS */}
        <SectionTitle>How wallet sign-in works (Sign-In with Ethereum / Solana)</SectionTitle>
        <Body>
          Sonar Tracker uses the <b>Sign-In with Ethereum</b> standard
          (<InlineCode>EIP-4361</InlineCode>) for EVM wallets and an equivalent message-signing
          flow for Solana. Both are <b>off-chain signatures</b> — they cost no gas, do not
          touch the blockchain, and cannot move any funds.
        </Body>
        <StepGrid>
          <Step>
            <h4>You click "Continue with Wallet"</h4>
            <p>Your wallet (MetaMask, Phantom, Rainbow, etc.) opens. We never see what wallets you have installed — your browser handles the connection.</p>
          </Step>
          <Step>
            <h4>We ask your wallet for a signature</h4>
            <p>The text says exactly what is happening: <i>"Sign in to Sonar Tracker. This is a read-only signature and does not authorize any transaction."</i> Your wallet shows you the full text before you sign.</p>
          </Step>
          <Step>
            <h4>We verify the signature server-side</h4>
            <p>The signature mathematically proves the connecting browser controls the private key for that address — without ever revealing the key.</p>
          </Step>
          <Step>
            <h4>We read your public balances</h4>
            <p>We call standard public RPC providers to fetch the tokens already visible on Etherscan, Solscan, or any block explorer. No private data is involved.</p>
          </Step>
          <Step>
            <h4>You can disconnect at any time</h4>
            <p>Visit your <Link href="/profile" style={{ color: '#00e5ff' }}>profile</Link> to unlink a wallet or delete your account entirely.</p>
          </Step>
        </StepGrid>

        {/* DATA WE COLLECT */}
        <SectionTitle>What data we store when you sign in</SectionTitle>
        <Body>
          The full legal definition lives in our <Link href="/privacy" style={{ color: '#00e5ff' }}>Privacy Policy</Link>.
          In plain English, when you sign in with a wallet we store:
        </Body>
        <BulletList>
          <Bullet>{Check}<span>Your <b>public wallet address</b> and which chain it lives on.</span></Bullet>
          <Bullet>{Check}<span>The <b>signature</b> and <b>nonce</b> from the sign-in challenge (proof of ownership).</span></Bullet>
          <Bullet>{Check}<span>A <b>cached snapshot</b> of public token balances so we do not hammer RPC providers on every page load. This refreshes periodically.</span></Bullet>
          <Bullet>{Check}<span>Your <b>attestation timestamps</b> (18+ confirmation, Terms acceptance, sanctions confirmation) and the IP + user-agent that submitted them — required for compliance and abuse prevention.</span></Bullet>
        </BulletList>
        <Body style={{ marginTop: 14 }}>
          We do <b>not</b> store private keys, seed phrases, transaction-signing capability, or any
          off-chain personal information beyond what is listed above and in the Privacy Policy.
        </Body>

        {/* RED FLAGS */}
        <SectionTitle>Red flags — when to disconnect immediately</SectionTitle>
        <Body>
          The same advice applies to <i>any</i> dApp, not just Sonar Tracker. If you see any of
          the following, close the tab and disconnect from the site:
        </Body>
        <BulletList>
          <Bullet>{X}<span>A site asks you to <b>"verify"</b> your wallet by entering a seed phrase or private key. Legitimate sites <b>never</b> need this.</span></Bullet>
          <Bullet>{X}<span>Your wallet shows a transaction popup (red <code>eth_sendTransaction</code>, contract call, NFT mint) on a sign-in flow.</span></Bullet>
          <Bullet>{X}<span>A signature request includes <b>permit</b>, <b>setApprovalForAll</b>, or unreadable hex blobs you cannot decode.</span></Bullet>
          <Bullet>{X}<span>The site claims it can <b>"recover lost funds"</b>, <b>"unlock airdrops"</b>, or guarantees returns.</span></Bullet>
          <Bullet>{X}<span>You arrived from a Discord or Twitter DM link — phishing sites copy real UIs perfectly.</span></Bullet>
        </BulletList>

        {/* FAQ */}
        <SectionTitle>Frequently asked questions</SectionTitle>

        <Faq>
          <summary>Can Sonar Tracker move my funds?</summary>
          <div className="body">
            No. We have no private key for your wallet, and signing in produces an off-chain signature
            that is mathematically incapable of authorizing a transfer. The action that would move funds
            (<InlineCode>eth_sendTransaction</InlineCode>) is never requested.
          </div>
        </Faq>

        <Faq>
          <summary>Does signing in cost gas?</summary>
          <div className="body">
            No. The signature is created entirely inside your wallet — it is not broadcast to the
            blockchain. You will not see a gas estimate.
          </div>
        </Faq>

        <Faq>
          <summary>Can I use Sonar without connecting a wallet?</summary>
          <div className="body">
            Yes. You can sign up with email or Google, or paste any public address as a watch-only
            view. Wallet sign-in is one option, not a requirement.
          </div>
        </Faq>

        <Faq>
          <summary>What happens if I lose access to the wallet I signed in with?</summary>
          <div className="body">
            Email <a href="mailto:saif@sonartracker.io">saif@sonartracker.io</a> from the email
            on file (if you also have one) and we can help recover account access. Without a recovery
            channel we cannot prove ownership of the address — this is by design.
          </div>
        </Faq>

        <Faq>
          <summary>How do I unlink a wallet or delete my account?</summary>
          <div className="body">
            Open your <Link href="/profile" style={{ color: '#00e5ff' }}>profile</Link> and use the
            "Linked wallets" panel to remove an address, or contact{' '}
            <a href="mailto:saif@sonartracker.io">saif@sonartracker.io</a> to delete the entire
            account. Cached on-chain data is purged on request as required by GDPR / CCPA.
          </div>
        </Faq>

        <Faq>
          <summary>Are you audited?</summary>
          <div className="body">
            Sonar Tracker does not deploy or interact with on-chain smart contracts that hold user funds —
            because we are non-custodial there is no fund-bearing contract to audit. Our authentication
            stack uses the OpenZeppelin-maintained <InlineCode>siwe</InlineCode> library for EIP-4361
            verification and standard <b>nacl</b> ed25519 verification for Solana.
          </div>
        </Faq>

        <Faq>
          <summary>Where can I report a security issue?</summary>
          <div className="body">
            Please email <a href="mailto:saif@sonartracker.io">saif@sonartracker.io</a>. We
            acknowledge reports within 72 hours. Coordinated disclosure is appreciated — please do
            not publicly disclose vulnerabilities before we have had a chance to patch them.
          </div>
        </Faq>

        {/* CTA */}
        <Cta>
          <div>
            <h3>Ready to personalize your dashboard?</h3>
            <p>Read-only signature. No gas. Disconnect any time.</p>
          </div>
          <Link href="/personalize">Try wallet personalization</Link>
        </Cta>

        {/* DISCLAIMER */}
        <Disclaimer>
          <h3>Legal &amp; risk disclaimer</h3>
          <p>
            Sonar Tracker is an informational analytics product. Nothing on this page or anywhere
            on the platform is investment advice, financial advice, tax advice, or a solicitation
            to buy or sell any digital asset. Cryptocurrency markets are volatile and trading
            carries significant risk of loss.
          </p>
          <p>
            The wallet sign-in flow described above is governed by our{' '}
            <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>, which take precedence over the
            plain-English summary on this page in the event of any conflict. By signing in with
            a wallet you confirm you are 18+, you accept the Terms, and you are not located in
            a jurisdiction subject to OFAC, UK, or EU sanctions that prohibit you from using the
            service.
          </p>
          <p>
            Sonar Tracker takes reasonable technical and organizational measures to protect user
            data but cannot guarantee absolute security of any system. Report suspected
            vulnerabilities to <a href="mailto:saif@sonartracker.io">saif@sonartracker.io</a>.
          </p>
        </Disclaimer>
      </Wrap>
    </Page>
  )
}
