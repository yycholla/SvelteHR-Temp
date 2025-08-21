<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { RoleGuard } from '$lib/components/auth';
	import { 
		Building2, 
		ChevronRight, 
		ChevronDown, 
		Users, 
		DollarSign,
		Eye,
		Edit,
		Trash2,
		Plus
	} from 'lucide-svelte';
	import type { DepartmentTreeNode } from '$lib/types/department';

	interface Props {
		nodes: DepartmentTreeNode[];
		onDelete?: (id: string) => void;
		level?: number;
	}

	let { nodes, onDelete, level = 0 }: Props = $props();

	let expandedNodes = $state<Set<string>>(new Set());

	function toggleExpand(nodeId: string) {
		const newExpanded = new Set(expandedNodes);
		if (newExpanded.has(nodeId)) {
			newExpanded.delete(nodeId);
		} else {
			newExpanded.add(nodeId);
		}
		expandedNodes = newExpanded;
	}

	function formatBudget(budget?: number | string): string {
		if (!budget) return 'Not set';
		const num = typeof budget === 'string' ? parseFloat(budget) : budget;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			notation: 'compact'
		}).format(num);
	}
</script>

<div class="space-y-2">
	{#each nodes as node (node.id)}
		{@const isExpanded = expandedNodes.has(node.id)}
		{@const hasChildren = node.children && node.children.length > 0}
		
		<div class="border rounded-lg">
			<!-- Department Node -->
			<div 
				class="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
				style="padding-left: {level * 1.5 + 1}rem"
			>
				<!-- Expand/Collapse Button -->
				{#if hasChildren}
					<Button
						variant="ghost"
						size="icon"
						onclick={() => toggleExpand(node.id)}
						class="h-6 w-6 shrink-0"
					>
						{#if isExpanded}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Button>
				{:else}
					<div class="w-6 h-6 shrink-0"></div>
				{/if}

				<!-- Department Icon -->
				<Building2 class="h-5 w-5 text-primary shrink-0" />

				<!-- Department Info -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<h4 class="font-semibold text-foreground truncate">
							{node.name}
						</h4>
						{#if !node.is_active}
							<Badge variant="secondary" class="text-xs">Inactive</Badge>
						{/if}
					</div>
					
					{#if node.description}
						<p class="text-sm text-muted-foreground truncate">
							{node.description}
						</p>
					{/if}

					<!-- Quick Stats -->
					<div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
						{#if node.employee_count !== undefined}
							<span class="flex items-center gap-1">
								<Users class="h-3 w-3" />
								{node.employee_count} employees
							</span>
						{/if}
						
						{#if node.budget}
							<span class="flex items-center gap-1">
								<DollarSign class="h-3 w-3" />
								{formatBudget(node.budget)}
							</span>
						{/if}
						
						{#if hasChildren}
							<span class="flex items-center gap-1">
								<Building2 class="h-3 w-3" />
								{node.children.length} subdepartments
							</span>
						{/if}
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-1 shrink-0">
					<Button
						variant="ghost"
						size="sm"
						href="/departments/{node.id}"
						class="gap-1 h-8"
					>
						<Eye class="h-3 w-3" />
						View
					</Button>
					
					<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
						<Button
							variant="ghost"
							size="sm"
							href="/departments/{node.id}/edit"
							class="gap-1 h-8"
						>
							<Edit class="h-3 w-3" />
							Edit
						</Button>
						
						{#if onDelete}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => onDelete?.(node.id)}
								class="gap-1 h-8 text-destructive hover:text-destructive"
							>
								<Trash2 class="h-3 w-3" />
								Delete
							</Button>
						{/if}
						
						<Button
							variant="ghost"
							size="sm"
							href="/departments/create?parent={node.id}"
							class="gap-1 h-8"
						>
							<Plus class="h-3 w-3" />
							Add Child
						</Button>
					</RoleGuard>
				</div>
			</div>

			<!-- Children (Recursively rendered) -->
			{#if hasChildren && isExpanded}
				<div class="border-t border-l ml-6 border-muted">
					<svelte:self 
						nodes={node.children} 
						{onDelete}
						level={level + 1} 
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>