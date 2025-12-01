// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			required?: string;
			current?: string;
		}
		interface Locals {
			user?: {
				id: string;
				email: string;
				display_name?: string;
				role?: string;
			};
			permissions?: string[];
			roles?: string[];
			requestId?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
