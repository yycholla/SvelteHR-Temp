/**
 * Goal Seed Data Model
 * Generates realistic employee goal data for performance management and tracking
 */

export interface SeedGoal {
	id: string;
	nodeId: string;
	employeeId: number;
	createdBy: number;
	title: string;
	description: string;
	category: 'performance' | 'learning' | 'leadership' | 'technical' | 'business' | 'personal';
	priority: 'low' | 'medium' | 'high' | 'critical';
	status: 'draft' | 'active' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
	progress: number; // 0-100 percentage
	targetValue?: number;
	currentValue?: number;
	unit?: string; // e.g., 'hours', 'projects', 'certifications'
	startDate: string;
	targetDate: string;
	completedDate?: string;
	lastUpdated: string;
	createdAt: string;
	updatedAt: string;
	tags: string[];
	keyResults: KeyResult[];
	milestones: Milestone[];
	isPublic: boolean;
	linkedToReview?: string; // Review ID if connected
	departmentId?: number;
}

export interface KeyResult {
	id: string;
	description: string;
	targetValue: number;
	currentValue: number;
	unit: string;
	progress: number; // 0-100 percentage
	status: 'not_started' | 'in_progress' | 'at_risk' | 'completed' | 'exceeded';
	dueDate: string;
	completedDate?: string;
	notes?: string;
}

export interface Milestone {
	id: string;
	title: string;
	description: string;
	dueDate: string;
	completedDate?: string;
	status: 'pending' | 'in_progress' | 'completed' | 'overdue';
	progress: number; // 0-100 percentage
	dependencies?: string[]; // IDs of other milestones
}

export interface SeedGoalTemplate {
	id: string;
	name: string;
	category: SeedGoal['category'];
	titleTemplate: string;
	descriptionTemplate: string;
	suggestedDuration: number; // days
	keyResultTemplates: string[];
	tags: string[];
	isActive: boolean;
	createdBy: number;
	createdAt: string;
}

/**
 * Generate realistic goal data
 */
export class GoalGenerator {
	private readonly goalTemplates = [
		{
			category: 'technical' as const,
			templates: [
				{
					title: 'Master [TECHNOLOGY] Development',
					description: 'Become proficient in [TECHNOLOGY] to improve development efficiency and code quality',
					duration: 90,
					keyResults: [
						'Complete [TECHNOLOGY] certification course',
						'Build 3 projects using [TECHNOLOGY]',
						'Achieve 90% score on technical assessment'
					],
					tags: ['skill-development', 'technology', 'certification']
				},
				{
					title: 'Improve Code Quality and Testing',
					description: 'Enhance software quality through better testing practices and code review processes',
					duration: 120,
					keyResults: [
						'Increase test coverage to 85%',
						'Reduce bug reports by 30%',
						'Implement automated testing pipeline'
					],
					tags: ['quality', 'testing', 'automation']
				},
				{
					title: 'Learn Cloud Architecture',
					description: 'Develop expertise in cloud technologies and scalable system design',
					duration: 180,
					keyResults: [
						'Obtain [CLOUD] certification',
						'Migrate 2 applications to cloud',
						'Design scalable microservices architecture'
					],
					tags: ['cloud', 'architecture', 'scalability']
				}
			]
		},
		{
			category: 'performance' as const,
			templates: [
				{
					title: 'Increase Productivity and Efficiency',
					description: 'Improve personal productivity and deliver higher quality work faster',
					duration: 90,
					keyResults: [
						'Complete tasks 20% faster',
						'Reduce rework by 50%',
						'Implement 3 process improvements'
					],
					tags: ['productivity', 'efficiency', 'process']
				},
				{
					title: 'Enhance Customer Satisfaction',
					description: 'Improve customer experience and satisfaction through better service delivery',
					duration: 120,
					keyResults: [
						'Achieve 95% customer satisfaction score',
						'Reduce response time to under 24 hours',
						'Complete customer service training'
					],
					tags: ['customer-service', 'satisfaction', 'quality']
				}
			]
		},
		{
			category: 'leadership' as const,
			templates: [
				{
					title: 'Develop Team Leadership Skills',
					description: 'Build capabilities to effectively lead and mentor team members',
					duration: 180,
					keyResults: [
						'Complete leadership development program',
						'Successfully mentor 2 junior developers',
						'Lead at least one cross-functional project'
					],
					tags: ['leadership', 'mentoring', 'team-management']
				},
				{
					title: 'Improve Communication and Collaboration',
					description: 'Enhance ability to communicate effectively across teams and stakeholders',
					duration: 90,
					keyResults: [
						'Complete presentation skills workshop',
						'Facilitate 10 successful team meetings',
						'Improve stakeholder satisfaction by 25%'
					],
					tags: ['communication', 'collaboration', 'presentations']
				}
			]
		},
		{
			category: 'learning' as const,
			templates: [
				{
					title: 'Professional Development and Certification',
					description: 'Advance professional knowledge through formal learning and certification',
					duration: 120,
					keyResults: [
						'Obtain industry certification',
						'Attend 3 professional conferences',
						'Complete advanced degree coursework'
					],
					tags: ['certification', 'education', 'professional-development']
				},
				{
					title: 'Cross-Functional Skill Development',
					description: 'Expand knowledge in areas outside primary expertise',
					duration: 150,
					keyResults: [
						'Shadow team members in different roles',
						'Complete cross-training program',
						'Contribute to projects in new domain'
					],
					tags: ['cross-training', 'versatility', 'learning']
				}
			]
		},
		{
			category: 'business' as const,
			templates: [
				{
					title: 'Drive Revenue Growth',
					description: 'Contribute to business growth through improved processes and customer acquisition',
					duration: 180,
					keyResults: [
						'Increase sales by 15%',
						'Identify 5 new business opportunities',
						'Improve conversion rate by 10%'
					],
					tags: ['revenue', 'growth', 'business-development']
				},
				{
					title: 'Cost Optimization and Efficiency',
					description: 'Reduce operational costs while maintaining quality and service levels',
					duration: 120,
					keyResults: [
						'Reduce department costs by 10%',
						'Implement 3 cost-saving initiatives',
						'Optimize resource allocation processes'
					],
					tags: ['cost-reduction', 'efficiency', 'optimization']
				}
			]
		},
		{
			category: 'personal' as const,
			templates: [
				{
					title: 'Work-Life Balance and Wellness',
					description: 'Maintain healthy work-life balance while achieving professional goals',
					duration: 365,
					keyResults: [
						'Take all allocated vacation days',
						'Complete wellness program',
						'Maintain consistent work schedule'
					],
					tags: ['wellness', 'work-life-balance', 'health']
				},
				{
					title: 'Career Development Planning',
					description: 'Create and execute plan for long-term career advancement',
					duration: 180,
					keyResults: [
						'Complete career assessment',
						'Identify advancement opportunities',
						'Develop 5-year career plan'
					],
					tags: ['career-planning', 'advancement', 'professional-growth']
				}
			]
		}
	];

	private readonly technologies = ['React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Go', 'Rust', 'TypeScript', 'GraphQL', 'Docker', 'Kubernetes'];
	private readonly cloudProviders = ['AWS', 'Azure', 'Google Cloud', 'IBM Cloud'];

	/**
	 * Generate goals for testing
	 */
	generateGoals(count: number, employeeIds: number[], managerIds: number[]): SeedGoal[] {
		const goals: SeedGoal[] = [];
		const now = new Date();

		for (let i = 0; i < count; i++) {
			const employeeId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
			const createdBy = Math.random() > 0.3 ? employeeId : managerIds[Math.floor(Math.random() * managerIds.length)];

			// Select random template
			const categoryTemplates = this.goalTemplates[Math.floor(Math.random() * this.goalTemplates.length)];
			const template = categoryTemplates.templates[Math.floor(Math.random() * categoryTemplates.templates.length)];

			// Generate dates
			const createdDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000); // Last 6 months
			const startDate = new Date(createdDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000); // Start within 2 weeks
			const targetDate = new Date(startDate.getTime() + template.duration * 24 * 60 * 60 * 1000);

			// Generate progress and status
			const progress = Math.floor(Math.random() * 101);
			const status = this.generateStatus(progress, startDate, targetDate, now);

			// Process template text
			const title = this.processTemplate(template.title);
			const description = this.processTemplate(template.description);

			const goal: SeedGoal = {
				id: `goal_${i + 1}`,
				nodeId: `node_goal_${i + 1}`,
				employeeId,
				createdBy,
				title,
				description,
				category: categoryTemplates.category,
				priority: this.generatePriority(),
				status,
				progress,
				startDate: startDate.toISOString().split('T')[0],
				targetDate: targetDate.toISOString().split('T')[0],
				completedDate: status === 'completed' ? this.generateCompletedDate(targetDate) : undefined,
				lastUpdated: new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				createdAt: createdDate.toISOString(),
				updatedAt: new Date(createdDate.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
				tags: [...template.tags, this.generateAdditionalTags()].flat(),
				keyResults: this.generateKeyResults(template.keyResults, targetDate),
				milestones: this.generateMilestones(startDate, targetDate),
				isPublic: Math.random() > 0.3, // 70% public
				linkedToReview: Math.random() > 0.7 ? `review_${Math.floor(Math.random() * 20) + 1}` : undefined,
				departmentId: Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : undefined
			};

			// Add quantifiable targets for some goals
			if (Math.random() > 0.6) {
				goal.targetValue = Math.floor(Math.random() * 100) + 1;
				goal.currentValue = Math.floor(goal.targetValue * (progress / 100));
				goal.unit = ['hours', 'projects', 'certifications', 'points', 'tasks'][Math.floor(Math.random() * 5)];
			}

			goals.push(goal);
		}

		return goals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	/**
	 * Generate goal templates
	 */
	generateGoalTemplates(creatorIds: number[]): SeedGoalTemplate[] {
		const templates: SeedGoalTemplate[] = [];
		let templateId = 1;

		this.goalTemplates.forEach(categoryGroup => {
			categoryGroup.templates.forEach(template => {
				templates.push({
					id: `template_${templateId++}`,
					name: template.title.replace(/\[.*?\]/g, '').trim(),
					category: categoryGroup.category,
					titleTemplate: template.title,
					descriptionTemplate: template.description,
					suggestedDuration: template.duration,
					keyResultTemplates: template.keyResults,
					tags: template.tags,
					isActive: true,
					createdBy: creatorIds[Math.floor(Math.random() * creatorIds.length)],
					createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
				});
			});
		});

		return templates;
	}

	private processTemplate(template: string): string {
		return template
			.replace(/\[TECHNOLOGY\]/g, this.technologies[Math.floor(Math.random() * this.technologies.length)])
			.replace(/\[CLOUD\]/g, this.cloudProviders[Math.floor(Math.random() * this.cloudProviders.length)]);
	}

	private generatePriority(): SeedGoal['priority'] {
		const priorities: Array<{ priority: SeedGoal['priority']; weight: number }> = [
			{ priority: 'medium', weight: 40 },
			{ priority: 'high', weight: 30 },
			{ priority: 'low', weight: 20 },
			{ priority: 'critical', weight: 10 }
		];

		const totalWeight = priorities.reduce((sum, p) => sum + p.weight, 0);
		let random = Math.random() * totalWeight;

		for (const priority of priorities) {
			random -= priority.weight;
			if (random <= 0) {
				return priority.priority;
			}
		}

		return 'medium';
	}

	private generateStatus(
		progress: number,
		startDate: Date,
		targetDate: Date,
		now: Date
	): SeedGoal['status'] {
		if (progress === 100) return 'completed';
		if (now < startDate) return 'draft';
		if (progress === 0) return 'active';
		if (progress > 0) return 'in_progress';
		if (now > targetDate && progress < 80) return 'paused';

		// Random edge cases
		if (Math.random() < 0.05) return 'cancelled';
		if (Math.random() < 0.03) return 'paused';

		return 'in_progress';
	}

	private generateCompletedDate(targetDate: Date): string {
		// Complete between target date and 30 days after
		const completedTime = targetDate.getTime() + (Math.random() - 0.5) * 30 * 24 * 60 * 60 * 1000;
		return new Date(completedTime).toISOString().split('T')[0];
	}

	private generateAdditionalTags(): string[] {
		const additionalTags = [
			'q1-2024', 'q2-2024', 'q3-2024', 'q4-2024',
			'high-impact', 'quick-win', 'long-term',
			'team-goal', 'individual-goal', 'department-goal',
			'skill-building', 'process-improvement', 'innovation'
		];

		const count = Math.floor(Math.random() * 3); // 0-2 additional tags
		return additionalTags
			.sort(() => Math.random() - 0.5)
			.slice(0, count);
	}

	private generateKeyResults(templates: string[], targetDate: Date): KeyResult[] {
		return templates.map((template, index) => {
			const targetValue = Math.floor(Math.random() * 100) + 1;
			const currentValue = Math.floor(targetValue * Math.random());
			const progress = Math.round((currentValue / targetValue) * 100);

			return {
				id: `kr_${index + 1}`,
				description: this.processTemplate(template),
				targetValue,
				currentValue,
				unit: ['points', 'tasks', 'hours', 'projects', 'certifications'][Math.floor(Math.random() * 5)],
				progress,
				status: this.getKeyResultStatus(progress),
				dueDate: targetDate.toISOString().split('T')[0],
				completedDate: progress === 100 ? this.generateCompletedDate(targetDate) : undefined,
				notes: Math.random() > 0.7 ? 'On track with current progress' : undefined
			};
		});
	}

	private getKeyResultStatus(progress: number): KeyResult['status'] {
		if (progress === 0) return 'not_started';
		if (progress < 50) return 'in_progress';
		if (progress < 80) return 'in_progress';
		if (progress < 100) return 'in_progress';
		if (progress === 100) return 'completed';
		return 'exceeded';
	}

	private generateMilestones(startDate: Date, targetDate: Date): Milestone[] {
		const count = Math.floor(Math.random() * 4) + 2; // 2-5 milestones
		const milestones: Milestone[] = [];
		const duration = targetDate.getTime() - startDate.getTime();

		for (let i = 0; i < count; i++) {
			const milestoneProgress = ((i + 1) / count) * 100;
			const dueTime = startDate.getTime() + (duration * (i + 1) / count);
			const dueDate = new Date(dueTime);

			const milestone: Milestone = {
				id: `milestone_${i + 1}`,
				title: `Phase ${i + 1} Completion`,
				description: `Complete phase ${i + 1} of the goal`,
				dueDate: dueDate.toISOString().split('T')[0],
				status: this.getMilestoneStatus(dueDate, milestoneProgress),
				progress: Math.floor(Math.random() * 101),
				dependencies: i > 0 ? [`milestone_${i}`] : undefined
			};

			if (milestone.status === 'completed') {
				milestone.completedDate = this.generateCompletedDate(dueDate);
			}

			milestones.push(milestone);
		}

		return milestones;
	}

	private getMilestoneStatus(dueDate: Date, progress: number): Milestone['status'] {
		const now = new Date();

		if (progress === 100) return 'completed';
		if (now < dueDate && progress > 0) return 'in_progress';
		if (now > dueDate && progress < 100) return 'overdue';
		return 'pending';
	}
}

/**
 * Default export for easy importing
 */
export default new GoalGenerator();