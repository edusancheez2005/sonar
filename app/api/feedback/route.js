import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function POST(req) {
  try {
    const { name, email, message } = await req.json()

    const cleanName = name?.trim()
    const cleanEmail = email?.trim().toLowerCase()
    const cleanMessage = message?.trim()

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

    const { error: dbError } = await supabaseAdmin
      .from('feedback_submissions')
      .insert({
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
        user_agent: userAgent,
        ip_address: ipHeader,
        source: 'widget'
      })

    if (dbError) {
      console.error('Failed to store feedback:', dbError)
    }

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
      replyTo: cleanEmail,
      subject: '[Sonar Feedback] New visitor feedback received',
      html: `
        <h2>New Feedback Submission</h2>
        <p><strong>Name:</strong> ${cleanName}</p>
        <p><strong>Email:</strong> ${cleanEmail}</p>
        <p style="margin-top: 1rem;"><strong>Feedback:</strong></p>
        <p style="white-space: pre-wrap; font-size: 15px;">${cleanMessage}</p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback submission failed:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again later.' },
      { status: 500 }
    )
  }
}


