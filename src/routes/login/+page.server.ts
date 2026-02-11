/**
 * Login Page Server-Side Handler
 *
 * Demonstrates how AuthService from the hexagonal architecture is used
 * for server-side authentication. Currently, login is handled client-side via
 * the jwt-auth store; this serves as the integration pattern for future
 * server-side auth flows.
 */

import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createAuthService } from '$lib/services/authServiceFactory';

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email: email ?? '' });
		}

		const authService = createAuthService(event);
		const result = await authService.login(email, password);

		if (result.isError) {
			return fail(401, { error: result.error.message, email });
		}

		redirect(303, '/dashboard');
	}
};
