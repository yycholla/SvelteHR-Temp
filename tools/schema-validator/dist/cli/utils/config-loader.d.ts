/**
 * Configuration loader utility
 */
import type { SchemaValidatorConfig } from '../../types/config.js';
/**
 * Load configuration from file
 */
export declare function loadConfig(configPath?: string): Promise<SchemaValidatorConfig>;
/**
 * Save configuration to file
 */
export declare function saveConfig(config: SchemaValidatorConfig, configPath?: string): Promise<void>;
//# sourceMappingURL=config-loader.d.ts.map