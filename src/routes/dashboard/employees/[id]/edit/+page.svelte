<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, hasPermission } from '$lib/stores/auth';
	import { userService } from '$lib/services/userService';
	import EmployeeForm from '$lib/components/employees/EmployeeFormShadcn.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-svelte';
	import type { User } from '$lib/types';

	// Get employee ID from URL params
	const employeeId = $derived($page.params.id);

	let employee: User | null = $state(null);
	let loading = $state(false);
	let error: string | null = $state(null);
	let formLoading = $state(false);

	// Check if user can edit this employee
	const canEdit = $derived(
		$currentUser && ($currentUser.id === employeeId || hasPermission('edit_users'))
	);

	// Check permissions and load employee data
	onMount(async () => {
		if (!$currentUser) {
			goto('/login');
			return;
		}

		if (!canEdit) {
			goto(`/employees/${employeeId}`);
			return;
		}

		await loadEmployee();
	});

	async function loadEmployee() {
		try {
			loading = true;
			error = null;
			employee = await userService.getUserDetails(employeeId);
		} catch (err: any) {
			error = err.message;
			employee = null;
		} finally {
			loading = false;
		}
	}

	function handleSuccess(event: CustomEvent) {
		const { employee: updatedEmployee } = event.detail;
		console.log('Employee updated successfully:', updatedEmployee);

		// Redirect back to employee profile
		goto(`/employees/${updatedEmployee.id}`);
	}

	function handleError(event: CustomEvent) {
		error = event.detail.message;
		formLoading = false;
	}

	function handleCancel() {
		goto(`/employees/${employeeId}`);
	}

	function goBack() {
		goto(`/employees/${employeeId}`);
	}
</script>

<svelte:head>
	<title>Edit Employee - SvelteHR</title>
	<meta name="description" content="Edit employee profile and information" />
</svelte:head>

<div class="space-y-6">
	<!-- Header with back button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button variant="ghost" size="sm" onclick={goBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Profile
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">
					{employee ? `Edit ${employee.displayName}` : 'Edit Employee'}
				</h1>
				<p class="text-muted-foreground">Update employee information and profile details</p>
			</div>
		</div>
	</div>

	{#if loading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-12">
				<div class="flex flex-col items-center space-y-4">
					<RefreshCw class="h-8 w-8 animate-spin text-muted-foreground" />
					<p class="text-muted-foreground">Loading employee data...</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="flex items-start space-x-4">
					<AlertCircle class="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
					<div class="flex-1 space-y-4">
						<div>
							<h3 class="text-lg font-semibold">Error Loading Employee</h3>
							<p class="text-muted-foreground">{error}</p>
						</div>
						<Button variant="outline" onclick={loadEmployee}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if employee}
		<EmployeeForm
			{employee}
			isEditing={true}
			loading={formLoading}
			onsuccess={handleSuccess}
			onerror={handleError}
			oncancel={handleCancel}
		/>
	{/if}
</div>
