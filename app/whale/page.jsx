import { redirect } from 'next/navigation'

// Live feed retired as the default entry — send /whale to the Research hub.
export default function WhaleIndexRedirect() {
  redirect('/wallet-tracker')
}
