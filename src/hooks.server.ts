import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

// Routes that don't require authentication
const publicRoutes = [
  '/login', 
  '/login-simple', 
  '/login-working',
  '/privacy', 
  '/terms',
  '/api'
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
}

export const handle: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event;
  
  // Get JWT token from cookies (this is what the frontend auth system uses)
  const token = cookies.get('hr_token') || cookies.get('auth-token');
  
  // Initialize locals with RBAC properties
  event.locals.user = null;
  event.locals.isAuthenticated = false;
  event.locals.permissions = [];
  event.locals.roles = [];
  
  if (token) {
    try {
      // Verify JWT token with backend using the RBAC endpoint
      const response = await fetch(`${PUBLIC_API_URL || 'http://localhost:8080/api/v2'}/auth/rbac/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        event.locals.user = userData.user;
        event.locals.isAuthenticated = true;
        event.locals.permissions = userData.permissions || [];
        event.locals.roles = userData.roles || [];
      } else {
        // Token is invalid, clear it
        cookies.delete('hr_token', { path: '/' });
        cookies.delete('auth-token', { path: '/' });
      }
    } catch (error) {
      console.error('SSR auth verification failed:', error);
      // Clear invalid tokens
      cookies.delete('hr_token', { path: '/' });
      cookies.delete('auth-token', { path: '/' });
    }
  }
  
  // Check if route requires authentication
  if (!isPublicRoute(url.pathname) && !event.locals.isAuthenticated) {
    // Redirect to login with return path
    const redirectTo = url.pathname + url.search;
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  
  return resolve(event);
};