'use client'

import React from 'react'
import { SessionProviders } from './session-provider'
import { NotificationProvider } from '../notifications/notification-provider'

export { SessionProviders } from './session-provider'
export { NotificationProvider } from '../notifications/notification-provider'

// Combined provider component
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviders>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProviders>
  )
}