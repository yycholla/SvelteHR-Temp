<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Badge from '../base/Badge.svelte';
  import type { Department } from '$lib/types';

  // Define the node structure
  interface TreeNodeData {
    department: Department;
    children: TreeNodeData[];
    level: number;
  }

  export let node: TreeNodeData;
  export let isExpanded: boolean = false;
  export let isSelected: boolean = false;
  export let canEdit: boolean = false;
  export let expandAll: boolean = false;

  const dispatch = createEventDispatcher<{
    toggle: string;
    select: Department;
    edit: string;
    view: string;
  }>();

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
    const budgetInfo = department.budgetLimit ? ` • $${(department.budgetLimit / 1000).toFixed(0)}k budget` : '';
    return `${employeeCount} employee${employeeCount === 1 ? '' : 's'}${budgetInfo}`;
  }

  function handleToggle() {
    dispatch('toggle', node.department.id);
  }

  function handleSelect() {
    dispatch('select', node.department);
  }

  function handleEdit() {
    dispatch('edit', node.department.id);
  }

  function handleView() {
    dispatch('view', node.department.id);
  }

  // Check if this node should be expanded (either explicitly or via expandAll)
  $: shouldExpand = isExpanded || expandAll;
</script>

<div class="tree-node" class:selected={isSelected}>
  <div 
    class="tree-node-content"
    style="padding-left: {node.level * 24}px"
    on:click={handleSelect}
    on:keydown={(e) => e.key === 'Enter' && handleSelect()}
    role="button"
    tabindex="0"
  >
    <div class="node-toggle">
      {#if hasChildren(node)}
        <button
          class="toggle-button"
          on:click|stopPropagation={handleToggle}
          aria-label={shouldExpand ? 'Collapse' : 'Expand'}
        >
          <i class="icon-chevron-{shouldExpand ? 'down' : 'right'} w-4 h-4"></i>
        </button>
      {:else}
        <div class="toggle-spacer"></div>
      {/if}
    </div>

    <div class="node-icon">
      <i class="icon-{getNodeIcon(node)} w-4 h-4 text-blue-600"></i>
    </div>

    <div class="node-info">
      <div class="node-header">
        <span class="node-name">{node.department.name}</span>
        {#if node.department.code}
          <span class="node-code">({node.department.code})</span>
        {/if}
        <Badge 
          variant={node.department.isActive ? 'success' : 'secondary'} 
          size="xs"
        >
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
        on:click|stopPropagation={handleView}
        title="View Details"
      >
        <i class="icon-eye w-4 h-4"></i>
      </button>

      {#if canEdit}
        <button
          class="action-button"
          on:click|stopPropagation={handleEdit}
          title="Edit Department"
        >
          <i class="icon-edit w-4 h-4"></i>
        </button>
      {/if}
    </div>
  </div>

  {#if hasChildren(node) && shouldExpand}
    <div class="tree-children">
      {#each node.children as childNode}
        <svelte:self
          node={childNode}
          isExpanded={isExpanded}
          isSelected={false}
          {canEdit}
          {expandAll}
          on:toggle
          on:select
          on:edit
          on:view
        />
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  /* Tree Node Styles */
  .tree-node {
    @apply relative;
  }

  .tree-node-content {
    @apply flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors;
  }

  .tree-node.selected .tree-node-content {
    @apply bg-blue-50 ring-2 ring-blue-200;
  }

  .node-toggle {
    @apply w-6 flex items-center justify-center;
  }

  .toggle-button {
    @apply p-1 rounded hover:bg-gray-200 transition-colors;
  }

  .toggle-spacer {
    @apply w-4;
  }

  .node-icon {
    @apply flex items-center justify-center w-6 h-6 mr-3;
  }

  .node-info {
    @apply flex-1 min-w-0;
  }

  .node-header {
    @apply flex items-center space-x-2;
  }

  .node-name {
    @apply text-sm font-medium text-gray-900 truncate;
  }

  .node-code {
    @apply text-xs text-gray-500;
  }

  .node-details {
    @apply flex items-center space-x-4 mt-1;
  }

  .node-manager {
    @apply text-xs text-gray-600;
  }

  .node-stats {
    @apply text-xs text-gray-500;
  }

  .node-actions {
    @apply flex items-center space-x-1 ml-2;
  }

  .action-button {
    @apply p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors;
  }

  .tree-children {
    @apply space-y-1;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .tree-node-content {
      @apply py-3;
    }

    .node-details {
      @apply flex-col items-start space-x-0 space-y-1;
    }
  }
</style>