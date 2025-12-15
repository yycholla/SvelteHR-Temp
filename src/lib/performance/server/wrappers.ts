import { performance } from 'perf_hooks';
import { ServerPerformanceMonitor } from './monitor';

// GraphQL Performance Wrapper
export function withGraphQLPerformanceTracking<T extends any[], R>(
	operationName: string,
	fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		const startTime = performance.now();
		const monitor = ServerPerformanceMonitor.getInstance();

		try {
			const result = await fn(...args);
			const duration = performance.now() - startTime;

			monitor.recordGraphQLOperation(operationName, duration, undefined, {
				success: true,
				resultSize: JSON.stringify(result).length
			});

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			monitor.recordGraphQLOperation(operationName, duration, undefined, {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			throw error;
		}
	};
}

// Database Performance Wrapper
export function withDatabasePerformanceTracking<T extends any[], R>(
	fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		const startTime = performance.now();
		const monitor = ServerPerformanceMonitor.getInstance();

		// Try to extract query from arguments (implementation-specific)
		const query =
			(args.find((arg) => typeof arg === 'string' && arg.includes('SELECT')) as string) ||
			'Unknown query';

		try {
			const result = await fn(...args);
			const duration = performance.now() - startTime;

			// Try to get row count from result
			const rowCount = Array.isArray(result) ? result.length : undefined;

			monitor.recordDatabaseQuery(query, duration, rowCount);

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			monitor.recordDatabaseQuery(
				query,
				duration,
				undefined,
				error instanceof Error ? error.message : 'Unknown error'
			);

			throw error;
		}
	};
}
