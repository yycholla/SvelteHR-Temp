import type { DataRequest } from './core';

// =============================================================================
// Department Management Operation Contracts
// =============================================================================

export interface GetDepartmentsVariables {
	includeEmployeeCount?: boolean;
}

export interface GetDepartmentsResponse {
	departments: Department[];
}

export interface GetDepartmentsWithStatsVariables {
	includeInactive?: boolean;
	includeEmployeeStats?: boolean;
	includeFinancialStats?: boolean;
	statsDateRange?: {
		startDate: string;
		endDate: string;
	};
	sortBy?: string;
	sortDirection?: 'asc' | 'desc';
}

export interface GetDepartmentsWithStatsResponse {
	departments: Department[];
	summary?: {
		totalDepartments: number;
		activeDepartments: number;
		inactiveDepartments: number;
		totalEmployeesAcrossAllDepts: number;
		totalBudgetAcrossAllDepts: number;
		averageDepartmentSize: number;
		largestDepartment: {
			name: string;
			employeeCount: number;
		};
		smallestDepartment: {
			name: string;
			employeeCount: number;
		};
	};
	aggregatedStats?: {
		companyWideMetrics: {
			totalHeadcount: number;
			averagePerformanceRating: number;
			totalSalaryExpense: number;
			averageCompanySalary: number;
			totalTurnoverRate: number;
			averageTenure: number;
		};
		departmentComparisons: Array<{
			departmentId: string;
			departmentName: string;
			performanceVsAverage: number;
			salaryVsAverage: number;
			turnoverVsAverage: number;
		}>;
	};
	metadata?: {
		lastCalculated: string;
		calculationDuration: number;
		dataFreshness: string;
		nextUpdateScheduled: string;
	};
}

export type GetDepartmentsWithStatsRequest = DataRequest<GetDepartmentsWithStatsVariables>;

export interface Department {
	id: string;
	name: string;
	description?: string;
	managerId?: string;
	manager?: {
		id: string;
		displayName: string;
		email: string;
	};
	employeeCount?: number;
	isActive: boolean;
	createdAt: string;
}
