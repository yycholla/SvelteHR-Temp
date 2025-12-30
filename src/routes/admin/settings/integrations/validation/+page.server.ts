import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const VALIDATION_QUERY = `
	query GetValidationData($entityType: String, $enabled: Boolean, $includeResolved: Boolean) {
		validation {
			validationRules(entityType: $entityType, enabled: $enabled) {
				id
				name
				description
				entityType
				fieldName
				ruleType
				condition
				severity
				autoFixStrategy
				enabled
				createdAt
			}
			validationFailures(entityType: $entityType, includeResolved: $includeResolved, limit: 100) {
				id
				ruleId
				entityType
				entityId
				fieldName
				invalidValue
				errorMessage
				severity
				detectedAt
				resolvedAt
				resolution
			}
			validationFailuresSummary(entityType: $entityType) {
				total
				errorCount
				warningCount
				infoCount
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:validation');

	const entityType = url.searchParams.get('entityType');
	const enabled = url.searchParams.get('enabled');
	const includeResolved = url.searchParams.get('includeResolved') === 'true';

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client
			.query(VALIDATION_QUERY, {
				entityType: entityType || null,
				enabled: enabled === 'true' ? true : enabled === 'false' ? false : null,
				includeResolved
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch validation data:', result.error);
			return {
				rules: [],
				failures: [],
				summary: null,
				error: 'Failed to load validation data'
			};
		}

		const validation = result.data?.validation;

		return {
			rules: validation?.validationRules || [],
			failures: validation?.validationFailures || [],
			summary: validation?.validationFailuresSummary || null,
			filters: { entityType, enabled, includeResolved }
		};
	} catch (error) {
		console.error('Error loading validation data:', error);
		return {
			rules: [],
			failures: [],
			summary: null,
			error: 'Failed to load validation data'
		};
	}
};
