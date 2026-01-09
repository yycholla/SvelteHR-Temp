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
				displayName?: string;
				role?: string;
				first_name?: string;
				last_name?: string;
				firstName?: string;
				lastName?: string;
				department_id?: string;
				departmentId?: string;
				department_name?: string;
				departmentName?: string;
				full_name?: string;
				fullName?: string;
				job_title?: string;
				jobTitle?: string;
				username?: string;
				profile_image?: string;
				profileImage?: string;
				job_information?: {
					department?: {
						name?: string;
					};
				};
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
