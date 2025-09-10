import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	const { id } = params;
	const token = cookies.get('hr_token');

	if (!token) {
		throw redirect(303, '/login');
	}

	console.log(`🔍 GraphQL Employee ${id} page load - Token present:`, !!token);
	console.log(`🔍 GraphQL Employee ${id} page load - User authenticated:`, !!locals.user);

	try {
		// Create GraphQL client with server-side authentication
		const graphqlClient = createServerClient(token);

		// Verify authentication first
		const authResponse = await graphqlClient.query(queries.auth.me);
		
		if (!authResponse.data?.me?.authenticated) {
			throw redirect(303, '/login');
		}

		const user = authResponse.data.me.user;
		const permissions = authResponse.data.me.permissions || [];

		console.log(`🔍 Fetching employee ${id} from GraphQL API...`);

		// Fetch employee data via GraphQL
		const employeeResponse = await graphqlClient.query(
			queries.employees.employee,
			{ id }
		);

		if (!employeeResponse.data?.employee) {
			throw error(404, {
				message: `Employee with ID ${id} not found`
			});
		}

		const employee = employeeResponse.data.employee;

		console.log(`✅ Employee ${id} fetched from GraphQL API`);
		console.log('🔍 GraphQL Employee data:', JSON.stringify(employee, null, 2));

		return {
			employee,
			user,
			permissions,
			isUsingGraphQL: true
		};

	} catch (err: any) {
		console.error(`❌ Failed to fetch employee ${id} via GraphQL:`, err);

		// Handle specific GraphQL errors
		if (err.message?.includes('not found')) {
			throw error(404, {
				message: `Employee with ID ${id} not found`
			});
		}

		if (err.message?.includes('auth')) {
			throw redirect(303, '/login');
		}

		throw error(500, {
			message: `Failed to load employee data: ${err.message}`
		});
	}
};
