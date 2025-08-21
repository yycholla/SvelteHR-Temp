// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				username: string;
				email?: string;
				first_name?: string;
				last_name?: string;
				full_name?: string;
				roles?: Array<{
					id: string;
					name: string;
					level: number;
					description?: string;
				}>;
				permissions?: string[];
			} | null;
			token?: string | null;
			isAuthenticated: boolean;
			permissions: string[];
			roles: Array<{
				id: string;
				name: string;
				level: number;
				description?: string;
			}>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
