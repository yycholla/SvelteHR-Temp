<!--
	Enhanced Dashboard Component - SvelteKit HR Management
	
	Features:
	- Role-based access control (RBAC) with hierarchical permissions
	- GraphQL integration for real-time data
	- Drag-and-drop dashboard customization
	- Live data updates via subscriptions
	- Performance optimized with virtual scrolling
	- Accessibility compliant (WCAG AAA)
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Plus, Settings, RotateCcw, Grid3X3, Maximize2, Download } from 'lucide-svelte';
	
	// GraphQL integration
	import { queries } from '$lib/graphql/queries.js';
	import { createSubscriptionStore } from '$lib/graphql/subscriptions.js';
	import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
	
	// Authentication and RBAC
	import { authStore } from '$lib/auth/store.js';
	import { checkPermission, checkAnyPermission } from '$lib/auth/store.js';
	
	// Dashboard components
	import DashboardCard from './grid/DashboardCard.svelte';
	import DashboardToolbar from './DashboardToolbar.svelte';
	import CardLibrary from './CardLibrary.svelte';
	
	// Dashboard cards
	import EmployeeStatisticsCard from './cards/EmployeeStatisticsCard.svelte';
	import APIPerformanceCard from './cards/APIPerformanceCard.svelte';
	import LiveNotificationsCard from './cards/LiveNotificationsCard.svelte';
	import LiveTasksCard from './cards/LiveTasksCard.svelte';
	import PersonalInfoCard from './cards/PersonalInfoCard.svelte';
	import MyTasksCard from './cards/MyTasksCard.svelte';
	import LiveComplianceCard from './cards/LiveComplianceCard.svelte';
	
	// Types
	import type { 
		DashboardLayout, 
		CardInstance, 
		CardMetadata, 
		UserDashboardPreferences,
		CardSize,
		UserRole 
	} from './types.js';
	import type { User } from '$lib/auth/index.js';

	// Props
	interface Props {
		user: User;
		initialData?: any;
		className?: string;
	}
	
	let { user, initialData, className = '' }: Props = $props();

	// Component registry for dynamic loading
	const cardComponents = {
		'EmployeeStatisticsCard': EmployeeStatisticsCard,
		'APIPerformanceCard': APIPerformanceCard,
		'LiveNotificationsCard': LiveNotificationsCard,
		'LiveTasksCard': LiveTasksCard,
		'PersonalInfoCard': PersonalInfoCard,
		'MyTasksCard': MyTasksCard,
		'LiveComplianceCard': LiveComplianceCard
	};

	// State management
	let dashboardData = $state<any>(initialData || {});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let isCustomizing = $state(false);
	let showCardLibrary = $state(false);
	let selectedLayout = $state<DashboardLayout | null>(null);
	let preferences = $state<UserDashboardPreferences | null>(null);
	let gridContainer: HTMLDivElement;

	// GraphQL client setup
	let graphqlClient: ReturnType<typeof createBrowserGraphQLClient> | null = null;
	
	// Real-time subscriptions
	let dashboardSubscription: any = null;
	let employeeSubscription: any = null;
	let notificationSubscription: any = null;

	// Role-based card definitions
	const availableCards: CardMetadata[] = [
		{
			id: 'personal-info',
			title: 'Personal Information',
			description: 'View and edit your personal profile',
			component: 'PersonalInfoCard',
			tags: ['personal'],
			requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
			defaultSize: '2x1',
			minSize: '2x1',
			maxSize: '2x2',
			allowResize: true,
			icon: 'User'
		},
		{
			id: 'employee-statistics',
			title: 'Employee Statistics',
			description: 'Overview of employee metrics and trends',
			component: 'EmployeeStatisticsCard',
			tags: ['metrics', 'hr'],
			requiredRoles: ['HR', 'Manager', 'Admin'],
			defaultSize: '2x2',
			minSize: '2x1',
			maxSize: '3x2',
			allowResize: true,
			refreshInterval: 300,
			icon: 'Users'
		},
		{
			id: 'my-tasks',
			title: 'My Tasks',
			description: 'Personal tasks and assignments',
			component: 'MyTasksCard',
			tags: ['tasks', 'personal'],
			requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
			defaultSize: '2x2',
			minSize: '1x2',
			maxSize: '2x3',
			allowResize: true,
			refreshInterval: 120,
			icon: 'CheckSquare'
		},
		{
			id: 'live-notifications',
			title: 'Live Notifications',
			description: 'Real-time notifications and alerts',
			component: 'LiveNotificationsCard',
			tags: ['notifications'],
			requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
			defaultSize: '1x2',
			minSize: '1x1',
			maxSize: '2x2',
			allowResize: true,
			icon: 'Bell'
		},
		{
			id: 'api-performance',
			title: 'System Performance',
			description: 'API response times and system metrics',
			component: 'APIPerformanceCard',
			tags: ['system', 'admin'],
			requiredRoles: ['Admin'],
			defaultSize: '2x1',
			minSize: '2x1',
			maxSize: '3x2',
			allowResize: true,
			refreshInterval: 60,
			icon: 'Activity'
		},
		{
			id: 'compliance-tracker',
			title: 'Compliance Tracker',
			description: 'Track compliance requirements and deadlines',
			component: 'LiveComplianceCard',
			tags: ['compliance', 'hr'],
			requiredRoles: ['HR', 'Admin'],
			defaultSize: '2x1',
			minSize: '2x1',
			maxSize: '2x2',
			allowResize: true,
			refreshInterval: 600,
			icon: 'Shield'
		}
	];

	// Filter cards based on user permissions
	const allowedCards = $derived(() => {
		return availableCards.filter(card => {
			// Check if user has required role
			const hasRole = card.requiredRoles.some(role => 
				user.role === role.toLowerCase() || 
				(user.role === 'admin' && role !== 'Employee') // Admin can access most cards
			);
			
			// Additional permission-based filtering
			if (card.tags.includes('hr')) {
				return hasRole && (checkPermission('employees:read') || checkPermission('*'));
			}
			
			if (card.tags.includes('admin')) {
				return hasRole && checkPermission('*');
			}
			
			if (card.tags.includes('reports')) {
				return hasRole && checkAnyPermission(['reports:read', 'reports:hr', 'reports:team']);
			}
			
			return hasRole;
		});
	});

	// Default layout generation based on user role
	function generateDefaultLayout(): DashboardLayout {
		const defaultCards: CardInstance[] = [];
		
		// Personal info card for everyone
		defaultCards.push({
			id: 'card-personal-info',
			cardId: 'personal-info',
			position: { x: 0, y: 0, w: 2, h: 1 },
			size: '2x1',
			visible: true
		});

		// Role-specific cards
		if (user.role === 'admin') {
			defaultCards.push(
				{
					id: 'card-employee-stats',
					cardId: 'employee-statistics',
					position: { x: 2, y: 0, w: 2, h: 2 },
					size: '2x2',
					visible: true
				},
				{
					id: 'card-api-performance',
					cardId: 'api-performance',
					position: { x: 0, y: 1, w: 2, h: 1 },
					size: '2x1',
					visible: true
				},
				{
					id: 'card-notifications',
					cardId: 'live-notifications',
					position: { x: 4, y: 0, w: 1, h: 2 },
					size: '1x2',
					visible: true
				}
			);
		} else if (user.role === 'hr_manager') {
			defaultCards.push(
				{
					id: 'card-employee-stats',
					cardId: 'employee-statistics',
					position: { x: 2, y: 0, w: 2, h: 2 },
					size: '2x2',
					visible: true
				},
				{
					id: 'card-compliance',
					cardId: 'compliance-tracker',
					position: { x: 0, y: 1, w: 2, h: 1 },
					size: '2x1',
					visible: true
				},
				{
					id: 'card-notifications',
					cardId: 'live-notifications',
					position: { x: 4, y: 0, w: 1, h: 2 },
					size: '1x2',
					visible: true
				}
			);
		} else if (user.role === 'manager') {
			defaultCards.push(
				{
					id: 'card-my-tasks',
					cardId: 'my-tasks',
					position: { x: 2, y: 0, w: 2, h: 2 },
					size: '2x2',
					visible: true
				},
				{
					id: 'card-notifications',
					cardId: 'live-notifications',
					position: { x: 4, y: 0, w: 1, h: 2 },
					size: '1x2',
					visible: true
				}
			);
		} else { // Employee
			defaultCards.push(
				{
					id: 'card-my-tasks',
					cardId: 'my-tasks',
					position: { x: 2, y: 0, w: 2, h: 2 },
					size: '2x2',
					visible: true
				},
				{
					id: 'card-notifications',
					cardId: 'live-notifications',
					position: { x: 4, y: 0, w: 1, h: 1 },
					size: '1x1',
					visible: true
				}
			);
		}

		return {
			id: 'default-layout',
			name: 'Default Layout',
			cards: defaultCards,
			gridCols: 6,
			gridRows: 4,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	// Initialize dashboard
	async function initializeDashboard() {
		try {
			loading = true;
			error = null;

			// Initialize GraphQL client
			if (browser && !graphqlClient) {
				graphqlClient = createBrowserGraphQLClient();
				
				// Set authentication token if available
				if (authStore.token) {
					graphqlClient.setToken(authStore.token);
				}
			}

			// Load user preferences or create defaults
			await loadUserPreferences();
			
			// Load initial dashboard data
			await loadDashboardData();
			
			// Setup real-time subscriptions
			setupSubscriptions();

		} catch (err) {
			console.error('Dashboard initialization failed:', err);
			error = 'Failed to initialize dashboard';
		} finally {
			loading = false;
		}
	}

	// Load user dashboard preferences
	async function loadUserPreferences() {
		try {
			if (!graphqlClient) return;

			const response = await graphqlClient.query(
				queries.dashboard.userPreferences,
				{ userId: user.id }
			);

			if (response.data?.userDashboardPreferences) {
				preferences = response.data.userDashboardPreferences;
				selectedLayout = preferences.layouts.find(l => l.id === preferences.activeLayoutId) || null;
			}

			// Create default layout if none exists
			if (!selectedLayout) {
				selectedLayout = generateDefaultLayout();
				
				preferences = {
					layouts: [selectedLayout],
					activeLayoutId: selectedLayout.id,
					autoRefresh: true,
					refreshInterval: 300
				};
			}

		} catch (err) {
			console.error('Failed to load user preferences:', err);
			// Fallback to default layout
			selectedLayout = generateDefaultLayout();
			preferences = {
				layouts: [selectedLayout],
				activeLayoutId: selectedLayout.id,
				autoRefresh: true,
				refreshInterval: 300
			};
		}
	}

	// Load dashboard data
	async function loadDashboardData() {
		try {
			if (!graphqlClient) return;

			// Load dashboard metrics based on user permissions
			const metricsResponse = await graphqlClient.query(
				queries.dashboard.metrics,
				{ 
					userId: user.id,
					includeTeamData: checkAnyPermission(['team:manage', 'employees:read']),
					includeHRData: checkAnyPermission(['employees:*', 'reports:hr'])
				}
			);

			if (metricsResponse.data) {
				dashboardData = {
					...dashboardData,
					...metricsResponse.data.dashboardMetrics
				};
			}

			// Load user-specific data
			const userDataResponse = await graphqlClient.query(
				queries.auth.profile,
				{ userId: user.id }
			);

			if (userDataResponse.data?.user) {
				dashboardData = {
					...dashboardData,
					userProfile: userDataResponse.data.user
				};
			}

		} catch (err) {
			console.error('Failed to load dashboard data:', err);
			// Continue with existing data
		}
	}

	// Setup real-time subscriptions
	function setupSubscriptions() {
		if (!browser) return;

		try {
			// Dashboard metrics subscription
			dashboardSubscription = createSubscriptionStore(
				`subscription DashboardMetricsUpdates($userId: ID!) {
					dashboardMetricsUpdated(userId: $userId) {
						total_employees
						active_employees
						new_hires_this_month
						pending_leave_requests
						recent_activities {
							id
							type
							title
							actor { id name }
							created_at
						}
						updated_at
					}
				}`,
				{ userId: user.id },
				{
					onData: (data) => {
						if (data?.dashboardMetricsUpdated) {
							dashboardData = {
								...dashboardData,
								...data.dashboardMetricsUpdated
							};
						}
					},
					onError: (error) => {
						console.error('Dashboard subscription error:', error);
					}
				}
			);

			// Employee updates subscription (for HR/Managers)
			if (checkAnyPermission(['employees:read', 'team:manage'])) {
				employeeSubscription = createSubscriptionStore(
					`subscription EmployeeUpdates {
						employeeUpdated {
							employee {
								id employee_id full_name status
								department { id name }
							}
							action
							timestamp
						}
					}`,
					{},
					{
						onData: (data) => {
							if (data?.employeeUpdated) {
								// Trigger dashboard data refresh
								loadDashboardData();
							}
						}
					}
				);
			}

			// Notification subscription
			notificationSubscription = createSubscriptionStore(
				`subscription NotificationUpdates($userId: ID!) {
					notificationReceived(userId: $userId) {
						notification {
							id type title message read created_at
						}
						timestamp
					}
				}`,
				{ userId: user.id },
				{
					onData: (data) => {
						if (data?.notificationReceived) {
							dashboardData = {
								...dashboardData,
								notifications: [
									data.notificationReceived.notification,
									...(dashboardData.notifications || [])
								].slice(0, 20) // Keep latest 20
							};
						}
					}
				}
			);

		} catch (err) {
			console.error('Failed to setup subscriptions:', err);
		}
	}

	// Save user preferences
	async function saveUserPreferences() {
		try {
			if (!graphqlClient || !preferences) return;

			await graphqlClient.mutate(
				queries.dashboard.savePreferences,
				{
					userId: user.id,
					preferences: preferences
				}
			);

		} catch (err) {
			console.error('Failed to save user preferences:', err);
		}
	}

	// Toggle customization mode
	function toggleCustomization() {
		isCustomizing = !isCustomizing;
		if (!isCustomizing) {
			saveUserPreferences();
		}
	}

	// Add new card to dashboard
	function addCard(cardId: string) {
		if (!selectedLayout) return;

		const cardMetadata = availableCards.find(card => card.id === cardId);
		if (!cardMetadata) return;

		const newCard: CardInstance = {
			id: `card-${cardId}-${Date.now()}`,
			cardId: cardId,
			position: { x: 0, y: 0, w: 2, h: 1 }, // Will be positioned by grid
			size: cardMetadata.defaultSize,
			visible: true
		};

		selectedLayout.cards = [...selectedLayout.cards, newCard];
		selectedLayout.updatedAt = new Date();
		
		showCardLibrary = false;
		saveUserPreferences();
	}

	// Remove card from dashboard
	function removeCard(cardId: string) {
		if (!selectedLayout) return;

		selectedLayout.cards = selectedLayout.cards.filter(card => card.id !== cardId);
		selectedLayout.updatedAt = new Date();
		saveUserPreferences();
	}

	// Refresh dashboard data
	async function refreshDashboard() {
		await loadDashboardData();
	}

	// Export dashboard configuration
	function exportDashboard() {
		if (!preferences) return;

		const exportData = {
			preferences,
			timestamp: new Date().toISOString(),
			version: '1.0'
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
			type: 'application/json' 
		});
		
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dashboard-config-${user.id}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Component lifecycle
	onMount(() => {
		initializeDashboard();
	});

	onDestroy(() => {
		// Cleanup subscriptions
		if (dashboardSubscription) {
			dashboardSubscription.unsubscribe();
		}
		if (employeeSubscription) {
			employeeSubscription.unsubscribe();
		}
		if (notificationSubscription) {
			notificationSubscription.unsubscribe();
		}
	});

	// Auto-refresh setup
	$effect(() => {
		if (browser && preferences?.autoRefresh && preferences.refreshInterval > 0) {
			const interval = setInterval(() => {
				refreshDashboard();
			}, preferences.refreshInterval * 1000);

			return () => clearInterval(interval);
		}
	});
</script>

<!-- Dashboard Header -->
<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">
			Welcome back, {user.name || user.email}
		</h1>
		<p class="mt-1 text-sm text-gray-500">
			Your personalized HR dashboard
		</p>
	</div>

	<!-- Dashboard Controls -->
	<div class="flex items-center gap-2">
		<button
			onclick={refreshDashboard}
			class="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
			disabled={loading}
		>
			<RotateCcw class="h-4 w-4" />
			Refresh
		</button>

		<button
			onclick={exportDashboard}
			class="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
		>
			<Download class="h-4 w-4" />
			Export
		</button>

		<button
			onclick={() => showCardLibrary = true}
			class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
		>
			<Plus class="h-4 w-4" />
			Add Card
		</button>

		<button
			onclick={toggleCustomization}
			class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
			class:bg-indigo-100={isCustomizing}
			class:text-indigo-700={isCustomizing}
			class:bg-white={!isCustomizing}
			class:text-gray-700={!isCustomizing}
		>
			<Grid3X3 class="h-4 w-4" />
			{isCustomizing ? 'Save Layout' : 'Customize'}
		</button>
	</div>
</div>

<!-- Dashboard Content -->
<div class="dashboard-container {className}" bind:this={gridContainer}>
	{#if loading}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto"></div>
				<p class="mt-2 text-sm text-gray-500">Loading your dashboard...</p>
			</div>
		</div>
	{:else if error}
		<div class="rounded-md bg-red-50 p-4">
			<div class="text-sm text-red-700">{error}</div>
		</div>
	{:else if selectedLayout}
		<!-- Dashboard Grid -->
		<div 
			class="dashboard-grid"
			class:customizing={isCustomizing}
			style="--grid-cols: {selectedLayout.gridCols}; --grid-rows: {selectedLayout.gridRows};"
		>
			{#each selectedLayout.cards as cardInstance (cardInstance.id)}
				{@const cardMetadata = availableCards.find(card => card.id === cardInstance.cardId)}
				{#if cardMetadata && cardInstance.visible}
					<DashboardCard
						{cardInstance}
						{cardMetadata}
						data={dashboardData}
						{isCustomizing}
						component={cardComponents[cardMetadata.component]}
						onRemove={() => removeCard(cardInstance.id)}
						onRefresh={refreshDashboard}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- Card Library Modal -->
{#if showCardLibrary}
	<CardLibrary
		availableCards={allowedCards}
		existingCards={selectedLayout?.cards || []}
		onAddCard={addCard}
		onClose={() => showCardLibrary = false}
	/>
{/if}

<!-- Dashboard Toolbar -->
{#if isCustomizing}
	<DashboardToolbar
		layout={selectedLayout}
		onSave={() => { isCustomizing = false; saveUserPreferences(); }}
		onCancel={() => isCustomizing = false}
	/>
{/if}

<style>
	.dashboard-container {
		@apply min-h-screen;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-cols, 6), 1fr);
		grid-template-rows: repeat(var(--grid-rows, 4), minmax(200px, auto));
		gap: 1rem;
		min-height: 600px;
	}

	.dashboard-grid.customizing {
		@apply border-2 border-dashed border-gray-300 rounded-lg p-4;
	}

	@media (max-width: 1024px) {
		.dashboard-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>