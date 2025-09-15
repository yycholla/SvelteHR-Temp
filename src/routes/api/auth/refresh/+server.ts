import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Token Refresh API Route
 * Handles access token refresh using httpOnly refresh token
 */

const BACKEND_URL = 'http://localhost:3001';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Get refresh token from httpOnly cookie
    const refreshToken = cookies.get('refreshToken');

    if (!refreshToken) {
      return json(
        { 
          success: false, 
          error: 'Refresh token not found' 
        }, 
        { status: 401 }
      );
    }

    // Forward refresh request to backend
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return json({
        success: true,
        accessToken: data.accessToken,
        expiresIn: data.expiresIn || 900, // 15 minutes default
      });
    } else {
      // Clear invalid refresh token
      cookies.delete('refreshToken', { path: '/' });
      return json(data, { status: response.status });
    }
  } catch (error) {
    console.error('Token refresh API error:', error);
    return json(
      { 
        success: false, 
        error: 'Token refresh service unavailable' 
      }, 
      { status: 500 }
    );
  }
};