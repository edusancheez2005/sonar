import { redirect } from 'next/navigation'
import { supabaseServer } from '@/app/lib/supabaseServerClient'
import { isAdmin } from '@/app/lib/adminConfig'

export default async function AdminLayout({ children }) {
  const supabase = supabaseServer()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Redirect if not logged in or not admin
  if (!user || !isAdmin(user.email)) {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}

