/**
 * Compute commands - Manage computed field configurations
 */
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../utils/config-loader.js';
async function addComputedField(fieldPath, options) {
    try {
        const config = await loadConfig(options.config);
        // Parse resolver location
        const [file, lineStr] = options.resolver.split(':');
        const line = lineStr ? parseInt(lineStr, 10) : NaN;
        if (!file || isNaN(line)) {
            throw new Error('Invalid resolver format. Expected: file:line');
        }
        // Parse source columns
        const sourceColumns = options.sourceColumns.split(',').map((c) => c.trim());
        // Create computed field config
        const computedField = {
            fieldPath,
            sourceColumns,
            resolverLocation: { file, line },
            description: options.description,
            returnType: options.returnType ?? 'String',
        };
        // Add to config
        config.computedFields.push(computedField);
        // Save config
        await saveConfig(config, options.config);
        console.log(chalk.green(`✓ Added computed field: ${fieldPath}`));
    }
    catch (error) {
        console.error(chalk.red('❌ Failed to add computed field:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function listComputedFields(options) {
    try {
        const config = await loadConfig(options.config);
        if (config.computedFields.length === 0) {
            console.log(chalk.yellow('No computed fields configured'));
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(config.computedFields, null, 2));
        }
        else {
            console.log(chalk.bold('\n📋 Computed Fields:\n'));
            for (const field of config.computedFields) {
                console.log(chalk.cyan(`  ${field.fieldPath}`));
                console.log(chalk.gray(`    Source: ${field.sourceColumns.join(', ')}`));
                console.log(chalk.gray(`    Resolver: ${field.resolverLocation.file}:${field.resolverLocation.line}`));
                console.log(chalk.gray(`    Type: ${field.returnType}`));
                console.log(chalk.gray(`    Description: ${field.description}`));
                console.log('');
            }
        }
    }
    catch (error) {
        console.error(chalk.red('❌ Failed to list computed fields:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
export const computeCommand = {
    add: addComputedField,
    list: listComputedFields,
};
//# sourceMappingURL=compute.js.map