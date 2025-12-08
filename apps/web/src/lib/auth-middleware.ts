import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  (req) => {
    // Get token from request
    const token = req.nextauth.token
    const isAuthenticated = !!token
    const isAdmin = token?.role === 'admin'

    // Public routes that don't require authentication
    const publicRoutes = ['/auth/signin', '/auth/error', '/api/auth']
    const isPublicRoute = publicRoutes.some(route =>
      req.nextUrl.pathname.startsWith(route)
    )

    // API routes that require authentication
    const apiRoutes = ['/api/conversations', '/api/messages', '/api/users', '/api/operators']
    const isApiRoute = apiRoutes.some(route =>
      req.nextUrl.pathname.startsWith(route)
    )

    // Admin-only routes
    const adminRoutes = ['/admin', '/api/admin']
    const isAdminRoute = adminRoutes.some(route =>
      req.nextUrl.pathname.startsWith(route)
    )

    // Check authentication requirements
    if (!isPublicRoute && !isAuthenticated) {
      // Redirect to sign in for protected routes
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Check admin requirements
    if (isAdminRoute && !isAdmin) {
      // Return 403 for unauthorized admin access
      return NextResponse.rewrite(
        new URL('/auth/error?error=AccessDenied', req.url)
      )
    }

    // Add security headers
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const publicRoutes = ['/auth/signin', '/auth/error']
        const isPublicRoute = publicRoutes.some(route =>
          req.nextUrl.pathname.startsWith(route)
        )

        if (isPublicRoute) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}