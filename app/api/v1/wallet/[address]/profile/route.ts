import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { authenticateApiKey } from '@/app/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,61}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { address } = await params
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_profiles')
    .select('*')
    .eq('address', address)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}
