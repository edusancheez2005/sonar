import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, email, message, feature, screenshot } = body || {}

    const cleanName = name?.trim()
    const cleanEmail = email?.trim().toLowerCase()
    const cleanMessage = message?.trim()
    const cleanFeature = typeof feature === 'string' ? feature.trim().slice(0, 64) : null
    const screenshotMeta =
      screenshot && typeof screenshot === 'object'
        ? {
            name: typeof screenshot.name === 'string' ? screenshot.name.slice(0, 200) : null,
            size: Number.isFinite(screenshot.size) ? screenshot.size : null,
          }
        : null

    if (!cleanName || !cleanMessage || !cleanEmail) {
      return NextResponse.json(
        { error: 'Name, email, and feedback are required.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') || null
    const ipHeader = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    /**
     * `feature` and `screenshot` metadata are appended to the message body
     * so we don't depend on a schema migration for the new fields. If/when
     * `feedback_submissions` adds a `metadata jsonb` column, swap to that.
     */
    const annotatedMessage = [
      cleanFeature ? `Feature: ${cleanFeature}` : null,
      screenshotMeta?.name
        ? `Screenshot: ${screenshotMeta.name} (${Math.round((screenshotMeta.size || 0) / 1024)}KB)`
        : null,
      cleanMessage,
    ]
      .filter(Boolean)
      .join('\n\n')

    const { error: dbError } = await supabaseAdmin
      .from('feedback_submissions')
      .insert({
        name: cleanName,
        email: cleanEmail,
        message: annotatedMessage,
        user_agent: userAgent,
        ip_address: ipHeader,
        source: 'widget'
      })

    if (dbError) {
      console.error('Failed to store feedback:', dbError)
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      })

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: 'eduardo@sonartracker.io',
        cc: '101303qq@gmail.com',
        replyTo: cleanEmail,
        subject: `[Sonar Feedback] ${cleanFeature ? `(${cleanFeature}) ` : ''}New visitor feedback received`,
        html: `
          <h2>New Feedback Submission</h2>
          <p><strong>Name:</strong> ${cleanName}</p>
          <p><strong>Email:</strong> ${cleanEmail}</p>
          ${cleanFeature ? `<p><strong>Feature:</strong> ${cleanFeature}</p>` : ''}
          ${screenshotMeta?.name ? `<p><strong>Screenshot:</strong> ${screenshotMeta.name} (${Math.round((screenshotMeta.size || 0) / 1024)}KB)</p>` : ''}
          <p style="margin-top: 1rem;"><strong>Feedback:</strong></p>
          <p style="white-space: pre-wrap; font-size: 15px;">${cleanMessage}</p>
        `
      })
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback submission failed:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again later.' },
      { status: 500 }
    )
  }
}


