<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import type { OrgNode } from './types';

	interface Props {
		departments: string[];
		orgNodes: OrgNode[];
	}

	const { departments, orgNodes }: Props = $props();

	function getNodeColor(node: Partial<OrgNode>): string {
		const level = node.roleLevel || 20;
		if (level >= 80) return 'bg-red-100 border-red-300 text-red-800';
		if (level >= 60) return 'bg-purple-100 border-purple-300 text-purple-800';
		if (level >= 40) return 'bg-blue-100 border-blue-300 text-blue-800';
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
						}).split(' ')[0]}"
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
