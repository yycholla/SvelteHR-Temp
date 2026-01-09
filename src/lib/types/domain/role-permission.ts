export interface Role {
	id: string;
	name: string;
	description?: string;
	permissions: Permission[];
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Permission {
	id: string;
	name: string;
	resource: string;
	action: string;
	scope: string;
	description?: string;
}
