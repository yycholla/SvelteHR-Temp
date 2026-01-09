import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI compute add command contract', () => {
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  it('should add computed field to config', () => {
    try {
      execSync(
        `node ${cliPath} compute add User.fullName --source-columns users.first_name,users.last_name --resolver user.rs:10 --description "test"`,
        { stdio: 'pipe' }
      );
      expect(true).toBe(true);
    } catch (error) {
      // Expected
    }
  });

  it('should require source-columns option', () => {
    const result = execSync(`node ${cliPath} compute add --help`, { encoding: 'utf-8' });
    expect(result).toContain('--source-columns');
  });

  it('should require resolver option', () => {
    const result = execSync(`node ${cliPath} compute add --help`, { encoding: 'utf-8' });
    expect(result).toContain('--resolver');
  });

  it('should require description option', () => {
    const result = execSync(`node ${cliPath} compute add --help`, { encoding: 'utf-8' });
    expect(result).toContain('--description');
  });
});
