export interface OrgNode {
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
