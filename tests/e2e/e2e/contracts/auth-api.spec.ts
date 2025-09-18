import { test, expect } from '@playwright/test';

/**
 * T004: Contract test for GraphQL authentication endpoint
 *
 * This test validates the GraphQL authentication API contract
 * based on the spec in contracts/auth-api.yaml
 */

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

test.describe('GraphQL Authentication API Contract', () => {
  test('authentication mutation returns valid JWT token', async ({ request }) => {
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        query: `
          mutation TestAuthentication($email: String!, $password: String!) {
            authenticate(input: {email: $email, password: $password}) {
              jwtToken
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com',
          password: 'admin123'
        }
      }
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    // Should not have GraphQL errors
    expect(result.errors).toBeUndefined();

    // Should have authentication data
    expect(result.data).toBeDefined();
    expect(result.data.authenticate).toBeDefined();

    const { jwtToken } = result.data.authenticate;

    // JWT Token validation
    expect(jwtToken).toBeDefined();
    expect(typeof jwtToken).toBe('string');
    expect(jwtToken.length).toBeGreaterThan(20);
    // JWT format: header.payload.signature
    expect(jwtToken).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);

    // Verify JWT payload contains expected claims
    const payload = JSON.parse(Buffer.from(jwtToken.split('.')[1], 'base64').toString());
    expect(payload.role).toBe('hr_admin');
    expect(payload.user_id).toBeDefined();
    expect(payload.role_level).toBe(100);
    expect(payload.aud).toBe('postgraphile');
    expect(payload.iss).toBe('postgraphile');

    console.log('✅ Authentication mutation contract validated');
  });

  test('authentication mutation rejects invalid credentials', async ({ request }) => {
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        query: `
          mutation TestInvalidAuth($email: String!, $password: String!) {
            authenticate(input: {email: $email, password: $password}) {
              jwtToken
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com',
          password: 'wrongpassword'
        }
      }
    });

    expect(response.status()).toBe(200); // GraphQL errors return 200 with error in body

    const result = await response.json();

    // Should have GraphQL errors for invalid credentials
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/invalid|credential|password|login/i);

    // Should not have authentication data
    expect(result.data?.authenticate).toBeNull();

    console.log('✅ Invalid credentials rejection contract validated');
  });

  test('userByEmail query works with valid JWT token', async ({ request }) => {
    // First, get a valid JWT token
    const authResponse = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        query: `
          mutation GetToken($email: String!, $password: String!) {
            authenticate(input: {email: $email, password: $password}) {
              jwtToken
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com',
          password: 'admin123'
        }
      }
    });

    const authResult = await authResponse.json();
    const jwtToken = authResult.data.authenticate.jwtToken;

    // Now test userByEmail query with the token
    const userResponse = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      data: {
        query: `
          query GetUserByEmail($email: String!) {
            userByEmail(email: $email) {
              id
              email
              displayName
              isActive
              userRoleAssignments {
                nodes {
                  userRole {
                    name
                    level
                    permissions
                  }
                }
              }
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com'
        }
      }
    });

    expect(userResponse.status()).toBe(200);

    const userResult = await userResponse.json();

    // Should not have GraphQL errors
    expect(userResult.errors).toBeUndefined();

    // Should have user data
    expect(userResult.data).toBeDefined();
    expect(userResult.data.userByEmail).toBeDefined();

    const user = userResult.data.userByEmail;

    // Validate user structure matches contract
    expect(user.id).toBeDefined();
    expect(user.email).toBe('admin@postgraphile-hr.com');
    expect(user.displayName).toBeDefined();
    expect(user.isActive).toBe(true);

    // Validate role assignments structure
    if (user.userRoleAssignments?.nodes) {
      expect(Array.isArray(user.userRoleAssignments.nodes)).toBe(true);

      if (user.userRoleAssignments.nodes.length > 0) {
        const firstRoleAssignment = user.userRoleAssignments.nodes[0];
        expect(firstRoleAssignment.userRole).toBeDefined();
        expect(firstRoleAssignment.userRole.name).toBeDefined();
        expect(typeof firstRoleAssignment.userRole.level).toBe('number');
      }
    }

    console.log('✅ UserByEmail query contract validated');
  });

  test('userByEmail query rejects invalid JWT token', async ({ request }) => {
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.jwt.token'
      },
      data: {
        query: `
          query GetUserByEmailInvalid($email: String!) {
            userByEmail(email: $email) {
              id
              email
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com'
        }
      }
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    // Should have GraphQL errors for invalid token
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/jwt|token|invalid|expired|unauthorized/i);

    console.log('✅ Invalid JWT token rejection contract validated');
  });

  test('userByEmail query rejects expired JWT token', async ({ request }) => {
    // Create an expired JWT token (this would need to be crafted or we'd need a test endpoint)
    // For now, we'll test with a malformed token that should be rejected
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';

    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`
      },
      data: {
        query: `
          query GetUserByEmailExpired($email: String!) {
            userByEmail(email: $email) {
              id
              email
            }
          }
        `,
        variables: {
          email: 'admin@postgraphile-hr.com'
        }
      }
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    // Should have GraphQL errors for expired/invalid token
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);

    console.log('✅ Expired JWT token rejection contract validated');
  });

  test('GraphQL introspection query works', async ({ request }) => {
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        query: `
          query IntrospectionQuery {
            __schema {
              types {
                name
                kind
              }
            }
          }
        `
      }
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    // Should not have GraphQL errors
    expect(result.errors).toBeUndefined();

    // Should have schema information
    expect(result.data).toBeDefined();
    expect(result.data.__schema).toBeDefined();
    expect(result.data.__schema.types).toBeDefined();
    expect(Array.isArray(result.data.__schema.types)).toBe(true);

    // Should have authentication-related types
    const typeNames = result.data.__schema.types.map((type: any) => type.name);
    expect(typeNames).toContain('User');

    console.log('✅ GraphQL introspection contract validated');
  });

  test('GraphQL endpoint handles malformed requests correctly', async ({ request }) => {
    // Test with malformed JSON
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'invalid json'
    });

    expect(response.status()).toBe(400);

    console.log('✅ Malformed request handling contract validated');
  });

  test('GraphQL endpoint returns proper CORS headers', async ({ request }) => {
    const response = await request.post(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5175'
      },
      data: {
        query: 'query { __typename }'
      }
    });

    expect(response.status()).toBe(200);

    // Check for CORS headers (these might vary based on PostGraphile configuration)
    const headers = response.headers();

    // Common CORS headers that should be present
    expect(headers['access-control-allow-origin'] || headers['access-control-allow-credentials']).toBeDefined();

    console.log('✅ CORS headers contract validated');
  });
});