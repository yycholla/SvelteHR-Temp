// Document interface matching the data structure
export interface Document {
	id: string;
	filename: string;
	file_type: string;
	file_size_bytes: number;
	category: string;
	sensitivity_level?: string;
	uploaded_at: string;
	uploaded_by: string;
	expiration_date?: string | null;
	version_number?: number;
	is_encrypted?: boolean;
	assigned_users?: Array<{ id: string; email: string; displayName: string }>;
}
