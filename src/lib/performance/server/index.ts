import { ServerPerformanceMonitor } from './monitor';
import type { ServerPerformanceConfig } from './types';

export * from './types';
export * from './config';
export * from './analysis';
export * from './wrappers';
export * from './monitor';

// Export singleton and factory
export const serverPerformanceMonitor = ServerPerformanceMonitor.getInstance();

export function createServerPerformanceMonitor(
	config?: Partial<ServerPerformanceConfig>
): ServerPerformanceMonitor {
	return ServerPerformanceMonitor.getInstance(config);
}
