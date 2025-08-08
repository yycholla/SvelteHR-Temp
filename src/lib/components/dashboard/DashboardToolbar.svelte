<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { 
		Edit3, 
		Plus, 
		RotateCcw, 
		Save, 
		Layout, 
		Settings, 
		Download, 
		Upload,
		Eye,
		Grid3X3
	} from 'lucide-svelte';
	import { 
		isEditing, 
		dashboardLayout, 
		dashboardPreferences, 
		dashboardActions 
	} from '$lib/stores/dashboard.js';
	import type { UserRole } from './types.js';
	
	// Props
	let { 
		userRole = 'Employee',
		showLayoutSelector = true,
		showImportExport = false // Admin only feature
	}: {
		userRole?: UserRole;
		showLayoutSelector?: boolean;
		showImportExport?: boolean;
	} = $props();
	
	// Events
	const dispatch = createEventDispatcher<{
		openCardLibrary: void;
		openLayoutManager: void;
		openSettings: void;
		exportConfig: void;
		importConfig: void;
	}>();
	
	// State
	let showLayoutDropdown = $state(false);
	
	// Toggle edit mode
	function toggleEditMode() {
		console.log('Toggle edit mode clicked');
		isEditing.update(editing => {
			console.log('Edit mode changing from', editing, 'to', !editing);
			return !editing;
		});
	}
	
	// Handle layout switch
	function switchLayout(layoutId: string) {
		console.log('Switching to layout:', layoutId);
		dashboardActions.switchLayout(layoutId);
		showLayoutDropdown = false;
	}
	
	// Create new layout
	function createNewLayout() {
		console.log('Creating new layout');
		const layoutName = prompt('Enter layout name:');
		if (layoutName && layoutName.trim()) {
			dashboardActions.createLayout(layoutName.trim(), true);
		}
		showLayoutDropdown = false;
	}
	
	// Handle dropdown toggle
	function toggleLayoutDropdown() {
		console.log('Toggle dropdown clicked, current state:', showLayoutDropdown);
		showLayoutDropdown = !showLayoutDropdown;
		console.log('New dropdown state:', showLayoutDropdown);
	}
	
	// Handle settings
	function handleSettings() {
		console.log('Settings button clicked');
		dispatch('openSettings');
	}
	
	// Reset to default
	function resetToDefault() {
		console.log('Reset button clicked');
		if (confirm('Reset dashboard to default layout? This will remove all customizations.')) {
			dashboardActions.resetToDefault();
		}
	}
	
	// Handle add card
	function handleAddCard() {
		console.log('Add card button clicked');
		dispatch('openCardLibrary');
	}
	
	// Handle export
	function handleExport() {
		try {
			const config = dashboardActions.exportConfig();
			const blob = new Blob([config], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			alert('Failed to export configuration');
		}
	}
	
	// Handle import
	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const config = e.target?.result as string;
					dashboardActions.importConfig(config);
					alert('Dashboard configuration imported successfully!');
				} catch (error) {
					alert('Failed to import configuration: Invalid file format');
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}
	
	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (showLayoutDropdown && !event.composedPath().some((element) => {
			return element instanceof Element && element.classList?.contains('layout-dropdown');
		})) {
			showLayoutDropdown = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dashboard-toolbar flex items-center justify-between p-4 bg-white border-b border-border">
	<!-- Left side - Dashboard info and layout selector -->
	<div class="flex items-center space-x-4">
		<div class="flex items-center space-x-2">
			<Grid3X3 class="h-5 w-5 text-primary" />
			<h1 class="text-xl font-semibold">Dashboard</h1>
			{#if $isEditing}
				<Badge variant="secondary">Editing</Badge>
			{/if}
		</div>
		
		{#if showLayoutSelector && $dashboardPreferences.layouts.length > 0}
			<div class="relative layout-dropdown">
				<Button
					variant="outline"
					size="sm"
					onclick={toggleLayoutDropdown}
					class="min-w-[150px] justify-between"
				>
					<Layout class="h-4 w-4 mr-2" />
					<span class="truncate">
						{$dashboardPreferences.layouts.find(l => l.id === $dashboardPreferences.activeLayoutId)?.name || 'Default'}
					</span>
					<svg class="h-4 w-4 ml-2 transition-transform {showLayoutDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</Button>
				
				{#if showLayoutDropdown}
					<div 
						class="absolute top-full left-0 mt-1 bg-white border border-border rounded-md shadow-lg py-1 z-10 min-w-[200px]"
						transition:fade={{ duration: 150 }}
					>
						{#each $dashboardPreferences.layouts as layout}
							<button
								class="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted text-left
									{layout.id === $dashboardPreferences.activeLayoutId ? 'bg-muted font-medium' : ''}"
								onclick={() => switchLayout(layout.id)}
							>
								<span class="truncate">{layout.name}</span>
								{#if layout.id === $dashboardPreferences.activeLayoutId}
									<Eye class="h-3 w-3 ml-2 flex-shrink-0" />
								{/if}
							</button>
						{/each}
						
						<hr class="my-1 border-border" />
						
						<button
							class="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
							onclick={createNewLayout}
						>
							<Plus class="h-3 w-3" />
							<span>New Layout</span>
						</button>
						
						<button
							class="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
							onclick={() => { dispatch('openLayoutManager'); showLayoutDropdown = false; }}
						>
							<Settings class="h-3 w-3" />
							<span>Manage Layouts</span>
						</button>
					</div>
				{/if}
			</div>
		{/if}
		
		{#if $dashboardLayout}
			<div class="text-sm text-muted-foreground">
				{$dashboardLayout.cards.filter(c => c.visible).length} cards
			</div>
		{/if}
	</div>
	
	<!-- Right side - Actions -->
	<div class="flex items-center space-x-2">
		{#if $isEditing}
			<!-- Edit mode actions -->
			<Button
				variant="outline"
				size="sm"
				onclick={handleAddCard}
			>
				<Plus class="h-4 w-4 mr-2" />
				Add Card
			</Button>
			
			<Button
				variant="outline"
				size="sm"
				onclick={resetToDefault}
			>
				<RotateCcw class="h-4 w-4 mr-2" />
				Reset
			</Button>
		{/if}
		
		{#if showImportExport && (userRole === 'Admin')}
			<!-- Import/Export for admins -->
			<Button
				variant="outline"
				size="sm"
				onclick={handleExport}
			>
				<Download class="h-4 w-4 mr-2" />
				Export
			</Button>
			
			<Button
				variant="outline"
				size="sm"
				onclick={handleImport}
			>
				<Upload class="h-4 w-4 mr-2" />
				Import
			</Button>
		{/if}
		
		<Button
			variant="outline"
			size="sm"
			onclick={handleSettings}
		>
			<Settings class="h-4 w-4 mr-2" />
			Settings
		</Button>
		
		<!-- Edit toggle -->
		<Button
			variant={$isEditing ? "default" : "outline"}
			size="sm"
			onclick={toggleEditMode}
		>
			<Edit3 class="h-4 w-4 mr-2" />
			{$isEditing ? 'Done' : 'Edit'}
		</Button>
	</div>
</div>

<style>
	.dashboard-toolbar {
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 1) 100%);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}
</style>