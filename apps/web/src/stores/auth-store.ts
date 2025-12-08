import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Session } from 'next-auth/react'

interface AuthState {
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      isAuthenticated: false,
      setSession: (session) => set({
        session,
        isAuthenticated: !!session?.user
      }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({
        session: null,
        isAuthenticated: false
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for auth
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
)