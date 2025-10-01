/**
 * Leave Request Seed Data Model
 * Generates realistic leave request data for testing the leave approvals system
 */

export interface SeedLeaveRequest {
	id: string;
	nodeId: string;
	employeeId: number;
	managerId: number;
	leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'jury_duty' | 'medical' | 'mental_health';
	startDate: string;
	endDate: string;
	daysRequested: number;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	reason: string;
	managerComments?: string;
	createdAt: string;
	updatedAt: string;
	emergency?: boolean;
	halfDay?: boolean;
	returnToWorkDate?: string;
}

export interface SeedLeaveBalance {
	id: string;
	employeeId: number;
	leaveType: string;
	totalDays: number;
	usedDays: number;
	remainingDays: number;
	accrualRate: number;
	year: number;
	policyId?: number;
}

/**
 * Generate realistic leave request data
 */
export class LeaveRequestGenerator {
	private readonly leaveTypes: Array<{
		type: SeedLeaveRequest['leaveType'];
		weight: number;
		reasonTemplates: string[];
		avgDays: number;
	}> = [
		{
			type: 'vacation',
			weight: 40,
			reasonTemplates: [
				'Annual family vacation',
				'Extended holiday trip',
				'Wedding anniversary celebration',
				'Visit family out of state',
				'Planned vacation with spouse',
				'Summer holiday break',
				'Christmas vacation',
				'Spring break trip'
			],
			avgDays: 7
		},
		{
			type: 'sick',
			weight: 25,
			reasonTemplates: [
				'Flu symptoms and recovery',
				'Medical procedure and recovery',
				'Dental surgery',
				'Back pain treatment',
				'Migraine management',
				'Cold and respiratory issues',
				'Doctor appointments and tests',
				'Physical therapy sessions'
			],
			avgDays: 3
		},
		{
			type: 'personal',
			weight: 15,
			reasonTemplates: [
				'Personal family matters',
				'Home repairs and maintenance',
				'Legal appointments',
				'Financial planning meetings',
				'Moving and relocation',
				'Personal errands',
				'Family emergency',
				'Personal development'
			],
			avgDays: 2
		},
		{
			type: 'medical',
			weight: 8,
			reasonTemplates: [
				'Scheduled surgery',
				'Cancer treatment',
				'Physical rehabilitation',
				'Mental health treatment',
				'Chronic condition management',
				'Specialist consultations',
				'Medical testing and diagnosis',
				'Recovery from injury'
			],
			avgDays: 5
		},
		{
			type: 'maternity',
			weight: 4,
			reasonTemplates: [
				'Maternity leave for childbirth',
				'Bonding time with newborn',
				'Postpartum recovery',
				'Prenatal care and preparation'
			],
			avgDays: 60
		},
		{
			type: 'paternity',
			weight: 3,
			reasonTemplates: [
				'Paternity leave for new child',
				'Supporting partner after childbirth',
				'Bonding time with newborn',
				'Family adjustment period'
			],
			avgDays: 14
		},
		{
			type: 'bereavement',
			weight: 3,
			reasonTemplates: [
				'Death of immediate family member',
				'Funeral arrangements',
				'Grief and mourning period',
				'Estate and legal matters'
			],
			avgDays: 3
		},
		{
			type: 'jury_duty',
			weight: 1,
			reasonTemplates: [
				'Jury duty service',
				'Court appearance required',
				'Legal civic duty'
			],
			avgDays: 5
		},
		{
			type: 'mental_health',
			weight: 1,
			reasonTemplates: [
				'Mental health treatment',
				'Stress management and recovery',
				'Burnout prevention',
				'Therapy and counseling'
			],
			avgDays: 2
		}
	];

	/**
	 * Generate leave requests for testing
	 */
	generateLeaveRequests(count: number, employeeIds: number[], managerIds: number[]): SeedLeaveRequest[] {
		const requests: SeedLeaveRequest[] = [];
		const now = new Date();

		for (let i = 0; i < count; i++) {
			const leaveTypeInfo = this.selectRandomLeaveType();
			const employeeId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
			const managerId = managerIds[Math.floor(Math.random() * managerIds.length)];

			// Generate realistic date ranges
			const requestDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
			const futureDate = new Date(now.getTime() + Math.random() * 180 * 24 * 60 * 60 * 1000); // Next 180 days

			const startDate = Math.random() > 0.3 ? futureDate : requestDate; // 70% future, 30% past
			const daysRequested = this.generateDaysRequested(leaveTypeInfo.avgDays);
			const endDate = new Date(startDate.getTime() + (daysRequested - 1) * 24 * 60 * 60 * 1000);

			// Determine status based on date and random factors
			const status = this.generateStatus(startDate, now);

			const request: SeedLeaveRequest = {
				id: `leave_${i + 1}`,
				nodeId: `node_leave_${i + 1}`,
				employeeId,
				managerId,
				leaveType: leaveTypeInfo.type,
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0],
				daysRequested,
				status,
				reason: leaveTypeInfo.reasonTemplates[Math.floor(Math.random() * leaveTypeInfo.reasonTemplates.length)],
				createdAt: requestDate.toISOString(),
				updatedAt: new Date(requestDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
				emergency: leaveTypeInfo.type === 'sick' && Math.random() < 0.2,
				halfDay: daysRequested < 1 && Math.random() < 0.3
			};

			// Add manager comments for non-pending requests
			if (status !== 'pending') {
				request.managerComments = this.generateManagerComment(status, leaveTypeInfo.type);
			}

			// Add return to work date for completed sick/medical leave
			if ((leaveTypeInfo.type === 'sick' || leaveTypeInfo.type === 'medical') &&
				status === 'approved' && endDate < now) {
				request.returnToWorkDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			}

			requests.push(request);
		}

		return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	/**
	 * Generate leave balances for employees
	 */
	generateLeaveBalances(employeeIds: number[], year: number = new Date().getFullYear()): SeedLeaveBalance[] {
		const balances: SeedLeaveBalance[] = [];

		const leaveTypeConfigs = [
			{ type: 'vacation', totalDays: 20, accrualRate: 1.67 },
			{ type: 'sick', totalDays: 10, accrualRate: 0.83 },
			{ type: 'personal', totalDays: 5, accrualRate: 0.42 },
			{ type: 'mental_health', totalDays: 3, accrualRate: 0.25 }
		];

		employeeIds.forEach((employeeId, index) => {
			leaveTypeConfigs.forEach((config, typeIndex) => {
				const usedDays = Math.floor(Math.random() * (config.totalDays * 0.8)); // Use up to 80% of allowance
				const balance: SeedLeaveBalance = {
					id: `balance_${employeeId}_${typeIndex}`,
					employeeId,
					leaveType: config.type,
					totalDays: config.totalDays,
					usedDays,
					remainingDays: config.totalDays - usedDays,
					accrualRate: config.accrualRate,
					year,
					policyId: typeIndex + 1
				};
				balances.push(balance);
			});
		});

		return balances;
	}

	private selectRandomLeaveType() {
		const totalWeight = this.leaveTypes.reduce((sum, type) => sum + type.weight, 0);
		let random = Math.random() * totalWeight;

		for (const type of this.leaveTypes) {
			random -= type.weight;
			if (random <= 0) {
				return type;
			}
		}

		return this.leaveTypes[0]; // Fallback
	}

	private generateDaysRequested(avgDays: number): number {
		if (avgDays <= 1) {
			return Math.random() < 0.7 ? 1 : 0.5; // 70% full day, 30% half day
		}

		// Use normal distribution around average
		const variation = avgDays * 0.3;
		const days = Math.max(1, Math.round(avgDays + (Math.random() - 0.5) * variation * 2));

		// Cap extremely long leaves
		return Math.min(days, avgDays > 30 ? 90 : 21);
	}

	private generateStatus(startDate: Date, now: Date): SeedLeaveRequest['status'] {
		const isPast = startDate < now;
		const isFuture = startDate > now;

		if (isPast) {
			// Past requests are mostly approved/rejected
			const rand = Math.random();
			if (rand < 0.7) return 'approved';
			if (rand < 0.85) return 'rejected';
			return 'cancelled';
		} else if (isFuture) {
			// Future requests are mostly pending or approved
			const rand = Math.random();
			if (rand < 0.4) return 'pending';
			if (rand < 0.8) return 'approved';
			if (rand < 0.95) return 'rejected';
			return 'cancelled';
		} else {
			// Current requests are mostly pending
			return Math.random() < 0.8 ? 'pending' : 'approved';
		}
	}

	private generateManagerComment(status: SeedLeaveRequest['status'], leaveType: string): string {
		const comments = {
			approved: [
				'Request approved. Enjoy your time off!',
				'Approved as requested. Please ensure work coverage.',
				'Time off approved. Have a great break!',
				'Request has been approved. Safe travels!',
				'Approved. Please coordinate with your team.',
				'Time off request approved as submitted.',
				'Approved. Hope you feel better soon!',
				'Request approved. Take care and rest well.'
			],
			rejected: [
				'Unfortunately cannot approve due to project deadlines.',
				'Denied due to staffing constraints during this period.',
				'Unable to approve - critical project phase.',
				'Rejected - please resubmit for alternative dates.',
				'Cannot approve due to team availability issues.',
				'Denied - peak business period requires full staffing.',
				'Unable to accommodate these dates. Please discuss alternatives.',
				'Request denied due to operational requirements.'
			],
			cancelled: [
				'Request cancelled by employee.',
				'Cancelled due to changed circumstances.',
				'Employee cancelled this request.',
				'Cancelled and withdrawn by requestor.'
			]
		};

		const statusComments = comments[status] || comments.approved;
		return statusComments[Math.floor(Math.random() * statusComments.length)];
	}
}

/**
 * Default export for easy importing
 */
export default new LeaveRequestGenerator();