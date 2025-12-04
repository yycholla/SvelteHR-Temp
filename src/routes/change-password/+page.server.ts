// Server-side password change handling
// Requires authentication and handles force_password_change flag

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check if user is authenticated
	if (!locals.user) {
		// Redirect to login with return path
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const required = url.searchParams.get('required') === 'true';

	return {
		user: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || ''
		},
		forcePasswordChange: required
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;

		// Check authentication
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		try {
			const formData = await request.formData();
			const currentPassword = formData.get('currentPassword') as string;
			const newPassword = formData.get('newPassword') as string;
			const confirmPassword = formData.get('confirmPassword') as string;

			// Validation
			if (!currentPassword) {
				return fail(400, {
					error: 'Current password is required',
					success: false
				});
			}

			if (!newPassword || newPassword.length < 8) {
				return fail(400, {
					error: 'New password must be at least 8 characters',
					success: false
				});
			}

			if (newPassword !== confirmPassword) {
				return fail(400, {
					error: 'New password and confirmation do not match',
					success: false
				});
			}

			// Make GraphQL mutation to Rust backend
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const cookieHeader = event.request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				Cookie: cookieHeader
			};

			console.log('[Change Password] Submitting password change for user:', locals.user.email);

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
							users {
								changePassword(
									currentPassword: $currentPassword
									newPassword: $newPassword
								) {
									success
									message
								}
							}
						}
					`,
					variables: {
						currentPassword,
						newPassword
					}
				})
			});

			if (!response.ok) {
				console.error('[Change Password] GraphQL request failed:', response.statusText);
				return fail(500, {
					error: `Password change failed: ${response.statusText}`,
					success: false
				});
			}

			const result = await response.json();

			if (result.errors && result.errors.length > 0) {
				console.error('[Change Password] GraphQL errors:', result.errors);
				const errorMessage = result.errors[0]?.message || 'Password change failed';
				return fail(400, {
					error: errorMessage,
					success: false
				});
			}

			const changePasswordResult = result.data?.users?.changePassword;

			if (!changePasswordResult || !changePasswordResult.success) {
				return fail(400, {
					error: changePasswordResult?.message || 'Password change failed',
					success: false
				});
			}

			console.log('[Change Password] Password changed successfully for user:', locals.user.email);

			// Redirect to dashboard after successful password change
			throw redirect(303, '/dashboard');
		} catch (err: any) {
			// If it's a redirect, let it through
			if (err.status === 303) {
				throw err;
			}

			console.error('[Change Password] Error during password change:', err);
			return fail(500, {
				error: err.message || 'An unexpected error occurred',
				success: false
			});
		}
	}
};
