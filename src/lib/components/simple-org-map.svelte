<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Crown, User, Building2, Mail, ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';

	// Props
	let { departmentData }: {
		departmentData: {
			name: string;
			manager?: any;
			employees: any[];
		}
	} = $props();

	// Simple node interface
	interface OrgNode {
		id: string;
		name: string;
		role: string;
		email: string;
		roleLevel: number;
		isManager: boolean;
		user: any;
		x: number;
		y: number;
	}

	// State
	let orgNodes: OrgNode[] = $state([]);
	let zoom = $state(1);

	// Drag state
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let dragOffset = $state({ x: 0, y: 0 });
	let lastDragOffset = $state({ x: 0, y: 0 });

	// Build hierarchical structure with positioning
	function buildOrgStructure(): OrgNode[] {
		const { employees } = departmentData;
		const nodes: OrgNode[] = [];

		// Group employees by role level
		const employeesByLevel = new Map<number, any[]>();

		employees.forEach(emp => {
			const roles = emp.userRoleAssignmentsByUserId?.nodes || [];
			const maxLevel = roles.length > 0 ?
				Math.max(...roles.map((r: any) => r.userRoleByRoleId?.level || 20)) : 20;

			if (!employeesByLevel.has(maxLevel)) {
				employeesByLevel.set(maxLevel, []);
			}
			employeesByLevel.get(maxLevel)!.push(emp);
		});

		// Sort levels (highest first)
		const sortedLevels = Array.from(employeesByLevel.keys()).sort((a, b) => b - a);

		// Position nodes by level
		const LEVEL_HEIGHT = 150;
		const NODE_WIDTH = 200;
		const HORIZONTAL_SPACING = 50;
		let currentY = 50;

		sortedLevels.forEach((roleLevel) => {
			const levelEmployees = employeesByLevel.get(roleLevel)!;
			const levelWidth = levelEmployees.length * (NODE_WIDTH + HORIZONTAL_SPACING);
			let startX = Math.max(50, (800 - levelWidth) / 2);

			levelEmployees.forEach((emp, empIndex) => {
				const node: OrgNode = {
					id: emp.id,
					name: emp.displayName || emp.email,
					role: getHighestRole(emp),
					email: emp.email,
					roleLevel: roleLevel,
					isManager: roleLevel >= 60,
					user: emp,
					x: startX + empIndex * (NODE_WIDTH + HORIZONTAL_SPACING),
					y: currentY
				};

				nodes.push(node);
			});

			currentY += LEVEL_HEIGHT;
		});

		return nodes;
	}

	function getHighestRole(user: any): string {
		const roles = user.userRoleAssignmentsByUserId?.nodes || [];
		if (roles.length === 0) return 'Employee';

		const highest = roles.reduce((prev: any, curr: any) =>
			curr.userRoleByRoleId.level > prev.userRoleByRoleId.level ? curr : prev
		);

		return highest.userRoleByRoleId.name;
	}

	function getUserInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
	}

	function getNodeColor(node: OrgNode): string {
		if (node.roleLevel >= 80) return 'bg-red-100 border-red-300 text-red-800';
		if (node.roleLevel >= 60) return 'bg-purple-100 border-purple-300 text-purple-800';
		if (node.roleLevel >= 40) return 'bg-blue-100 border-blue-300 text-blue-800';
		return 'bg-gray-100 border-gray-300 text-gray-800';
	}

	// Drag handlers
	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		dragStart = { x: e.clientX, y: e.clientY };
		lastDragOffset = { ...dragOffset };
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;

		const deltaX = e.clientX - dragStart.x;
		const deltaY = e.clientY - dragStart.y;

		dragOffset = {
			x: lastDragOffset.x + deltaX,
			y: lastDragOffset.y + deltaY
		};
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
		zoom = Math.max(0.3, Math.min(2, zoom * zoomFactor));
	}

	function resetView() {
		zoom = 1;
		dragOffset = { x: 0, y: 0 };
		lastDragOffset = { x: 0, y: 0 };
	}

	// Initialize the org structure
	onMount(() => {
		orgNodes = buildOrgStructure();
	});
</script>

<div class="space-y-4">
	<!-- Controls -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Organization Map</h3>
			<p class="text-sm text-muted-foreground">
				Level-based organizational structure • {orgNodes.length} employees
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => zoom = Math.min(2, zoom * 1.2)}>
				<ZoomIn class="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onclick={() => zoom = Math.max(0.3, zoom * 0.8)}>
				<ZoomOut class="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onclick={resetView}>
				<RotateCcw class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Organization Map -->
	<Card.Root>
		<Card.Content class="p-0">
			<div
				class="relative h-[500px] w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 cursor-grab {isDragging ? 'cursor-grabbing' : ''}"
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onmouseup={handleMouseUp}
				onmouseleave={handleMouseUp}
				onwheel={handleWheel}
			>
				<!-- Container for draggable content -->
				<div
					class="absolute inset-0"
					style="transform: translate({dragOffset.x}px, {dragOffset.y}px) scale({zoom}); transform-origin: top left;"
				>
					<!-- Employee Nodes -->
					{#each orgNodes as node (node.id)}
						<div
							class="absolute select-none transition-all"
							style="left: {node.x}px; top: {node.y}px;"
					>
						<div class="w-[180px] rounded-lg border-2 p-3 bg-white {getNodeColor(node)} shadow-sm hover:shadow-md transition-shadow">
							<!-- Header -->
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									{#if node.isManager}
										<Crown class="h-4 w-4 text-yellow-600" />
									{:else}
										<User class="h-4 w-4" />
									{/if}
								</div>
								<Badge variant="outline" class="text-xs">
									L{node.roleLevel}
								</Badge>
							</div>

							<!-- Avatar and Info -->
							<div class="flex items-center gap-2 mb-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-xs">
									{getUserInitials(node.name)}
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="font-semibold text-sm truncate">{node.name}</h4>
									<p class="text-xs opacity-80 truncate">{node.role}</p>
									<p class="text-xs opacity-60 truncate">{node.email}</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center justify-center">
								<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
									<Mail class="h-3 w-3" />
								</Button>
							</div>
						</div>
					</div>
				{/each}

					<!-- Level Lines -->
					{#each Array.from(new Set(orgNodes.map(n => n.y))) as levelY}
						<div
							class="absolute w-full border-t border-gray-200 opacity-30"
							style="top: {levelY - 10}px;"
						></div>
					{/each}
				</div>

				<!-- Fixed UI indicators (outside draggable content) -->
				<div class="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
					Zoom: {Math.round(zoom * 100)}%
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Level Legend -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded bg-red-200 border border-red-300"></div>
			<span>Executive (80+)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded bg-purple-200 border border-purple-300"></div>
			<span>Management (60-79)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded bg-blue-200 border border-blue-300"></div>
			<span>Senior (40-59)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded bg-gray-200 border border-gray-300"></div>
			<span>Staff (20-39)</span>
		</div>
	</div>
</div>