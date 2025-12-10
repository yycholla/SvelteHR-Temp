<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import {
		Building2,
		Crown,
		Eye,
		Filter,
		Grid,
		Mail,
		Maximize,
		RotateCcw,
		Search,
		User,
		Users,
		ZoomIn,
		ZoomOut
	} from '@lucide/svelte';

	// Props
	const {
		allEmployees
	}: {
		allEmployees: any[];
	} = $props();

	// Enhanced node interface
	interface OrgNode {
		id: string;
		name: string;
		role: string;
		email: string;
		roleLevel: number;
		department: string;
		isManager: boolean;
		user: any;
		x: number;
		y: number;
		children: string[];
		parentId: string | null;
	}

	// State
	let orgNodes: OrgNode[] = $state([]);
	let filteredNodes: OrgNode[] = $state([]);
	let zoom = $state(0.8);
	let searchTerm = $state('');
	let selectedDepartment = $state('all');
	let selectedLevel = $state('all');
	let showStats = $state(true);

	// Drag state
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let dragOffset = $state({ x: 0, y: 0 });
	let lastDragOffset = $state({ x: 0, y: 0 });

	// Layout constants
	const LEVEL_HEIGHT = 200;
	const NODE_WIDTH = 190;
	const NODE_HEIGHT = 140;
	const HORIZONTAL_SPACING = 30;
	const VERTICAL_SPACING = 160;
	const DEPARTMENT_SPACING = 80;

	// Build department-based hierarchical structure with connecting lines
	function buildOrgStructure(): OrgNode[] {
		const nodes: OrgNode[] = [];
		const departments = new Map<string, any[]>();
		const departmentHeads = new Map<string, any>();

		// Group employees by department and find department heads
		allEmployees.forEach((emp) => {
			const department = getDepartmentFromUser(emp);
			const roles = emp.userRoleAssignmentsByUserId?.nodes || [];
			const maxLevel =
				roles.length > 0 ? Math.max(...roles.map((r: any) => r.userRoleByRoleId?.level || 20)) : 20;

			if (!departments.has(department)) {
				departments.set(department, []);
			}
			departments.get(department)!.push({ ...emp, maxLevel });

			// Track department head (highest level in each department)
			const currentHead = departmentHeads.get(department);
			if (!currentHead || maxLevel > currentHead.maxLevel) {
				departmentHeads.set(department, { ...emp, maxLevel });
			}
		});

		// Position departments horizontally with their hierarchies
		const departmentNames = Array.from(departments.keys()).sort();
		const departmentWidth = 400; // Increased width to prevent overlap
		let startX = 150;

		departmentNames.forEach((deptName, deptIndex) => {
			const deptEmployees = departments.get(deptName)!;
			const head = departmentHeads.get(deptName);

			// Position department head at top
			const headNode: OrgNode = {
				id: head.id,
				name: head.displayName || head.email,
				role: getHighestRole(head),
				email: head.email,
				roleLevel: head.maxLevel,
				department: deptName,
				isManager: head.maxLevel >= 60,
				user: head,
				x: startX + departmentWidth / 2 - NODE_WIDTH / 2,
				y: 100,
				children: [],
				parentId: null
			};
			nodes.push(headNode);

			// Position other employees under the head in a proper tree structure
			const otherEmployees = deptEmployees.filter((emp) => emp.id !== head.id);

			if (otherEmployees.length > 0) {
				// Create sub-levels based on role levels
				const subLevels = new Map<number, any[]>();
				otherEmployees.forEach((emp) => {
					const level = emp.maxLevel >= 40 ? 40 : 20; // Senior vs Staff
					if (!subLevels.has(level)) {
						subLevels.set(level, []);
					}
					subLevels.get(level)!.push(emp);
				});

				const sortedSubLevels = Array.from(subLevels.keys()).sort((a, b) => b - a);
				let currentY = 100 + VERTICAL_SPACING; // Start below head with proper spacing

				sortedSubLevels.forEach((level) => {
					const levelEmployees = subLevels.get(level)!;
					const employeesPerRow = Math.min(2, levelEmployees.length); // Reduced to 2 per row
					const rows = Math.ceil(levelEmployees.length / employeesPerRow);

					levelEmployees.forEach((emp, index) => {
						const row = Math.floor(index / employeesPerRow);
						const col = index % employeesPerRow;
						const totalInRow = Math.min(
							employeesPerRow,
							levelEmployees.length - row * employeesPerRow
						);

						// Calculate centered positioning for each row
						const rowWidth = totalInRow * NODE_WIDTH + (totalInRow - 1) * HORIZONTAL_SPACING;
						const startX_row = startX + (departmentWidth - rowWidth) / 2;

						const empNode: OrgNode = {
							id: emp.id,
							name: emp.displayName || emp.email,
							role: getHighestRole(emp),
							email: emp.email,
							roleLevel: emp.maxLevel,
							department: deptName,
							isManager: emp.maxLevel >= 60,
							user: emp,
							x: startX_row + col * (NODE_WIDTH + HORIZONTAL_SPACING),
							y: currentY + row * VERTICAL_SPACING,
							children: [],
							parentId: head.id
						};
						nodes.push(empNode);
						headNode.children.push(empNode.id);
					});

					currentY += rows * VERTICAL_SPACING + 40; // Add more space between levels
				});
			}

			startX += departmentWidth + DEPARTMENT_SPACING;
		});

		return nodes;
	}

	function getDepartmentFromUser(user: any): string {
		const roleAssignments = user.userRoleAssignmentsByUserId?.nodes || [];
		if (roleAssignments.length === 0) return 'General';

		const roleName = roleAssignments[0].userRoleByRoleId?.name || '';
		if (roleName.includes('hr')) return 'Human Resources';
		else if (roleName.includes('admin')) return 'Administration';
		else if (roleName.includes('manager')) return 'Management';
		else if (roleName.includes('finance')) return 'Finance';
		else if (roleName.includes('engineering')) return 'Engineering';
		else if (roleName.includes('marketing')) return 'Marketing';
		else if (roleName.includes('sales')) return 'Sales';
		return 'General';
	}

	function getHighestRole(user: any): string {
		const roles = user.userRoleAssignmentsByUserId?.nodes || [];
		if (roles.length === 0) return 'Employee';

		const highest = roles.reduce((prev: any, curr: any) =>
			curr.userRoleByRoleId.level > prev.userRoleByRoleId.level ? curr : prev
		);

		return highest.userRoleByRoleId.name;
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

	function getDepartmentColor(department: string): string {
		const colors = {
			'Human Resources': 'bg-green-50 border-l-4 border-green-400',
			Administration: 'bg-red-50 border-l-4 border-red-400',
			Management: 'bg-purple-50 border-l-4 border-purple-400',
			Finance: 'bg-yellow-50 border-l-4 border-yellow-400',
			Engineering: 'bg-blue-50 border-l-4 border-blue-400',
			Marketing: 'bg-pink-50 border-l-4 border-pink-400',
			Sales: 'bg-orange-50 border-l-4 border-orange-400',
			General: 'bg-gray-50 border-l-4 border-gray-400'
		};
		return colors[department as keyof typeof colors] || colors.General;
	}

	// Filter functionality
	function updateFilteredNodes() {
		let filtered = [...orgNodes];

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(node) =>
					node.name.toLowerCase().includes(search) ||
					node.email.toLowerCase().includes(search) ||
					node.role.toLowerCase().includes(search) ||
					node.department.toLowerCase().includes(search)
			);
		}

		// Department filter
		if (selectedDepartment !== 'all') {
			filtered = filtered.filter((node) => node.department === selectedDepartment);
		}

		// Level filter
		if (selectedLevel !== 'all') {
			const levelRange = selectedLevel.split('-').map(Number);
			if (levelRange.length === 2) {
				filtered = filtered.filter(
					(node) => node.roleLevel >= levelRange[0] && node.roleLevel <= levelRange[1]
				);
			}
		}

		filteredNodes = filtered;
	}

	// Statistics
	const stats = $derived.by(() => {
		if (!filteredNodes || filteredNodes.length === 0) {
			return {
				total: 0,
				byLevel: {
					executive: 0,
					management: 0,
					senior: 0,
					staff: 0
				},
				departments: 0
			};
		}

		const total = filteredNodes.length;
		const byLevel = {
			executive: filteredNodes.filter((n) => n.roleLevel >= 80).length,
			management: filteredNodes.filter((n) => n.roleLevel >= 60 && n.roleLevel < 80).length,
			senior: filteredNodes.filter((n) => n.roleLevel >= 40 && n.roleLevel < 60).length,
			staff: filteredNodes.filter((n) => n.roleLevel < 40).length
		};
		const departments = new Set(filteredNodes.map((n) => n.department)).size;

		return { total, byLevel, departments };
	});

	// Get unique departments for filter
	const departments = $derived.by(() => {
		const depts = new Set(orgNodes.map((n) => n.department));
		return Array.from(depts).sort();
	});

	// Auto-layout function
	function autoLayout() {
		orgNodes = buildOrgStructure();
		updateFilteredNodes();
	}

	// Initialize the org structure
	onMount(() => {
		orgNodes = buildOrgStructure();
		updateFilteredNodes();
	});

	// Update filtered nodes when filters change
	$effect(() => {
		updateFilteredNodes();
	});
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="flex items-center gap-3 text-2xl font-bold tracking-tight">
				<Building2 class="h-7 w-7" />
				Organization Map
			</h2>
			<p class="text-sm text-muted-foreground">
				Company-wide organizational structure by levels and departments
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (showStats = !showStats)}>
				<Grid class="h-4 w-4" />
				{showStats ? 'Hide' : 'Show'} Stats
			</Button>
		</div>
	</div>

	<!-- Statistics -->
	{#if showStats && stats?.byLevel}
		<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
			<Card.Root>
				<Card.Content class="p-4">
					<div class="text-center">
						<div class="text-2xl font-bold">{stats.total}</div>
						<div class="text-xs text-muted-foreground">Total Employees</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-red-600">{stats.byLevel.executive}</div>
						<div class="text-xs text-muted-foreground">Executive</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-600">{stats.byLevel.management}</div>
						<div class="text-xs text-muted-foreground">Management</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{stats.byLevel.senior}</div>
						<div class="text-xs text-muted-foreground">Senior</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-gray-600">{stats.byLevel.staff}</div>
						<div class="text-xs text-muted-foreground">Staff</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Filters and Controls -->
	<Card.Root>
		<Card.Content class="p-4">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<!-- Search and Filters -->
				<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
					<div class="relative">
						<Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input placeholder="Search employees..." bind:value={searchTerm} class="w-64 pl-10" />
					</div>

					<select
						bind:value={selectedDepartment}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All Departments</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>

					<select
						bind:value={selectedLevel}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All Levels</option>
						<option value="80-100">Executive (80+)</option>
						<option value="60-79">Management (60-79)</option>
						<option value="40-59">Senior (40-59)</option>
						<option value="20-39">Staff (20-39)</option>
					</select>
				</div>

				<!-- Zoom Controls -->
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={() => (zoom = Math.min(2, zoom * 1.2))}>
						<ZoomIn class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={() => (zoom = Math.max(0.3, zoom * 0.8))}>
						<ZoomOut class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={() => (zoom = 0.8)}>
						<RotateCcw class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={autoLayout}>
						<Maximize class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Organization Map -->
	<Card.Root>
		<Card.Content class="p-0">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="relative h-[700px] w-full cursor-grab overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 {isDragging
					? 'cursor-grabbing'
					: ''}"
				role="application"
				aria-label="Interactive organization chart with pan and zoom controls"
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
					<!-- Connection Lines -->
					<svg class="pointer-events-none absolute inset-0">
						{#each filteredNodes.filter((node) => node.parentId) as node}
							{@const parent = filteredNodes.find((p) => p.id === node.parentId)}
							{#if parent}
								{@const startX = parent.x + NODE_WIDTH / 2}
								{@const startY = parent.y + NODE_HEIGHT}
								{@const endX = node.x + NODE_WIDTH / 2}
								{@const endY = node.y}
								{@const midY = startY + (endY - startY) / 2}

								<!-- Family tree style connection -->
								<path
									d="M {startX} {startY} L {startX} {midY} L {endX} {midY} L {endX} {endY}"
									stroke="#64748b"
									stroke-width="2"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>

								<!-- Connection dots -->
								<circle cx={startX} cy={startY} r="3" fill="#64748b" />
								<circle cx={endX} cy={endY} r="3" fill="#64748b" />
							{/if}
						{/each}
					</svg>

					<!-- Department Headers -->
					{#each Array.from(new Set(filteredNodes.map((n) => n.department))) as dept}
						{@const deptNodes = filteredNodes.filter((n) => n.department === dept)}
						{@const deptHead = deptNodes.find((n) => n.parentId === null)}
						{#if deptHead}
							<div
								class="absolute z-10 rounded-lg border bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm"
								style="top: {deptHead.y - 35}px; left: {deptHead.x}px;"
							>
								<span class="text-sm font-semibold text-gray-700">{dept}</span>
								<span class="ml-2 text-xs text-gray-500">({deptNodes.length})</span>
							</div>
						{/if}
					{/each}

					<!-- Employee Nodes -->
					{#each filteredNodes as node (node.id)}
						<div
							class="absolute select-none transition-all"
							style="left: {node.x}px; top: {node.y}px;"
						>
							<div
								class="w-[190px] rounded-lg border-2 bg-white p-3 {getNodeColor(
									node
								)} shadow-sm transition-all duration-200 hover:shadow-lg"
							>
								<!-- Department indicator -->
								<div
									class="mb-2 h-1 w-full rounded-t {getDepartmentColor(node.department).split(
										' '
									)[0]}"
								></div>

								<!-- Header -->
								<div class="mb-2 flex items-center justify-between">
									<div class="flex items-center gap-2">
										{#if node.isManager}
											<Crown class="h-4 w-4 text-yellow-600" />
										{:else}
											<User class="h-4 w-4" />
										{/if}
										<span class="font-mono text-xs"
											>{node.department.slice(0, 3).toUpperCase()}</span
										>
									</div>
									<Badge variant="outline" class="text-xs">
										L{node.roleLevel}
									</Badge>
								</div>

								<!-- Avatar and Info -->
								<div class="mb-3 flex items-center gap-2">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold"
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
								<div class="flex items-center justify-center gap-1">
									<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
										<Mail class="h-3 w-3" />
									</Button>
									<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
										<Eye class="h-3 w-3" />
									</Button>
								</div>
							</div>
						</div>
					{/each}

					<!-- Results indicator -->
				</div>

				<!-- Fixed UI indicators (outside draggable content) -->
				<div
					class="absolute bottom-4 left-4 rounded bg-white/90 px-3 py-2 text-sm backdrop-blur-sm"
				>
					Showing {filteredNodes.length} of {orgNodes.length} employees
				</div>

				<!-- Zoom indicator -->
				<div
					class="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-xs backdrop-blur-sm"
				>
					Zoom: {Math.round(zoom * 100)}%
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Department Legend -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Department Legend</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
				{#each departments as dept}
					<div class="flex items-center gap-2 rounded p-2 {getDepartmentColor(dept)}">
						<div
							class="h-3 w-3 rounded-full {getNodeColor({
								roleLevel: 60,
								department: dept
							} as OrgNode).split(' ')[0]}"
						></div>
						<span class="font-medium">{dept}</span>
						<Badge variant="outline" class="text-xs">
							{orgNodes.filter((n) => n.department === dept).length}
						</Badge>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
