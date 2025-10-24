<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		Crown,
		User,
		Building2,
		Mail,
		Phone,
		Move,
		ZoomIn,
		ZoomOut,
		RotateCcw,
		Maximize
	} from '@lucide/svelte';

	// Props
	let {
		departmentData
	}: {
		departmentData: {
			name: string;
			manager?: any;
			employees: any[];
			subDepartments?: any[];
		};
	} = $props();

	// Enhanced node interface for positioning
	interface OrgNode {
		id: string;
		name: string;
		role: string;
		email: string;
		level: number;
		roleLevel: number;
		isManager: boolean;
		user: any;
		children: OrgNode[];
		x: number;
		y: number;
		isDragging: boolean;
	}

	// State
	let orgNodes: OrgNode[] = $state([]);
	let connections: { from: string; to: string }[] = $state([]);
	let mapContainer: HTMLDivElement;
	let svgContainer: SVGSVGElement;
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let draggedNode: OrgNode | null = $state(null);
	let dragOffset = $state({ x: 0, y: 0 });

	// Constants for layout
	const LEVEL_HEIGHT = 150;
	const NODE_WIDTH = 200;
	const NODE_HEIGHT = 120;
	const HORIZONTAL_SPACING = 50;

	// Build hierarchical structure with positioning
	function buildOrgStructure(): { nodes: OrgNode[]; connections: { from: string; to: string }[] } {
		const { manager, employees, name } = departmentData;
		const nodes: OrgNode[] = [];
		const connections: { from: string; to: string }[] = [];

		// Group employees by role level
		const employeesByLevel = new Map<number, any[]>();

		employees.forEach((emp) => {
			const roles = emp.userRoleAssignmentsByUserId?.nodes || [];
			const maxLevel =
				roles.length > 0 ? Math.max(...roles.map((r: any) => r.userRoleByRoleId?.level || 20)) : 20;

			if (!employeesByLevel.has(maxLevel)) {
				employeesByLevel.set(maxLevel, []);
			}
			employeesByLevel.get(maxLevel)!.push(emp);
		});

		// Sort levels (highest first)
		const sortedLevels = Array.from(employeesByLevel.keys()).sort((a, b) => b - a);

		// Position nodes by level
		let currentY = 50;

		sortedLevels.forEach((roleLevel, levelIndex) => {
			const levelEmployees = employeesByLevel.get(roleLevel)!;
			const levelWidth = levelEmployees.length * (NODE_WIDTH + HORIZONTAL_SPACING);
			let startX = Math.max(50, (800 - levelWidth) / 2); // Center horizontally

			levelEmployees.forEach((emp, empIndex) => {
				const node: OrgNode = {
					id: emp.id,
					name: emp.displayName || emp.email,
					role: getHighestRole(emp),
					email: emp.email,
					level: levelIndex,
					roleLevel: roleLevel,
					isManager: roleLevel >= 60,
					user: emp,
					children: [],
					x: startX + empIndex * (NODE_WIDTH + HORIZONTAL_SPACING),
					y: currentY,
					isDragging: false
				};

				nodes.push(node);

				// Create connections to managers (employees report to managers)
				if (roleLevel < 60) {
					const managers = nodes.filter((n) => n.roleLevel >= 60);
					if (managers.length > 0) {
						// Connect to the closest manager or the first one
						connections.push({
							from: managers[0].id,
							to: node.id
						});
					}
				}
			});

			currentY += LEVEL_HEIGHT;
		});

		return { nodes, connections };
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
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function getNodeColor(node: OrgNode): string {
		if (node.roleLevel >= 80) return 'bg-red-100 border-red-300 text-red-800';
		if (node.roleLevel >= 60) return 'bg-purple-100 border-purple-300 text-purple-800';
		if (node.roleLevel >= 40) return 'bg-blue-100 border-blue-300 text-blue-800';
		return 'bg-gray-100 border-gray-300 text-gray-800';
	}

	// Drag and drop functionality
	function handleMouseDown(event: MouseEvent, node: OrgNode) {
		event.preventDefault();
		isDragging = true;
		draggedNode = node;
		node.isDragging = true;

		const rect = mapContainer.getBoundingClientRect();
		dragOffset.x = event.clientX - rect.left - node.x * zoom - panX;
		dragOffset.y = event.clientY - rect.top - node.y * zoom - panY;
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !draggedNode) return;

		const rect = mapContainer.getBoundingClientRect();
		const newX = (event.clientX - rect.left - dragOffset.x - panX) / zoom;
		const newY = (event.clientY - rect.top - dragOffset.y - panY) / zoom;

		draggedNode.x = Math.max(0, newX);
		draggedNode.y = Math.max(0, newY);

		// Update the orgNodes array to trigger reactivity
		orgNodes = [...orgNodes];
	}

	function handleMouseUp() {
		if (draggedNode) {
			draggedNode.isDragging = false;
			draggedNode = null;
		}
		isDragging = false;
	}

	// Zoom and pan functionality
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
		zoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));
	}

	function resetView() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	function autoLayout() {
		// Rebuild the structure with automatic positioning
		const { nodes, connections: newConnections } = buildOrgStructure();
		orgNodes = nodes;
		connections = newConnections;
	}

	// Initialize the org structure
	onMount(() => {
		const { nodes, connections: newConnections } = buildOrgStructure();
		orgNodes = nodes;
		connections = newConnections;

		// Add global mouse event listeners
		if (typeof document !== 'undefined') {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});

	// Calculate SVG viewBox
	const viewBox = $derived(`${-panX} ${-panY} ${800 / zoom} ${600 / zoom}`);
</script>

<div class="space-y-4">
	<!-- Controls -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Interactive Organization Map</h3>
			<p class="text-sm text-muted-foreground">
				Drag nodes to rearrange • Scroll to zoom • {orgNodes.length} employees
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (zoom = Math.min(3, zoom * 1.2))}>
				<ZoomIn class="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onclick={() => (zoom = Math.max(0.5, zoom * 0.8))}>
				<ZoomOut class="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onclick={resetView}>
				<RotateCcw class="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onclick={autoLayout}>
				<Maximize class="h-4 w-4" />
				Auto Layout
			</Button>
		</div>
	</div>

	<!-- Organization Map -->
	<Card.Root>
		<Card.Content class="p-0">
			<div
				bind:this={mapContainer}
				class="relative h-[600px] w-full cursor-grab overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
				class:cursor-grabbing={isDragging}
				onwheel={handleWheel}
			>
				<!-- SVG for connections -->
				<svg
					bind:this={svgContainer}
					class="pointer-events-none absolute inset-0"
					width="100%"
					height="100%"
				>
					<defs>
						<marker
							id="arrowhead"
							markerWidth="10"
							markerHeight="7"
							refX="9"
							refY="3.5"
							orient="auto"
						>
							<polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
						</marker>
					</defs>

					{#each connections as connection}
						{@const fromNode = orgNodes.find((n) => n.id === connection.from)}
						{@const toNode = orgNodes.find((n) => n.id === connection.to)}
						{#if fromNode && toNode}
							<line
								x1={fromNode.x * zoom + (NODE_WIDTH / 2) * zoom + panX}
								y1={fromNode.y * zoom + NODE_HEIGHT * zoom + panY}
								x2={toNode.x * zoom + (NODE_WIDTH / 2) * zoom + panX}
								y2={toNode.y * zoom + panY}
								stroke="#6b7280"
								stroke-width="2"
								marker-end="url(#arrowhead)"
								opacity="0.6"
							/>
						{/if}
					{/each}
				</svg>

				<!-- Employee Nodes -->
				{#each orgNodes as node (node.id)}
					<div
						class="absolute cursor-move select-none transition-shadow hover:shadow-lg"
						class:shadow-lg={node.isDragging}
						class:z-10={node.isDragging}
						style="transform: translate({node.x * zoom + panX}px, {node.y * zoom +
							panY}px) scale({zoom}); transform-origin: top left;"
						onmousedown={(e) => handleMouseDown(e, node)}
					>
						<div
							class="h-[120px] w-[200px] rounded-lg border-2 bg-white p-3 {getNodeColor(
								node
							)} transition-all"
						>
							<!-- Header -->
							<div class="mb-2 flex items-center justify-between">
								<div class="flex items-center gap-2">
									{#if node.isManager}
										<Crown class="h-4 w-4 text-yellow-600" />
									{:else}
										<User class="h-4 w-4" />
									{/if}
									<Move class="h-3 w-3 opacity-50" />
								</div>
								<Badge variant="outline" class="text-xs">
									Level {node.roleLevel}
								</Badge>
							</div>

							<!-- Avatar and Info -->
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold"
								>
									{getUserInitials(node.name)}
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="truncate text-sm font-semibold">{node.name}</h4>
									<p class="truncate text-xs opacity-80">{node.role}</p>
									<p class="truncate text-xs opacity-60">{node.email}</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="mt-3 flex items-center justify-center gap-1">
								<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
									<Mail class="h-3 w-3" />
								</Button>
								<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
									<Phone class="h-3 w-3" />
								</Button>
							</div>
						</div>
					</div>
				{/each}

				<!-- Zoom indicator -->
				<div
					class="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-xs backdrop-blur-sm"
				>
					Zoom: {Math.round(zoom * 100)}%
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Level Legend -->
	<div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded border border-red-300 bg-red-200"></div>
			<span>C-Level (80+)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded border border-purple-300 bg-purple-200"></div>
			<span>Management (60-79)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded border border-blue-300 bg-blue-200"></div>
			<span>Senior (40-59)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="h-4 w-4 rounded border border-gray-300 bg-gray-200"></div>
			<span>Staff (20-39)</span>
		</div>
	</div>
</div>
