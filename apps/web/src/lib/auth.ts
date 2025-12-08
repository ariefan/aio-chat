import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db, operators } from '@/db'
import { eq } from 'drizzle-orm'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find operator by email
          const operator = await db
            .select()
            .from(operators)
            .where(eq(operators.email, credentials.email))
            .limit(1)

          if (!operator[0]) {
            return null
          }

          const operatorData = operator[0]

          // Check if operator is active
          if (!operatorData.isActive) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            operatorData.passwordHash
          )

          if (!isPasswordValid) {
            return null
          }

          // Update last login time
          await db
            .update(operators)
            .set({ lastLoginAt: new Date() })
            .where(eq(operators.id, operatorData.id))

          return {
            id: operatorData.id,
            email: operatorData.email,
            name: operatorData.name,
            role: operatorData.role || 'operator', // Default to operator if null
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }

  interface User {
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}