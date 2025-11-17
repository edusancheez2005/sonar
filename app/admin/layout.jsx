import { cookies } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/app/lib/adminConfig'

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Redirect if not logged in or not admin
  if (!user || !isAdmin(user.email)) {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}

