<script lang="ts">
	import Badge from '../base/Badge.svelte';
	import TreeNode from './TreeNode.svelte';
	import type { Department } from '$lib/types';

	// Define the node structure
	interface TreeNodeData {
		department: Department;
		children: TreeNodeData[];
		level: number;
	}

	let {
		node,
		isExpanded = false,
		isSelected = false,
		canEdit = false,
		expandAll = false,
		ontoggle = undefined,
		onselect = undefined,
		onedit = undefined,
		onview = undefined
	}: {
		node: TreeNodeData;
		isExpanded?: boolean;
		isSelected?: boolean;
		canEdit?: boolean;
		expandAll?: boolean;
		ontoggle?: ((detail: string) => void) | undefined;
		onselect?: ((detail: Department) => void) | undefined;
		onedit?: ((detail: string) => void) | undefined;
		onview?: ((detail: string) => void) | undefined;
	} = $props();

	function hasChildren(node: TreeNodeData): boolean {
		return node.children.length > 0;
	}

	function getNodeIcon(node: TreeNodeData): string {
		if (!hasChildren(node)) return 'folder';
		return isExpanded ? 'folder-open' : 'folder';
	}

	function getManagerInfo(department: Department): string {
		if (!department.manager) return 'No manager assigned';
		return department.manager.display_name || department.manager.displayName || 'Unknown';
	}

	function getDepartmentStats(department: Department): string {
		const employeeCount = department.employeeCount || 0;
		const budgetInfo = department.budgetLimit
			? ` • $${(department.budgetLimit / 1000).toFixed(0)}k budget`
			: '';
		return `${employeeCount} employee${employeeCount === 1 ? '' : 's'}${budgetInfo}`;
	}

	function handleToggle(event: Event) {
		event.stopPropagation();
		ontoggle?.(node.department.id);
	}

	function handleSelect() {
		onselect?.(node.department);
	}

	function handleEdit(event: Event) {
		event.stopPropagation();
		onedit?.(node.department.id);
	}

	function handleView(event: Event) {
		event.stopPropagation();
		onview?.(node.department.id);
	}

	// Check if this node should be expanded (either explicitly or via expandAll)
	let shouldExpand = $derived(isExpanded || expandAll);
</script>

<div class="tree-node" class:selected={isSelected}>
	<div
		class="tree-node-content"
		style="padding-left: {node.level * 24}px"
		onclick={handleSelect}
		onkeydown={(e) => e.key === 'Enter' && handleSelect()}
		role="button"
		tabindex="0"
	>
		<div class="node-toggle">
			{#if hasChildren(node)}
				<button
					class="toggle-button"
					onclick={handleToggle}
					aria-label={shouldExpand ? 'Collapse' : 'Expand'}
				>
					<i class="icon-chevron-{shouldExpand ? 'down' : 'right'} h-4 w-4"></i>
				</button>
			{:else}
				<div class="toggle-spacer"></div>
			{/if}
		</div>

		<div class="node-icon">
			<i class="icon-{getNodeIcon(node)} h-4 w-4 text-blue-600"></i>
		</div>

		<div class="node-info">
			<div class="node-header">
				<span class="node-name">{node.department.name}</span>
				{#if node.department.code}
					<span class="node-code">({node.department.code})</span>
				{/if}
				<Badge variant={node.department.isActive ? 'success' : 'secondary'} size="xs">
					{node.department.isActive ? 'Active' : 'Inactive'}
				</Badge>
			</div>

			<div class="node-details">
				<span class="node-manager">{getManagerInfo(node.department)}</span>
				<span class="node-stats">{getDepartmentStats(node.department)}</span>
			</div>
		</div>

		<div class="node-actions">
			<button
				class="action-button"
				onclick={handleView}
				title="View Details"
				aria-label="View Details"
			>
				<i class="icon-eye h-4 w-4"></i>
			</button>

			{#if canEdit}
				<button
					class="action-button"
					onclick={handleEdit}
					title="Edit Department"
					aria-label="Edit Department"
				>
					<i class="icon-edit h-4 w-4"></i>
				</button>
			{/if}
		</div>
	</div>

	{#if hasChildren(node) && shouldExpand}
		<div class="tree-children">
			{#each node.children as childNode (childNode.department.id)}
				<TreeNode
					node={childNode}
					{isExpanded}
					isSelected={false}
					{canEdit}
					{expandAll}
					{ontoggle}
					{onselect}
					{onedit}
					{onview}
				/>
			{/each}
		</div>
	{/if}
</div>


