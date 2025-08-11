import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseServer = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbwfvqzomipoftgodof.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YndmdnF6b21pcG9mdGdvZG9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzkyNzczMywiZXhwIjoyMDYzNTAzNzMzfQ.L2e_VICxQ_aumt8KmvJaClwK4W2rQLA1QZ3EfvdVYXM'
  return createClient(url, key, { auth: { persistSession: false } })
} 