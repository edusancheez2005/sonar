// Email utility for Sonar Tracker
// Configure your preferred email service here

export async function sendWelcomeEmail(email, name = '') {
  // This is a placeholder - integrate with your preferred email service
  console.log(`📧 Sending welcome email to: ${email}`)

  // Example implementations:

  // 1. SendGrid
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({
  //   to: email,
  //   from: 'welcome@sonartracker.io',
  //   subject: 'Welcome to Sonar Tracker!',
  //   html: getWelcomeEmailHTML(email, name)
  // })

  // 2. Resend
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'welcome@sonartracker.io',
  //   to: email,
  //   subject: 'Welcome to Sonar Tracker!',
  //   html: getWelcomeEmailHTML(email, name)
  // })

  return true
}

export async function sendWaitlistConfirmation(email) {
  console.log(`📧 Sending Orca waitlist confirmation to: ${email}`)

  // Placeholder for waitlist confirmation email
  // Integrate with your email service here

  return true
}

function getWelcomeEmailHTML(email, name = '') {
  const displayName = name || email.split('@')[0]

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Sonar Tracker</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #3498db, #2c3e50); padding: 40px 30px; text-align: center; }
          .logo { width: 80px; height: auto; margin-bottom: 20px; }
          .content { padding: 40px 30px; color: #333; line-height: 1.6; }
          .button { display: inline-block; background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
          .highlight { background: rgba(52, 152, 219, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://sonartracker.io/assets/logo2.png" alt="Sonar Logo" class="logo">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Sonar Tracker!</h1>
          </div>

          <div class="content">
            <h2>Hi ${displayName},</h2>

            <p>Welcome to Sonar Tracker! 🎉 You're now part of our community of traders and investors who rely on real-time whale transaction monitoring and market intelligence.</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #3498db;">What you can do now:</h3>
              <ul>
                <li>Monitor whale transactions in real-time</li>
                <li>Access advanced market analytics</li>
                <li>Track institutional trading patterns</li>
                <li>Get insights from our AI-powered analysis</li>
              </ul>
            </div>

            <p>Ready to dive into the world of cryptocurrency intelligence?</p>

            <a href="https://sonartracker.io/dashboard" class="button">Access Your Dashboard →</a>

            <p style="margin-top: 30px; font-size: 16px;">
              <strong>Questions?</strong> Reach out to us at <a href="mailto:support@sonartracker.io">support@sonartracker.io</a>
            </p>
          </div>

          <div class="footer">
            <p>© 2024 Sonar Tracker. All rights reserved.</p>
            <p>This email was sent to ${email}. If you didn't create this account, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function getWaitlistEmailHTML(email) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're on the Orca Waitlist!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #9b59b6, #3498db); padding: 40px 30px; text-align: center; }
          .logo { width: 80px; height: auto; margin-bottom: 20px; }
          .content { padding: 40px 30px; color: #333; line-height: 1.6; }
          .highlight { background: rgba(155, 89, 182, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://sonartracker.io/assets/logo2.png" alt="Sonar Logo" class="logo">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're on the Orca Waitlist! 🐋</h1>
          </div>

          <div class="content">
            <h2>Thanks for joining the Orca revolution!</h2>

            <p>You've successfully subscribed to our Orca AI waitlist. Be among the first to experience the next generation of cryptocurrency intelligence powered by advanced AI.</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #9b59b6;">What to expect:</h3>
              <ul>
                <li>Early access to Orca AI features</li>
                <li>Exclusive beta testing opportunities</li>
                <li>Direct communication from our team</li>
                <li>Priority support and feature requests</li>
              </ul>
            </div>

            <p>We'll notify you as soon as Orca is ready for your early access. In the meantime, feel free to explore our current dashboard and analytics tools.</p>

            <p style="margin-top: 30px; font-size: 16px;">
              <strong>Stay connected!</strong> Follow us for updates and be the first to know when Orca launches.
            </p>
          </div>

          <div class="footer">
            <p>© 2024 Sonar Tracker. All rights reserved.</p>
            <p>This email was sent to ${email}. You can unsubscribe at any time.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
