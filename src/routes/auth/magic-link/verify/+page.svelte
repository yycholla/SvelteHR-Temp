<script lang="ts">
	import { onMount } from 'svelte';

	// This page should rarely be seen as users get redirected immediately
	// But it provides feedback during the verification process
	
	onMount(() => {
		// Auto-redirect if somehow the server-side redirect failed
		setTimeout(() => {
			if (typeof window !== 'undefined') {
				window.location.href = '/login?error=verification_timeout';
			}
		}, 5000);
	});
</script>

<svelte:head>
	<title>Verifying Magic Link - SvelteHR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background px-4">
	<div class="max-w-md w-full text-center space-y-6">
		<div class="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
			<div class="animate-spin w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
		</div>
		
		<div>
			<h1 class="text-2xl font-bold text-foreground mb-2">
				Verifying Magic Link
			</h1>
			<p class="text-muted-foreground">
				Please wait while we verify your authentication...
			</p>
		</div>
		
		<div class="text-sm text-muted-foreground">
			<p>If you're not redirected automatically, <a href="/login" class="text-primary hover:underline">click here</a></p>
		</div>
	</div>
</div>

<style>
	.animate-spin {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>