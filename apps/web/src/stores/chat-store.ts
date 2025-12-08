import { create } from 'zustand'
import { Message, Conversation } from '@/db'

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  unreadCount: number

  // Actions
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  addConversation: (conversation: Conversation) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setLoading: (loading: boolean) => void
  setTyping: (typing: boolean) => void
  incrementUnreadCount: () => void
  clearUnreadCount: () => void
  markMessagesAsRead: (conversationId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  unreadCount: 0,

  setConversations: (conversations) => set({ conversations }),

  setCurrentConversation: (conversation) => {
    set({
      currentConversation: conversation,
      messages: conversation ? [] : [] // Clear messages when switching conversations
    })
  },

  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    // Update conversation's last message time
    currentConversation: state.currentConversation
      ? { ...state.currentConversation, lastMessageAt: new Date() }
      : state.currentConversation,
    // Move conversation to top if it exists
    conversations: state.conversations.map(conv =>
      conv.id === message.conversationId
        ? { ...conv, lastMessageAt: new Date(), updatedAt: new Date() }
        : conv
    ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
  })),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    )
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setTyping: (isTyping) => set({ isTyping }),

  incrementUnreadCount: () => set((state) => ({
    unreadCount: state.unreadCount + 1
  })),

  clearUnreadCount: () => set({ unreadCount: 0 }),

  markMessagesAsRead: (conversationId) => {
    const state = get()
    const updatedMessages = state.messages.map(msg =>
      msg.conversationId === conversationId && msg.direction === 'inbound' && msg.status !== 'read'
        ? { ...msg, status: 'read' as const, readAt: new Date() }
        : msg
    )
    set({ messages: updatedMessages })
  },
}))