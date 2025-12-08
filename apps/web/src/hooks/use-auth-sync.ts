"use client"

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores'

export const useAuthSync = () => {
  const { data: session, status } = useSession()
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true)
    } else {
      setLoading(false)
    }

    if (session) {
      setSession(session)
    } else if (status === 'unauthenticated') {
      setSession(null)
    }
  }, [session, status, setSession, setLoading])

  return { session, status }
}