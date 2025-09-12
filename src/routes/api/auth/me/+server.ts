/**
 * Current User API Endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/auth/service';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('auth-token');

  if (!token) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await authService.verifyToken(token);

  if (!user) {
    // Clear invalid token
    cookies.delete('auth-token');
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  return json({ user });
};