#!/usr/bin/env node
/**
 * Hasura Migration CLI
 *
 * Command-line interface for the Hasura Migration Library
 * Provides commands for managing database migrations and Hasura metadata
 */
import { MigrationConfig } from './index';
interface CLIConfig extends MigrationConfig {
    configPath?: string;
}
declare function loadConfig(configPath?: string): Promise<CLIConfig>;
declare function main(): Promise<void>;
export { main, loadConfig };
