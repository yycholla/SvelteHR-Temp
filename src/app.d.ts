// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				username: string;
				email: string;
				first_name: string;
				last_name: string;
				full_name: string;
				department_id?: string;
				hire_date?: string;
				job_title?: string;
				status?: string;
				termination_date?: string;
				created_at: string;
				updated_at: string;
			} | null;
			token?: string | null;
			isAuthenticated: boolean;
			permissions: string[];
			roles: Array<{
				id: string;
				name: string;
				description?: string;
				permissions?: Array<{
					id: string;
					name: string;
					description?: string;
				}>;
			}>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
