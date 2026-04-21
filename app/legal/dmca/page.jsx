import React from 'react'

export const metadata = {
  title: 'DMCA / Copyright Notice & Counter-Notice | Sonar Tracker',
  description:
    'How to submit a DMCA takedown notice or counter-notice for content on Sonar Tracker. Designated agent details and procedural requirements under 17 U.S.C. § 512.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.sonartracker.io/legal/dmca' },
}

export default function DmcaPage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '7rem 1.5rem 4rem', color: '#e0e6ed', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.65 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>DMCA / Copyright Notice &amp; Counter-Notice</h1>
      <p style={{ color: '#8a9bb0', marginBottom: '2rem' }}>
        Sonar Tracker respects the intellectual property rights of others
        and complies with the safe-harbour provisions of the United States
        Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512, the EU
        Copyright Directive (Directive (EU) 2019/790) and the equivalent
        United Kingdom regime.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>1. Submitting a Takedown Notice</h2>
      <p>
        If you believe that material on www.sonartracker.io infringes a
        copyright that you own or control, send a written notice to our
        designated agent that includes <strong>all</strong> of the following
        (a notice missing any of these elements may not give rise to a
        valid takedown obligation under 17 U.S.C. § 512(c)(3)):
      </p>
      <ol>
        <li>A physical or electronic signature of the copyright owner or a person authorised to act on their behalf.</li>
        <li>Identification of the copyrighted work claimed to have been infringed (or, for multiple works on a single site, a representative list).</li>
        <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate it (please include the full URL).</li>
        <li>Information reasonably sufficient to permit us to contact you: postal address, telephone number and email address.</li>
        <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorised by the copyright owner, its agent or the law.</li>
        <li>A statement that the information in the notice is accurate, and <strong>under penalty of perjury</strong>, that you are authorised to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
      </ol>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>2. Designated Agent</h2>
      <p>
        Send notices to our designated agent. Notices submitted to any other
        address may not be processed.
      </p>
      <p style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', padding: '1rem', borderRadius: 8 }}>
        <strong>DMCA Designated Agent</strong><br />
        Eduardo Morales, Founder<br />
        SonarTracker (United Kingdom)<br />
        Postcode: SE16 3TY<br />
        Email: <a href="mailto:dmca@sonartracker.io" style={{ color: '#00e5ff' }}>dmca@sonartracker.io</a>
      </p>
      <p style={{ fontSize: '0.85rem', color: '#8a9bb0' }}>
        SonarTracker is a United Kingdom-based service and is not
        established in the United States. The above agent has not yet
        been registered with the US Copyright Office&apos;s DMCA Designated
        Agent Directory. We honour properly-formed takedown notices on a
        voluntary basis as a matter of good faith and in line with our
        obligations under the UK Copyright, Designs and Patents Act 1988
        and Article 17 of the EU Copyright Directive (Directive (EU)
        2019/790). Until US-Copyright-Office registration is in place, the
        statutory § 512(c) safe harbour may not be available to us in US
        courts; the email address above is the operative point of contact
        for all notices.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>3. What Happens Next</h2>
      <ol>
        <li>We acknowledge receipt of compliant notices within 5 business days.</li>
        <li>Where the notice is facially valid, we expeditiously remove or disable access to the material and notify any account that posted it.</li>
        <li>We forward a copy of the notice to the affected user, redacting your direct contact details only on request.</li>
        <li>Repeat infringers will have their accounts terminated under our repeat-infringer policy.</li>
      </ol>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>4. Counter-Notice (17 U.S.C. § 512(g))</h2>
      <p>
        If you believe material was removed in error, you may submit a
        counter-notice to our designated agent containing all of:
      </p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material that has been removed and the location at which the material appeared before it was removed.</li>
        <li>A statement <strong>under penalty of perjury</strong> that you have a good-faith belief that the material was removed as a result of mistake or misidentification.</li>
        <li>Your name, postal address, telephone number and email address; and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or, if outside the US, the courts of England and Wales) and that you will accept service of process from the original complainant or their agent.</li>
      </ol>
      <p>
        We will forward the counter-notice to the original complainant. If
        we do not receive notice that the complainant has filed an action
        seeking a court order against you within 10 to 14 business days, we
        may, in our discretion, restore the removed material.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>5. Misrepresentations</h2>
      <p>
        Any person who knowingly materially misrepresents either that
        material is infringing, or that material was removed by mistake or
        misidentification, may be liable for damages under 17 U.S.C. §
        512(f), including costs and reasonable legal fees incurred by the
        alleged infringer, by any copyright owner or its licensee, and by
        Sonar Tracker.
      </p>

      <h2 style={{ fontSize: '1.2rem', marginTop: '2rem' }}>6. Trademark, Right of Publicity and Other Claims</h2>
      <p>
        For trademark complaints, right-of-publicity / personality-rights
        complaints, defamation complaints or any other non-copyright
        intellectual-property complaint, please use the{' '}
        <a href="/legal/data-removal-request" style={{ color: '#00e5ff' }}>Data Removal Request</a>{' '}
        process. We will route the request to our legal team and aim to
        respond within 30 days.
      </p>

      <p style={{ fontSize: '0.8rem', color: '#8a9bb0', marginTop: '3rem' }}>
        Last updated: 21 April 2026.
      </p>
    </main>
  )
}
