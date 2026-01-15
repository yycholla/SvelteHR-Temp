<script lang="ts">
	import { onMount } from 'svelte';
	import type { OrgNode } from './org-map/types';

	// Import decomposed components
	import OrgMapControls from './org-map/OrgMapControls.svelte';
	import OrgMapStats from './org-map/OrgMapStats.svelte';
	import OrgMapCanvas from './org-map/OrgMapCanvas.svelte';
	import OrgMapLegend from './org-map/OrgMapLegend.svelte';

	// Props
	const {
		allEmployees
	}: {
		allEmployees: any[];
	} = $props();

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

		departmentNames.forEach((deptName) => {
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
	<!-- Controls -->
	<OrgMapControls
		bind:searchTerm
		bind:selectedDepartment
		bind:selectedLevel
		bind:showStats
		{departments}
		onZoomIn={() => (zoom = Math.min(2, zoom * 1.2))}
		onZoomOut={() => (zoom = Math.max(0.3, zoom * 0.8))}
		onResetZoom={() => (zoom = 0.8)}
		onAutoLayout={autoLayout}
	/>

	<!-- Statistics -->
	{#if showStats && stats?.byLevel}
		<OrgMapStats {stats} />
	{/if}

	<!-- Map Canvas -->
	<OrgMapCanvas
		{orgNodes}
		{filteredNodes}
		{zoom}
		{isDragging}
		{dragOffset}
		{NODE_WIDTH}
		{NODE_HEIGHT}
		onMouseDown={handleMouseDown}
		onMouseMove={handleMouseMove}
		onMouseUp={handleMouseUp}
		onWheel={handleWheel}
	/>

	<!-- Legend -->
	<OrgMapLegend {departments} {orgNodes} />
</div>
