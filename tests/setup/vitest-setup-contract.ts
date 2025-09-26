// Vitest Contract Test Setup
// Schema validation and contract testing setup
// Created: 2025-09-24

import { beforeAll } from 'vitest';
import './vitest-setup'; // Import base setup

beforeAll(() => {
  // Contract tests don't need database setup
  // They focus on schema validation and API contracts
  console.log('Setting up contract test environment...');

  // Ensure we have required dependencies for schema testing
  if (typeof global.fetch === 'undefined') {
    global.fetch = require('node-fetch');
  }
});