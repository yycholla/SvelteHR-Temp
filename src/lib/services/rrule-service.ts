/**
 * RRULE Service
 * Feature: 025-events-flesh-out
 *
 * Service for parsing, validating, and expanding recurring events using RFC 5545 RRULE standard.
 * Provides utilities for working with the rrule.js library.
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';

export interface RecurringEventInstance {
	id: string; // Parent event ID + occurrence index
	parentEventId: string;
	title: string;
	description?: string;
	startTime: Date;
	endTime: Date;
	location?: string;
	visibility: 'public' | 'private';
	type: 'meeting' | 'training' | 'social' | 'conference' | 'other';
	rrule: string;
	isRecurring: true;
	occurrenceIndex: number;
}

export interface RRuleValidationResult {
	isValid: boolean;
	error?: string;
	rrule?: RRule;
}

/**
 * RRULE Service Class
 */
export class RRuleService {
	/**
	 * Validate RRULE string against RFC 5545 standard
	 */
	static validateRRule(rruleString: string): RRuleValidationResult {
		try {
			// Ensure it starts with RRULE: prefix
			const formattedRRule = rruleString.startsWith('RRULE:')
				? rruleString
				: `RRULE:${rruleString}`;

			const rrule = rrulestr(formattedRRule);

			if (!rrule) {
				return {
					isValid: false,
					error: 'Invalid RRULE format'
				};
			}

			return {
				isValid: true,
				rrule: rrule as RRule
			};
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Unknown RRULE validation error'
			};
		}
	}

	/**
	 * Expand RRULE into individual event instances within date range
	 */
	static expandRecurringEvent(
		eventData: {
			id: string;
			title: string;
			description?: string;
			startTime: Date;
			endTime: Date;
			location?: string;
			visibility: 'public' | 'private';
			type: 'meeting' | 'training' | 'social' | 'conference' | 'other';
			rrule: string;
		},
		rangeStart: Date,
		rangeEnd: Date,
		maxOccurrences = 100
	): RecurringEventInstance[] {
		try {
			const validation = this.validateRRule(eventData.rrule);

			if (!validation.isValid || !validation.rrule) {
				throw new Error(validation.error || 'Invalid RRULE');
			}

			const rrule = validation.rrule;

			// Set dtstart to event's start time
			const rruleWithDtstart = new RRule({
				...rrule.origOptions,
				dtstart: eventData.startTime
			});

			// Get occurrences within range
			const occurrences = rruleWithDtstart.between(rangeStart, rangeEnd, true).slice(0, maxOccurrences);

			// Calculate event duration
			const eventDuration = eventData.endTime.getTime() - eventData.startTime.getTime();

			// Create instance objects
			const instances: RecurringEventInstance[] = occurrences.map((occurrenceStart, index) => {
				const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration);

				return {
					id: `${eventData.id}_${index}`,
					parentEventId: eventData.id,
					title: eventData.title,
					description: eventData.description,
					startTime: occurrenceStart,
					endTime: occurrenceEnd,
					location: eventData.location,
					visibility: eventData.visibility,
					type: eventData.type,
					rrule: eventData.rrule,
					isRecurring: true,
					occurrenceIndex: index
				};
			});

			return instances;
		} catch (error) {
			console.error('Error expanding recurring event:', error);
			return [];
		}
	}

	/**
	 * Parse human-readable recurrence options to RRULE string
	 */
	static createRRule(options: {
		frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
		interval?: number;
		count?: number;
		until?: Date;
		byweekday?: number[]; // 0 = Monday, 6 = Sunday
		bymonthday?: number[];
	}): string {
		const rruleOptions: any = {
			freq: RRule[options.frequency],
			interval: options.interval || 1
		};

		if (options.count) {
			rruleOptions.count = options.count;
		}

		if (options.until) {
			rruleOptions.until = options.until;
		}

		if (options.byweekday && options.byweekday.length > 0) {
			rruleOptions.byweekday = options.byweekday.map((day) => RRule.MO.nth(0).weekday + day);
		}

		if (options.bymonthday && options.bymonthday.length > 0) {
			rruleOptions.bymonthday = options.bymonthday;
		}

		const rrule = new RRule(rruleOptions);

		// Return just the RRULE part (without RRULE: prefix for storage)
		return rrule.toString().replace('RRULE:', '');
	}

	/**
	 * Get next occurrence date for a recurring event
	 */
	static getNextOccurrence(rruleString: string, afterDate: Date): Date | null {
		try {
			const validation = this.validateRRule(rruleString);

			if (!validation.isValid || !validation.rrule) {
				return null;
			}

			const nextOccurrence = validation.rrule.after(afterDate, true);
			return nextOccurrence;
		} catch (error) {
			console.error('Error getting next occurrence:', error);
			return null;
		}
	}

	/**
	 * Check if a date matches a recurring event rule
	 */
	static dateMatchesRRule(rruleString: string, checkDate: Date, startDate: Date): boolean {
		try {
			const validation = this.validateRRule(rruleString);

			if (!validation.isValid || !validation.rrule) {
				return false;
			}

			const rruleWithDtstart = new RRule({
				...validation.rrule.origOptions,
				dtstart: startDate
			});

			// Get all occurrences up to check date + 1 day
			const endDate = new Date(checkDate);
			endDate.setDate(endDate.getDate() + 1);

			const occurrences = rruleWithDtstart.between(startDate, endDate, true);

			// Check if any occurrence matches the check date (within same day)
			return occurrences.some((occurrence) => {
				return (
					occurrence.getFullYear() === checkDate.getFullYear() &&
					occurrence.getMonth() === checkDate.getMonth() &&
					occurrence.getDate() === checkDate.getDate()
				);
			});
		} catch (error) {
			console.error('Error checking date match:', error);
			return false;
		}
	}

	/**
	 * Convert RRULE to human-readable description
	 */
	static getRRuleDescription(rruleString: string): string {
		try {
			const validation = this.validateRRule(rruleString);

			if (!validation.isValid || !validation.rrule) {
				return 'Invalid recurrence rule';
			}

			return validation.rrule.toText();
		} catch (error) {
			return 'Unable to parse recurrence rule';
		}
	}
}
