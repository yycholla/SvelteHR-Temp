<script lang="ts">
	import { page } from '$app/stores';
	import EmployeeProfile from '$lib/components/employees/EmployeeProfileShadcn.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Get employee ID from URL params
	const employeeId = $derived($page.params.id);

	let error: string | null = $state(null);

	function handleEdit(event: CustomEvent) {
		const { employee } = event.detail;
		goto(`/employees/${employee.id}/edit`);
	}

	function handleDeactivated(event: CustomEvent) {
		const { employee } = event.detail;
		console.log('Employee deactivated:', employee);
		// Could show a success message or refresh data
	}

	function goBack() {
		goto('/employees');
	}
</script>

<svelte:head>
	<title>Employee Profile - SvelteHR</title>
	<meta name="description" content="View employee profile and details" />
</svelte:head>

<div class="space-y-6">
	<!-- Header with back button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button variant="ghost" size="sm" onclick={goBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Employees
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Employee Profile</h1>
				<p class="text-muted-foreground">View and manage employee details and information</p>
			</div>
		</div>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="flex items-start space-x-4">
					<AlertCircle class="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
					<div class="flex-1 space-y-4">
						<div>
							<h3 class="text-lg font-semibold">Error Loading Profile</h3>
							<p class="text-muted-foreground">{error}</p>
						</div>
						<Button variant="outline" onclick={() => window.location.reload()}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Employee Profile Component -->
	<EmployeeProfile
		{employeeId}
		showActions={true}
		onedit={handleEdit}
		ondeactivated={handleDeactivated}
	/>
</div>
