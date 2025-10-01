/**
 * Performance Review Seed Data Model
 * Generates realistic performance review data for HR analytics and management dashboards
 */

export interface SeedPerformanceReview {
	id: string;
	nodeId: string;
	employeeId: number;
	reviewerId: number;
	reviewPeriod: string; // e.g., "2024-Q1", "2024-Annual"
	reviewType: 'quarterly' | 'annual' | 'probationary' | 'mid_year' | 'project_based';
	overallRating: number; // 1-5 scale
	competencyRatings: CompetencyRating[];
	goals: ReviewGoal[];
	achievements: string[];
	areasForImprovement: string[];
	reviewerComments: string;
	employeeSelfReview?: string;
	status: 'draft' | 'in_progress' | 'pending_approval' | 'completed' | 'overdue';
	dueDate: string;
	completedDate?: string;
	createdAt: string;
	updatedAt: string;
	nextReviewDate?: string;
}

export interface CompetencyRating {
	competency: string;
	rating: number; // 1-5 scale
	comments?: string;
	weight: number; // Percentage weight in overall score
}

export interface ReviewGoal {
	id: string;
	description: string;
	status: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'not_met';
	targetDate: string;
	completionDate?: string;
	notes?: string;
	measurable: boolean;
	impact: 'low' | 'medium' | 'high';
}

export interface SeedReviewTemplate {
	id: string;
	name: string;
	reviewType: SeedPerformanceReview['reviewType'];
	competencies: string[];
	isActive: boolean;
	createdBy: number;
	createdAt: string;
}

/**
 * Generate realistic performance review data
 */
export class PerformanceReviewGenerator {
	private readonly competencies = [
		{ name: 'Technical Skills', weight: 30 },
		{ name: 'Communication', weight: 20 },
		{ name: 'Teamwork & Collaboration', weight: 15 },
		{ name: 'Problem Solving', weight: 15 },
		{ name: 'Leadership', weight: 10 },
		{ name: 'Innovation & Creativity', weight: 5 },
		{ name: 'Time Management', weight: 5 }
	];

	private readonly achievementTemplates = [
		'Successfully delivered [PROJECT] ahead of schedule',
		'Improved team productivity by [X]% through process optimization',
		'Mentored [X] junior team members',
		'Led cross-functional initiative that resulted in [OUTCOME]',
		'Implemented new [TECHNOLOGY/PROCESS] that reduced [METRIC] by [X]%',
		'Exceeded sales targets by [X]% for [PERIOD]',
		'Resolved [X] critical customer issues with 100% satisfaction rate',
		'Completed professional certification in [SKILL]',
		'Streamlined [PROCESS] reducing processing time by [X] hours',
		'Identified and fixed security vulnerability preventing potential data breach'
	];

	private readonly improvementTemplates = [
		'Enhance technical skills in [TECHNOLOGY]',
		'Improve presentation and public speaking abilities',
		'Develop better time management strategies',
		'Strengthen delegation and team management skills',
		'Increase proactive communication with stakeholders',
		'Focus on strategic thinking and long-term planning',
		'Improve attention to detail in documentation',
		'Develop customer service and relationship management skills',
		'Enhance analytical and data interpretation skills',
		'Build stronger cross-departmental collaboration'
	];

	private readonly reviewerCommentTemplates = [
		'[EMPLOYEE] consistently demonstrates strong performance across all key areas. Their technical expertise and collaborative approach make them a valuable team member.',
		'[EMPLOYEE] has shown significant growth this review period. Their initiative in [PROJECT] particularly stood out and contributed to team success.',
		'[EMPLOYEE] meets expectations in most areas with room for improvement in [AREA]. With focused development, they have potential for advancement.',
		'Exceptional performance from [EMPLOYEE] this period. Their leadership in [INITIATIVE] and mentoring of junior staff exemplifies our core values.',
		'[EMPLOYEE] has consistently delivered quality work while maintaining positive team relationships. Their problem-solving skills have been particularly valuable.',
		'[EMPLOYEE] shows promise but needs to focus on [AREA] to reach their full potential. Regular coaching sessions are recommended.',
		'Outstanding contributor who consistently exceeds expectations. [EMPLOYEE] would benefit from stretch assignments to prepare for leadership roles.',
		'[EMPLOYEE] has successfully adapted to new challenges this period. Their willingness to learn and grow is commendable.'
	];

	/**
	 * Generate performance reviews for testing
	 */
	generatePerformanceReviews(
		count: number,
		employeeIds: number[],
		reviewerIds: number[]
	): SeedPerformanceReview[] {
		const reviews: SeedPerformanceReview[] = [];
		const now = new Date();

		for (let i = 0; i < count; i++) {
			const employeeId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
			const reviewerId = reviewerIds[Math.floor(Math.random() * reviewerIds.length)];

			// Generate review period (last 24 months)
			const reviewDate = new Date(now.getTime() - Math.random() * 24 * 30 * 24 * 60 * 60 * 1000);
			const reviewType = this.selectReviewType();
			const reviewPeriod = this.generateReviewPeriod(reviewDate, reviewType);

			// Generate competency ratings
			const competencyRatings = this.generateCompetencyRatings();
			const overallRating = this.calculateOverallRating(competencyRatings);

			// Generate goals
			const goals = this.generateReviewGoals(3 + Math.floor(Math.random() * 3)); // 3-5 goals

			const review: SeedPerformanceReview = {
				id: `review_${i + 1}`,
				nodeId: `node_review_${i + 1}`,
				employeeId,
				reviewerId,
				reviewPeriod,
				reviewType,
				overallRating,
				competencyRatings,
				goals,
				achievements: this.generateAchievements(2 + Math.floor(Math.random() * 4)), // 2-5 achievements
				areasForImprovement: this.generateImprovements(1 + Math.floor(Math.random() * 3)), // 1-3 areas
				reviewerComments: this.generateReviewerComments(),
				employeeSelfReview: Math.random() > 0.3 ? this.generateSelfReview() : undefined,
				status: this.generateStatus(reviewDate, now),
				dueDate: new Date(reviewDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				completedDate: Math.random() > 0.2 ? new Date(reviewDate.getTime() + Math.random() * 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
				createdAt: new Date(reviewDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
				updatedAt: new Date(reviewDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
				nextReviewDate: this.calculateNextReviewDate(reviewDate, reviewType)
			};

			reviews.push(review);
		}

		return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	/**
	 * Generate review templates
	 */
	generateReviewTemplates(creatorIds: number[]): SeedReviewTemplate[] {
		const templates: SeedReviewTemplate[] = [
			{
				id: 'template_annual',
				name: 'Annual Performance Review',
				reviewType: 'annual',
				competencies: this.competencies.map(c => c.name),
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
			},
			{
				id: 'template_quarterly',
				name: 'Quarterly Check-in',
				reviewType: 'quarterly',
				competencies: ['Technical Skills', 'Communication', 'Teamwork & Collaboration', 'Problem Solving'],
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
			},
			{
				id: 'template_probationary',
				name: 'Probationary Review',
				reviewType: 'probationary',
				competencies: ['Technical Skills', 'Communication', 'Time Management'],
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
			},
			{
				id: 'template_project',
				name: 'Project-Based Review',
				reviewType: 'project_based',
				competencies: ['Technical Skills', 'Problem Solving', 'Innovation & Creativity'],
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
			}
		];

		return templates;
	}

	private selectReviewType(): SeedPerformanceReview['reviewType'] {
		const types: Array<{ type: SeedPerformanceReview['reviewType']; weight: number }> = [
			{ type: 'quarterly', weight: 40 },
			{ type: 'annual', weight: 30 },
			{ type: 'mid_year', weight: 15 },
			{ type: 'probationary', weight: 10 },
			{ type: 'project_based', weight: 5 }
		];

		const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
		let random = Math.random() * totalWeight;

		for (const type of types) {
			random -= type.weight;
			if (random <= 0) {
				return type.type;
			}
		}

		return 'quarterly';
	}

	private generateReviewPeriod(date: Date, type: SeedPerformanceReview['reviewType']): string {
		const year = date.getFullYear();
		const quarter = Math.floor(date.getMonth() / 3) + 1;

		switch (type) {
			case 'quarterly':
				return `${year}-Q${quarter}`;
			case 'annual':
				return `${year}-Annual`;
			case 'mid_year':
				return `${year}-Mid-Year`;
			case 'probationary':
				return `${year}-Probationary`;
			case 'project_based':
				return `${year}-Project-${Math.floor(Math.random() * 1000)}`;
			default:
				return `${year}-Q${quarter}`;
		}
	}

	private generateCompetencyRatings(): CompetencyRating[] {
		return this.competencies.map(comp => ({
			competency: comp.name,
			rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 range, rounded to 1 decimal
			comments: Math.random() > 0.7 ? this.generateCompetencyComment(comp.name) : undefined,
			weight: comp.weight
		}));
	}

	private generateCompetencyComment(competency: string): string {
		const comments = {
			'Technical Skills': [
				'Strong grasp of core technologies',
				'Stays current with industry trends',
				'Could benefit from advanced certification',
				'Excellent troubleshooting abilities'
			],
			'Communication': [
				'Clear and effective communicator',
				'Good at explaining complex concepts',
				'Could improve written documentation',
				'Excellent presentation skills'
			],
			'Teamwork & Collaboration': [
				'Great team player',
				'Helps colleagues when needed',
				'Could be more proactive in team activities',
				'Natural collaborator'
			],
			'Problem Solving': [
				'Methodical approach to challenges',
				'Creative solutions to complex problems',
				'Could ask for help sooner when stuck',
				'Excellent analytical thinking'
			],
			'Leadership': [
				'Shows leadership potential',
				'Good at mentoring others',
				'Could take on more leadership responsibilities',
				'Natural leader'
			]
		};

		const competencyComments = comments[competency] || ['Performing well in this area'];
		return competencyComments[Math.floor(Math.random() * competencyComments.length)];
	}

	private calculateOverallRating(ratings: CompetencyRating[]): number {
		const weightedSum = ratings.reduce((sum, rating) => {
			return sum + (rating.rating * rating.weight / 100);
		}, 0);

		return Math.round(weightedSum * 10) / 10; // Round to 1 decimal place
	}

	private generateReviewGoals(count: number): ReviewGoal[] {
		const goalTemplates = [
			'Complete certification in [TECHNOLOGY]',
			'Improve [METRIC] by [X]% over next quarter',
			'Lead at least one cross-functional project',
			'Mentor [X] junior team members',
			'Reduce bug reports by [X]% through better testing',
			'Implement new [PROCESS/TOOL] to improve efficiency',
			'Enhance customer satisfaction scores to [X]%',
			'Attend [X] professional development workshops',
			'Contribute to open source project in [TECHNOLOGY]',
			'Develop expertise in [NEW_AREA]'
		];

		const goals: ReviewGoal[] = [];
		for (let i = 0; i < count; i++) {
			const template = goalTemplates[Math.floor(Math.random() * goalTemplates.length)];
			const goal: ReviewGoal = {
				id: `goal_${i + 1}`,
				description: template.replace(/\[X\]/g, String(Math.floor(Math.random() * 20) + 5))
					.replace(/\[TECHNOLOGY\]/g, ['React', 'Node.js', 'Python', 'AWS', 'Docker'][Math.floor(Math.random() * 5)])
					.replace(/\[METRIC\]/g, ['productivity', 'accuracy', 'response time', 'quality score'][Math.floor(Math.random() * 4)])
					.replace(/\[PROCESS\/TOOL\]/g, ['automation tool', 'testing framework', 'monitoring system'][Math.floor(Math.random() * 3)])
					.replace(/\[NEW_AREA\]/g, ['machine learning', 'cloud architecture', 'security', 'data analysis'][Math.floor(Math.random() * 4)]),
				status: ['not_started', 'in_progress', 'completed', 'exceeded', 'not_met'][Math.floor(Math.random() * 5)] as ReviewGoal['status'],
				targetDate: new Date(Date.now() + (30 + Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				measurable: Math.random() > 0.3,
				impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as ReviewGoal['impact']
			};

			if (goal.status === 'completed' || goal.status === 'exceeded') {
				goal.completionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
				goal.notes = 'Successfully completed as planned';
			}

			goals.push(goal);
		}

		return goals;
	}

	private generateAchievements(count: number): string[] {
		const achievements: string[] = [];
		for (let i = 0; i < count; i++) {
			let achievement = this.achievementTemplates[Math.floor(Math.random() * this.achievementTemplates.length)];
			achievement = achievement
				.replace(/\[PROJECT\]/g, ['Customer Portal', 'API Migration', 'Mobile App', 'Data Pipeline'][Math.floor(Math.random() * 4)])
				.replace(/\[X\]/g, String(Math.floor(Math.random() * 30) + 10))
				.replace(/\[OUTCOME\]/g, ['cost savings of $50K', 'improved user satisfaction', '25% faster processing'][Math.floor(Math.random() * 3)])
				.replace(/\[TECHNOLOGY\/PROCESS\]/g, ['CI/CD pipeline', 'automated testing', 'code review process'][Math.floor(Math.random() * 3)])
				.replace(/\[METRIC\]/g, ['deployment time', 'error rate', 'processing time'][Math.floor(Math.random() * 3)])
				.replace(/\[PERIOD\]/g, ['Q1', 'Q2', 'Q3', 'Q4'][Math.floor(Math.random() * 4)])
				.replace(/\[SKILL\]/g, ['AWS Solutions Architect', 'PMP', 'Scrum Master', 'Security+'][Math.floor(Math.random() * 4)])
				.replace(/\[PROCESS\]/g, ['onboarding process', 'bug triage', 'deployment pipeline'][Math.floor(Math.random() * 3)]);

			achievements.push(achievement);
		}
		return achievements;
	}

	private generateImprovements(count: number): string[] {
		return this.improvementTemplates
			.sort(() => Math.random() - 0.5)
			.slice(0, count)
			.map(template =>
				template.replace(/\[TECHNOLOGY\]/g, ['React', 'Python', 'AWS', 'Kubernetes'][Math.floor(Math.random() * 4)])
					.replace(/\[AREA\]/g, ['time management', 'communication', 'technical skills'][Math.floor(Math.random() * 3)])
			);
	}

	private generateReviewerComments(): string {
		const template = this.reviewerCommentTemplates[Math.floor(Math.random() * this.reviewerCommentTemplates.length)];
		return template
			.replace(/\[EMPLOYEE\]/g, 'The employee')
			.replace(/\[PROJECT\]/g, ['customer portal', 'API integration', 'mobile app development'][Math.floor(Math.random() * 3)])
			.replace(/\[AREA\]/g, ['communication', 'technical documentation', 'time management'][Math.floor(Math.random() * 3)])
			.replace(/\[INITIATIVE\]/g, ['team mentoring program', 'process improvement', 'technical innovation'][Math.floor(Math.random() * 3)]);
	}

	private generateSelfReview(): string {
		const templates = [
			'This review period has been challenging but rewarding. I\'ve grown significantly in my technical abilities and feel more confident in my role.',
			'I\'m proud of the projects I\'ve completed and the relationships I\'ve built with my team. I\'m excited to continue developing my skills.',
			'I believe I\'ve met most of my objectives this period. I\'ve identified areas where I can improve and am committed to professional growth.',
			'The feedback from my colleagues has been valuable. I\'ve implemented several suggestions and seen positive results in my work quality.',
			'I\'ve enjoyed taking on new challenges this period. While some were difficult, they\'ve helped me expand my capabilities.'
		];

		return templates[Math.floor(Math.random() * templates.length)];
	}

	private generateStatus(reviewDate: Date, now: Date): SeedPerformanceReview['status'] {
		const daysDiff = (now.getTime() - reviewDate.getTime()) / (24 * 60 * 60 * 1000);

		if (daysDiff < -14) return 'draft';
		if (daysDiff < -7) return 'in_progress';
		if (daysDiff < 0) return 'pending_approval';
		if (daysDiff < 21) return 'completed';
		return Math.random() > 0.8 ? 'overdue' : 'completed';
	}

	private calculateNextReviewDate(currentDate: Date, type: SeedPerformanceReview['reviewType']): string {
		const nextDate = new Date(currentDate);

		switch (type) {
			case 'quarterly':
				nextDate.setMonth(nextDate.getMonth() + 3);
				break;
			case 'annual':
				nextDate.setFullYear(nextDate.getFullYear() + 1);
				break;
			case 'mid_year':
				nextDate.setMonth(nextDate.getMonth() + 6);
				break;
			case 'probationary':
				nextDate.setMonth(nextDate.getMonth() + 6);
				break;
			case 'project_based':
				nextDate.setMonth(nextDate.getMonth() + 12); // Next annual review
				break;
		}

		return nextDate.toISOString().split('T')[0];
	}
}

/**
 * Default export for easy importing
 */
export default new PerformanceReviewGenerator();