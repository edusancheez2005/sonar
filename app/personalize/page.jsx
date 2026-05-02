import { supabaseServer } from '@/app/lib/supabaseServerClient'
import { isAdmin } from '@/app/lib/adminConfig'
import PersonalizePreview from './PersonalizePreview'
import PersonalizeAdmin from './PersonalizeAdmin'

export const metadata = {
  title: 'Personalize | Sonar Tracker',
  description:
    'Connect your wallet to tailor Sonar around the assets you actually hold. ' +
    'See whale flow, signals and sentiment for your tokens first.',
  robots: { index: false, follow: false },
}

export default async function PersonalizePage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = isAdmin(user?.email)

  if (admin) {
    return <PersonalizeAdmin email={user.email} />
  }
  return <PersonalizePreview />
}
