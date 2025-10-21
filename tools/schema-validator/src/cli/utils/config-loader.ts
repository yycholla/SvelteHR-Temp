/**
 * Configuration loader utility
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { SchemaValidatorConfig } from '../../types/config.js';
import { SchemaValidatorConfigSchema } from '../../types/schemas.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SchemaValidatorConfig = {
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  apiUrl: process.env['API_URL'] ?? '',
  graphqlPaths: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.svelte'],
  cacheDir: '.schema-cache',
  cacheTtl: 3600,
  computedFields: [],
  strict: false,
  ignore: ['node_modules/**', 'dist/**', 'build/**'],
};

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<SchemaValidatorConfig> {
  const path = configPath ?? './schema-validator.config.json';

  // Check if config file exists
  if (!existsSync(path)) {
    console.warn(`⚠️  Config file not found: ${path}. Using default configuration.`);
    return DEFAULT_CONFIG;
  }

  try {
    // Read and parse config file
    let content = await readFile(path, 'utf-8');

    // Interpolate environment variables (${VAR_NAME} syntax)
    content = content.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || '';
    });

    const rawConfig = JSON.parse(content);

    // Map nested structure to flat structure expected by SchemaValidator

    // Handle graphqlPaths - create separate glob patterns for each extension
    let graphqlPaths: string[];
    if (rawConfig.sources?.directory && rawConfig.sources?.extensions) {
      graphqlPaths = rawConfig.sources.extensions.map((ext: string) => {
        const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
        return `${rawConfig.sources.directory}/**/*${cleanExt}`;
      });
    } else if (rawConfig.graphqlPaths) {
      graphqlPaths = rawConfig.graphqlPaths;
    } else {
      graphqlPaths = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.svelte'];
    }

    // Handle computedFields - convert string array to object array if needed
    let computedFields = [];
    if (rawConfig.validation?.computedFields && Array.isArray(rawConfig.validation.computedFields)) {
      computedFields = rawConfig.validation.computedFields.map((fieldPath: string) => ({
        fieldPath,
        sourceColumns: [],
        resolverLocation: { file: '', line: 0 },
        description: `Computed field: ${fieldPath}`,
        returnType: 'String'
      }));
    } else if (rawConfig.computedFields && Array.isArray(rawConfig.computedFields)) {
      computedFields = rawConfig.computedFields;
    }

    const flatConfig: any = {
      databaseUrl: rawConfig.database?.connectionString || rawConfig.databaseUrl || process.env['DATABASE_URL'] || '',
      apiUrl: rawConfig.api?.endpoint || rawConfig.apiUrl || process.env['API_URL'] || '',
      graphqlPaths,
      cacheDir: rawConfig.cache?.directory || rawConfig.cacheDir || '.schema-cache',
      cacheTtl: rawConfig.cache?.ttl || rawConfig.cacheTtl || 3600,
      computedFields,
      strict: rawConfig.validation?.strict ?? rawConfig.strict ?? false,
      ignore: rawConfig.sources?.excludePatterns || rawConfig.ignore || [],
      typeMappings: rawConfig.typeMappings,
    };

    // Validate with Zod schema
    const validated = SchemaValidatorConfigSchema.parse(flatConfig);

    // Merge with defaults
    const result: SchemaValidatorConfig = {
      ...DEFAULT_CONFIG,
      ...validated,
    };

    // Only add typeMappings if it's explicitly defined
    if (validated.typeMappings && validated.typeMappings !== undefined) {
      result.typeMappings = validated.typeMappings;
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to load config from ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(
  config: SchemaValidatorConfig,
  configPath?: string
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  const path = configPath ?? './schema-validator.config.json';

  try {
    // Validate config
    SchemaValidatorConfigSchema.parse(config);

    // Write to file
    const json = JSON.stringify(config, null, 2);
    await writeFile(path, json, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to save config to ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
