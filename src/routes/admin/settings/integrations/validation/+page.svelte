<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import {
		AlertTriangle,
		CheckCircle2,
		RefreshCw,
		AlertCircle,
		Database
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let validationErrors = $state(data.validationErrors || []);
	let editingEmail = $state<{ [key: string]: string }>({});
	let loading = $state<{ [key: string]: boolean }>({});

	async function importWithEmail(error: ValidationError) {
		const email = editingEmail[error.id];
		if (!email || !email.includes('@')) {
			toast.error('Please enter a valid email address');
			return;
		}

		loading[error.id] = true;

		try {
			const response = await fetch('/api/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation ImportEmployeeWithEmail($quickbooksId: String!, $email: String!) {
							employeeImport {
								importEmployeeWithEmail(quickbooksId: $quickbooksId, email: $email) {
									success
									message
									employeeId
									employeeName
								}
							}
						}
					`,
					variables: {
						quickbooksId: error.entityId,
						email: email
					}
				})
			});

			const result = await response.json();

			if (result.data?.employeeImport?.importEmployeeWithEmail?.success) {
				toast.success(result.data.employeeImport.importEmployeeWithEmail.message);
				validationErrors = validationErrors.filter((e: ValidationError) => e.id !== error.id);
				delete editingEmail[error.id];
			} else {
				toast.error(result.data?.employeeImport?.importEmployeeWithEmail?.message || 'Failed to import employee');
			}
		} catch (err) {
			toast.error('Failed to import employee: ' + err);
		} finally {
			loading[error.id] = false;
		}
	}

	function getSeverityColor(
		severity: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (severity.toLowerCase()) {
			case 'error':
			case 'critical':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'default';
		}
	}

	interface ValidationError {
		id: string;
		ruleId: string;
		entityType: string;
		entityId: string;
		fieldName: string;
		invalidValue?: string;
		errorMessage: string;
		severity: string;
		detectedAt: string;
		resolvedAt?: string;
		resolution?: string;
	}

	function getEmployeeName(error: ValidationError): string {
		// Employee name is stored in invalidValue field
		return error.invalidValue || 'Unknown Employee';
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Validation Errors</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<AlertTriangle class="h-3.5 w-3.5" />
				<span>QuickBooks Data Quality</span>
			</div>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => (validationErrors = data.validationErrors || [])}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<RefreshCw class="h-3.5 w-3.5" />
				Refresh
			</button>
		</div>
	</header>

	<div class="flex-1 overflow-auto bg-muted/5">
		<!-- KPI Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 border-b">
			<!-- Total Errors -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Total Errors</span
					>
					<AlertTriangle class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight {validationErrors.length > 0 ? 'text-red-600' : 'text-green-600'}">
						{validationErrors.length}
					</div>
					<div class="mt-1 text-xs text-muted-foreground">Validation issues</div>
				</div>
			</div>

			<!-- Unresolved -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Unresolved</span
					>
					<AlertCircle class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight text-orange-600">
						{validationErrors.filter((e: ValidationError) => !e.resolvedAt).length}
					</div>
					<div class="mt-1 text-xs text-muted-foreground">Require attention</div>
				</div>
			</div>

			<!-- Resolved -->
			<div class="p-6 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Resolved</span
					>
					<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight text-green-600">
						{validationErrors.filter((e: ValidationError) => e.resolvedAt).length}
					</div>
					<div class="mt-1 text-xs text-muted-foreground">Successfully fixed</div>
				</div>
			</div>
		</div>

		{#if validationErrors.length === 0}
			<!-- Empty State -->
			<div class="bg-background border-t">
				<div class="px-4 py-12 text-center text-muted-foreground">
					<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500/50" />
					<p class="font-medium text-xs">No validation errors</p>
					<p class="text-[10px] mt-1">All employees have valid data</p>
				</div>
			</div>
		{:else}
			<!-- Errors Table -->
			<div class="bg-background border-t">
				<div class="px-4 py-3 border-b">
					<h2 class="text-sm font-semibold">Validation Issues</h2>
					<p class="text-xs text-muted-foreground mt-0.5">
						Resolve data quality issues to enable employee import
					</p>
				</div>
				<div class="relative">
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Employee</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Severity</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Issue</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Field</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Detected</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each validationErrors as error (error.id)}
								<tr class="hover:bg-muted/30 group {error.resolvedAt ? 'bg-muted/20' : ''}">
									<td class="px-3 py-2 border-r last:border-r-0">
										<div class="font-medium text-xs">{getEmployeeName(error)}</div>
										<div class="text-[10px] text-muted-foreground">
											{error.fieldName} • QuickBooks
										</div>
									</td>
									<td class="px-3 py-2 border-r last:border-r-0">
										<Badge variant={getSeverityColor(error.severity)} class="text-[10px]">
											{error.severity}
										</Badge>
									</td>
									<td class="px-3 py-2 border-r last:border-r-0">
										<div class="max-w-md">
											<p class="text-xs">{error.errorMessage}</p>
										</div>
									</td>
									<td class="px-3 py-2 border-r last:border-r-0">
										<span class="text-xs font-medium">{error.fieldName}</span>
									</td>
									<td class="px-3 py-2 border-r last:border-r-0">
										<div class="text-xs text-muted-foreground">
											{new Date(error.detectedAt).toLocaleDateString()}
										</div>
										<div class="text-[10px] text-muted-foreground">
											{new Date(error.detectedAt).toLocaleTimeString()}
										</div>
									</td>
									<td class="px-3 py-2 text-right">
										<div class="flex gap-1 justify-end items-center">
											{#if error.resolvedAt}
												<span
													class="text-[10px] text-green-600 font-medium flex items-center mr-2"
												>
													<CheckCircle2 class="h-3 w-3 mr-0.5" />
													Resolved
												</span>
											{:else if error.fieldName === 'email'}
												<div class="flex gap-2 items-center">
													<Input
														id="email-{error.id}"
														type="email"
														placeholder="email@company.com"
														bind:value={editingEmail[error.id]}
														disabled={loading[error.id]}
														class="h-7 w-48 text-xs"
													/>
													<button
														onclick={() => importWithEmail(error)}
														disabled={loading[error.id] || !editingEmail[error.id]}
														class="flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
													>
														{#if loading[error.id]}
															<RefreshCw class="h-3 w-3 animate-spin" />
															Importing...
														{:else}
															Import
														{/if}
													</button>
												</div>
											{/if}
										</div>
									</td>
								</tr>
								{#if error.fieldName === 'email' && !error.resolvedAt}
									<tr class="bg-muted/10">
										<td colspan="6" class="px-3 py-2">
											<p class="text-[10px] text-muted-foreground">
												<AlertCircle class="h-3 w-3 inline mr-1" />
												This will create the employee account with the provided email and link them to
												QuickBooks
											</p>
										</td>
									</tr>
								{/if}
								{#if error.resolvedAt}
									<tr class="bg-green-50/50">
										<td colspan="6" class="px-3 py-2">
											<p class="text-[10px] text-green-600">
												<CheckCircle2 class="h-3 w-3 inline mr-1" />
												Resolved on {new Date(error.resolvedAt).toLocaleString()}
												{#if error.resolution}- {error.resolution}{/if}
											</p>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>
