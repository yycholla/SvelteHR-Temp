import type { Department } from '$lib/types';

export interface TreeNodeData {
	department: Department;
	children: TreeNodeData[];
	level: number;
}
