'use client'

import React from 'react'
import styled from 'styled-components'
import PortfolioPanel from '@/components/wallet/PortfolioPanel'

/**
 * Admin-only Personalize workbench. Renders the live PortfolioPanel so we can
 * iterate on the wallet-connect UX in production without exposing the
 * half-finished flow to general users. Gated server-side in page.jsx via
 * isAdmin(user.email).
 */

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
`

const Content = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: 5rem 1.5rem 4rem;
`

const AdminBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.32);
  background: rgba(245, 158, 11, 0.08);
  color: #fcd34d;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
  span.tag {
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  span.email { color: #fde68a; }
`

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  color: #e6edf7;
  margin: 0 0 0.5rem;
`

const Sub = styled.p`
  color: #94a3b8;
  font-size: 0.98rem;
  margin: 0 0 2rem;
`

export default function PersonalizeAdmin({ email }) {
  return (
    <Page>
      <Content>
        <AdminBanner>
          <span><span className="tag">Admin preview</span> &nbsp; live wallet personalization workbench</span>
          <span className="email">{email}</span>
        </AdminBanner>
        <Title>Personalize</Title>
        <Sub>
          Internal build. Use this page to iterate on the connect-wallet flow
          and the personalized portfolio panel before exposing it to users.
        </Sub>
        <PortfolioPanel />
      </Content>
    </Page>
  )
}
