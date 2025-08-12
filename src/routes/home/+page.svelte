<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import DashboardGrid from '$lib/components/dashboard/grid/DashboardGrid.svelte';
	import DashboardToolbar from '$lib/components/dashboard/DashboardToolbar.svelte';
	import CardLibrary from '$lib/components/dashboard/CardLibrary.svelte';
    // Removed streaming - using static data from server
	import { dashboardActions, isEditing, dashboardLayout } from '$lib/stores/dashboard.js';
	import type { PageData } from './$types';
	import type { UserRole } from '$lib/components/dashboard/types.js';
	
	// Page data
	let { data }: { data: PageData } = $props();
	
	// UI State
	let showCardLibrary = $state(false);
	let showLayoutManager = $state(false);
	let showSettings = $state(false);
	let isLoading = $state(true);
	let initError = $state<string | null>(null);
    let useStreamingMode = $state(false);
	
	// Initialize dashboard when component mounts
    onMount(async () => {
		// Timeout fallback
		const timeoutId = setTimeout(() => {
			if (isLoading) {
				console.warn('⏰ Dashboard initialization timeout - forcing load');
				isLoading = false;
				initError = 'Dashboard took too long to load. Some features may not work properly.';
			}
		}, 5000); // 5 second timeout
		
		try {
			console.log('🏠 Initializing dashboard for user:', data.currentUser?.username, 'Role:', data.userRole);
			
			// Clear any potentially corrupted localStorage data
			if (typeof localStorage !== 'undefined') {
				const saved = localStorage.getItem('dashboard-preferences');
				if (saved) {
					try {
						const parsed = JSON.parse(saved);
						// Check for duplicate IDs in existing data
						const ids = new Set();
						let hasDuplicates = false;
						
						if (parsed.layouts) {
							for (const layout of parsed.layouts) {
								if (layout.cards) {
									for (const card of layout.cards) {
										if (ids.has(card.id)) {
											hasDuplicates = true;
											break;
										}
										ids.add(card.id);
									}
									if (hasDuplicates) break;
								}
							}
						}
						
						if (hasDuplicates) {
							console.warn('🗑️ Clearing dashboard data with duplicate card IDs');
							localStorage.removeItem('dashboard-preferences');
						} else {
							// Temporary: Clear existing data to apply new compact card heights
							console.warn('🔄 Clearing dashboard data to apply compact card heights and overflow fixes');
							localStorage.removeItem('dashboard-preferences');
						}
					} catch (e) {
						console.warn('🗑️ Clearing corrupted dashboard preferences');
						localStorage.removeItem('dashboard-preferences');
					}
				}
			}
			
            // Persisted streaming preference
            if (typeof localStorage !== 'undefined') {
                const pref = localStorage.getItem('dashboard-streaming-enabled');
                if (pref != null) useStreamingMode = pref === 'true';
            }

            // Initialize dashboard with user role
			await dashboardActions.initialize(data.userRole as UserRole, data.currentUser?.id?.toString());
			
			console.log('✅ Dashboard initialized successfully');
			clearTimeout(timeoutId);
            isLoading = false;
            // Streaming disabled - using static data only
		} catch (error) {
			console.error('❌ Failed to initialize dashboard:', error);
			clearTimeout(timeoutId);
			initError = 'Failed to load dashboard. Please refresh the page.';
			isLoading = false;
		}
	});

    // Streaming mode disabled - using static data only
    function setStreamingMode(enabled: boolean) {
        useStreamingMode = enabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('dashboard-streaming-enabled', enabled.toString());
        }
        // Streaming functionality removed
    }
	
	// Handle card library
	function handleOpenCardLibrary() {
		showCardLibrary = true;
	}
	
	function handleCloseCardLibrary() {
		showCardLibrary = false;
	}
	
	function handleAddCard(event: CustomEvent<{ cardId: string }>) {
		console.log('🎯 handleAddCard called with:', event.detail);
		dashboardActions.addCard(event.detail.cardId);
		showCardLibrary = false;
	}
	
	// Handle layout management
	function handleOpenLayoutManager() {
		showLayoutManager = true;
		// TODO: Implement layout manager modal
		console.log('Layout manager - TODO');
	}
	
	// Handle settings
	function handleOpenSettings() {
		showSettings = true;
		// TODO: Implement dashboard settings modal
		console.log('Dashboard settings - TODO');
	}
	
	// Handle import/export (admin only)
	function handleExportConfig() {
		// Handled by toolbar
	}
	
	function handleImportConfig() {
		// Handled by toolbar
	}
	
	// Get user display name
	function getUserDisplayName(): string {
		const user = data.currentUser;
		if (user?.firstName && user?.lastName) {
			return `${user.firstName} ${user.lastName}`;
		}
		return user?.username || 'User';
	}
	
	// Get role display name
	function getRoleDisplayName(role: string): string {
		const roleNames: Record<string, string> = {
			'Admin': 'Administrator',
			'HR': 'HR Manager',
			'Manager': 'Team Manager',
			'Employee': 'Employee'
		};
		return roleNames[role] || role;
	}
</script>

<svelte:head>
	<title>Dashboard - SvelteHR</title>
	<meta name="description" content="Your personalized HR dashboard" />
</svelte:head>

<div class="dashboard-page h-screen flex flex-col bg-muted/20">
	<!-- Fixed Branding Section -->
	<div class="fixed left-6 top-4 z-40 flex items-center space-x-4">
		<div class="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
			<span class="text-primary-foreground font-bold text-sm">HR</span>
		</div>
		<div class="hidden md:flex items-center">
			<h1 class="font-bold text-3xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
				SvelteHR
			</h1>
		</div>
	</div>

	<!-- Welcome Section -->
	{#if !$isEditing}
		<div class="pt-20 pb-4 px-6 text-center" transition:fade={{ duration: 300 }}>
			<h2 class="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
				Welcome back, {getUserDisplayName()}!
			</h2>
			<p class="text-muted-foreground mt-2 max-w-2xl mx-auto">
				{getRoleDisplayName(data.userRole)} Dashboard • 
				{#if data.isUsingMockData}
					Demo Mode - Connect your API for live data
				{:else}
					Connected to live data
				{/if}
			</p>
			<div class="flex items-center justify-center space-x-2 text-muted-foreground mt-2">
				<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
				<span class="text-sm">Dashboard ready</span>
			</div>
		</div>
	{/if}
	
	<!-- Dashboard Toolbar -->
	<DashboardToolbar 
		userRole={data.userRole}
		showImportExport={data.userRole === 'Admin'}
		on:openCardLibrary={handleOpenCardLibrary}
		on:openLayoutManager={handleOpenLayoutManager}
		on:openSettings={handleOpenSettings}
		on:exportConfig={handleExportConfig}
		on:importConfig={handleImportConfig}
	/>
	
	<!-- Main Dashboard Content -->
	<div class="flex-1 overflow-hidden">
		{#if isLoading}
			<!-- Loading State -->
			<div class="flex items-center justify-center h-full">
				<div class="text-center space-y-4">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<h3 class="text-lg font-semibold">Setting up your dashboard...</h3>
					<p class="text-sm text-muted-foreground max-w-md">
						Loading your personalized workspace with role-specific widgets
					</p>
				</div>
			</div>
		{:else if initError}
			<!-- Error State -->
			<div class="flex items-center justify-center h-full">
				<div class="text-center space-y-4 max-w-md">
					<div class="text-6xl opacity-30">⚠️</div>
					<h3 class="text-lg font-semibold text-destructive">Dashboard Error</h3>
					<p class="text-sm text-muted-foreground">{initError}</p>
					<button 
						class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
						onclick={() => window.location.reload()}
					>
						Refresh Page
					</button>
				</div>
			</div>
		{:else}
			<!-- Mode Toggle -->
			<div class="mode-toggle-container">
                <button 
                    class="mode-toggle" 
                    class:active={!useStreamingMode}
                    onclick={() => setStreamingMode(false)}
                >
					📊 Static Dashboard
				</button>
                <button 
                    class="mode-toggle" 
                    class:active={useStreamingMode}
                    onclick={() => setStreamingMode(true)}
                >
					🔄 Streaming Dashboard
				</button>
			</div>
			
			<!-- Dashboard Content -->
			<div class="h-full">
                <!-- Use the same interactive grid for both modes -->
                <DashboardGrid />
                
                <!-- Streaming HUD removed - static data only -->
			</div>
		{/if}
	</div>
	
	<!-- Card Library Modal -->
	<CardLibrary 
		open={showCardLibrary}
		on:close={handleCloseCardLibrary}
		on:addCard={handleAddCard}
	/>
	
	<!-- Debug Panel (Development Only) -->
	{#if import.meta.env.DEV && $dashboardLayout}
		<div class="fixed bottom-4 right-4 bg-white border border-border rounded-lg p-3 shadow-lg text-xs max-w-sm">
			<details>
				<summary class="font-semibold cursor-pointer">Debug Info</summary>
				<div class="mt-2 space-y-1">
					<div><strong>User Role:</strong> {data.userRole}</div>
					<div><strong>Layout Cards:</strong> {$dashboardLayout.cards.length}</div>
					<div><strong>Visible Cards:</strong> {$dashboardLayout.cards.filter(c => c.visible).length}</div>
					<div><strong>Edit Mode:</strong> {$isEditing ? 'On' : 'Off'}</div>
					<div><strong>Mock Data:</strong> {data.isUsingMockData ? 'Yes' : 'No'}</div>
				</div>
			</details>
		</div>
	{/if}
</div>

<style>
	.dashboard-page {
		/* Ensure consistent background */
		min-height: 100vh;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
	}
	
	/* Hide scrollbars but keep functionality */
	.dashboard-page {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	
	.dashboard-page::-webkit-scrollbar {
		display: none;
	}
	
	/* Smooth transitions */
	* {
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	/* Mode Toggle Styles */
	.mode-toggle-container {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding: 0.5rem;
		background: var(--color-surface-100);
		border-radius: 8px;
		border: 1px solid var(--color-surface-300);
	}

	.mode-toggle {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-surface-300);
		border-radius: 6px;
		background: white;
		color: var(--color-surface-600);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.mode-toggle:hover {
		background: var(--color-surface-50);
		border-color: var(--color-primary-300);
		color: var(--color-primary-600);
	}

	.mode-toggle.active {
		background: var(--color-primary-500);
		border-color: var(--color-primary-500);
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.mode-toggle.active:hover {
		background: var(--color-primary-600);
		border-color: var(--color-primary-600);
	}
</style>