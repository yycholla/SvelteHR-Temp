export interface PerformanceReviewFilter {
	status?: {
		equalTo?: 'draft' | 'in_progress' | 'completed' | 'overdue';
		in?: Array<'draft' | 'in_progress' | 'completed' | 'overdue'>;
	};
	employeeId?: {
		equalTo?: string;
	};
	reviewerId?: {
		equalTo?: string;
	};
	reviewPeriod?: {
		equalTo?: string;
		includesInsensitive?: string;
	};
	reviewDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	overallRating?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
	employee?: {
		departmentId?: {
			equalTo?: string;
		};
		displayName?: {
			includesInsensitive?: string;
		};
	};
}

// Rust backend input types (flat, no clientMutationId)
export interface CreatePerformanceReviewInput {
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	reviewDate: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	status?: 'draft' | 'in_progress' | 'completed';
}

export interface UpdatePerformanceReviewInput {
	reviewPeriod?: string;
	reviewDate?: string;
	overallRating?: number;
	goalsAchievement?: number;
	collaboration?: number;
	communication?: number;
	leadership?: number;
	technicalSkills?: number;
	strengths?: string;
	areasForImprovement?: string;
	comments?: string;
	status?: 'draft' | 'in_progress' | 'completed';
}

// DeletePerformanceReviewInput not needed - uses string id directly

export interface PerformanceReview {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		department: {
			id: string;
			name: string;
		};
	};
	reviewerId: string;
	reviewer: {
		id: string;
		displayName: string;
		email: string;
	};
	reviewPeriod: string;
	reviewDate: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	status: 'draft' | 'in_progress' | 'completed' | 'overdue';
	createdAt: string;
	updatedAt: string;
}

export interface PerformanceStatistics {
	totalReviews: number;
	completedReviews: number;
	inProgressReviews: number;
	overdueReviews: number;
	completionRate: number;
	averageRatings: {
		overall: number;
		goalsAchievement: number;
		collaboration: number;
		communication: number;
		leadership: number;
		technicalSkills: number;
	};
	ratingDistribution: Array<{
		rating: number;
		count: number;
		percentage: number;
	}>;
}
