<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Building2 } from 'lucide-svelte';

	/**
	 * Authentication Layout Component
	 * Provides consistent layout for auth pages (login, register, forgot password)
	 */

	export let title = 'SvelteHR';
	export let subtitle = 'Human Resources Management System';
	export let showBranding = true;
	export let showFooter = true;

	// Dynamic background patterns
	let backgroundPattern = 'dots';

	onMount(() => {
		// Set different patterns based on route
		const pathname = $page.url.pathname;
		if (pathname.includes('login')) {
			backgroundPattern = 'dots';
		} else if (pathname.includes('register')) {
			backgroundPattern = 'grid';
		} else if (pathname.includes('forgot')) {
			backgroundPattern = 'waves';
		}
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={subtitle} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div
	class="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background py-12 sm:px-6 lg:px-8"
>
	<!-- Background Pattern -->
	<div class="absolute inset-0 bg-background">
		{#if backgroundPattern === 'dots'}
			<div class="bg-dots-pattern absolute inset-0 opacity-5"></div>
		{:else if backgroundPattern === 'grid'}
			<div class="bg-grid-pattern absolute inset-0 opacity-5"></div>
		{:else if backgroundPattern === 'waves'}
			<div class="bg-waves-pattern absolute inset-0 opacity-5"></div>
		{/if}
	</div>

	<!-- Gradient Overlay -->
	<div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>

	<!-- Main Content -->
	<div class="relative z-10">
		<!-- Header -->
		{#if showBranding}
			<div class="mb-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div class="text-center">
					<!-- Logo -->
					<div
						class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
					>
						<Building2 class="h-8 w-8 text-primary-foreground" />
					</div>

					<!-- Brand Text -->
					<h2 class="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
						{title}
					</h2>
					<p class="mt-2 text-sm text-muted-foreground sm:text-base">
						{subtitle}
					</p>
				</div>
			</div>
		{/if}

		<!-- Auth Form Container -->
		<div class="sm:mx-auto sm:w-full sm:max-w-md">
			<Card.Root class="p-8">
				<Card.Content class="p-0">
					<slot />
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Footer -->
		{#if showFooter}
			<div class="mt-8 text-center">
				<p class="text-xs text-muted-foreground">
					© {new Date().getFullYear()} SvelteHR. All rights reserved.
				</p>
				<div class="mt-2 flex justify-center space-x-4 text-xs text-muted-foreground">
					<a href="/privacy" class="transition-colors hover:text-foreground">Privacy Policy</a>
					<span>•</span>
					<a href="/terms" class="transition-colors hover:text-foreground">Terms of Service</a>
					<span>•</span>
					<a href="/support" class="transition-colors hover:text-foreground">Support</a>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Background patterns */
	.bg-dots-pattern {
		background-image: radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px);
		background-size: 20px 20px;
	}

	.bg-grid-pattern {
		background-image:
			linear-gradient(to right, hsl(var(--muted-foreground)) 1px, transparent 1px),
			linear-gradient(to bottom, hsl(var(--muted-foreground)) 1px, transparent 1px);
		background-size: 20px 20px;
	}

	.bg-waves-pattern {
		background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='hsl(var(--muted-foreground))' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.bg-dots-pattern,
		.bg-grid-pattern {
			background-size: 15px 15px;
		}
	}

	/* Smooth transitions */
	a {
		transition: color 0.15s ease-in-out;
	}

	/* Focus styles for accessibility */
	a:focus {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
