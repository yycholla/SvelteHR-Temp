/**
 * Checksum Calculation (T033)
 *
 * SHA-256 checksum calculation for migration file integrity validation.
 * Used to detect modified migration files after they have been applied.
 */

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';

/**
 * Calculates SHA-256 checksum of a file.
 *
 * @param filePath - Absolute or relative path to file
 * @returns Promise resolving to 64-character hex string
 */
export async function calculateChecksum(filePath: string): Promise<string> {
	const content = await readFile(filePath, 'utf-8');
	return calculateChecksumFromContent(content);
}

/**
 * Calculates SHA-256 checksum from string content.
 *
 * @param content - File content as string
 * @returns 64-character hex string
 */
export function calculateChecksumFromContent(content: string): string {
	const hash = createHash('sha256');
	hash.update(content, 'utf-8');
	return hash.digest('hex');
}

/**
 * Verifies if a file's checksum matches the expected value.
 *
 * @param filePath - Path to file to verify
 * @param expectedChecksum - Expected SHA-256 checksum
 * @returns Promise resolving to true if checksums match
 */
export async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
	const actualChecksum = await calculateChecksum(filePath);
	return actualChecksum === expectedChecksum;
}

/**
 * Calculates checksums for multiple files in parallel.
 *
 * @param filePaths - Array of file paths
 * @returns Promise resolving to Map of filePath → checksum
 */
export async function calculateChecksums(
	filePaths: string[]
): Promise<Map<string, string>> {
	const checksumPromises = filePaths.map(async (path) => {
		const checksum = await calculateChecksum(path);
		return [path, checksum] as [string, string];
	});

	const results = await Promise.all(checksumPromises);
	return new Map(results);
}

/**
 * Validates checksums for a batch of files.
 *
 * @param files - Map of filePath → expectedChecksum
 * @returns Promise resolving to validation results
 */
export async function validateChecksums(
	files: Map<string, string>
): Promise<{
	valid: boolean;
	mismatches: Array<{
		filePath: string;
		expected: string;
		actual: string;
	}>;
}> {
	const mismatches: Array<{
		filePath: string;
		expected: string;
		actual: string;
	}> = [];

	for (const [filePath, expectedChecksum] of files.entries()) {
		try {
			const actualChecksum = await calculateChecksum(filePath);
			if (actualChecksum !== expectedChecksum) {
				mismatches.push({
					filePath,
					expected: expectedChecksum,
					actual: actualChecksum
				});
			}
		} catch (error) {
			// File not found or read error - treat as mismatch
			mismatches.push({
				filePath,
				expected: expectedChecksum,
				actual: 'ERROR: File not readable'
			});
		}
	}

	return {
		valid: mismatches.length === 0,
		mismatches
	};
}

/**
 * Generates a checksum manifest file content.
 *
 * Format: One line per file with "checksum  filepath"
 * Compatible with `sha256sum -c` command.
 *
 * @param checksums - Map of filePath → checksum
 * @returns Manifest file content
 */
export function generateChecksumManifest(checksums: Map<string, string>): string {
	const lines: string[] = [];

	for (const [filePath, checksum] of checksums.entries()) {
		lines.push(`${checksum}  ${filePath}`);
	}

	return lines.join('\n') + '\n';
}

/**
 * Parses a checksum manifest file content.
 *
 * Compatible with `sha256sum` output format.
 *
 * @param manifestContent - Manifest file content
 * @returns Map of filePath → checksum
 */
export function parseChecksumManifest(manifestContent: string): Map<string, string> {
	const checksums = new Map<string, string>();
	const lines = manifestContent.split('\n').filter((line) => line.trim().length > 0);

	for (const line of lines) {
		// Format: "checksum  filepath" (two spaces)
		const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
		if (match) {
			const [, checksum, filePath] = match;
			checksums.set(filePath, checksum);
		}
	}

	return checksums;
}

/**
 * Compares two checksum sets to find differences.
 *
 * @param baseline - Baseline checksums (e.g., from database)
 * @param current - Current checksums (e.g., from filesystem)
 * @returns Difference report
 */
export function compareChecksums(
	baseline: Map<string, string>,
	current: Map<string, string>
): {
	modified: string[];
	missing: string[];
	added: string[];
} {
	const modified: string[] = [];
	const missing: string[] = [];
	const added: string[] = [];

	// Find modified and missing files
	for (const [filePath, baselineChecksum] of baseline.entries()) {
		const currentChecksum = current.get(filePath);
		if (currentChecksum === undefined) {
			missing.push(filePath);
		} else if (currentChecksum !== baselineChecksum) {
			modified.push(filePath);
		}
	}

	// Find added files
	for (const filePath of current.keys()) {
		if (!baseline.has(filePath)) {
			added.push(filePath);
		}
	}

	return { modified, missing, added };
}
