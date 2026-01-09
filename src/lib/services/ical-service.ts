import { logger } from '$lib/utils/logger';
/**
 * iCal Export Service
 * Feature: 025-events-flesh-out
 *
 * Service for generating .ics files using ical.js library.
 * Supports single event and full calendar export.
 */

import ICAL from 'ical.js';

export interface ICalEvent {
	id: string;
	title: string;
	description?: string;
	location?: string;
	startTime: Date;
	endTime: Date;
	rrule?: string;
	organizer?: {
		name: string;
		email: string;
	};
	attendees?: Array<{
		name: string;
		email: string;
		rsvpStatus?: 'accepted' | 'declined' | 'tentative' | 'pending';
	}>;
}

export interface ICalExportOptions {
	productId?: string;
	calendarName?: string;
	timezone?: string;
}

/**
 * iCal Service Class
 */
export class ICalService {
	private static DEFAULT_PRODUCT_ID = '-//SvelteHR//Events Calendar//EN';
	private static DEFAULT_TIMEZONE = 'UTC';

	/**
	 * Generate iCal file for a single event
	 */
	static generateEventICS(event: ICalEvent, options: ICalExportOptions = {}): string {
		try {
			const comp = new ICAL.Component(['vcalendar', [], []]);

			// Set calendar properties
			comp.updatePropertyWithValue('prodid', options.productId || this.DEFAULT_PRODUCT_ID);
			comp.updatePropertyWithValue('version', '2.0');
			comp.updatePropertyWithValue('calscale', 'GREGORIAN');
			comp.updatePropertyWithValue('method', 'PUBLISH');

			if (options.calendarName) {
				comp.updatePropertyWithValue('x-wr-calname', options.calendarName);
			}

			// Create VEVENT component
			const vevent = this.createVEvent(event, options);
			comp.addSubcomponent(vevent);

			return comp.toString();
		} catch (error) {
			logger.error('Error generating iCal event:', error as Error);
			throw new Error('Failed to generate iCal file');
		}
	}

	/**
	 * Generate iCal file for multiple events (full calendar)
	 */
	static generateCalendarICS(events: ICalEvent[], options: ICalExportOptions = {}): string {
		try {
			const comp = new ICAL.Component(['vcalendar', [], []]);

			// Set calendar properties
			comp.updatePropertyWithValue('prodid', options.productId || this.DEFAULT_PRODUCT_ID);
			comp.updatePropertyWithValue('version', '2.0');
			comp.updatePropertyWithValue('calscale', 'GREGORIAN');

			if (options.calendarName) {
				comp.updatePropertyWithValue('x-wr-calname', options.calendarName);
			}

			// Add all events
			for (const event of events) {
				const vevent = this.createVEvent(event, options);
				comp.addSubcomponent(vevent);
			}

			return comp.toString();
		} catch (error) {
			logger.error('Error generating iCal calendar:', error as Error);
			throw new Error('Failed to generate iCal calendar');
		}
	}

	/**
	 * Create VEVENT component from event data
	 */
	private static createVEvent(event: ICalEvent, options: ICalExportOptions): ICAL.Component {
		const vevent = new ICAL.Component('vevent');

		// Required properties
		vevent.updatePropertyWithValue('uid', event.id);
		vevent.updatePropertyWithValue('summary', event.title);

		// Start time
		const dtstart = ICAL.Time.fromJSDate(event.startTime, true);
		vevent.updatePropertyWithValue('dtstart', dtstart);

		// End time
		const dtend = ICAL.Time.fromJSDate(event.endTime, true);
		vevent.updatePropertyWithValue('dtend', dtend);

		// Timestamp (created/last modified)
		const dtstamp = ICAL.Time.fromJSDate(new Date(), true);
		vevent.updatePropertyWithValue('dtstamp', dtstamp);

		// Optional properties
		if (event.description) {
			vevent.updatePropertyWithValue('description', event.description);
		}

		if (event.location) {
			vevent.updatePropertyWithValue('location', event.location);
		}

		// Organizer
		if (event.organizer) {
			const organizerProp = vevent.addPropertyWithValue(
				'organizer',
				`mailto:${event.organizer.email}`
			);
			organizerProp.setParameter('cn', event.organizer.name);
		}

		// Attendees
		if (event.attendees && event.attendees.length > 0) {
			for (const attendee of event.attendees) {
				const attendeeProp = vevent.addPropertyWithValue('attendee', `mailto:${attendee.email}`);
				attendeeProp.setParameter('cn', attendee.name);
				attendeeProp.setParameter('role', 'REQ-PARTICIPANT');

				if (attendee.rsvpStatus) {
					const partstat = this.mapRsvpToPartStat(attendee.rsvpStatus);
					attendeeProp.setParameter('partstat', partstat);
				}
			}
		}

		// Recurrence rule
		if (event.rrule) {
			// Parse RRULE string and add to VEVENT
			try {
				vevent.updatePropertyWithValue('rrule', event.rrule);
			} catch (error) {
				logger.warn('Invalid RRULE, skipping:', { rrule: event.rrule });
			}
		}

		// Status
		vevent.updatePropertyWithValue('status', 'CONFIRMED');

		return vevent;
	}

	/**
	 * Map RSVP status to iCal PARTSTAT parameter
	 */
	private static mapRsvpToPartStat(
		rsvpStatus: 'accepted' | 'declined' | 'tentative' | 'pending'
	): string {
		const mapping = {
			accepted: 'ACCEPTED',
			declined: 'DECLINED',
			tentative: 'TENTATIVE',
			pending: 'NEEDS-ACTION'
		};

		return mapping[rsvpStatus];
	}

	/**
	 * Parse iCal file and extract events
	 */
	static parseICS(icsContent: string): ICalEvent[] {
		try {
			const jcalData = ICAL.parse(icsContent);
			const comp = new ICAL.Component(jcalData);

			const events: ICalEvent[] = [];
			const vevents = comp.getAllSubcomponents('vevent');

			for (const vevent of vevents) {
				const event = this.parseVEvent(vevent);
				if (event) {
					events.push(event);
				}
			}

			return events;
		} catch (error) {
			logger.error('Error parsing iCal file:', error as Error);
			return [];
		}
	}

	/**
	 * Parse VEVENT component to ICalEvent
	 */
	private static parseVEvent(vevent: ICAL.Component): ICalEvent | null {
		try {
			const uid = vevent.getFirstPropertyValue('uid') as string;
			const summary = vevent.getFirstPropertyValue('summary') as string;
			const description = vevent.getFirstPropertyValue('description') as string | undefined;
			const location = vevent.getFirstPropertyValue('location') as string | undefined;

			const dtstart = vevent.getFirstPropertyValue('dtstart') as ICAL.Time;
			const dtend = vevent.getFirstPropertyValue('dtend') as ICAL.Time;

			if (!uid || !summary || !dtstart || !dtend) {
				return null;
			}

			const event: ICalEvent = {
				id: uid,
				title: summary,
				description,
				location,
				startTime: dtstart.toJSDate(),
				endTime: dtend.toJSDate()
			};

			// Parse RRULE if present
			const rrule = vevent.getFirstPropertyValue('rrule');
			if (rrule) {
				event.rrule = rrule.toString();
			}

			return event;
		} catch (error) {
			logger.error('Error parsing VEVENT:', error as Error);
			return null;
		}
	}

	/**
	 * Generate downloadable iCal file blob
	 */
	static generateICSBlob(icsContent: string): Blob {
		return new Blob([icsContent], {
			type: 'text/calendar;charset=utf-8'
		});
	}

	/**
	 * Trigger browser download of iCal file
	 */
	static downloadICS(icsContent: string, filename: string): void {
		const blob = this.generateICSBlob(icsContent);
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

	/**
	 * Export single event as downloadable .ics file
	 */
	static exportEvent(event: ICalEvent, filename?: string): void {
		const icsContent = this.generateEventICS(event);
		const downloadFilename = filename || `event-${event.id}.ics`;
		this.downloadICS(icsContent, downloadFilename);
	}

	/**
	 * Export multiple events as downloadable .ics file
	 */
	static exportCalendar(events: ICalEvent[], filename?: string, calendarName?: string): void {
		const icsContent = this.generateCalendarICS(events, { calendarName });
		const downloadFilename = filename || 'calendar.ics';
		this.downloadICS(icsContent, downloadFilename);
	}

	/**
	 * Generate URL for calendar subscription
	 */
	static generateCalendarUrl(calendarId: string, baseUrl: string): string {
		// This would generate a webcal:// URL for calendar subscription
		// Example: webcal://example.com/calendar/user123.ics
		const protocol = baseUrl.startsWith('https://') ? 'webcal://' : 'http://';
		const domain = baseUrl.replace(/^https?:\/\//, '');

		return `${protocol}${domain}/calendar/${calendarId}.ics`;
	}
}
