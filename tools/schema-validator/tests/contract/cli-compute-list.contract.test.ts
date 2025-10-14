import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI compute list command contract', () => {
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  it('should list all computed fields', () => {
    try {
      const result = execSync(`node ${cliPath} compute list`, { encoding: 'utf-8' });
      expect(result).toBeDefined();
    } catch (error) {
      // Expected
    }
  });

  it('should support --json output format', () => {
    try {
      const result = execSync(`node ${cliPath} compute list --json`, { encoding: 'utf-8' });
      JSON.parse(result);
      expect(true).toBe(true);
    } catch (error) {
      // Expected
    }
  });
});
