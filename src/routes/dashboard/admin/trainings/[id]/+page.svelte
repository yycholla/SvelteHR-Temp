<script lang="ts">
	import { enhance } from '$app/forms';
	import { logger } from '$lib/utils/logger';
	import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// Import decomposed components
	import TrainingHeader from './components/TrainingHeader.svelte';
	import TrainingEditForm from './components/TrainingEditForm.svelte';
	import TrainingAssignments from './components/TrainingAssignments.svelte';

	const { data, form } = $props();
	const { training, allUsers, departments, assignments } = data;

	let submitting = $state(false);
	let isActive = $state(training.isActive);
	let tags = $state<string[]>(training.tags || []);
	let selectedUsersToAssign = $state<string[]>([]);
	let selectedDepartmentsToAssign = $state<string[]>([]);
	let assignmentType = $state<'user' | 'department' | 'all'>('user');
	let assignmentDueDate = $state<string | undefined>(undefined);
	let isAssigning = $state(false);
	let searchTerms = $state<string[]>([]);
	let recurrencePattern = $state(
		training.rrule
			? ({
					frequency: 'weekly',
					interval: 1,
					endDate: training.recurrenceEndDate ? new Date(training.recurrenceEndDate) : null,
					rruleString: training.rrule
				} as any)
			: null
	);

	// Transform allUsers for MultiSearchInput options
	const userOptions = allUsers.map((user: any) => {
		const displayName = user.displayName || '';
		const firstName = user.firstName || '';
		const lastName = user.lastName || '';
		const email = user.email || '';

		const primaryName = displayName || `${firstName} ${lastName}`.trim() || email;
		const label =
			displayName || `${firstName} ${lastName}`.trim() ? `${primaryName} (${email})` : email;

		return {
			value: user.id,
			label
		};
	});

	// Transform departments for Select options
	const departmentOptions = departments.map((dept: any) => ({
		value: dept.id,
		label: dept.name
	}));

	async function handleAssign() {
		if (isAssigning) return;
		isAssigning = true;

		try {
			let successCount = 0;
			let failCount = 0;

			if (assignmentType === 'user') {
				// Assign to multiple users
				for (const userId of selectedUsersToAssign) {
					const formData = new FormData();
					formData.append('userId', userId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assign', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			} else if (assignmentType === 'department') {
				// Assign to multiple departments
				for (const departmentId of selectedDepartmentsToAssign) {
					const formData = new FormData();
					formData.append('departmentId', departmentId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assignToDepartment', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			} else if (assignmentType === 'all') {
				// Assign to all employees
				const formData = new FormData();
				if (assignmentDueDate) {
					formData.append('dueDate', new Date(assignmentDueDate).toISOString());
				}

				const response = await fetch('?/assignToAllEmployees', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					const result = await response.json();
					if (result.type === 'success' && result.data?.message) {
						alert(result.data.message);
					}
				}
			}

			if (assignmentType !== 'all') {
				if (successCount > 0) {
					alert(
						`Successfully assigned to ${successCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
					);
				}
				if (failCount > 0) {
					alert(
						`Failed to assign ${failCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
					);
				}
			}

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			alert('An error occurred during assignment');
			logger.error('Assignment error:', error as Error);
		} finally {
			isAssigning = false;
			selectedUsersToAssign = [];
			selectedDepartmentsToAssign = [];
			assignmentDueDate = undefined;
		}
	}

	async function handleUnassignUser(assignmentId: string) {
		isAssigning = true;
		const formData = new FormData();
		formData.append('assignmentId', assignmentId);

		try {
			const response = await fetch(`?/unassign`, {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				goto($page.url.pathname, { invalidateAll: true });
			} else {
				const result = await response.json();
				alert(`Failed to unassign user: ${result.error}`);
			}
		} catch (error) {
			alert('An error occurred during unassignment');
		} finally {
			isAssigning = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Training - {training.title}</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-10">
	<TrainingHeader
		trainingId={training.id}
		title={training.title}
	/>

	{#if form?.error}
		<Alert.Root variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if form?.success}
		<Alert.Root
			variant="default"
			class="mb-6 border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
		>
			<CheckCircle2 class="h-4 w-4" />
			<Alert.Title>Success</Alert.Title>
			<Alert.Description>Training updated successfully!</Alert.Description>
		</Alert.Root>
	{/if}

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<!-- Hidden inputs for complex bindings -->
		<input type="hidden" name="isActive" value={isActive ? 'on' : 'off'} />
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="recurrencePattern" value={JSON.stringify(recurrencePattern)} />

		<TrainingEditForm
			{training}
			bind:isActive
			bind:tags
			bind:recurrencePattern
		/>

		<TrainingAssignments
			{assignments}
			{userOptions}
			{departmentOptions}
			bind:assignmentType
			bind:selectedUsersToAssign
			bind:selectedDepartmentsToAssign
			bind:assignmentDueDate
			bind:searchTerms
			{isAssigning}
			onAssign={handleAssign}
			onUnassign={handleUnassignUser}
		/>

		<div class="flex justify-end gap-2 pb-10">
			<Button variant="ghost" href="/dashboard/admin/trainings" disabled={submitting}>Back</Button>
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save Changes
				{/if}
			</Button>
		</div>
	</form>
</div>