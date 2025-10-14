/**
 * History command - Show validation run history
 */

import chalk from 'chalk';

interface HistoryCommandOptions {
  limit?: string;
  format?: string;
}

export async function historyCommand(_options: HistoryCommandOptions): Promise<void> {
  console.log(chalk.yellow('⚠️  History tracking not yet implemented'));
  console.log(chalk.gray('This feature will store validation run history in a local database.\n'));
}
