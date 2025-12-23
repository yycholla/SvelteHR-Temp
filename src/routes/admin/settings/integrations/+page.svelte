<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle, CheckCircle2, RefreshCw, Link as LinkIcon, Unlink, Upload, Download, RotateCcw } from '@lucide/svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	const { data } = $props();

	let syncing = $state(false);
	let pushingDepartments = $state(false);
	let pushingEmployees = $state(false);
	let pushingAll = $state(false);
	let updatingEmployeeDepartments = $state(false);
	let pullingDepartments = $state(false);
	let pullingEmployees = $state(false);
	let pullingAll = $state(false);
	let disconnecting = $state(false);
	let resettingForTest = $state(false);
	let errorMessage = $state('');

	let syncMessage = $state('');

	// Two-way sync state
	let syncingBidirectional = $state(false);
	let selectedConflictStrategy = $state('LAST_WRITE_WINS');
	let selectedEntityType = $state<'EMPLOYEE' | 'DEPARTMENT' | null>(null);

	// Check if we're in development mode
	const isDev = import.meta.env.DEV;

	async function syncNow() {
		syncing = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/sync', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to sync';
			} else {
				syncMessage = result.message || 'Sync completed';
				if (result.errors && result.errors.length > 0) {
					console.log('Sync warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to sync with QuickBooks';
		} finally {
			syncing = false;
		}
	}

	async function pushDepartments() {
		pushingDepartments = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/push?type=departments', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to push departments';
			} else {
				syncMessage = result.message || 'Departments pushed successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Push warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to push departments to QuickBooks';
		} finally {
			pushingDepartments = false;
		}
	}

	async function pushEmployees() {
		pushingEmployees = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/push?type=employees', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to push employees';
			} else {
				syncMessage = result.message || 'Employees pushed successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Push warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to push employees to QuickBooks';
		} finally {
			pushingEmployees = false;
		}
	}

	async function pushAll() {
		pushingAll = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/push?type=all', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to push data';
			} else {
				syncMessage = result.message || 'Push completed successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Push warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to push data to QuickBooks';
		} finally {
			pushingAll = false;
		}
	}

	async function updateEmployeeDepartments() {
		updatingEmployeeDepartments = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/push?type=employee-departments', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to update employee departments';
			} else {
				syncMessage = result.message || 'Employee departments updated successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Update warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to update employee departments in QuickBooks';
		} finally {
			updatingEmployeeDepartments = false;
		}
	}

	async function pullDepartments() {
		pullingDepartments = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/pull?type=departments', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to pull departments';
			} else {
				syncMessage = result.message || 'Departments pulled successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Pull warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to pull departments from QuickBooks';
		} finally {
			pullingDepartments = false;
		}
	}

	async function pullEmployees() {
		pullingEmployees = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/pull?type=employees', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to pull employees';
			} else {
				syncMessage = result.message || 'Employees pulled successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Pull warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to pull employees from QuickBooks';
		} finally {
			pullingEmployees = false;
		}
	}

	async function pullAll() {
		pullingAll = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/pull?type=all', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to pull data';
			} else {
				syncMessage = result.message || 'Pull completed successfully';
				if (result.errors && result.errors.length > 0) {
					console.log('Pull warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to pull data from QuickBooks';
		} finally {
			pullingAll = false;
		}
	}

	async function syncBidirectional(entityType: 'EMPLOYEE' | 'DEPARTMENT') {
		if (!confirm(`This will sync ${entityType.toLowerCase()}s in both directions, applying the ${selectedConflictStrategy.replace(/_/g, ' ').toLowerCase()} strategy for conflicts. Continue?`)) {
			return;
		}

		syncingBidirectional = true;
		selectedEntityType = entityType;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/sync-bidirectional', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					entityType,
					conflictStrategy: selectedConflictStrategy
				})
			});

			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to perform bidirectional sync';
			} else {
				const { pushed_count = 0, pulled_count = 0, conflicts_resolved = 0, errors = [] } = result;
				syncMessage = `Bidirectional sync completed: ${pushed_count} pushed, ${pulled_count} pulled, ${conflicts_resolved} conflicts resolved`;

				if (errors.length > 0) {
					console.warn('Sync errors:', errors);
					errorMessage = `Completed with ${errors.length} error(s). Check console for details.`;
				}

				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 3000);
			}
		} catch (error) {
			errorMessage = 'Failed to perform bidirectional sync';
		} finally {
			syncingBidirectional = false;
			selectedEntityType = null;
		}
	}

	async function resetForTesting() {
		if (!confirm('This will reset QuickBooks IDs for all departments and up to 5 employees so they can be re-synced. Continue?')) {
			return;
		}

		resettingForTest = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/reset-test', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to reset for testing';
			} else {
				syncMessage = result.message || `Reset ${result.resetCount || 0} item(s) for testing. You can now re-push them.`;
			}
		} catch (error) {
			errorMessage = 'Failed to reset sync status';
		} finally {
			resettingForTest = false;
		}
	}

	async function disconnectIntuit() {
		if (!confirm('Are you sure you want to disconnect from QuickBooks? This will stop all data synchronization.')) {
			return;
		}

		disconnecting = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/intuit/disconnect', { method: 'POST' });

			if (!response.ok) {
				const result = await response.json();
				errorMessage = result.error || 'Failed to disconnect';
			} else {
				window.location.reload();
			}
		} catch (error) {
			errorMessage = 'Failed to disconnect from QuickBooks';
		} finally {
			disconnecting = false;
		}
	}
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">Integrations</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Connect external services to sync data and automate workflows
		</p>
	</div>

	{#if errorMessage}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{errorMessage}</AlertDescription>
		</Alert>
	{/if}

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if syncMessage}
		<Alert class="mb-6 border-green-600 bg-green-50 text-green-900">
			<CheckCircle2 class="h-4 w-4 text-green-600" />
			<AlertDescription>{syncMessage}</AlertDescription>
		</Alert>
	{/if}

	<!-- QuickBooks Integration -->
	<Card>
		<CardHeader>
			<div class="flex items-start justify-between">
				<div>
					<CardTitle class="flex items-center gap-2">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="24" height="24" rx="4" fill="#2CA01C"/>
							<path d="M8 6h8v12H8V6z" fill="white"/>
						</svg>
						QuickBooks / Intuit Workforce
					</CardTitle>
					<CardDescription class="mt-1.5">
						Sync employee data and payroll information with QuickBooks
					</CardDescription>
				</div>
				<div class="flex flex-col items-end gap-2">
					{#if data.intuitConnected}
						<Badge variant="default" class="bg-green-600">
							<CheckCircle2 class="h-3 w-3 mr-1" />
							Connected
						</Badge>
						<a
							href="/admin/settings/integrations/sync-status"
							class="text-xs text-blue-600 hover:text-blue-800 underline"
						>
							📊 View Sync Dashboard
						</a>
					{:else}
						<Badge variant="secondary">
							Not Connected
						</Badge>
					{/if}
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if data.intuitConnected}
				<div class="space-y-4">
					<!-- Connection Details -->
					<div class="rounded-lg border bg-muted/50 p-4 space-y-2">
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Company</span>
							<span class="font-medium">{data.intuitCompanyName || 'QuickBooks Company'}</span>
						</div>
						{#if data.intuitLastSync}
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Last Synced</span>
								<span class="font-medium">
									{new Date(data.intuitLastSync).toLocaleString()}
								</span>
							</div>
						{/if}
						{#if data.intuitRealmId}
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Realm ID</span>
								<span class="font-mono text-xs">{data.intuitRealmId}</span>
							</div>
						{/if}
					</div>

					<!-- Features -->
					<div class="space-y-2">
						<p class="text-sm font-medium">Active Features:</p>
						<ul class="space-y-1 text-sm text-muted-foreground">
							<li class="flex items-center gap-2">
								<CheckCircle2 class="h-4 w-4 text-green-600" />
								Employee data synchronization
							</li>
							<li class="flex items-center gap-2">
								<CheckCircle2 class="h-4 w-4 text-green-600" />
								Automatic payroll updates
							</li>
							<li class="flex items-center gap-2">
								<CheckCircle2 class="h-4 w-4 text-green-600" />
								New hire onboarding → QuickBooks
							</li>
						</ul>
					</div>

					<!-- Actions -->
					<div class="space-y-3">
						<div>
							<p class="text-sm font-medium mb-2">Push to QuickBooks:</p>
							<div class="flex flex-wrap gap-2">
								<Button onclick={pushDepartments} disabled={pushingDepartments || pushingAll} variant="default" size="sm">
									{#if pushingDepartments}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pushing...
									{:else}
										<Upload class="h-4 w-4 mr-2" />
										Departments
									{/if}
								</Button>
								<Button onclick={pushEmployees} disabled={pushingEmployees || pushingAll} variant="default" size="sm">
									{#if pushingEmployees}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pushing...
									{:else}
										<Upload class="h-4 w-4 mr-2" />
										Employees
									{/if}
								</Button>
								<Button onclick={pushAll} disabled={pushingAll || pushingDepartments || pushingEmployees} variant="default" size="sm">
									{#if pushingAll}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pushing All...
									{:else}
										<Upload class="h-4 w-4 mr-2" />
										All Data
									{/if}
								</Button>
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								Note: Employees are created without department assignments due to QuickBooks API limitations.
							</p>
						</div>
						<div>
							<p class="text-sm font-medium mb-2">Update in QuickBooks:</p>
							<div class="flex flex-wrap gap-2">
								<Button onclick={updateEmployeeDepartments} disabled={updatingEmployeeDepartments} variant="secondary" size="sm">
									{#if updatingEmployeeDepartments}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Updating...
									{:else}
										<RefreshCw class="h-4 w-4 mr-2" />
										Employee Departments
									{/if}
								</Button>
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								Updates existing QuickBooks employees with their department assignments.
							</p>
						</div>
						<div>
							<p class="text-sm font-medium mb-2">Pull from QuickBooks:</p>
							<div class="flex flex-wrap gap-2">
								<Button onclick={pullDepartments} disabled={pullingDepartments || pullingAll} variant="secondary" size="sm">
									{#if pullingDepartments}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pulling...
									{:else}
										<Download class="h-4 w-4 mr-2" />
										Departments
									{/if}
								</Button>
								<Button onclick={pullEmployees} disabled={pullingEmployees || pullingAll} variant="secondary" size="sm">
									{#if pullingEmployees}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pulling...
									{:else}
										<Download class="h-4 w-4 mr-2" />
										Employees
									{/if}
								</Button>
								<Button onclick={pullAll} disabled={pullingAll || pullingDepartments || pullingEmployees} variant="secondary" size="sm">
									{#if pullingAll}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Pulling All...
									{:else}
										<Download class="h-4 w-4 mr-2" />
										All Data
									{/if}
								</Button>
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								Import data from QuickBooks into the HR system. Existing records will be updated, new ones will be created.
							</p>
						</div>

						<!-- Two-Way Sync Section -->
						<div class="border-t pt-4 mt-4">
							<p class="text-sm font-medium mb-2 flex items-center gap-2">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
								</svg>
								Two-Way Sync (with Conflict Resolution):
							</p>

							<!-- Conflict Strategy Selector -->
							<div class="mb-3">
								<div class="flex items-center justify-between mb-1">
									<label for="conflict-strategy" class="text-xs font-medium text-muted-foreground">Conflict Strategy:</label>
									<a
										href="/admin/settings/integrations/conflicts"
										class="text-xs text-blue-600 hover:text-blue-800 underline"
									>
										View Conflicts →
									</a>
								</div>
								<select
									id="conflict-strategy"
									bind:value={selectedConflictStrategy}
									class="w-full max-w-md text-sm border rounded-md px-3 py-1.5 bg-background"
									disabled={syncingBidirectional}
								>
									<option value="LAST_WRITE_WINS">Last Write Wins (Recommended) - Use most recent change</option>
									<option value="LOCAL_WINS">Local Wins - Keep HR system changes</option>
									<option value="REMOTE_WINS">QuickBooks Wins - Keep QuickBooks changes</option>
									<option value="MANUAL_REVIEW">Manual Review - Mark conflicts for review</option>
								</select>
								<p class="text-xs text-muted-foreground mt-1">
									{#if selectedConflictStrategy === 'LAST_WRITE_WINS'}
										When conflicts occur, the most recently modified version will be kept based on timestamps.
									{:else if selectedConflictStrategy === 'LOCAL_WINS'}
										Local changes will always override QuickBooks changes.
									{:else if selectedConflictStrategy === 'REMOTE_WINS'}
										QuickBooks changes will always override local changes.
									{:else}
										Conflicts will be marked for manual review and not automatically resolved.
									{/if}
								</p>
							</div>

							<!-- Sync Buttons -->
							<div class="flex flex-wrap gap-2">
								<Button
									onclick={() => syncBidirectional('EMPLOYEE')}
									disabled={syncingBidirectional}
									variant="default"
									size="sm"
									class="bg-blue-600 hover:bg-blue-700"
								>
									{#if syncingBidirectional && selectedEntityType === 'EMPLOYEE'}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Syncing...
									{:else}
										<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
										</svg>
										Employees
									{/if}
								</Button>

								<Button
									onclick={() => syncBidirectional('DEPARTMENT')}
									disabled={syncingBidirectional}
									variant="default"
									size="sm"
									class="bg-blue-600 hover:bg-blue-700"
								>
									{#if syncingBidirectional && selectedEntityType === 'DEPARTMENT'}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Syncing...
									{:else}
										<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
										</svg>
										Departments
									{/if}
								</Button>
							</div>

							<div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
								<p class="text-xs text-blue-900">
									<strong>Two-way sync</strong> detects changes on both sides and synchronizes them bidirectionally.
									Changes made locally will be pushed to QuickBooks, and changes made in QuickBooks will be pulled here.
									Conflicts are resolved using the selected strategy.
								</p>
							</div>
						</div>

						{#if isDev}
							<div>
								<p class="text-sm font-medium mb-2 text-orange-600">Development Tools:</p>
								<Button onclick={resetForTesting} disabled={resettingForTest} variant="outline" size="sm" class="border-orange-300 text-orange-700 hover:bg-orange-50">
									{#if resettingForTest}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Resetting...
									{:else}
										<RotateCcw class="h-4 w-4 mr-2" />
										Reset Departments & Employees
									{/if}
								</Button>
								<p class="text-xs text-muted-foreground mt-1">Clears QuickBooks IDs from all departments and 5 employees to re-test sync</p>
							</div>
						{/if}
						<div class="flex gap-2">
							<Button onclick={disconnectIntuit} disabled={disconnecting} variant="destructive">
								{#if disconnecting}
									<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
									Disconnecting...
								{:else}
									<Unlink class="h-4 w-4 mr-2" />
									Disconnect
								{/if}
							</Button>
						</div>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Benefits -->
					<div class="space-y-2">
						<p class="text-sm font-medium">Connect QuickBooks to:</p>
						<ul class="space-y-1 text-sm text-muted-foreground">
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
								Automatically sync employee data to payroll
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
								New hires auto-created in QuickBooks
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
								PTO requests sync to payroll
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
								Employees can view pay stubs in HR portal
							</li>
						</ul>
					</div>

					<!-- Connect Button -->
					<a href="/api/intuit/connect" class="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
						<LinkIcon class="h-4 w-4 mr-2" />
						Connect to QuickBooks
					</a>

					<!-- Note -->
					<Alert>
						<AlertCircle class="h-4 w-4" />
						<AlertDescription>
							You'll be redirected to QuickBooks to authorize access. This is secure and you can revoke access at any time.
						</AlertDescription>
					</Alert>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Future Integrations -->
	<div class="mt-6">
		<h2 class="text-lg font-semibold mb-4">Coming Soon</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Slack -->
			<Card class="opacity-60">
				<CardHeader>
					<CardTitle class="text-base flex items-center gap-2">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
							<path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
						</svg>
						Slack
						<Badge variant="outline" class="ml-auto">Coming Soon</Badge>
					</CardTitle>
					<CardDescription>Notifications and team communication</CardDescription>
				</CardHeader>
			</Card>

			<!-- Google Workspace -->
			<Card class="opacity-60">
				<CardHeader>
					<CardTitle class="text-base flex items-center gap-2">
						<svg class="h-5 w-5" viewBox="0 0 24 24">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
						</svg>
						Google Workspace
						<Badge variant="outline" class="ml-auto">Coming Soon</Badge>
					</CardTitle>
					<CardDescription>SSO and calendar integration</CardDescription>
				</CardHeader>
			</Card>
		</div>
	</div>
</div>
