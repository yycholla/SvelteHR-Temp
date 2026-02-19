export interface FilterValues {
	action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | null;
	resourceType?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	employeeId?: string | null;
	searchQuery?: string | null;
}

export interface AuditLogFiltersProps {
	initialFilters?: FilterValues;
	resourceTypes: string[];
	onFilterChange: (filters: FilterValues) => void;
	onClear: () => void;
}
