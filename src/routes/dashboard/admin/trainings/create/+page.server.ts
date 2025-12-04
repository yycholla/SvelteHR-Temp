import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { CREATE_TRAINING_MUTATION } from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {
		permissionAny: ['training:write', 'training:assign']
	});
	return {
		meta: {
			title: 'Create Training Module'
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const startDate = formData.get('startDate')?.toString();
		const endDate = formData.get('endDate')?.toString();
		const isActive = formData.get('isActive') === 'on';

		// New fields
		const metaTitle = formData.get('metaTitle')?.toString().trim();
		const metaDescription = formData.get('metaDescription')?.toString().trim();
		const tagsJson = formData.get('tags')?.toString();
		const authorId = formData.get('authorId')?.toString();
		const recurrencePatternJson = formData.get('recurrencePattern')?.toString();

		let tags: string[] = [];
		try {
			if (tagsJson) {
				tags = JSON.parse(tagsJson);
			}
		} catch (e) {
			console.error('Failed to parse tags:', e);
		}

		// Parse recurrence pattern
		let rrule: string | null = null;
		let recurrenceEndDate: string | null = null;
		try {
			if (recurrencePatternJson && recurrencePatternJson !== 'null') {
				const pattern = JSON.parse(recurrencePatternJson);
				if (pattern?.rruleString) {
					rrule = pattern.rruleString;
					if (pattern.endDate) {
						recurrenceEndDate = new Date(pattern.endDate).toISOString();
					}
				}
			}
		} catch (e) {
			console.error('Failed to parse recurrence pattern:', e);
		}

		if (!title) {
			return fail(400, {
				error: 'Title is required',
				values: { title, description, startDate, endDate, isActive, metaTitle, metaDescription }
			});
		}

		const client = GraphQLClient.fromCookies(cookies);

		// Format dates to ISO strings if present
		const isoStartDate = startDate ? new Date(startDate).toISOString() : null;
		const isoEndDate = endDate ? new Date(endDate).toISOString() : null;

		const variables = {
			input: {
				title,
				description: description || null,
				startDate: isoStartDate,
				endDate: isoEndDate,
				isActive,
				metaTitle: metaTitle || null,
				metaDescription: metaDescription || null,
				tags: tags.length > 0 ? tags : null,
				// authorId: authorId || null // TODO: Enable when backend supports User ID resolution or passed from frontend
				rrule: rrule,
				recurrenceEndDate: recurrenceEndDate
			}
		};

		try {
			const response = await client.mutation(CREATE_TRAINING_MUTATION, variables);

			console.log('=== MUTATION RESPONSE ===');
			console.log('Full response:', JSON.stringify(response, null, 2));
			console.log('response.data:', response.data);
			console.log('response.data?.training:', response.data?.training);
			console.log(
				'response.data?.training?.createTraining:',
				response.data?.training?.createTraining
			);
			console.log('=========================');

			if (response.errors) {
				console.error('Training creation errors:', response.errors);
				return fail(500, {
					error: response.errors[0].message,
					values: { title, description, startDate, endDate, isActive, metaTitle, metaDescription }
				});
			}

			const newTrainingId = response.data?.training?.createTraining?.id;
			console.log('Extracted newTrainingId:', newTrainingId);

			if (newTrainingId) {
				console.log('Redirecting to:', `/dashboard/admin/trainings/${newTrainingId}/content`);
				// Redirect to the content builder for this new training
				throw redirect(303, `/dashboard/admin/trainings/${newTrainingId}/content`);
			} else {
				console.error('newTrainingId is falsy! Falling through to default redirect.');
			}
		} catch (err) {
			// Re-throw redirects (these are successful responses, not errors)
			// SvelteKit redirects have a status property in the 3xx range
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			console.error('Training creation error:', err);
			return fail(500, {
				error: 'Internal server error',
				values: { title, description, startDate, endDate, isActive, metaTitle, metaDescription }
			});
		}

		throw redirect(303, '/dashboard/admin/trainings');
	}
};
