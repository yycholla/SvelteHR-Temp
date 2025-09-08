<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	
	function handleLogout() {
		// Clear auth cookie and redirect to login
		document.cookie = 'gel-auth-token=; path=/; max-age=0';
		window.location.href = '/login?reason=logout';
	}
</script>

<svelte:head>
	<title>Dashboard - SvelteHR</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Dashboard</h1>
				<p class="text-muted-foreground mt-1">Welcome to SvelteHR</p>
			</div>
			
			<Button 
				variant="secondary" 
				onclick={handleLogout}
			>
				Sign Out
			</Button>
		</div>

		<!-- Success Message -->
		<div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
					<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
					</svg>
				</div>
				<div>
					<h2 class="text-lg font-semibold text-green-800">Authentication Successful!</h2>
					<p class="text-green-700">You have successfully signed in using magic link authentication.</p>
				</div>
			</div>
		</div>

		<!-- Content Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="bg-card border rounded-lg p-6">
				<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
					</svg>
				</div>
				<h3 class="font-semibold text-foreground mb-2">Employee Management</h3>
				<p class="text-sm text-muted-foreground">Manage employee profiles, roles, and permissions.</p>
			</div>

			<div class="bg-card border rounded-lg p-6">
				<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
					</svg>
				</div>
				<h3 class="font-semibold text-foreground mb-2">Analytics</h3>
				<p class="text-sm text-muted-foreground">View HR metrics, reports, and performance data.</p>
			</div>

			<div class="bg-card border rounded-lg p-6">
				<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
				</div>
				<h3 class="font-semibold text-foreground mb-2">Settings</h3>
				<p class="text-sm text-muted-foreground">Configure system settings and preferences.</p>
			</div>
		</div>

		<!-- Debug Info -->
		<div class="mt-8 p-4 bg-muted rounded-lg">
			<h3 class="font-medium text-foreground mb-2">🔧 Debug Information</h3>
			<div class="text-sm text-muted-foreground space-y-1">
				<p><strong>Current URL:</strong> {$page.url.href}</p>
				<p><strong>Route:</strong> {$page.route.id}</p>
				<p><strong>Auth Status:</strong> <span class="text-green-600">Authenticated via Magic Link</span></p>
			</div>
		</div>
	</div>
</div>