<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// Import decomposed components
	import OnboardingHeader from './components/OnboardingHeader.svelte';
	import OnboardingOverview from './components/OnboardingOverview.svelte';
	import OnboardingAssignments from './components/OnboardingAssignments.svelte';

	const { data } = $props();

	const completedAssignments = data.assignments.filter((a: any) => a.completedAt).length;
	const totalAssignments = data.assignments.length;
	const completionRate =
		totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

	// Assignment state
	let selectedUsersToAssign = $state<string[]>([]);
	let selectedDepartmentsToAssign = $state<string[]>([]);
	let assignmentType = $state<'user' | 'department'>('user');
	let assignmentDueDate = $state<string | undefined>(undefined);
	let isAssigning = $state(false);
	let searchTerms = $state<string[]>([]);

	// Transform allUsers for MultiSearchInput options
	const userOptions = data.allUsers.map((user: any) => {
		const displayName = user.displayName || user.display_name || '';
		const firstName = user.firstName || user.first_name || '';
		const lastName = user.lastName || user.last_name || '';
		const email = user.email || '';

		// Primary display name
		const primaryName = displayName || `${firstName} ${lastName}`.trim() || email;

		// Include email in label for searchability (MultiSearchInput only searches label field)
		// Format: "Display Name (email@example.com)" or just "email@example.com" if no name
		const label =
			displayName || `${firstName} ${lastName}`.trim() ? `${primaryName} (${email})` : email;

		return {
			value: user.id,
			label
		};
	});

	// Debug: Log user options to console
	logger.info('[ONBOARDING] User options', { sampleOptions: userOptions.slice(0, 5) });

	// Transform departments for Select options
	const departmentOptions = data.departments.map((dept: any) => ({
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
			}

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

	onMount(() => {
		logger.info('[ONBOARDING DETAIL] Component mounted', {
			moduleId: data.module.id,
			url: $page.url.href,
			pathname: $page.url.pathname,
			timestamp: new Date().toISOString()
		});

		// Listen for navigation events
		const handlePopState = (event: PopStateEvent) => {
			logger.info('[ONBOARDING DETAIL] PopState event detected', {
				event,
				url: window.location.href,
				timestamp: new Date().toISOString()
			});
		};

		const handleBeforeUnload = () => {
			logger.info('[ONBOARDING DETAIL] Page unloading', {
				url: window.location.href,
				timestamp: new Date().toISOString()
			});
		};

		window.addEventListener('popstate', handlePopState);
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	onDestroy(() => {
		if (browser) {
			logger.info('[ONBOARDING DETAIL] Component destroying', {
				url: $page.url.href,
				timestamp: new Date().toISOString()
			});
		}
	});

	// Track page store changes
	$effect(() => {
		if (browser) {
			logger.info('[ONBOARDING DETAIL] Page store changed', {
				url: $page.url.href,
				pathname: $page.url.pathname,
				timestamp: new Date().toISOString()
			});
		}
	});
</script>

<svelte:head>
	<title>{data.module.title} - Onboarding - MountainHR</title>
</svelte:head>

<div class="container mx-auto py-8 max-w-6xl px-4">
	<OnboardingHeader module={data.module} />

	<OnboardingOverview
		module={data.module}
		contentBlocks={data.contentBlocks}
		stats={{
			total: totalAssignments,
			completed: completedAssignments,
			rate: completionRate
		}}
	/>

	<OnboardingAssignments
		assignments={data.assignments}
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
</div>