#!/usr/bin/env node
/**
 * Generate Test JWT Token for Rust GraphQL API Testing
 *
 * This script generates a valid JWT token that can be used to test
 * the Rust GraphQL API at http://localhost:4001/graphql
 *
 * Usage:
 *   node generate-test-jwt.js [user_id] [email] [role]
 *
 * Examples:
 *   node generate-test-jwt.js
 *   node generate-test-jwt.js "25775732-e69f-4e9c-9eae-dec37f96172e" "admin@mountainhr.dev" "super_admin"
 *   node generate-test-jwt.js "4020ba0b-5dc5-4623-8405-345aa36f3e46" "manager@mountainhr.dev" "hr_manager"
 */

const jwt = require('jsonwebtoken');

// Configuration (MUST match Rust API auth middleware)
// The Rust API uses "test-secret-key" as the default JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_ALGORITHM = 'HS256';
const EXPIRATION_HOURS = 24;

// Default admin user from database
const DEFAULT_USER = {
  user_id: '25775732-e69f-4e9c-9eae-dec37f96172e',
  email: 'admin@mountainhr.dev',
  role: 'super_admin'
};

// Parse command line arguments
const args = process.argv.slice(2);
const user_id = args[0] || DEFAULT_USER.user_id;
const email = args[1] || DEFAULT_USER.email;
const role = args[2] || DEFAULT_USER.role;

// Determine permissions based on role
const getPermissions = (role) => {
  if (role === 'super_admin' || role === 'admin') {
    return ['*'];
  }
  if (role === 'hr_manager') {
    return ['employees:*', 'departments:*', 'reports:*'];
  }
  if (role === 'manager') {
    return ['employees:read', 'team:*', 'reports:read'];
  }
  return ['profile:*'];
};

// Generate token payload (MUST match Rust API Claims structure)
const now = Math.floor(Date.now() / 1000);
const payload = {
  sub: user_id,           // Subject (user ID) - required by Rust API
  user_id,                // Also include user_id for compatibility
  roles: [role],          // Roles as array - required by Rust API
  email,                  // Optional email field
  permissions: getPermissions(role),  // Optional permissions array
  iat: now,
  exp: now + (EXPIRATION_HOURS * 60 * 60)
};

// Generate JWT token
const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: JWT_ALGORITHM
});

// Output results
console.log('='.repeat(80));
console.log('JWT Token Generated Successfully');
console.log('='.repeat(80));
console.log('');
console.log('User Information:');
console.log('  User ID:', user_id);
console.log('  Email:', email);
console.log('  Role:', role);
console.log('  Permissions:', getPermissions(role).join(', '));
console.log('');
console.log('Token Details:');
console.log('  Issued At:', new Date(now * 1000).toISOString());
console.log('  Expires At:', new Date(payload.exp * 1000).toISOString());
console.log('  Valid For:', EXPIRATION_HOURS, 'hours');
console.log('');
console.log('JWT Token:');
console.log(token);
console.log('');
console.log('='.repeat(80));
console.log('Usage Examples:');
console.log('='.repeat(80));
console.log('');
console.log('1. Test Health Endpoint (No Auth Required):');
console.log('   curl http://localhost:4001/health');
console.log('');
console.log('2. Test GraphQL Introspection:');
console.log(`   curl -X POST http://localhost:4001/graphql \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -H "Authorization: Bearer ${token}" \\`);
console.log(`     -d '{"query":"{ __schema { queryType { name } } }"}'`);
console.log('');
console.log('3. Test Dashboard Stats Query:');
console.log(`   curl -X POST http://localhost:4001/graphql \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -H "Authorization: Bearer ${token}" \\`);
console.log(`     -d '{"query":"query { dashboardStats { totalEmployees activeEmployees } }"}'`);
console.log('');
console.log('4. Export Token to Environment Variable:');
console.log(`   export JWT_TOKEN="${token}"`);
console.log('   curl -X POST http://localhost:4001/graphql \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -H "Authorization: Bearer $JWT_TOKEN" \\');
console.log('     -d \'{"query":"{ __typename }"}\'');
console.log('');
console.log('='.repeat(80));
console.log('Available Test Users:');
console.log('='.repeat(80));
console.log('');
console.log('Super Admin:');
console.log('  node generate-test-jwt.js \\');
console.log('    "25775732-e69f-4e9c-9eae-dec37f96172e" \\');
console.log('    "admin@mountainhr.dev" \\');
console.log('    "super_admin"');
console.log('');
console.log('HR Manager:');
console.log('  node generate-test-jwt.js \\');
console.log('    "4020ba0b-5dc5-4623-8405-345aa36f3e46" \\');
console.log('    "manager@mountainhr.dev" \\');
console.log('    "hr_manager"');
console.log('');
console.log('='.repeat(80));

// Save token to file for easy reuse
const fs = require('fs');
const tokenFile = '/tmp/jwt-token.txt';
fs.writeFileSync(tokenFile, token);
console.log(`\nToken saved to: ${tokenFile}`);
console.log('You can use it with: export JWT_TOKEN=$(cat /tmp/jwt-token.txt)');
console.log('='.repeat(80));
