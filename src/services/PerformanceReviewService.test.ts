import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceReviewService } from './PerformanceReviewService';
import type {
	PerformanceReviewRepository,
	CreatePerformanceReviewData,
	UpdatePerformanceReviewData,
	PerformanceReviewFilter
} from './ports/PerformanceReviewRepository';
import {
	PerformanceReview,
	ReviewStatus,
	Rating,
	ReviewPeriod,
	ReviewDate,
	PerformanceReviewNotFoundError,
	PerformanceReviewError
} from '$domain/PerformanceReview';
import { Result } from '$domain/Result';

// Mock repository
class MockPerformanceReviewRepository implements PerformanceReviewRepository {
	private reviews: Map<string, PerformanceReview> = new Map();
	private nextId = 1;

	async findById(id: string): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>> {
		const review = this.reviews.get(id);
		if (!review) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
		return Result.ok(review);
	}

	async findAll(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		let reviews = Array.from(this.reviews.values());

		if (filter?.employeeId) {
			reviews = reviews.filter((r) => r.employeeId === filter.employeeId);
		}
		if (filter?.reviewerId) {
			reviews = reviews.filter((r) => r.reviewerId === filter.reviewerId);
		}
		if (filter?.status) {
			reviews = reviews.filter((r) => r.status.value === filter.status);
		}

		return Result.ok(reviews);
	}

	async create(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		const id = `review-${this.nextId++}`;

		// Validate all value objects
		const statusResult = data.status
			? ReviewStatus.create(data.status)
			: ReviewStatus.create('draft');
		if (statusResult.isError) {
			return Result.error(new PerformanceReviewError(statusResult.error.message));
		}

		const reviewPeriodResult = ReviewPeriod.create(data.reviewPeriod);
		if (reviewPeriodResult.isError) {
			return Result.error(new PerformanceReviewError(reviewPeriodResult.error.message));
		}

		const reviewDateResult = ReviewDate.create(data.reviewDate);
		if (reviewDateResult.isError) {
			return Result.error(new PerformanceReviewError(reviewDateResult.error.message));
		}

		const overallRatingResult = Rating.create(data.overallRating);
		if (overallRatingResult.isError) {
			return Result.error(new PerformanceReviewError(overallRatingResult.error.message));
		}

		const goalsAchievementResult = Rating.create(data.goalsAchievement);
		if (goalsAchievementResult.isError) {
			return Result.error(new PerformanceReviewError(goalsAchievementResult.error.message));
		}

		const collaborationResult = Rating.create(data.collaboration);
		if (collaborationResult.isError) {
			return Result.error(new PerformanceReviewError(collaborationResult.error.message));
		}

		const communicationResult = Rating.create(data.communication);
		if (communicationResult.isError) {
			return Result.error(new PerformanceReviewError(communicationResult.error.message));
		}

		const leadershipResult = Rating.create(data.leadership);
		if (leadershipResult.isError) {
			return Result.error(new PerformanceReviewError(leadershipResult.error.message));
		}

		let technicalSkills: Rating | undefined = undefined;
		if (data.technicalSkills !== undefined) {
			const technicalSkillsResult = Rating.create(data.technicalSkills);
			if (technicalSkillsResult.isError) {
				return Result.error(new PerformanceReviewError(technicalSkillsResult.error.message));
			}
			technicalSkills = technicalSkillsResult.value;
		}

		const reviewResult = PerformanceReview.create({
			id,
			employeeId: data.employeeId,
			reviewerId: data.reviewerId,
			reviewPeriod: reviewPeriodResult.value,
			reviewDate: reviewDateResult.value,
			status: statusResult.value,
			overallRating: overallRatingResult.value,
			goalsAchievement: goalsAchievementResult.value,
			collaboration: collaborationResult.value,
			communication: communicationResult.value,
			leadership: leadershipResult.value,
			technicalSkills,
			strengths: data.strengths,
			areasForImprovement: data.areasForImprovement,
			comments: data.comments,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		if (reviewResult.isError) {
			return Result.error(new PerformanceReviewError(reviewResult.error.message));
		}

		this.reviews.set(id, reviewResult.value);
		return Result.ok(reviewResult.value);
	}

	async update(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		const existingResult = await this.findById(id);
		if (existingResult.isError) {
			return Result.error(new PerformanceReviewError(existingResult.error.message));
		}

		const existing = existingResult.value;

		let status = existing.status;
		if (data.status) {
			const statusResult = ReviewStatus.create(data.status);
			if (statusResult.isError) {
				return Result.error(new PerformanceReviewError(statusResult.error.message));
			}
			status = statusResult.value;
		}

		let reviewPeriod = existing.reviewPeriod;
		if (data.reviewPeriod) {
			const reviewPeriodResult = ReviewPeriod.create(data.reviewPeriod);
			if (reviewPeriodResult.isError) {
				return Result.error(new PerformanceReviewError(reviewPeriodResult.error.message));
			}
			reviewPeriod = reviewPeriodResult.value;
		}

		let reviewDate = existing.reviewDate;
		if (data.reviewDate) {
			const reviewDateResult = ReviewDate.create(data.reviewDate);
			if (reviewDateResult.isError) {
				return Result.error(new PerformanceReviewError(reviewDateResult.error.message));
			}
			reviewDate = reviewDateResult.value;
		}

		let overallRating = existing.overallRating;
		if (data.overallRating !== undefined) {
			const overallRatingResult = Rating.create(data.overallRating);
			if (overallRatingResult.isError) {
				return Result.error(new PerformanceReviewError(overallRatingResult.error.message));
			}
			overallRating = overallRatingResult.value;
		}

		let goalsAchievement = existing.goalsAchievement;
		if (data.goalsAchievement !== undefined) {
			const goalsAchievementResult = Rating.create(data.goalsAchievement);
			if (goalsAchievementResult.isError) {
				return Result.error(new PerformanceReviewError(goalsAchievementResult.error.message));
			}
			goalsAchievement = goalsAchievementResult.value;
		}

		let collaboration = existing.collaboration;
		if (data.collaboration !== undefined) {
			const collaborationResult = Rating.create(data.collaboration);
			if (collaborationResult.isError) {
				return Result.error(new PerformanceReviewError(collaborationResult.error.message));
			}
			collaboration = collaborationResult.value;
		}

		let communication = existing.communication;
		if (data.communication !== undefined) {
			const communicationResult = Rating.create(data.communication);
			if (communicationResult.isError) {
				return Result.error(new PerformanceReviewError(communicationResult.error.message));
			}
			communication = communicationResult.value;
		}

		let leadership = existing.leadership;
		if (data.leadership !== undefined) {
			const leadershipResult = Rating.create(data.leadership);
			if (leadershipResult.isError) {
				return Result.error(new PerformanceReviewError(leadershipResult.error.message));
			}
			leadership = leadershipResult.value;
		}

		let technicalSkills = existing.technicalSkills;
		if (data.technicalSkills !== undefined) {
			if (data.technicalSkills !== null) {
				const technicalSkillsResult = Rating.create(data.technicalSkills);
				if (technicalSkillsResult.isError) {
					return Result.error(new PerformanceReviewError(technicalSkillsResult.error.message));
				}
				technicalSkills = technicalSkillsResult.value;
			} else {
				technicalSkills = undefined;
			}
		}

		const updatedReviewResult = PerformanceReview.create({
			id: existing.id,
			employeeId: existing.employeeId,
			reviewerId: existing.reviewerId,
			reviewPeriod,
			reviewDate,
			status,
			overallRating,
			goalsAchievement,
			collaboration,
			communication,
			leadership,
			technicalSkills,
			strengths: data.strengths ?? existing.strengths,
			areasForImprovement: data.areasForImprovement ?? existing.areasForImprovement,
			comments: data.comments !== undefined ? data.comments : existing.comments,
			createdAt: existing.createdAt,
			updatedAt: new Date()
		});

		if (updatedReviewResult.isError) {
			return Result.error(new PerformanceReviewError(updatedReviewResult.error.message));
		}

		this.reviews.set(id, updatedReviewResult.value);
		return Result.ok(updatedReviewResult.value);
	}

	async delete(id: string): Promise<Result<void, PerformanceReviewNotFoundError>> {
		if (!this.reviews.has(id)) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
		this.reviews.delete(id);
		return Result.ok(undefined);
	}

	async getReviewsForEmployee(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		const reviews = Array.from(this.reviews.values()).filter((r) => r.employeeId === employeeId);
		return Result.ok(reviews);
	}

	async getReviewsByReviewer(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		const reviews = Array.from(this.reviews.values()).filter((r) => r.reviewerId === reviewerId);
		return Result.ok(reviews);
	}
}

describe('PerformanceReviewService', () => {
	let service: PerformanceReviewService;
	let repository: MockPerformanceReviewRepository;

	beforeEach(() => {
		repository = new MockPerformanceReviewRepository();
		service = new PerformanceReviewService(repository);
	});

	describe('getReviewById', () => {
		it('should return review when found', async () => {
			const createResult = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});
			const reviewId = createResult.value.id;

			const result = await service.getReviewById(reviewId);

			expect(result.isOk).toBe(true);
			expect(result.value.employeeId).toBe('emp-123');
			expect(result.value.reviewerId).toBe('mgr-456');
		});

		it('should return error when review not found', async () => {
			const result = await service.getReviewById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});
	});

	describe('getAllReviews', () => {
		it('should return all reviews without filter', async () => {
			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 4,
				strengths: 'Outstanding performer',
				areasForImprovement: 'None at this time'
			});

			const result = await service.getAllReviews();

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(2);
		});

		it('should filter reviews by employeeId', async () => {
			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 4,
				strengths: 'Outstanding performer',
				areasForImprovement: 'None at this time'
			});

			const result = await service.getAllReviews({ employeeId: 'emp-123' });

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(1);
			expect(result.value[0].employeeId).toBe('emp-123');
		});

		it('should filter reviews by status', async () => {
			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'in_progress',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 4,
				strengths: 'Outstanding performer',
				areasForImprovement: 'None at this time'
			});

			const result = await service.getAllReviews({ status: 'completed' });

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(1);
			expect(result.value[0].status.value).toBe('completed');
		});
	});

	describe('createReview', () => {
		it('should create a new review', async () => {
			const result = await service.createReview({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.employeeId).toBe('emp-123');
			expect(result.value.reviewerId).toBe('mgr-456');
			expect(result.value.overallRating.value).toBe(4);
		});

		it('should create review with optional technical skills rating', async () => {
			const result = await service.createReview({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				technicalSkills: 5,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.technicalSkills?.value).toBe(5);
		});

		it('should create review with custom status', async () => {
			const result = await service.createReview({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'in_progress',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});
	});

	describe('updateReview', () => {
		it('should update an existing review', async () => {
			const createResult = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});
			const reviewId = createResult.value.id;

			const result = await service.updateReview(reviewId, {
				overallRating: 5,
				strengths: 'Exceptional team player'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.overallRating.value).toBe(5);
			expect(result.value.strengths).toBe('Exceptional team player');
		});

		it('should update review status', async () => {
			const createResult = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'draft',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});
			const reviewId = createResult.value.id;

			const result = await service.updateReview(reviewId, {
				status: 'in_progress'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should return error when review not found', async () => {
			const result = await service.updateReview('nonexistent', {
				overallRating: 5
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});
	});

	describe('deleteReview', () => {
		it('should delete an existing review', async () => {
			const createResult = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});
			const reviewId = createResult.value.id;

			const result = await service.deleteReview(reviewId);

			expect(result.isOk).toBe(true);

			const findResult = await service.getReviewById(reviewId);
			expect(findResult.isError).toBe(true);
		});

		it('should return error when review not found', async () => {
			const result = await service.deleteReview('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});
	});

	describe('getEmployeeReviews', () => {
		it('should return all reviews for an employee', async () => {
			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-789',
				reviewPeriod: 'Q2-2024',
				reviewDate: '2024-06-30',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 4,
				strengths: 'Improved significantly',
				areasForImprovement: 'Continue improvement'
			});

			await repository.create({
				employeeId: 'emp-999',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 3,
				goalsAchievement: 3,
				collaboration: 3,
				communication: 3,
				leadership: 3,
				strengths: 'Consistent',
				areasForImprovement: 'Need more initiative'
			});

			const result = await service.getEmployeeReviews('emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(2);
			expect(result.value.every((r) => r.employeeId === 'emp-123')).toBe(true);
		});

		it('should return empty array when employee has no reviews', async () => {
			const result = await service.getEmployeeReviews('emp-nonexistent');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(0);
		});
	});

	describe('getReviewerReviews', () => {
		it('should return all reviews conducted by a reviewer', async () => {
			await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 4,
				strengths: 'Outstanding performer',
				areasForImprovement: 'None at this time'
			});

			await repository.create({
				employeeId: 'emp-999',
				reviewerId: 'mgr-999',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				overallRating: 3,
				goalsAchievement: 3,
				collaboration: 3,
				communication: 3,
				leadership: 3,
				strengths: 'Consistent',
				areasForImprovement: 'Need more initiative'
			});

			const result = await service.getReviewerReviews('mgr-456');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(2);
			expect(result.value.every((r) => r.reviewerId === 'mgr-456')).toBe(true);
		});

		it('should return empty array when reviewer has conducted no reviews', async () => {
			const result = await service.getReviewerReviews('mgr-nonexistent');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(0);
		});
	});

	describe('calculateStatistics', () => {
		it('should calculate statistics for empty array', () => {
			const stats = service.calculateStatistics([]);

			expect(stats.totalReviews).toBe(0);
			expect(stats.completed).toBe(0);
			expect(stats.inProgress).toBe(0);
			expect(stats.overdue).toBe(0);
			expect(stats.averageRating).toBe(0);
		});

		it('should calculate statistics for reviews', async () => {
			// Create completed review
			const review1Result = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 4,
				communication: 4,
				leadership: 4,
				strengths: 'Great team player',
				areasForImprovement: 'Work on time management'
			});

			// Create in-progress review (past date, so overdue)
			const review2Result = await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q2-2024',
				reviewDate: '2024-06-30',
				status: 'in_progress',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 5,
				strengths: 'Outstanding performer',
				areasForImprovement: 'None at this time'
			});

			// Create overdue review (past date, not completed)
			const review3Result = await repository.create({
				employeeId: 'emp-999',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q4-2023',
				reviewDate: '2023-12-31',
				status: 'draft',
				overallRating: 3,
				goalsAchievement: 3,
				collaboration: 3,
				communication: 3,
				leadership: 3,
				strengths: 'Consistent',
				areasForImprovement: 'Need more initiative'
			});

			const reviews = [review1Result.value, review2Result.value, review3Result.value];
			const stats = service.calculateStatistics(reviews);

			expect(stats.totalReviews).toBe(3);
			expect(stats.completed).toBe(1);
			expect(stats.inProgress).toBe(1);
			// Both review2 (in_progress) and review3 (draft) are past their dates, so both are overdue
			expect(stats.overdue).toBe(2);
			// Average: (4+5+3)/3 = 4.0
			expect(stats.averageRating).toBe(4.0);
		});

		it('should calculate correct average rating with technical skills', async () => {
			// Review with technical skills (6 ratings total)
			const review1Result = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 5,
				technicalSkills: 5,
				strengths: 'Excellent all around',
				areasForImprovement: 'Keep it up'
			});

			// Review without technical skills (5 ratings total)
			const review2Result = await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 3,
				goalsAchievement: 3,
				collaboration: 3,
				communication: 3,
				leadership: 3,
				strengths: 'Meets expectations',
				areasForImprovement: 'Room for growth'
			});

			const reviews = [review1Result.value, review2Result.value];
			const stats = service.calculateStatistics(reviews);

			// Review 1 average: (5+5+5+5+5+5)/6 = 5.0
			// Review 2 average: (3+3+3+3+3)/5 = 3.0
			// Overall average: (5.0 + 3.0)/2 = 4.0
			expect(stats.averageRating).toBe(4.0);
		});

		it('should round average rating to 1 decimal place', async () => {
			const review1Result = await repository.create({
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 4,
				communication: 4,
				leadership: 5,
				strengths: 'Good work',
				areasForImprovement: 'Minor improvements'
			});

			const review2Result = await repository.create({
				employeeId: 'emp-789',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 4,
				communication: 4,
				leadership: 4,
				strengths: 'Solid performer',
				areasForImprovement: 'Keep going'
			});

			const review3Result = await repository.create({
				employeeId: 'emp-999',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2024',
				reviewDate: '2024-03-31',
				status: 'completed',
				overallRating: 5,
				goalsAchievement: 5,
				collaboration: 5,
				communication: 5,
				leadership: 5,
				strengths: 'Outstanding',
				areasForImprovement: 'None'
			});

			const reviews = [review1Result.value, review2Result.value, review3Result.value];
			const stats = service.calculateStatistics(reviews);

			// Review 1: (4+4+4+4+5)/5 = 4.2
			// Review 2: (4+4+4+4+4)/5 = 4.0
			// Review 3: (5+5+5+5+5)/5 = 5.0
			// Overall: (4.2+4.0+5.0)/3 = 4.4
			expect(stats.averageRating).toBe(4.4);
		});
	});
});
