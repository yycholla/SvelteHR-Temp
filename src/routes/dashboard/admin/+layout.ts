import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth';
import type { LayoutLoad } from './$types';

export const ssr = false; // Disable SSR for admin routes since they require auth

export const load: LayoutLoad = async ({ parent }) => {
	console.log('Admin layout load: Skipping auth check - delegating to AuthGuard');

	// Let the AuthGuard handle all authentication logic
	// This eliminates potential race conditions in the load function
	return {};
};
