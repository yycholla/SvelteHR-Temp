import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Login API Route
 * Proxies login requests to the backend authentication service
 */

const BACKEND_URL = 'http://localhost:3001';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    
    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Set refresh token as httpOnly cookie for security
      if (data.refreshToken) {
        cookies.set('refreshToken', data.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: body.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
          path: '/',
        });
      }

      // Return response without refresh token (it's in httpOnly cookie)
      return json({
        success: true,
        accessToken: data.accessToken,
        user: data.user,
        expiresIn: data.expiresIn,
        sessionId: data.sessionId,
      });
    }

    return json(data, { status: response.status });
  } catch (error) {
    console.error('Login API error:', error);
    return json(
      { 
        success: false, 
        error: 'Authentication service unavailable' 
      }, 
      { status: 500 }
    );
  }
};