import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { name, email, subject, category, message } = await req.json()

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // sonartracker@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password
      }
    })

    // Email to Sonar Tracker
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: 'sonartracker@gmail.com',
      replyTo: email,
      subject: `[Sonar Contact] ${category.toUpperCase()}: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9f9f9;
              border: 1px solid #ddd;
              border-top: none;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .field {
              margin-bottom: 20px;
            }
            .label {
              font-weight: 600;
              color: #36a6ba;
              display: block;
              margin-bottom: 5px;
            }
            .value {
              color: #333;
              padding: 10px;
              background: white;
              border-left: 3px solid #36a6ba;
              border-radius: 4px;
            }
            .category-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              background: #2ecc71;
              color: white;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🐋 Sonar Tracker</h1>
            <p style="margin: 5px 0 0 0;">New Contact Form Submission</p>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Category:</span>
              <div class="value">
                <span class="category-badge">${category}</span>
              </div>
            </div>
            <div class="field">
              <span class="label">From:</span>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="field">
              <span class="label">Subject:</span>
              <div class="value">${subject}</div>
            </div>
            <div class="field">
              <span class="label">Message:</span>
              <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
            <div class="footer">
              <p>This message was sent via the Sonar Tracker contact form.</p>
              <p>Reply directly to this email to respond to ${name}.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // Send email
    await transporter.sendMail(mailOptions)

    // Optional: Send confirmation email to user
    const confirmationOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'We received your message - Sonar Tracker',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9f9f9;
              border: 1px solid #ddd;
              border-top: none;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🐋 Sonar Tracker</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for contacting us!</p>
          </div>
          <div class="content">
            <h2 style="color: #36a6ba; margin-top: 0;">Hi ${name},</h2>
            <p>Thank you for reaching out to Sonar Tracker! We've received your message and our team will review it shortly.</p>
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our support team will review your inquiry</li>
              <li>You'll receive a response within 24-48 hours</li>
              <li>For urgent matters, we prioritize based on category</li>
            </ul>
            <p>In the meantime, you can:</p>
            <ul>
              <li>Check out our <a href="https://www.sonartracker.io/faq" style="color: #36a6ba;">FAQ page</a> for instant answers</li>
              <li>Explore the <a href="https://www.sonartracker.io/dashboard" style="color: #36a6ba;">dashboard</a> for real-time whale activity</li>
              <li>Try our AI advisor <a href="https://www.sonartracker.io/ai-advisor" style="color: #36a6ba;">Orca 2.0</a> for market insights</li>
            </ul>
            <center>
              <a href="https://www.sonartracker.io" class="button">Visit Dashboard</a>
            </center>
            <div class="footer">
              <p><strong>Your Inquiry Details:</strong></p>
              <p>Category: ${category} | Subject: ${subject}</p>
              <p style="margin-top: 20px;">If you didn't send this message, please ignore this email.</p>
              <p>© 2025 Sonar Tracker. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    await transporter.sendMail(confirmationOptions)

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully' 
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
}

