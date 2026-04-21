import React from 'react'
import DataRemovalForm from './DataRemovalForm'

export const metadata = {
  title: 'Data Removal Request | Sonar Tracker',
  description:
    'Submit a request to have personal data, an entity profile, a wallet-to-person mapping, or a photograph removed from Sonar Tracker. Required by UK GDPR Art. 17 / CCPA §1798.105 / right of publicity.',
  robots: { index: true, follow: false, nocache: true },
  alternates: { canonical: 'https://www.sonartracker.io/legal/data-removal-request' },
}

export default function DataRemovalRequestPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '7rem 1.5rem 4rem', color: '#e0e6ed', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Data Removal Request</h1>
      <p style={{ color: '#8a9bb0', marginBottom: '2rem' }}>
        Use this page to request removal of personal data, an entity profile, a
        wallet-to-person mapping, or a photograph from Sonar Tracker. We
        process requests under the UK GDPR (Article 17, Right to Erasure), the
        EU GDPR (Article 17), the California Consumer Privacy Act (§1798.105),
        and applicable right-of-publicity statutes. We aim to respond within
        30 days of receiving a verifiable request.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>Who can submit</h2>
      <ul>
        <li>The natural person whose personal data appears on Sonar.</li>
        <li>An authorised representative or guardian acting on their behalf.</li>
        <li>A legal entity whose registered trademark or copyrighted work appears without licence.</li>
      </ul>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>How we handle your request</h2>
      <ol>
        <li>Acknowledge receipt within 5 business days at the email you provide.</li>
        <li>Verify your identity / authority to submit the request, proportionate to its sensitivity.</li>
        <li>Where the request is valid, remove the data from the live product, our search index, and any caches we control, and request de-indexing from Google and Bing.</li>
        <li>Where we cannot remove the data (for example a legal obligation to retain), explain why in writing within 30 days.</li>
        <li>Log the request and our response in our regulatory record under UK GDPR Art. 30.</li>
      </ol>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>Submit a request</h2>
      <DataRemovalForm />

      <h2 style={{ fontSize: '1.2rem', marginTop: '3rem' }}>Prefer email?</h2>
      <p>
        You may also email{' '}
        <a href="mailto:privacy@sonartracker.io" style={{ color: '#00e5ff' }}>privacy@sonartracker.io</a>{' '}
        with the subject line <strong>"Data Removal Request"</strong> and the
        same information requested in the form above.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>Right to complain</h2>
      <p>
        If you are not satisfied with our response, you may complain to your
        local data protection authority. UK residents may complain to the
        Information Commissioner&apos;s Office (ICO) at{' '}
        <a href="https://ico.org.uk/make-a-complaint/" style={{ color: '#00e5ff' }}>ico.org.uk/make-a-complaint</a>.
        EU residents may complain to the supervisory authority in their
        member state. California residents may complain to the California
        Privacy Protection Agency.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>Postal address</h2>
      <p style={{ color: '#8a9bb0' }}>
        SonarTracker (United Kingdom)<br />
        Postcode: SE16 3TY
      </p>

      <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
        For copyright / DMCA-specific notices, please use the dedicated{' '}
        <a href="/legal/dmca" style={{ color: '#00e5ff' }}>DMCA</a> process.
      </p>
    </main>
  )
}
