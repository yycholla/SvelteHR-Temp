/**
 * Login API Endpoint - Direct EdgeQL Authentication
 * Handles user login using EdgeQL queries instead of GraphQL
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/auth/service';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const authResult = await authService.authenticate(email, password);

    if (!authResult) {
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Set httpOnly cookie with auth token
    cookies.set('auth-token', authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15 // 15 minutes
    });

    return json({
      success: true,
      user: authResult.user,
      expiresAt: authResult.expiresAt
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};