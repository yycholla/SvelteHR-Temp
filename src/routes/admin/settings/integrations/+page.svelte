<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle, CheckCircle2, RefreshCw, Link as LinkIcon, Unlink, Upload } from '@lucide/svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	const { data } = $props();

	let syncing = $state(false);
	let pushing = $state(false);
	let disconnecting = $state(false);
	let errorMessage = $state('');

	let syncMessage = $state('');

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

	async function pushToQuickBooks() {
		pushing = true;
		errorMessage = '';
		syncMessage = '';

		try {
			const response = await fetch('/api/intuit/push', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorMessage = result.message || result.error || 'Failed to push employees';
			} else {
				syncMessage = result.message || 'Push completed';
				if (result.errors && result.errors.length > 0) {
					console.log('Push warnings:', result.errors);
				}
				// Reload page after a delay to show the message
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (error) {
			errorMessage = 'Failed to push employees to QuickBooks';
		} finally {
			pushing = false;
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
				{#if data.intuitConnected}
					<Badge variant="default" class="bg-green-600">
						<CheckCircle2 class="h-3 w-3 mr-1" />
						Connected
					</Badge>
				{:else}
					<Badge variant="secondary">
						Not Connected
					</Badge>
				{/if}
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
					<div class="flex gap-2">
						<Button onclick={pushToQuickBooks} disabled={pushing} variant="default">
							{#if pushing}
								<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
								Pushing...
							{:else}
								<Upload class="h-4 w-4 mr-2" />
								Push to QuickBooks
							{/if}
						</Button>
						<Button onclick={syncNow} disabled={syncing} variant="secondary">
							{#if syncing}
								<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
								Syncing...
							{:else}
								<RefreshCw class="h-4 w-4 mr-2" />
								Pull from QuickBooks
							{/if}
						</Button>
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
