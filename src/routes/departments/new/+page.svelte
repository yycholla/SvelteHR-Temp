<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DepartmentForm from '$lib/components/departments/DepartmentForm.svelte';
	import Button from '$lib/components/base/Button.svelte';
	import { currentUser, hasPermission } from '$lib/services/auth';

	// Check permissions on mount
	onMount(() => {
		// Redirect if user doesn't have permission to create departments
		if (!$currentUser || !hasPermission('department:create')) {
			goto('/departments');
			return;
		}
	});

	function handleSubmit(event: CustomEvent) {
		const department = event.detail;
		// Navigate to the newly created department
		goto(`/departments/${department.id}`);
	}

	function handleCancel() {
		goto('/departments');
	}
</script>

<svelte:head>
	<title>New Department - MountainHR</title>
	<meta name="description" content="Create a new department in your organization" />
</svelte:head>

<div class="new-department-page">
	<div class="page-header">
		<div class="breadcrumb">
			<Button variant="ghost" size="sm" leftIcon="arrow-left" on:click={() => goto('/departments')}>
				Back to Departments
			</Button>
		</div>
	</div>

	<DepartmentForm mode="create" on:submit={handleSubmit} on:cancel={handleCancel} />
</div>

<style lang="postcss">
	.new-department-page {
		@apply w-full space-y-6;
	}

	.page-header {
		@apply flex items-center justify-between;
	}

	.breadcrumb {
		@apply flex items-center space-x-2;
	}
</style>
