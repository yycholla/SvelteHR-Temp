<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Helper function to get current user ID from JWT token
	function getCurrentUserIdFromToken(): string | null {
		const token = localStorage.getItem('postgraphile-jwt-token');
		if (!token) return null;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			return payload.user_id || null;
		} catch {
			return null;
		}
	}

	// Redirect to new team URL structure
	onMount(() => {
		const currentUserId = getCurrentUserIdFromToken();
		if (currentUserId) {
			goto(`/dashboard/teams/${currentUserId}`, { replaceState: true });
		} else {
			goto('/login', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Team Performance - HR Dashboard</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		<p class="mt-4 text-muted-foreground">Redirecting to team performance...</p>
	</div>
</div>
