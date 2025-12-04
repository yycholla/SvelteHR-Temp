<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		Building2,
		ChevronDown,
		ChevronRight,
		Crown,
		Mail,
		Phone,
		User,
		Users
	} from '@lucide/svelte';

	// Props
	const {
		departmentData
	}: {
		departmentData: {
			name: string;
			manager?: any;
			employees: any[];
			subDepartments?: any[];
		};
	} = $props();

	// Tree node interface
	interface TreeNode {
		id: string;
		name: string;
		role: string;
		email: string;
		level: number;
		isManager: boolean;
		children: TreeNode[];
		user: any;
	}

	// State for expanded nodes
	let expandedNodes = $state(new Set<string>());

	// Build hierarchical tree structure
	function buildTreeStructure(): TreeNode {
		const { manager, employees, name } = departmentData;

		// Create root node (department)
		const rootNode: TreeNode = {
			id: `dept-${name}`,
			name,
			role: 'Department',
			email: '',
			level: 0,
			isManager: false,
			children: [],
			user: null
		};

		// Add manager if exists
		if (manager) {
			const managerNode: TreeNode = {
				id: manager.id,
				name: manager.displayName || manager.email,
				role: getHighestRole(manager),
				email: manager.email,
				level: 1,
				isManager: true,
				children: [],
				user: manager
			};
			rootNode.children.push(managerNode);
		}

		// Group remaining employees by role level
		const nonManagerEmployees = employees.filter((emp) => emp.id !== manager?.id);
		const roleGroups = groupByRoleLevel(nonManagerEmployees);

		// Add employees to appropriate parent (manager or department)
		const parentNode = manager ? rootNode.children[0] : rootNode;
		const startLevel = manager ? 2 : 1;

		// Sort role groups by level (highest first)
		const sortedRoleGroups = Object.entries(roleGroups).sort(
			([a], [b]) => parseInt(b) - parseInt(a)
		);

		sortedRoleGroups.forEach(([roleLevel, roleEmployees]) => {
			roleEmployees.forEach((emp) => {
				const empNode: TreeNode = {
					id: emp.id,
					name: emp.displayName || emp.email,
					role: getHighestRole(emp),
					email: emp.email,
					level: startLevel,
					isManager: false,
					children: [],
					user: emp
				};
				parentNode.children.push(empNode);
			});
		});

		return rootNode;
	}

	function getHighestRole(user: any): string {
		const roles = user.userRoleAssignmentsByUserId?.nodes || [];
		if (roles.length === 0) return 'Employee';

		const highest = roles.reduce((prev: any, curr: any) =>
			curr.userRoleByRoleId.level > prev.userRoleByRoleId.level ? curr : prev
		);

		return highest.userRoleByRoleId.name;
	}

	function groupByRoleLevel(employees: any[]) {
		return employees.reduce(
			(groups, emp) => {
				const roles = emp.userRoleAssignmentsByUserId?.nodes || [];
				const level =
					roles.length > 0 ? Math.max(...roles.map((r: any) => r.userRoleByRoleId.level)) : 20;

				if (!groups[level]) groups[level] = [];
				groups[level].push(emp);
				return groups;
			},
			{} as Record<number, any[]>
		);
	}

	function toggleNode(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = new Set(expandedNodes); // Trigger reactivity
	}

	function getNodeIcon(node: TreeNode) {
		if (node.level === 0) return Building2;
		if (node.isManager) return Crown;
		return User;
	}

	function getNodeColor(node: TreeNode) {
		if (node.level === 0) return 'bg-blue-100 text-blue-700 border-blue-200';
		if (node.isManager) return 'bg-purple-100 text-purple-700 border-purple-200';
		return 'bg-gray-100 text-gray-700 border-gray-200';
	}

	function getUserInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	let treeData = $state<TreeNode | null>(null);

	onMount(() => {
		treeData = buildTreeStructure();
		// Auto-expand root and manager nodes
		if (treeData) {
			expandedNodes.add(treeData.id);
			if (treeData.children.length > 0 && treeData.children[0].isManager) {
				expandedNodes.add(treeData.children[0].id);
			}
		}
	});

	// Render tree nodes recursively using Svelte components
	function renderTreeNodes(nodes: TreeNode[], depth: number = 0): TreeNode[] {
		return nodes;
	}
</script>

<div class="space-y-4">
	<!-- Tree Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Department Organization</h3>
			<p class="text-sm text-muted-foreground">
				{departmentData.employees.length} total members
			</p>
		</div>

		<div class="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					// Expand all
					if (treeData) {
						const allIds = new Set();
						function collectIds(node: TreeNode) {
							allIds.add(node.id);
							node.children.forEach(collectIds);
						}
						collectIds(treeData);
						expandedNodes = allIds;
					}
				}}
			>
				Expand All
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					expandedNodes = new Set();
				}}
			>
				Collapse All
			</Button>
		</div>
	</div>

	<!-- Tree Visualization -->
	<Card.Root>
		<Card.Content class="p-6">
			{#if treeData}
				<div class="space-y-2">
					{@render TreeNode(treeData, 0)}
				</div>
			{:else}
				<div class="flex items-center justify-center py-8">
					<p class="text-muted-foreground">Loading organization chart...</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Legend -->
	<div class="flex flex-wrap gap-4 text-sm">
		<div class="flex items-center gap-2">
			<div class="h-3 w-3 rounded-full bg-blue-500"></div>
			<span>Department</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-3 w-3 rounded-full bg-purple-500"></div>
			<span>Manager</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-3 w-3 rounded-full bg-gray-500"></div>
			<span>Employee</span>
		</div>
	</div>
</div>

{#snippet TreeNode(node: TreeNode, depth: number)}
	<div class="relative">
		<!-- Connection lines -->
		{#if depth > 0}
			<div class="absolute left-6 top-0 h-6 w-px bg-gray-300"></div>
			<div class="absolute left-6 top-6 h-px w-6 bg-gray-300"></div>
		{/if}

		<!-- Node -->
		<div class="flex items-center gap-3 p-2">
			{#if node.children.length > 0}
				<button
					onclick={() => toggleNode(node.id)}
					class="flex h-6 w-6 items-center justify-center rounded border bg-white shadow-sm hover:bg-gray-50"
				>
					{#if expandedNodes.has(node.id)}
						<ChevronDown class="h-3 w-3" />
					{:else}
						<ChevronRight class="h-3 w-3" />
					{/if}
				</button>
			{:else}
				<div class="h-6 w-6"></div>
			{/if}

			<div
				class="flex items-center gap-3 rounded-lg border p-3 {getNodeColor(node)} min-w-0 flex-1"
			>
				<!-- Avatar -->
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 font-semibold"
				>
					{#if node.user}
						{getUserInitials(node.name)}
					{:else}
						{@const NodeIcon = getNodeIcon(node)}
						<NodeIcon class="h-5 w-5" />
					{/if}
				</div>

				<!-- Info -->
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<h4 class="truncate font-semibold">{node.name}</h4>
						{#if node.isManager}
							<Crown class="h-4 w-4 text-yellow-600" />
						{/if}
					</div>
					<p class="text-sm opacity-80">{node.role}</p>
					{#if node.email}
						<p class="text-xs opacity-70">{node.email}</p>
					{/if}
				</div>

				<!-- Actions -->
				{#if node.user}
					<div class="flex gap-1">
						<Button variant="ghost" size="sm">
							<Mail class="h-3 w-3" />
						</Button>
						<Button variant="ghost" size="sm">
							<User class="h-3 w-3" />
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Children -->
		{#if node.children.length > 0 && expandedNodes.has(node.id)}
			<div class="ml-12 space-y-2">
				{#each node.children as child}
					{@render TreeNode(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}
