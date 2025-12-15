import type { JobInfoGraphQL, JobInfoClient } from './types';

/**
 * Maps JobInfo from GraphQL (snake_case) to Client (camelCase)
 */
export function mapJobInfoFromGraphQL(jobInfo: JobInfoGraphQL): JobInfoClient {
	return {
		title: jobInfo.title,
		department: jobInfo.department,
		manager: jobInfo.manager,
		hireDate: jobInfo.hire_date,
		employmentType: jobInfo.employment_type,
		salary: jobInfo.salary,
		currency: jobInfo.currency,
		isRemote: jobInfo.is_remote,
		payType: jobInfo.pay_type,
		startDate: jobInfo.start_date,
		endDate: jobInfo.end_date,
		jobTitle: jobInfo.job_title,
		departmentId: jobInfo.department_id,
		managerId: jobInfo.manager_id,
		employeeId: jobInfo.employee_id,
		reportsTo: jobInfo.reports_to
	};
}

/**
 * Maps JobInfo from Client (camelCase) to GraphQL (snake_case)
 */
export function mapJobInfoToGraphQL(jobInfo: JobInfoClient): JobInfoGraphQL {
	return {
		title: jobInfo.title,
		department: jobInfo.department,
		manager: jobInfo.manager,
		hire_date: jobInfo.hireDate,
		employment_type: jobInfo.employmentType,
		salary: jobInfo.salary,
		currency: jobInfo.currency,
		is_remote: jobInfo.isRemote,
		pay_type: jobInfo.payType,
		start_date: jobInfo.startDate,
		end_date: jobInfo.endDate,
		job_title: jobInfo.jobTitle,
		department_id: jobInfo.departmentId,
		manager_id: jobInfo.managerId,
		employee_id: jobInfo.employeeId,
		reports_to: jobInfo.reportsTo
	};
}
