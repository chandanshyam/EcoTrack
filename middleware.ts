import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated for protected routes
        const { pathname } = req.nextUrl
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/error',
          '/api/auth',
        ]
        
        // Check if the current path is public
        const isPublicRoute = publicRoutes.some(route => 
          pathname.startsWith(route)
        )
        
        // Allow access to public routes
        if (isPublicRoute) {
          return true
        }
        
        // Require authentication for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/history/:path*',
    '/profile/:path*',
    '/api/user/:path*',
  ]
}