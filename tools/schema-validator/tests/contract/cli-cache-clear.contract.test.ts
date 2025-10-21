import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI cache clear command contract', () => {
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  it('should support --all flag', () => {
    const result = execSync(`node ${cliPath} cache clear --help`, { encoding: 'utf-8' });
    expect(result).toContain('--all');
  });

  it('should support --database flag', () => {
    const result = execSync(`node ${cliPath} cache clear --help`, { encoding: 'utf-8' });
    expect(result).toContain('--database');
  });

  it('should support --api flag', () => {
    const result = execSync(`node ${cliPath} cache clear --help`, { encoding: 'utf-8' });
    expect(result).toContain('--api');
  });

  it('should support --operations flag', () => {
    const result = execSync(`node ${cliPath} cache clear --help`, { encoding: 'utf-8' });
    expect(result).toContain('--operations');
  });
});
