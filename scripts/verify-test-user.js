#!/usr/bin/env node

/**
 * Test User Verification Script
 * Verifies that the test user exists and can authenticate with PostGraphile
 */

const TEST_USER = {
  email: 'admin@postgraphile-hr.com',
  password: 'admin123',
  expectedRole: 'hr_admin',
  expectedLevel: 100
};

const POSTGRAPHILE_URL = 'http://localhost:4000/graphql';

async function verifyTestUser() {
  console.log('🔍 Verifying test user authentication...');

  try {
    // Test GraphQL authentication mutation
    const response = await fetch(POSTGRAPHILE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation TestLogin($email: String!, $password: String!) {
            authenticate(input: {email: $email, password: $password}) {
              jwtToken
              user {
                id
                email
                displayName
                role
                isActive
              }
            }
          }
        `,
        variables: {
          email: TEST_USER.email,
          password: TEST_USER.password
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ Authentication failed:');
      result.errors.forEach(error => {
        console.error(`   ${error.message}`);
      });
      process.exit(1);
    }

    if (!result.data?.authenticate?.jwtToken) {
      console.error('❌ No JWT token returned');
      process.exit(1);
    }

    const { jwtToken, user } = result.data.authenticate;

    // Verify user properties
    console.log('✅ Authentication successful!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   JWT Token: ${jwtToken.substring(0, 20)}...`);

    // Decode JWT payload (basic decode, no verification)
    try {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      console.log('✅ JWT Token decoded:');
      console.log(`   User ID: ${payload.user_id}`);
      console.log(`   Role: ${payload.role}`);
      console.log(`   Audience: ${payload.aud}`);
      console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    } catch (error) {
      console.warn('⚠️  Could not decode JWT payload:', error.message);
    }

    // Test token validation
    console.log('🔍 Testing token validation...');
    const validateResponse = await fetch(POSTGRAPHILE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        query: `
          query GetCurrentUser {
            currentUser {
              id
              email
              displayName
              role
              isActive
            }
          }
        `
      })
    });

    const validateResult = await validateResponse.json();

    if (validateResult.errors) {
      console.error('❌ Token validation failed:');
      validateResult.errors.forEach(error => {
        console.error(`   ${error.message}`);
      });
      process.exit(1);
    }

    if (validateResult.data?.currentUser) {
      console.log('✅ Token validation successful!');
      console.log('✅ Test user is ready for Playwright tests');
    } else {
      console.error('❌ Token validation returned no user data');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.error('   Make sure PostGraphile is running on http://localhost:4000');
    process.exit(1);
  }
}

// Check if PostGraphile is accessible first
async function checkPostGraphileHealth() {
  console.log('🔍 Checking PostGraphile health...');

  try {
    const response = await fetch(POSTGRAPHILE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query { __typename }'
      })
    });

    if (response.ok) {
      console.log('✅ PostGraphile is accessible');
      return true;
    } else {
      console.error(`❌ PostGraphile returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Could not connect to PostGraphile:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test User Verification Script');
  console.log('================================');

  // Check PostGraphile health first
  const isHealthy = await checkPostGraphileHealth();
  if (!isHealthy) {
    console.error('\n❌ PostGraphile is not accessible. Please start it first.');
    console.error('   Try: npm run backend:dev');
    process.exit(1);
  }

  // Verify test user
  await verifyTestUser();

  console.log('\n🎉 All verifications passed!');
  console.log('   Ready to run Playwright authentication tests.');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});