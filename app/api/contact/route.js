import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    )

    // Store the message in Supabase
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        category: category || 'general',
        message,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      // If table doesn't exist, create it on the fly isn't possible,
      // so fall back to logging
      if (insertError.code === '42P01') {
        // Table doesn't exist — just log and return success so user isn't blocked
        console.log('=== NEW CONTACT MESSAGE ===')
        console.log(`From: ${name} <${email}>`)
        console.log(`Category: ${category} | Subject: ${subject}`)
        console.log(`Message: ${message}`)
        console.log('===========================')
        return NextResponse.json({
          success: true,
          message: 'Message received! We will get back to you soon.'
        })
      }
      throw insertError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully! We will get back to you within 24-48 hours.' 
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later or email us directly at eduardo@sonartracker.io' },
      { status: 500 }
    )
  }
}
