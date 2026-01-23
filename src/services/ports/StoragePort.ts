/**
 * Port (interface) for browser storage operations.
 */
export interface StoragePort {
	/**
	 * Get item from storage
	 * @param key - Storage key
	 * @returns Stored value or null
	 */
	getItem(key: string): string | null;

	/**
	 * Set item in storage
	 * @param key - Storage key
	 * @param value - Value to store
	 */
	setItem(key: string, value: string): void;

	/**
	 * Remove item from storage
	 * @param key - Storage key
	 */
	removeItem(key: string): void;

	/**
	 * Clear all items from storage
	 */
	clear(): void;
}
