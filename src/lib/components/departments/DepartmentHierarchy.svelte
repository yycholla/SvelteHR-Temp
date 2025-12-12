<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolveRoute } from '$app/paths';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { departmentError, departmentService, departments } from '$lib/services/departmentService';
	import { currentUser, hasPermission } from '$lib/services/auth';
	import Button from '../base/Button.svelte';
	import Card from '../base/Card.svelte';
	import Badge from '../base/Badge.svelte';
	import TreeNode from './TreeNode.svelte';
	import type { Department } from '$lib/types';
	import type { TreeNodeData } from './types';

	// Props
	const {
		showControls = true,
		expandAll: initialExpandAll = false
	}: {
		showControls?: boolean;
		expandAll?: boolean;
	} = $props();

	// Internal state
	let expandedNodes = $state(new SvelteSet<string>());
	let selectedDepartment = $state<Department | null>(null);
	let expandAll = $state(initialExpandAll);

	// Reactive computation for tree structure
	const rootNodes = $derived(buildHierarchyTree($departments));

	function buildHierarchyTree(departments: Department[]): TreeNodeData[] {
		if (!departments.length) return [];

		// Build a map for quick lookups
		const deptMap = new SvelteMap<string, Department>();
		departments.forEach((dept) => deptMap.set(dept.id, dept));

		// Find root departments (no parent)
		const roots = departments.filter((dept) => !dept.parentDepartment);

		// Recursive function to build tree
		function buildNode(department: Department, level: number = 0): TreeNodeData {
			const children = departments
				.filter((dept) => dept.parentDepartment?.id === department.id)
				.map((child) => buildNode(child, level + 1))
				.sort((a, b) => a.department.name.localeCompare(b.department.name));

			return {
				department,
				children,
				level
			};
		}

		return roots
			.map((root) => buildNode(root))
			.sort((a, b) => a.department.name.localeCompare(b.department.name));
	}

	function toggleNode(departmentId: string) {
		const newSet = new SvelteSet(expandedNodes);
		if (newSet.has(departmentId)) {
			newSet.delete(departmentId);
		} else {
			newSet.add(departmentId);
		}
		expandedNodes = newSet;
	}

	function isExpanded(departmentId: string): boolean {
		return expandAll || expandedNodes.has(departmentId);
	}

	function selectDepartment(department: Department) {
		selectedDepartment = selectedDepartment?.id === department.id ? null : department;
	}

	function expandAllNodes() {
		expandAll = !expandAll;
		expandedNodes.clear();
	}

	function getManagerInfo(department: Department): string {
		if (!department.manager) return 'No manager assigned';
		return department.manager.display_name || 'Unknown';
	}

	function getDepartmentStats(department: Department): string {
		const employeeCount = department.employeeCount || 0;
		const budgetInfo = department.budgetLimit
			? ` • $${(department.budgetLimit / 1000).toFixed(0)}k budget`
			: '';
		return `${employeeCount} employee${employeeCount === 1 ? '' : 's'}${budgetInfo}`;
	}

	onMount(() => {
		departmentService.loadDepartments();
	});
</script>

<div class="department-hierarchy">
	{#if showControls}
		<div class="hierarchy-controls">
			<div class="hierarchy-title">
				<h2 class="text-lg font-semibold text-gray-900">Organization Hierarchy</h2>
				<p class="text-sm text-gray-600">Interactive view of your department structure</p>
			</div>

			<div class="hierarchy-actions">
				<Button variant="ghost" size="sm" leftIcon="expand" onclick={expandAllNodes}>
					{expandAll ? 'Collapse All' : 'Expand All'}
				</Button>

				{#if $currentUser && hasPermission('department:create')}
					<Button
						variant="secondary"
						size="sm"
						leftIcon="plus"
						            onclick={() => goto(resolveRoute('/departments/new' as any))}
						          >
						            Add Department					</Button>
				{/if}
			</div>
		</div>
	{/if}

	<div class="hierarchy-container">
		<div class="hierarchy-tree">
			{#if false}
				<div class="hierarchy-loading">
					<div class="loading-spinner"></div>
					<span class="text-sm text-gray-600">Loading hierarchy...</span>
				</div>
			{:else if $departmentError}
				<Card padding="md" class="hierarchy-error">
					<div class="error-content">
						<i class="icon-alert-circle h-5 w-5 text-red-500"></i>
						<div>
							<h3 class="text-sm font-medium text-gray-900">Error Loading Hierarchy</h3>
							<p class="text-sm text-gray-600">{$departmentError}</p>
							<Button
								variant="secondary"
								size="sm"
								leftIcon="refresh-cw"
								onclick={() => departmentService.loadDepartments()}
								class="mt-2"
							>
								Retry
							</Button>
						</div>
					</div>
				</Card>
			{:else if rootNodes.length === 0}
				<Card padding="lg" class="hierarchy-empty">
					<div class="empty-content">
						<i class="icon-folder mx-auto h-12 w-12 text-gray-400"></i>
						<h3 class="mt-4 text-lg font-medium text-gray-900">No departments found</h3>
						<p class="mt-2 text-sm text-gray-600">Get started by creating your first department.</p>
						{#if $currentUser && hasPermission('department:create')}
							<Button
								variant="primary"
								size="md"
								leftIcon="plus"
								onclick={() => goto(resolveRoute('/departments/new' as any))}
								class="mt-4"
							>
								Create Department
							</Button>
						{/if}
					</div>
				</Card>
			{:else}
				<div class="tree-nodes">
					{#each rootNodes as node (node.department.id)}
						<TreeNode
							{node}
							isExpanded={isExpanded(node.department.id)}
							isSelected={selectedDepartment?.id === node.department.id}
							canEdit={($currentUser && hasPermission('department:update')) || false}
							{expandAll}
							ontoggle={(id) => toggleNode(id)}
							onselect={(dept) => selectDepartment(dept)}
							onedit={(id) => goto(resolveRoute(`/departments/${id}/edit` as any))}
							onview={(id) => goto(resolveRoute(`/departments/${id}` as any))}
						/>
					{/each}
				</div>
			{/if}
		</div>

		{#if selectedDepartment}
			<div class="hierarchy-sidebar">
				<Card padding="md" class="department-details">
					<div class="details-header">
						<h3 class="text-lg font-semibold text-gray-900">{selectedDepartment.name}</h3>
						<div class="details-status">
							<Badge variant={selectedDepartment.isActive ? 'default' : 'secondary'} size="sm">
								{selectedDepartment.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
					</div>

					<div class="details-content">
						{#if selectedDepartment.code}
							<div class="detail-item">
								<span class="detail-label">Code:</span>
								<span class="detail-value">{selectedDepartment.code}</span>
							</div>
						{/if}

						{#if selectedDepartment.description}
							<div class="detail-item">
								<span class="detail-label">Description:</span>
								<span class="detail-value">{selectedDepartment.description}</span>
							</div>
						{/if}

						<div class="detail-item">
							<span class="detail-label">Manager:</span>
							<span class="detail-value">{getManagerInfo(selectedDepartment)}</span>
						</div>

						<div class="detail-item">
							<span class="detail-label">Statistics:</span>
							<span class="detail-value">{getDepartmentStats(selectedDepartment)}</span>
						</div>

						{#if selectedDepartment.parentDepartment}
							<div class="detail-item">
								<span class="detail-label">Parent:</span>
								<span class="detail-value">{selectedDepartment.parentDepartment.name}</span>
							</div>
						{/if}

						{#if selectedDepartment.location}
							<div class="detail-item">
								<span class="detail-label">Location:</span>
								<span class="detail-value">{selectedDepartment.location}</span>
							</div>
						{/if}
					</div>

					<div class="details-actions">
						<Button
							variant="secondary"
							size="sm"
							leftIcon="eye"
							onclick={() =>
								selectedDepartment && goto(resolveRoute(`/departments/${selectedDepartment.id}` as any))}
						>
							View Details
						</Button>

						{#if $currentUser && hasPermission('department:update')}
							<Button
								variant="primary"
								size="sm"
								leftIcon="edit"
								onclick={() =>
									selectedDepartment &&
									goto(resolveRoute(`/departments/${selectedDepartment.id}/edit` as any))}
							>
								Edit
							</Button>
						{/if}
					</div>
				</Card>
			</div>
		{/if}
	</div>
</div>
