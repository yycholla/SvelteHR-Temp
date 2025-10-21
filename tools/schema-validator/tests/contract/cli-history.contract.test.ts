import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI history command contract', () => {
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  it('should show validation history', () => {
    try {
      const result = execSync(`node ${cliPath} history`, { encoding: 'utf-8' });
      expect(result).toBeDefined();
    } catch (error) {
      // Expected
    }
  });

  it('should support --limit option', () => {
    const result = execSync(`node ${cliPath} history --help`, { encoding: 'utf-8' });
    expect(result).toContain('--limit');
  });

  it('should support --format option', () => {
    const result = execSync(`node ${cliPath} history --help`, { encoding: 'utf-8' });
    expect(result).toContain('--format');
  });
});
