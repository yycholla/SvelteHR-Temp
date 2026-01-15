<script lang="ts">
	import { Crown, Eye, Mail, User } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { OrgNode } from './types';

	interface Props {
		orgNodes: OrgNode[];
		filteredNodes: OrgNode[];
		zoom: number;
		isDragging: boolean;
		dragOffset: { x: number; y: number };
		NODE_WIDTH: number;
		NODE_HEIGHT: number;
		onMouseDown: (e: MouseEvent) => void;
		onMouseMove: (e: MouseEvent) => void;
		onMouseUp: () => void;
		onWheel: (e: WheelEvent) => void;
	}

	const {
		orgNodes,
		filteredNodes,
		zoom,
		isDragging,
		dragOffset,
		NODE_WIDTH,
		NODE_HEIGHT,
		onMouseDown,
		onMouseMove,
		onMouseUp,
		onWheel
	}: Props = $props();

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
</script>

<Card.Root>
	<Card.Content class="p-0">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="relative h-[700px] w-full cursor-grab overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 {isDragging
				? 'cursor-grabbing'
				: ''}"
			role="application"
			aria-label="Interactive organization chart with pan and zoom controls"
			onmousedown={onMouseDown}
			onmousemove={onMouseMove}
			onmouseup={onMouseUp}
			onmouseleave={onMouseUp}
			onwheel={onWheel}
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
									<span class="font-mono text-xs">{node.department.slice(0, 3).toUpperCase()}</span>
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
			</div>

			<!-- Fixed UI indicators (outside draggable content) -->
			<div class="absolute bottom-4 left-4 rounded bg-white/90 px-3 py-2 text-sm backdrop-blur-sm">
				Showing {filteredNodes.length} of {orgNodes.length} employees
			</div>

			<!-- Zoom indicator -->
			<div class="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-xs backdrop-blur-sm">
				Zoom: {Math.round(zoom * 100)}%
			</div>
		</div>
	</Card.Content>
</Card.Root>
