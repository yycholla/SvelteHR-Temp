/**
 * GraphQL Image Upload Resolver for Events
 * Feature: 025-events-flesh-out
 *
 * Implements image upload mutation with Sharp-based optimization.
 */

import { ImageService } from '../../../../../src/lib/services/image-service';
import type { Pool } from 'pg';

interface Context {
	pgPool: Pool;
	currentUserId?: string;
}

interface UploadEventImageArgs {
	eventId: string;
	file: {
		buffer: Buffer;
		mimetype: string;
		filename: string;
	};
	options?: {
		maxWidth?: number;
		maxHeight?: number;
		quality?: number;
		format?: 'jpeg' | 'png' | 'webp';
	};
}

/**
 * Mutation: uploadEventImage
 * Uploads and optimizes an event image using Sharp
 */
export async function uploadEventImage(
	parent: any,
	args: UploadEventImageArgs,
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { eventId, file, options = {} } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	try {
		// Check if user is event creator
		const eventResult = await pgPool.query(
			`SELECT id, created_by FROM events WHERE id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Event not found');
		}

		const event = eventResult.rows[0];

		if (event.created_by !== currentUserId) {
			throw new Error('Only the event creator can upload images');
		}

		// Upload and optimize image using ImageService
		const uploadResult = await ImageService.uploadEventImage(file.buffer, file.mimetype, {
			eventId,
			maxWidth: options.maxWidth,
			maxHeight: options.maxHeight,
			quality: options.quality,
			format: options.format
		});

		// Update event with image URL
		const updateResult = await pgPool.query(
			`UPDATE events
			SET image_url = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING *`,
			[uploadResult.url, eventId]
		);

		return {
			event: updateResult.rows[0],
			image: uploadResult
		};
	} catch (error) {
		console.error('Error uploading event image:', error);

		// Check for specific image validation errors
		if (error instanceof Error) {
			if (error.message.includes('File size')) {
				throw new Error('Image file size exceeds 10MB limit');
			}
			if (error.message.includes('Invalid file type')) {
				throw new Error('Invalid image format. Allowed formats: JPEG, PNG, GIF, WebP');
			}
		}

		throw new Error('Failed to upload event image');
	}
}

/**
 * Mutation: deleteEventImage
 * Removes event image
 */
export async function deleteEventImage(
	parent: any,
	args: { eventId: string },
	context: Context
): Promise<boolean> {
	const { pgPool, currentUserId } = context;
	const { eventId } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	try {
		// Check if user is event creator
		const eventResult = await pgPool.query(
			`SELECT id, created_by, image_url FROM events WHERE id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Event not found');
		}

		const event = eventResult.rows[0];

		if (event.created_by !== currentUserId) {
			throw new Error('Only the event creator can delete images');
		}

		if (!event.image_url) {
			throw new Error('Event has no image to delete');
		}

		// Delete image file
		await ImageService.deleteEventImage(event.image_url);

		// Update event to remove image URL
		await pgPool.query(
			`UPDATE events
			SET image_url = NULL, updated_at = NOW()
			WHERE id = $1`,
			[eventId]
		);

		return true;
	} catch (error) {
		console.error('Error deleting event image:', error);
		throw new Error('Failed to delete event image');
	}
}

/**
 * Export all image mutation resolvers
 */
export const imageMutationResolvers = {
	uploadEventImage,
	deleteEventImage
};
