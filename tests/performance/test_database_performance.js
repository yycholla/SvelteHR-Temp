// Database Performance Contract Test
// Validates sub-200ms query performance with proper indexing
// MUST FAIL until performance indexes are implemented in T070

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://hasura:hasura123@localhost:5432/svelteHR'
});

describe('Database Performance Contract Tests', () => {
  beforeAll(async () => {
    await client.connect();
    
    // Verify pg_stat_statements extension is available
    const result = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')"
    );
    
    if (!result.rows[0].exists) {
      throw new Error('pg_stat_statements extension not found - required for performance testing');
    }
    
    // Reset statement statistics for clean measurement
    await client.query('SELECT pg_stat_statements_reset()');
  });

  afterAll(async () => {
    await client.end();
  });

  it('should have required performance indexes for employee queries', async () => {
    // Test employees email index exists
    const emailIndexResult = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'users' AND indexname = 'idx_users_email'
    `);
    expect(emailIndexResult.rows).toHaveLength(1);

    // Test employees active status index exists
    const activeIndexResult = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'users' AND indexname = 'idx_users_active'
    `);
    expect(activeIndexResult.rows).toHaveLength(1);

    // Test department-role composite index exists
    const deptRoleIndexResult = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'job_information' AND indexname = 'idx_job_info_department_role'
    `);
    expect(deptRoleIndexResult.rows).toHaveLength(1);
  });

  it('should execute employee directory query under 200ms', async () => {
    const startTime = Date.now();
    
    // Simulate employee directory query (most common operation)
    const result = await client.query(`
      SELECT u.id, u.display_name, u.email, ji.job_title, d.name as department_name
      FROM users u
      LEFT JOIN job_information ji ON u.id = ji.employee_id
      LEFT JOIN departments d ON ji.department_id = d.id
      WHERE u.is_active = true
      ORDER BY u.display_name
      LIMIT 50
    `);
    
    const executionTime = Date.now() - startTime;
    
    // Contract: Must execute under 200ms
    expect(executionTime).toBeLessThan(200);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should execute department hierarchy query under 200ms', async () => {
    const startTime = Date.now();
    
    // Simulate department hierarchy query with employee counts
    const result = await client.query(`
      SELECT d.id, d.name, d.budget,
             COUNT(ji.employee_id) as employee_count,
             COUNT(subdept.id) as subdepartment_count
      FROM departments d
      LEFT JOIN job_information ji ON d.id = ji.department_id
      LEFT JOIN departments subdept ON d.id = subdept.parent_department_id
      WHERE d.is_active = true
      GROUP BY d.id, d.name, d.budget
      ORDER BY d.name
      LIMIT 20
    `);
    
    const executionTime = Date.now() - startTime;
    
    // Contract: Must execute under 200ms
    expect(executionTime).toBeLessThan(200);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should execute role-based user lookup under 100ms', async () => {
    const startTime = Date.now();
    
    // Simulate role-based user lookup (frequent permission check)
    const result = await client.query(`
      SELECT u.id, u.display_name, ur.name as role_name, ur.level
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.email = $1 AND ura.is_active = true
    `, ['admin@svelteHR.com']);
    
    const executionTime = Date.now() - startTime;
    
    // Contract: Must execute under 100ms (critical auth path)
    expect(executionTime).toBeLessThan(100);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should have efficient full-text search performance', async () => {
    const startTime = Date.now();
    
    // Test full-text search on employee names (replacing LIKE queries)
    const result = await client.query(`
      SELECT u.id, u.display_name, u.email,
             ts_rank(to_tsvector('english', u.display_name || ' ' || u.email), 
                     to_tsquery('english', 'admin')) as rank
      FROM users u
      WHERE to_tsvector('english', u.display_name || ' ' || u.email) @@ to_tsquery('english', 'admin')
      ORDER BY rank DESC
      LIMIT 10
    `);
    
    const executionTime = Date.now() - startTime;
    
    // Contract: Full-text search must be under 150ms
    expect(executionTime).toBeLessThan(150);
  });

  it('should maintain high cache hit ratio', async () => {
    // Execute some queries to populate cache
    await client.query('SELECT COUNT(*) FROM users WHERE is_active = true');
    await client.query('SELECT COUNT(*) FROM departments WHERE is_active = true');
    await client.query('SELECT COUNT(*) FROM user_roles');
    
    // Check cache hit ratio
    const cacheResult = await client.query(`
      SELECT 
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_read) as heap_read,
        CASE WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
             ELSE sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric 
        END as cache_hit_ratio
      FROM pg_statio_user_tables
    `);
    
    const cacheHitRatio = parseFloat(cacheResult.rows[0].cache_hit_ratio);
    
    // Contract: Cache hit ratio must be > 0.95 (95%)
    expect(cacheHitRatio).toBeGreaterThan(0.95);
  });

  it('should have optimized indexes for complex HR queries', async () => {
    const startTime = Date.now();
    
    // Complex query simulating manager dashboard
    const result = await client.query(`
      SELECT 
        d.name as department_name,
        COUNT(CASE WHEN u.onboarding_status = 'Active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN u.onboarding_status = 'Onboarding' THEN 1 END) as onboarding_employees,
        AVG(CASE WHEN c.pay_rate IS NOT NULL THEN c.pay_rate END) as avg_compensation
      FROM departments d
      LEFT JOIN job_information ji ON d.id = ji.department_id
      LEFT JOIN users u ON ji.employee_id = u.id
      LEFT JOIN compensation c ON u.id = c.employee_id
      WHERE d.is_active = true
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
    
    const executionTime = Date.now() - startTime;
    
    // Contract: Complex aggregation query must be under 200ms
    expect(executionTime).toBeLessThan(200);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should monitor slow queries and enforce limits', async () => {
    // Check for queries that exceed 200ms threshold
    const slowQueriesResult = await client.query(`
      SELECT query, mean_exec_time, calls
      FROM pg_stat_statements
      WHERE mean_exec_time > 200
      ORDER BY mean_exec_time DESC
      LIMIT 5
    `);
    
    // Contract: No queries should consistently exceed 200ms
    // Allow up to 1 slow query during testing, but log it
    if (slowQueriesResult.rows.length > 1) {
      console.warn('Slow queries detected:', slowQueriesResult.rows);
    }
    
    expect(slowQueriesResult.rows.length).toBeLessThanOrEqual(1);
  });

  it('should validate connection pool efficiency', async () => {
    // Check current connection count
    const connectionResult = await client.query(`
      SELECT count(*) as total_connections,
             count(*) FILTER (WHERE state = 'active') as active_connections,
             count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    
    const connections = connectionResult.rows[0];
    const totalConnections = parseInt(connections.total_connections);
    
    // Contract: Should not exceed 80% of max_connections (400)
    expect(totalConnections).toBeLessThan(320);
    
    // Contract: Active connections should be reasonable for test environment
    expect(parseInt(connections.active_connections)).toBeLessThan(50);
  });

  it('should validate table statistics are up to date', async () => {
    // Check when tables were last analyzed
    const statsResult = await client.query(`
      SELECT schemaname, tablename, last_analyze, last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    // Contract: All tables should have statistics (either manual or auto)
    const tablesWithoutStats = statsResult.rows.filter(row => 
      !row.last_analyze && !row.last_autoanalyze
    );
    
    if (tablesWithoutStats.length > 0) {
      console.warn('Tables without statistics:', tablesWithoutStats);
    }
    
    // Allow new tables without stats during initial testing
    expect(tablesWithoutStats.length).toBeLessThanOrEqual(3);
  });
});