'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CommunityPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/news') }, [router])
  return null
}

