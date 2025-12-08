'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useWebSocket } from '@/lib/websocket/client'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // WebSocket integration for real-time notifications
  useWebSocket({
    onMessage: useCallback((message: any) => {
      switch (message.type) {
        case 'new_message':
          addNotification({
            type: 'info',
            title: 'New Message',
            message: `New message from ${message.data?.userName || 'Unknown'}`,
            data: message.data,
          })
          break

        case 'conversation_assigned':
          addNotification({
            type: 'info',
            title: 'Conversation Assigned',
            message: `You have been assigned to a new conversation`,
            data: message.data,
          })
          break

        case 'automation_executed':
          addNotification({
            type: 'success',
            title: 'Automation Executed',
            message: `Rule "${message.data?.ruleName}" was executed successfully`,
            data: message.data,
          })
          break

        case 'system_alert':
          addNotification({
            type: message.data?.severity || 'warning',
            title: message.data?.title || 'System Alert',
            message: message.data?.message || 'A system event occurred',
            data: message.data,
          })
          break
      }
    }, []),
  })

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    }

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep only last 50

    // Show toast notification
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, { description: notification.message })
        break
      case 'error':
        toast.error(notification.title, { description: notification.message })
        break
      case 'warning':
        toast.warning(notification.title, { description: notification.message })
        break
      default:
        toast.info(notification.title, { description: notification.message })
    }
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addNotification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}