/**
 * Chat Sessions API
 * GET: Fetch all chat sessions for the logged-in user
 * Each session is grouped by session_id with first/last message preview
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all chat history for this user, ordered by timestamp
    const { data: chats, error } = await supabase
      .from('chat_history')
      .select('id, session_id, user_message, orca_response, tickers_mentioned, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching chat sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Group by session_id
    const sessionMap = new Map<string, any>()

    for (const chat of (chats || [])) {
      const sid = chat.session_id || chat.id?.toString() || 'unknown'
      if (!sessionMap.has(sid)) {
        // Extract first 80 chars of orca response as preview, strip markdown
        const rawPreview = (chat.orca_response || '').replace(/[#*_`>\[\]()]/g, '').trim()
        sessionMap.set(sid, {
          session_id: sid,
          title: chat.tickers_mentioned?.[0]
            ? `${chat.tickers_mentioned[0]} Analysis`
            : chat.user_message?.substring(0, 50) || 'Chat',
          preview: rawPreview.substring(0, 80) || null,
          first_message: chat.user_message,
          ticker: chat.tickers_mentioned?.[0] || null,
          last_activity: chat.timestamp,
          message_count: 0,
        })
      }
      sessionMap.get(sid).message_count++
    }

    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
      .slice(0, 50) // Max 50 sessions in sidebar

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error in sessions endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
