<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		Filter,
		ShieldAlert,
		ShieldCheck,
		AlertTriangle,
		Info,
		Settings
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let rules = $derived(data.rules);
	let failures = $derived(data.failures);
	let summary = $derived(data.summary);
	let filters = $derived(data.filters || {});

	let refreshing = $state(false);
	let selectedEntityType = $state('all');
	let selectedEnabled = $state('all');
	let includeResolved = $state(false);

	$effect(() => {
		if ((filters as any).entityType) selectedEntityType = (filters as any).entityType;
		if ((filters as any).enabled === 'true') selectedEnabled = 'true';
		else if ((filters as any).enabled === 'false') selectedEnabled = 'false';
		if ((filters as any).includeResolved) includeResolved = (filters as any).includeResolved;
	});

	const entityTypes = [
		{ value: 'all', label: 'All Entity Types' },
		{ value: 'employee', label: 'Employee' },
		{ value: 'department', label: 'Department' },
		{ value: 'user', label: 'User' }
	];

	const enabledOptions = [
		{ value: 'all', label: 'All Rules' },
		{ value: 'true', label: 'Enabled Only' },
		{ value: 'false', label: 'Disabled Only' }
	];

	async function refreshData() {
		refreshing = true;
		await invalidate('app:validation');
		refreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedEntityType !== 'all') params.set('entityType', selectedEntityType);
		if (selectedEnabled !== 'all') params.set('enabled', selectedEnabled);
		if (includeResolved) params.set('includeResolved', 'true');
		goto(`?${params.toString()}`);
	}

	function getSeverityVariant(severity: string): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (severity.toUpperCase()) {
			case 'ERROR':
				return 'destructive';
			case 'WARNING':
				return 'secondary';
			case 'INFO':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString();
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold flex items-center gap-2">
				<ShieldAlert class="h-6 w-6" />
				Validation Management
			</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Data quality rules and validation failure monitoring
			</p>
		</div>
		<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
			<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	<!-- Summary Statistics -->
	{#if summary}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Failures</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<AlertCircle class="h-8 w-8 text-orange-500" />
						<p class="text-3xl font-bold">{summary.total}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Errors</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<ShieldAlert class="h-8 w-8 text-red-500" />
						<p class="text-3xl font-bold">{summary.errorCount}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Warnings</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<AlertTriangle class="h-8 w-8 text-yellow-500" />
						<p class="text-3xl font-bold">{summary.warningCount}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Info</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<Info class="h-8 w-8 text-blue-500" />
						<p class="text-3xl font-bold">{summary.infoCount}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- Filters -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Filter class="h-5 w-5" />
				Filters
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Select
					type="single"
					value={selectedEntityType as any}
					onValueChange={(value: any) => {
						selectedEntityType = value;
						applyFilters();
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select entity type" />
					</SelectTrigger>
					<SelectContent>
						{#each entityTypes as type}
							<SelectItem value={type.value}>{type.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>

				<Select
					type="single"
					value={selectedEnabled as any}
					onValueChange={(value: any) => {
						selectedEnabled = value;
						applyFilters();
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						{#each enabledOptions as option}
							<SelectItem value={option.value}>{option.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>

				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="include-resolved"
						bind:checked={includeResolved}
						onchange={applyFilters}
						class="h-4 w-4"
					/>
					<label for="include-resolved" class="text-sm cursor-pointer">
						Include resolved failures
					</label>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Tabs for Rules and Failures -->
	<Tabs value="failures" class="w-full">
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="failures">
				Validation Failures ({failures.length})
			</TabsTrigger>
			<TabsTrigger value="rules">
				Validation Rules ({rules.length})
			</TabsTrigger>
		</TabsList>

		<!-- Validation Failures Tab -->
		<TabsContent value="failures">
			<Card>
				<CardHeader>
					<CardTitle>Validation Failures</CardTitle>
					<CardDescription>Data quality issues detected during sync operations</CardDescription>
				</CardHeader>
				<CardContent>
					{#if failures.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<ShieldCheck class="h-12 w-12 mx-auto mb-3 text-green-500" />
							<p class="font-medium">No validation failures</p>
							<p class="text-sm">All data is passing validation rules</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each failures as failure}
								<div class="border rounded-lg p-4 {failure.resolvedAt ? 'bg-muted/30' : 'bg-background'}">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<Badge variant={getSeverityVariant(failure.severity)}>
													{#if failure.severity === 'ERROR'}
														<ShieldAlert class="h-3 w-3 mr-1" />
													{:else if failure.severity === 'WARNING'}
														<AlertTriangle class="h-3 w-3 mr-1" />
													{:else}
														<Info class="h-3 w-3 mr-1" />
													{/if}
													{failure.severity}
												</Badge>
												<Badge variant="outline" class="capitalize">
													{failure.entityType}
												</Badge>
												{#if failure.resolvedAt}
													<Badge variant="default" class="bg-green-600">
														<CheckCircle2 class="h-3 w-3 mr-1" />
														Resolved
													</Badge>
												{/if}
											</div>
											<p class="text-sm font-medium">{failure.errorMessage}</p>
											<p class="text-xs text-muted-foreground mt-1">
												Field: {failure.fieldName}
												{#if failure.entityId}
													• Entity: {failure.entityId}
												{/if}
											</p>
										</div>
									</div>

									{#if failure.invalidValue}
										<div class="mt-3">
											<span class="text-xs text-muted-foreground">Invalid Value:</span>
											<p class="font-mono text-xs mt-1 p-2 bg-red-50 border border-red-200 rounded">
												{failure.invalidValue}
											</p>
										</div>
									{/if}

									<div class="mt-3 text-xs text-muted-foreground">
										<p>Detected: {formatDate(failure.detectedAt)}</p>
										{#if failure.resolvedAt}
											<p class="text-green-600">
												Resolved: {formatDate(failure.resolvedAt)}
												{#if failure.resolution}
													• {failure.resolution}
												{/if}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Validation Rules Tab -->
		<TabsContent value="rules">
			<Card>
				<CardHeader>
					<CardTitle>Validation Rules</CardTitle>
					<CardDescription>Active data quality validation rules</CardDescription>
				</CardHeader>
				<CardContent>
					{#if rules.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Settings class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No validation rules</p>
							<p class="text-sm">No validation rules configured</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each rules as rule}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<p class="font-medium">{rule.name}</p>
												<Badge variant={rule.enabled ? 'default' : 'secondary'}>
													{rule.enabled ? 'Enabled' : 'Disabled'}
												</Badge>
												<Badge variant={getSeverityVariant(rule.severity)}>
													{rule.severity}
												</Badge>
											</div>
											{#if rule.description}
												<p class="text-sm text-muted-foreground">{rule.description}</p>
											{/if}
										</div>
									</div>

									<div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										<div>
											<span class="text-muted-foreground">Entity Type:</span>
											<p class="font-medium capitalize">{rule.entityType}</p>
										</div>
										<div>
											<span class="text-muted-foreground">Field:</span>
											<p class="font-medium">{rule.fieldName}</p>
										</div>
										<div>
											<span class="text-muted-foreground">Rule Type:</span>
											<p class="font-medium capitalize">{rule.ruleType.replace(/_/g, ' ')}</p>
										</div>
										<div>
											<span class="text-muted-foreground">Auto-Fix:</span>
											<p class="font-medium capitalize">{rule.autoFixStrategy.replace(/_/g, ' ')}</p>
										</div>
									</div>

									<div class="mt-3 p-3 bg-muted rounded text-sm">
										<span class="text-muted-foreground">Condition:</span>
										<p class="font-mono text-xs mt-1">{rule.condition}</p>
									</div>

									<div class="mt-3 text-xs text-muted-foreground">
										Created: {formatDate(rule.createdAt)}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</div>
