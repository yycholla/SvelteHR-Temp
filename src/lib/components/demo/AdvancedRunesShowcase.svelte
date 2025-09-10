<!--
	Advanced Svelte 5 Runes Showcase
	
	Comprehensive demonstration of all advanced utilities and patterns:
	- Performance monitoring and optimization
	- Global state management with localStorage sync
	- Advanced form management with real-time validation
	- Debounced derived states and async operations
	- Reactive arrays with optimized operations
	- Error handling and retry mechanisms
	- Real-time notifications and feedback
	
	This component serves as both a demo and a reference implementation
	for the advanced runes patterns developed in the SvelteHR project.
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	
	import { 
		createDebouncedDerived, 
		createAsyncDerived, 
		createPerformanceMonitor, 
		createMemoized,
		ReactiveArray,
		createLocalStorageState
	} from '$lib/utils/reactivity.svelte';
	
	import { globalState } from '$lib/stores/global-state.svelte';
	import { createAdvancedForm } from '$lib/forms/advanced-form.svelte';
	
	import { z } from 'zod';
	import { 
		Activity, 
		TrendingUp, 
		TrendingDown, 
		Zap, 
		Database, 
		RefreshCw,
		Plus,
		Trash2,
		ChevronUp,
		ChevronDown
	} from 'lucide-svelte';

	// Performance monitoring for the entire showcase
	const showcaseMonitor = createPerformanceMonitor('AdvancedRunesShowcase');

	// 1. PERFORMANCE MONITORING DEMO
	let computationTime = $state(0);
	let computationCount = $state(0);

	// Expensive computation that benefits from monitoring
	const expensiveComputation = createMemoized((n: number) => {
		return showcaseMonitor.monitor(() => {
			// Simulate expensive work
			let result = 0;
			for (let i = 0; i < n * 1000; i++) {
				result += Math.sqrt(i);
			}
			return result;
		});
	});

	// 2. DEBOUNCED DERIVED DEMO
	let searchQuery = $state('');
	let searchResults = $state<string[]>([]);
	
	// Debounced search that only triggers after user stops typing
	const debouncedSearch = createDebouncedDerived(() => {
		if (!searchQuery.trim()) return [];
		
		// Simulate search results
		const mockResults = [
			'Advanced React Patterns',
			'Svelte 5 Runes Guide',
			'TypeScript Best Practices',
			'Performance Optimization',
			'State Management Solutions',
			'Component Architecture',
			'Testing Strategies',
			'Accessibility Guidelines'
		];
		
		return mockResults.filter(item => 
			item.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, 500);

	// Update search results when debounced search changes
	$effect(() => {
		searchResults = debouncedSearch();
	});

	// 3. ASYNC DERIVED DEMO
	let fetchTrigger = $state(0);
	
	const asyncUserData = createAsyncDerived(async () => {
		// Simulate API call with random delay and occasional failure
		const delay = Math.random() * 2000 + 500;
		await new Promise(resolve => setTimeout(resolve, delay));
		
		if (Math.random() < 0.2) {
			throw new Error('Simulated API failure');
		}
		
		return {
			id: Math.floor(Math.random() * 1000),
			name: `User ${Math.floor(Math.random() * 100)}`,
			email: `user${Math.floor(Math.random() * 100)}@example.com`,
			lastLogin: new Date().toISOString(),
			status: Math.random() > 0.3 ? 'active' : 'inactive'
		};
	});

	// Trigger refetch when fetchTrigger changes
	$effect(() => {
		fetchTrigger; // Access to trigger reactivity
		// The async derived will automatically re-execute
	});

	// 4. REACTIVE ARRAY DEMO
	const items = new ReactiveArray(['Item 1', 'Item 2', 'Item 3']);
	let newItemName = $state('');

	function addItem() {
		if (newItemName.trim()) {
			items.push(`${newItemName.trim()} (${Date.now()})`);
			newItemName = '';
			
			globalState.addNotification({
				type: 'success',
				title: 'Item Added',
				message: `Added "${newItemName}" to the list`
			});
		}
	}

	function removeItem(index: number) {
		const removed = items.value[index];
		items.splice(index, 1);
		
		globalState.addNotification({
			type: 'info',
			title: 'Item Removed',
			message: `Removed "${removed}" from the list`
		});
	}

	function moveItemUp(index: number) {
		if (index > 0) {
			items.move(index, index - 1);
		}
	}

	function moveItemDown(index: number) {
		if (index < items.length - 1) {
			items.move(index, index + 1);
		}
	}

	// 5. LOCALSTORAGE STATE DEMO
	const preferences = createLocalStorageState('showcase-preferences', {
		theme: 'system' as 'light' | 'dark' | 'system',
		animations: true,
		notifications: true,
		autoSave: false
	});

	// 6. ADVANCED FORM DEMO
	const demoFormSchema = z.object({
		title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
		description: z.string().max(500, 'Description too long').optional(),
		category: z.enum(['personal', 'work', 'learning', 'other']),
		priority: z.number().min(1).max(5),
		dueDate: z.string().optional(),
		tags: z.array(z.string()).max(10, 'Too many tags'),
		estimatedHours: z.number().min(0).max(100).optional()
	});

	const demoForm = createAdvancedForm(demoFormSchema, {
		initialValues: {
			title: '',
			description: '',
			category: 'personal' as const,
			priority: 3,
			dueDate: '',
			tags: [],
			estimatedHours: undefined
		},
		validation: {
			debounceMs: 300,
			validateOnChange: true,
			validateOnBlur: true
		},
		onSubmit: async (data) => {
			// Simulate form submission
			await new Promise(resolve => setTimeout(resolve, 1500));
			
			globalState.addNotification({
				type: 'success',
				title: 'Form Submitted',
				message: `Task "${data.title}" has been created successfully`
			});

			return { success: true, data };
		}
	});

	// Tag management for the form
	let newTag = $state('');
	const formTags = demoForm.createArrayField('tags', '');

	function addTag() {
		if (newTag.trim() && !formTags.items.includes(newTag.trim())) {
			formTags.push(newTag.trim());
			newTag = '';
		}
	}

	// 7. REAL-TIME METRICS
	let metricsEnabled = $state(true);
	let metricsInterval: number;

	$effect(() => {
		if (metricsEnabled) {
			metricsInterval = setInterval(() => {
				// Update global performance metrics
				globalState.incrementApiCall();
				
				if (Math.random() > 0.3) {
					globalState.incrementCacheHit();
				} else {
					globalState.incrementCacheMiss();
				}

				// Update local metrics
				computationTime = showcaseMonitor.getStats().averageTime;
				computationCount = showcaseMonitor.getStats().count;
			}, 2000);
		}

		return () => {
			if (metricsInterval) {
				clearInterval(metricsInterval);
			}
		};
	});

	// Computed showcase statistics
	const showcaseStats = $derived(() => {
		const globalMetrics = globalState.performanceMetrics();
		const monitorStats = showcaseMonitor.getStats();
		
		return {
			totalApiCalls: globalMetrics.apiCalls,
			cacheHitRate: globalMetrics.cacheHits + globalMetrics.cacheMisses > 0
				? (globalMetrics.cacheHits / (globalMetrics.cacheHits + globalMetrics.cacheMisses) * 100)
				: 0,
			averageComputeTime: monitorStats.averageTime,
			totalComputations: monitorStats.count,
			searchResultsCount: searchResults.length,
			itemsInList: items.length,
			formProgress: Object.values(demoForm.data).filter(v => v && v !== '').length / Object.keys(demoForm.data).length * 100,
			notificationCount: globalState.unreadCount()
		};
	});
</script>

<div class="space-y-8 p-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold">Advanced Svelte 5 Runes Showcase</h1>
		<p class="text-muted-foreground">
			Comprehensive demonstration of optimized reactive patterns and utilities
		</p>
	</div>

	<!-- Global Statistics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
		<div class="text-center">
			<div class="text-2xl font-bold text-primary">{showcaseStats.totalApiCalls}</div>
			<div class="text-sm text-muted-foreground">API Calls</div>
		</div>
		<div class="text-center">
			<div class="text-2xl font-bold text-green-600">{showcaseStats.cacheHitRate.toFixed(1)}%</div>
			<div class="text-sm text-muted-foreground">Cache Hit Rate</div>
		</div>
		<div class="text-center">
			<div class="text-2xl font-bold text-blue-600">{showcaseStats.averageComputeTime.toFixed(1)}ms</div>
			<div class="text-sm text-muted-foreground">Avg Compute</div>
		</div>
		<div class="text-center">
			<div class="text-2xl font-bold text-purple-600">{showcaseStats.notificationCount}</div>
			<div class="text-sm text-muted-foreground">Notifications</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- 1. Performance Monitoring Demo -->
		<div class="space-y-4 p-6 border rounded-lg">
			<div class="flex items-center gap-2">
				<Zap class="h-5 w-5 text-yellow-600" />
				<h2 class="text-xl font-semibold">Performance Monitoring</h2>
			</div>
			
			<div class="space-y-3">
				<div class="flex gap-2">
					<Button onclick={() => expensiveComputation(100)}>
						Light Computation (100)
					</Button>
					<Button onclick={() => expensiveComputation(1000)}>
						Heavy Computation (1000)
					</Button>
				</div>
				
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<strong>Total Runs:</strong> {computationCount}
					</div>
					<div>
						<strong>Avg Time:</strong> {computationTime.toFixed(2)}ms
					</div>
				</div>

				{#if computationTime > 16}
					<Badge variant="destructive">
						⚠️ Slow computation detected!
					</Badge>
				{:else if computationTime > 8}
					<Badge variant="secondary">
						⚡ Moderate performance
					</Badge>
				{:else}
					<Badge variant="default">
						✨ Excellent performance
					</Badge>
				{/if}
			</div>
		</div>

		<!-- 2. Debounced Search Demo -->
		<div class="space-y-4 p-6 border rounded-lg">
			<div class="flex items-center gap-2">
				<Activity class="h-5 w-5 text-blue-600" />
				<h2 class="text-xl font-semibold">Debounced Search</h2>
			</div>
			
			<div class="space-y-3">
				<Input
					placeholder="Type to search..."
					bind:value={searchQuery}
				/>
				
				<div class="min-h-32 max-h-32 overflow-y-auto space-y-1">
					{#each searchResults as result}
						<div class="p-2 bg-muted rounded text-sm">
							{result}
						</div>
					{:else}
						<div class="p-4 text-center text-muted-foreground">
							{searchQuery ? 'No results found' : 'Start typing to see results...'}
						</div>
					{/each}
				</div>
				
				<div class="text-xs text-muted-foreground">
					Found {searchResults.length} results • Debounced 500ms
				</div>
			</div>
		</div>

		<!-- 3. Async Data Demo -->
		<div class="space-y-4 p-6 border rounded-lg">
			<div class="flex items-center gap-2">
				<Database class="h-5 w-5 text-green-600" />
				<h2 class="text-xl font-semibold">Async Data Management</h2>
			</div>
			
			<div class="space-y-3">
				<Button onclick={() => fetchTrigger = Date.now()} disabled={asyncUserData.loading()}>
					<RefreshCw class="h-4 w-4 mr-2" class:animate-spin={asyncUserData.loading()} />
					{asyncUserData.loading() ? 'Loading...' : 'Fetch User Data'}
				</Button>
				
				{#if asyncUserData.loading()}
					<div class="p-4 border rounded bg-muted/30">
						<div class="animate-pulse flex space-x-4">
							<div class="rounded-full bg-muted h-12 w-12"></div>
							<div class="flex-1 space-y-2 py-1">
								<div class="h-4 bg-muted rounded w-3/4"></div>
								<div class="h-4 bg-muted rounded w-1/2"></div>
							</div>
						</div>
					</div>
				{:else if asyncUserData.error()}
					<div class="p-4 border border-destructive rounded bg-destructive/10">
						<p class="text-destructive font-medium">Error loading data</p>
						<p class="text-sm text-destructive/80">{asyncUserData.error()?.message}</p>
						<Button size="sm" variant="outline" onclick={asyncUserData.retry} class="mt-2">
							Try Again
						</Button>
					</div>
				{:else if asyncUserData.value()}
					{@const user = asyncUserData.value()}
					<div class="p-4 border rounded bg-green-50">
						<h3 class="font-medium">{user.name}</h3>
						<p class="text-sm text-muted-foreground">{user.email}</p>
						<div class="flex items-center gap-2 mt-2">
							<Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
								{user.status}
							</Badge>
							<span class="text-xs text-muted-foreground">ID: {user.id}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- 4. Reactive Array Demo -->
		<div class="space-y-4 p-6 border rounded-lg">
			<div class="flex items-center gap-2">
				<TrendingUp class="h-5 w-5 text-purple-600" />
				<h2 class="text-xl font-semibold">Reactive Array Operations</h2>
			</div>
			
			<div class="space-y-3">
				<div class="flex gap-2">
					<Input
						placeholder="Add new item..."
						bind:value={newItemName}
						onkeydown={(e) => e.key === 'Enter' && addItem()}
					/>
					<Button onclick={addItem} disabled={!newItemName.trim()}>
						<Plus class="h-4 w-4" />
					</Button>
				</div>
				
				<div class="space-y-1 max-h-48 overflow-y-auto">
					{#each items.value as item, index}
						<div class="flex items-center gap-2 p-2 bg-muted rounded">
							<span class="flex-1 text-sm">{item}</span>
							<div class="flex gap-1">
								<Button size="sm" variant="ghost" onclick={() => moveItemUp(index)} disabled={index === 0}>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button size="sm" variant="ghost" onclick={() => moveItemDown(index)} disabled={index === items.length - 1}>
									<ChevronDown class="h-3 w-3" />
								</Button>
								<Button size="sm" variant="ghost" onclick={() => removeItem(index)}>
									<Trash2 class="h-3 w-3" />
								</Button>
							</div>
						</div>
					{:else}
						<div class="p-4 text-center text-muted-foreground">
							No items yet. Add some above!
						</div>
					{/each}
				</div>
				
				<div class="text-xs text-muted-foreground">
					Total items: {items.length} • Optimized array operations
				</div>
			</div>
		</div>
	</div>

	<!-- Advanced Form Demo -->
	<div class="p-6 border rounded-lg space-y-6">
		<div class="flex items-center gap-2">
			<Activity class="h-5 w-5 text-orange-600" />
			<h2 class="text-xl font-semibold">Advanced Form Management</h2>
			<Badge variant="secondary">Progress: {showcaseStats.formProgress.toFixed(0)}%</Badge>
		</div>

		<Progress value={showcaseStats.formProgress} class="h-2" />

		<form onsubmit={demoForm.handleSubmit} class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="title">Task Title *</Label>
					<Input
						id="title"
						bind:value={demoForm.data.title}
						oninput={() => demoForm.setFieldTouched('title')}
						placeholder="Enter task title"
						class={demoForm.errors.title ? 'border-destructive' : ''}
					/>
					{#if demoForm.errors.title}
						<p class="text-sm text-destructive">{demoForm.errors.title}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="category">Category</Label>
					<select
						id="category"
						bind:value={demoForm.data.category}
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="personal">Personal</option>
						<option value="work">Work</option>
						<option value="learning">Learning</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label for="priority">Priority: {demoForm.data.priority}</Label>
					<input
						id="priority"
						type="range"
						min="1"
						max="5"
						bind:value={demoForm.data.priority}
						class="w-full"
					/>
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>Low</span>
						<span>High</span>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="dueDate">Due Date</Label>
					<Input
						id="dueDate"
						type="date"
						bind:value={demoForm.data.dueDate}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<textarea
					id="description"
					bind:value={demoForm.data.description}
					placeholder="Enter task description..."
					rows="3"
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					class:border-destructive={demoForm.errors.description}
				></textarea>
				{#if demoForm.errors.description}
					<p class="text-sm text-destructive">{demoForm.errors.description}</p>
				{/if}
			</div>

			<!-- Tags Management -->
			<div class="space-y-2">
				<Label>Tags</Label>
				<div class="flex gap-2">
					<Input
						bind:value={newTag}
						placeholder="Add tag..."
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
					/>
					<Button type="button" onclick={addTag} disabled={!newTag.trim()}>
						Add
					</Button>
				</div>
				
				{#if formTags.items.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each formTags.items as tag, index}
							<Badge variant="secondary" class="cursor-pointer" onclick={() => formTags.remove(index)}>
								{tag} ×
							</Badge>
						{/each}
					</div>
				{/if}
				
				{#if demoForm.errors.tags}
					<p class="text-sm text-destructive">{demoForm.errors.tags}</p>
				{/if}
			</div>

			<div class="flex justify-between items-center">
				<div class="text-sm text-muted-foreground">
					{demoForm.hasChanges ? 'Unsaved changes' : 'No changes'}
					{#if demoForm.submitCount > 0}
						• {demoForm.submitCount} submissions
					{/if}
				</div>
				
				<div class="flex gap-2">
					<Button 
						type="button" 
						variant="outline" 
						onclick={() => demoForm.resetForm()}
						disabled={demoForm.isSubmitting}
					>
						Reset
					</Button>
					<Button 
						type="submit" 
						disabled={!demoForm.canSubmit || demoForm.isSubmitting}
					>
						{demoForm.isSubmitting ? 'Submitting...' : 'Create Task'}
					</Button>
				</div>
			</div>
		</form>
	</div>

	<!-- Preferences Demo -->
	<div class="p-6 border rounded-lg space-y-4">
		<div class="flex items-center gap-2">
			<Activity class="h-5 w-5 text-indigo-600" />
			<h2 class="text-xl font-semibold">LocalStorage Preferences</h2>
		</div>
		
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="space-y-2">
				<Label>Theme</Label>
				<select
					bind:value={preferences.value.theme}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
					<option value="system">System</option>
				</select>
			</div>

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="animations"
					bind:checked={preferences.value.animations}
					class="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
				/>
				<Label for="animations">Animations</Label>
			</div>

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="notifications"
					bind:checked={preferences.value.notifications}
					class="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
				/>
				<Label for="notifications">Notifications</Label>
			</div>

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="autoSave"
					bind:checked={preferences.value.autoSave}
					class="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
				/>
				<Label for="autoSave">Auto Save</Label>
			</div>
		</div>
		
		<div class="text-xs text-muted-foreground">
			Preferences are automatically synced with localStorage and persist across browser sessions
		</div>
	</div>

	<!-- Controls -->
	<div class="flex justify-center gap-4">
		<Button onclick={() => metricsEnabled = !metricsEnabled}>
			{metricsEnabled ? 'Disable' : 'Enable'} Live Metrics
		</Button>
		
		<Button 
			variant="outline" 
			onclick={() => globalState.addNotification({
				type: 'info',
				title: 'Test Notification',
				message: `Generated at ${new Date().toLocaleTimeString()}`
			})}
		>
			Add Test Notification
		</Button>
		
		<Button 
			variant="outline" 
			onclick={() => globalState.clearAllNotifications()}
		>
			Clear All Notifications
		</Button>
	</div>
</div>