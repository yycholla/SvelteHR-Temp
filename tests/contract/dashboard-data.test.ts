/**
 * Contract Test: Dashboard Data API
 * 
 * This test defines the contract for GET /api/frontend/dashboard/{role} endpoint
 * Used for loading role-specific dashboard data with customizable widgets and RBAC filtering
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Contract: GET /api/frontend/dashboard/{role}', () => {
  const API_BASE_URL = 'http://localhost:8080/api/frontend';
  
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('Admin Dashboard - Full System Overview', () => {
    it('should return comprehensive admin dashboard with all system metrics', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Must return 200 OK for admin dashboard access
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // CONTRACT: Admin dashboard must include comprehensive system overview
      expect(data).toMatchObject({
        dashboard_id: expect.any(String),
        role: 'admin',
        user_id: expect.any(String),
        generated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        widgets: expect.any(Array),
        layout_config: expect.any(Object),
        real_time_updates: expect.any(Object),
        customization_options: expect.any(Object)
      });
      
      // CONTRACT: Admin widgets must include system-wide metrics
      const widgetTypes = data.widgets.map((w: any) => w.widget_type);
      
      const expectedWidgets = [
        'system_overview',
        'employee_metrics',
        'financial_summary',
        'department_analytics',
        'security_alerts',
        'performance_metrics',
        'compliance_status',
        'user_activity',
        'system_health'
      ];
      
      expectedWidgets.forEach(widgetType => {
        expect(widgetTypes).toContain(widgetType);
      });
      
      // CONTRACT: Each widget must have proper structure
      data.widgets.forEach((widget: any) => {
        expect(widget).toMatchObject({
          widget_id: expect.any(String),
          widget_type: expect.any(String),
          title: expect.any(String),
          position: expect.objectContaining({
            row: expect.any(Number),
            col: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number)
          }),
          data: expect.any(Object),
          visualization: expect.any(Object),
          last_updated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          refresh_interval: expect.any(Number)
        });
      });
    });

    it('should include financial and sensitive data in admin dashboard', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin?include=financial,security`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Admin should access financial widgets
      const financialWidget = data.widgets.find((w: any) => w.widget_type === 'financial_summary');
      expect(financialWidget).toBeDefined();
      expect(financialWidget.data).toMatchObject({
        total_payroll_cost: expect.any(Number),
        department_budgets: expect.any(Array),
        cost_per_employee: expect.any(Number),
        budget_utilization: expect.any(Number),
        financial_trends: expect.any(Array)
      });
      
      // CONTRACT: Admin should access security widgets
      const securityWidget = data.widgets.find((w: any) => w.widget_type === 'security_alerts');
      expect(securityWidget).toBeDefined();
      expect(securityWidget.data).toMatchObject({
        active_threats: expect.any(Number),
        recent_incidents: expect.any(Array),
        vulnerability_score: expect.any(Number),
        access_violations: expect.any(Array),
        security_trends: expect.any(Object)
      });
    });

    it('should provide real-time dashboard updates for admin', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin?real_time=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include real-time update configuration
      expect(data.real_time_updates).toMatchObject({
        enabled: true,
        websocket_url: expect.stringMatching(/^wss?:\/\//),
        connection_token: expect.any(String),
        update_channels: expect.any(Array),
        heartbeat_interval: expect.any(Number)
      });
      
      // CONTRACT: Update channels should include all admin-relevant streams
      expect(data.real_time_updates.update_channels).toEqual(
        expect.arrayContaining([
          'system_metrics',
          'employee_status',
          'financial_alerts',
          'security_events',
          'performance_data'
        ])
      );
    });

    it('should support admin dashboard customization', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include customization options
      expect(data.customization_options).toMatchObject({
        can_add_widgets: true,
        can_remove_widgets: true,
        can_resize_widgets: true,
        can_create_custom_queries: true,
        available_widgets: expect.any(Array),
        layout_templates: expect.any(Array),
        theme_options: expect.any(Object)
      });
      
      // CONTRACT: Available widgets should include all widget types
      expect(data.customization_options.available_widgets.length).toBeGreaterThan(15);
      
      data.customization_options.available_widgets.forEach((widget: any) => {
        expect(widget).toMatchObject({
          widget_type: expect.any(String),
          display_name: expect.any(String),
          description: expect.any(String),
          category: expect.any(String),
          required_permissions: expect.any(Array),
          configuration_options: expect.any(Object)
        });
      });
    });
  });

  describe('HR Manager Dashboard - HR-Focused Analytics', () => {
    it('should return HR Manager dashboard with HR-specific widgets', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/hr_manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR Manager dashboard should focus on people analytics
      const widgetTypes = data.widgets.map((w: any) => w.widget_type);
      
      const expectedHRWidgets = [
        'employee_overview',
        'hiring_pipeline',
        'performance_summary',
        'compliance_tracking',
        'turnover_analysis',
        'training_progress',
        'department_health',
        'diversity_metrics'
      ];
      
      expectedHRWidgets.forEach(widgetType => {
        expect(widgetTypes).toContain(widgetType);
      });
      
      // CONTRACT: Should NOT include financial widgets
      expect(widgetTypes).not.toContain('financial_summary');
      expect(widgetTypes).not.toContain('budget_analysis');
      expect(widgetTypes).not.toContain('payroll_costs');
    });

    it('should include compliance and training widgets for HR Manager', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/hr_manager?focus=compliance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include detailed compliance tracking
      const complianceWidget = data.widgets.find((w: any) => w.widget_type === 'compliance_tracking');
      expect(complianceWidget).toBeDefined();
      expect(complianceWidget.data).toMatchObject({
        overall_compliance_rate: expect.any(Number),
        overdue_trainings: expect.any(Array),
        upcoming_deadlines: expect.any(Array),
        compliance_by_department: expect.any(Array),
        critical_gaps: expect.any(Array)
      });
      
      // CONTRACT: Should include training progress analytics
      const trainingWidget = data.widgets.find((w: any) => w.widget_type === 'training_progress');
      expect(trainingWidget).toBeDefined();
      expect(trainingWidget.data).toMatchObject({
        completion_rates: expect.any(Object),
        training_hours: expect.any(Number),
        certifications_earned: expect.any(Number),
        training_calendar: expect.any(Array)
      });
    });

    it('should provide HR-specific real-time updates', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/hr_manager?real_time=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR real-time channels should be HR-focused
      expect(data.real_time_updates.update_channels).toEqual(
        expect.arrayContaining([
          'employee_changes',
          'compliance_alerts',
          'training_completions',
          'performance_updates',
          'hiring_activity'
        ])
      );
      
      // CONTRACT: Should NOT include financial or security channels
      expect(data.real_time_updates.update_channels).not.toContain('financial_alerts');
      expect(data.real_time_updates.update_channels).not.toContain('security_events');
    });

    it('should include diversity and inclusion metrics for HR Manager', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/hr_manager?include=diversity`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include diversity metrics widget
      const diversityWidget = data.widgets.find((w: any) => w.widget_type === 'diversity_metrics');
      expect(diversityWidget).toBeDefined();
      expect(diversityWidget.data).toMatchObject({
        gender_distribution: expect.any(Object),
        ethnicity_breakdown: expect.any(Object),
        age_demographics: expect.any(Object),
        leadership_diversity: expect.any(Object),
        hiring_diversity_trends: expect.any(Array),
        pay_equity_analysis: expect.any(Object)
      });
    });
  });

  describe('Manager Dashboard - Team-Focused Analytics', () => {
    it('should return Manager dashboard with team-specific widgets', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Manager dashboard should focus on team management
      const widgetTypes = data.widgets.map((w: any) => w.widget_type);
      
      const expectedManagerWidgets = [
        'team_overview',
        'team_performance',
        'pending_approvals',
        'team_goals',
        'attendance_summary',
        'team_feedback',
        'upcoming_reviews'
      ];
      
      expectedManagerWidgets.forEach(widgetType => {
        expect(widgetTypes).toContain(widgetType);
      });
      
      // CONTRACT: All team data should be scoped to manager's department
      data.widgets.forEach((widget: any) => {
        if (widget.data.department_scope) {
          expect(widget.data.department_scope).toMatchObject({
            department_id: expect.any(String),
            department_name: expect.any(String),
            scoped_to_user: true
          });
        }
      });
    });

    it('should apply department filtering to all manager widgets', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include department scope metadata
      expect(data).toHaveProperty('scope_enforcement');
      expect(data.scope_enforcement).toMatchObject({
        applied: true,
        scope_type: 'department',
        department_id: expect.any(String),
        records_accessible: expect.any(Number)
      });
      
      // CONTRACT: Team overview should be department-scoped
      const teamWidget = data.widgets.find((w: any) => w.widget_type === 'team_overview');
      expect(teamWidget).toBeDefined();
      expect(teamWidget.data).toMatchObject({
        team_size: expect.any(Number),
        direct_reports: expect.any(Array),
        department_id: data.scope_enforcement.department_id,
        active_employees: expect.any(Number)
      });
      
      // CONTRACT: All employee data should belong to same department
      if (teamWidget.data.direct_reports.length > 0) {
        teamWidget.data.direct_reports.forEach((employee: any) => {
          expect(employee.department_id).toBe(data.scope_enforcement.department_id);
        });
      }
    });

    it('should include pending approvals and tasks for manager', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/manager?include=approvals`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include pending approvals widget
      const approvalsWidget = data.widgets.find((w: any) => w.widget_type === 'pending_approvals');
      expect(approvalsWidget).toBeDefined();
      expect(approvalsWidget.data).toMatchObject({
        pending_count: expect.any(Number),
        approval_types: expect.any(Object),
        urgent_approvals: expect.any(Array),
        approval_history: expect.any(Array)
      });
      
      // CONTRACT: Approval types should include common manager approvals
      expect(approvalsWidget.data.approval_types).toMatchObject({
        time_off_requests: expect.any(Number),
        expense_reports: expect.any(Number),
        performance_reviews: expect.any(Number),
        schedule_changes: expect.any(Number)
      });
    });

    it('should restrict manager access to department-level data only', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should NOT include org-wide or cross-department widgets
      const widgetTypes = data.widgets.map((w: any) => w.widget_type);
      
      const forbiddenWidgets = [
        'system_overview',
        'financial_summary',
        'security_alerts',
        'org_wide_metrics',
        'all_departments_view'
      ];
      
      forbiddenWidgets.forEach(widgetType => {
        expect(widgetTypes).not.toContain(widgetType);
      });
      
      // CONTRACT: Should include access restrictions metadata
      expect(data.customization_options).toMatchObject({
        can_add_widgets: false,
        can_access_org_data: false,
        scope_locked: true,
        available_widgets: expect.any(Array)
      });
      
      // CONTRACT: Available widgets should be limited to team-focused options
      expect(data.customization_options.available_widgets.length).toBeLessThan(10);
    });
  });

  describe('Employee Dashboard - Personal Analytics', () => {
    it('should return Employee dashboard with self-service widgets', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Employee dashboard should focus on personal data
      const widgetTypes = data.widgets.map((w: any) => w.widget_type);
      
      const expectedEmployeeWidgets = [
        'personal_overview',
        'my_timesheet',
        'my_requests',
        'upcoming_deadlines',
        'my_benefits',
        'training_assigned',
        'team_directory'
      ];
      
      expectedEmployeeWidgets.forEach(widgetType => {
        expect(widgetTypes).toContain(widgetType);
      });
      
      // CONTRACT: All widgets should be scoped to current user
      data.widgets.forEach((widget: any) => {
        if (widget.data.user_scope) {
          expect(widget.data.user_scope).toMatchObject({
            user_id: expect.any(String),
            scoped_to_self: true
          });
        }
      });
    });

    it('should apply strict self-only filtering for employee widgets', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should enforce self-only scope
      expect(data.scope_enforcement).toMatchObject({
        applied: true,
        scope_type: 'self',
        user_id: expect.any(String),
        records_accessible: expect.any(Number)
      });
      
      // CONTRACT: Personal overview should contain only own data
      const personalWidget = data.widgets.find((w: any) => w.widget_type === 'personal_overview');
      expect(personalWidget).toBeDefined();
      expect(personalWidget.data).toMatchObject({
        employee_id: data.scope_enforcement.user_id,
        personal_info: expect.any(Object),
        employment_status: expect.any(String),
        hire_date: expect.any(String),
        department: expect.any(String)
      });
      
      // CONTRACT: Should NOT include salary or sensitive financial data
      expect(personalWidget.data).not.toHaveProperty('salary');
      expect(personalWidget.data).not.toHaveProperty('compensation');
      expect(personalWidget.data).not.toHaveProperty('bonus_history');
    });

    it('should include employee self-service widgets', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/employee?include=benefits,training`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include benefits information
      const benefitsWidget = data.widgets.find((w: any) => w.widget_type === 'my_benefits');
      expect(benefitsWidget).toBeDefined();
      expect(benefitsWidget.data).toMatchObject({
        enrolled_plans: expect.any(Array),
        available_benefits: expect.any(Array),
        open_enrollment_status: expect.any(Object),
        benefit_usage: expect.any(Object)
      });
      
      // CONTRACT: Should include training assignments
      const trainingWidget = data.widgets.find((w: any) => w.widget_type === 'training_assigned');
      expect(trainingWidget).toBeDefined();
      expect(trainingWidget.data).toMatchObject({
        assigned_courses: expect.any(Array),
        completed_courses: expect.any(Array),
        overdue_trainings: expect.any(Array),
        completion_rate: expect.any(Number)
      });
    });

    it('should restrict employee customization options', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should have minimal customization options
      expect(data.customization_options).toMatchObject({
        can_add_widgets: false,
        can_remove_widgets: false,
        can_resize_widgets: true, // Only resizing allowed
        can_reorder_widgets: true,
        available_widgets: expect.any(Array)
      });
      
      // CONTRACT: Available widgets should be very limited
      expect(data.customization_options.available_widgets.length).toBeLessThan(5);
      
      // CONTRACT: All available widgets should be self-service only
      data.customization_options.available_widgets.forEach((widget: any) => {
        expect(widget.category).toBe('self-service');
        expect(widget.required_permissions).toContain('profile:read');
      });
    });
  });

  describe('Dashboard Customization & Personalization', () => {
    it('should support dashboard layout customization for allowed roles', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const customLayoutRequest = {
        layout_config: {
          grid_columns: 12,
          row_height: 60,
          margins: [10, 10],
          widgets: [
            {
              widget_id: 'system_overview',
              position: { x: 0, y: 0, w: 6, h: 4 }
            },
            {
              widget_id: 'employee_metrics',
              position: { x: 6, y: 0, w: 6, h: 4 }
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin/customize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customLayoutRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should save and return customized layout
      expect(data).toMatchObject({
        dashboard_id: expect.any(String),
        layout_saved: true,
        custom_layout: expect.objectContaining({
          grid_columns: 12,
          row_height: 60,
          widgets: expect.any(Array)
        }),
        saved_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      });
    });

    it('should support widget filtering and search', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin?widgets=system_overview,employee_metrics&search=performance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should return only requested widgets
      expect(data.widgets.length).toBeLessThanOrEqual(2);
      
      // CONTRACT: Should include search results in metadata
      expect(data.metadata).toHaveProperty('widget_filter');
      expect(data.metadata.widget_filter).toMatchObject({
        requested_widgets: ['system_overview', 'employee_metrics'],
        search_term: 'performance',
        filtered_count: expect.any(Number),
        total_available: expect.any(Number)
      });
    });

    it('should support theme and visual customization', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin?theme=dark&compact=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include theme configuration
      expect(data.layout_config).toHaveProperty('theme');
      expect(data.layout_config.theme).toMatchObject({
        name: 'dark',
        primary_color: expect.any(String),
        background_color: expect.any(String),
        text_color: expect.any(String),
        accent_colors: expect.any(Object)
      });
      
      // CONTRACT: Should include compact layout settings
      expect(data.layout_config.display_mode).toBe('compact');
      expect(data.layout_config.widget_spacing).toBeLessThan(20);
    });
  });

  describe('Dashboard Performance & Caching', () => {
    it('should implement dashboard data caching', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      // First request
      const response1 = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      
      // Second request (should hit cache)
      const response2 = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      
      // CONTRACT: Should include cache information
      expect(data1.metadata).toHaveProperty('cache_info');
      expect(data2.metadata.cache_info.cache_status).toBe('hit');
      expect(data2.metadata.cache_info.cached_at).toBeDefined();
    });

    it('should support dashboard data refresh', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin?refresh=true&widgets=system_overview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should bypass cache when refresh requested
      expect(data.metadata.cache_info.cache_status).toBe('bypassed');
      expect(data.metadata.refresh_requested).toBe(true);
      
      // CONTRACT: Refreshed widgets should have recent timestamps
      const systemWidget = data.widgets.find((w: any) => w.widget_type === 'system_overview');
      const refreshTime = new Date(systemWidget.last_updated);
      const now = new Date();
      expect(now.getTime() - refreshTime.getTime()).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle concurrent dashboard requests efficiently', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      // CONTRACT: Should handle multiple concurrent dashboard requests
      const concurrentRequests = Array(5).fill(null).map(() =>
        fetch(`${API_BASE_URL}/dashboard/admin`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should leverage caching for performance
      const data = await Promise.all(responses.map(r => r.json()));
      const cacheHits = data.filter(d => d.metadata.cache_info.cache_status === 'hit').length;
      expect(cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Authorization'),
        status_code: 401
      });
    });

    it('should return 401 for invalid or expired tokens', async () => {
      const invalidToken = 'invalid-or-expired-token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
    });

    it('should return 403 for role-dashboard mismatch', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      // Employee trying to access admin dashboard
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('admin dashboard access denied'),
        user_role: 'employee',
        required_role: 'admin'
      });
    });

    it('should return 404 for invalid dashboard roles', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/invalid_role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: 'dashboard_not_found',
        message: expect.stringContaining('invalid_role'),
        available_dashboards: expect.arrayContaining(['admin', 'hr_manager', 'manager', 'employee'])
      });
    });
  });

  describe('Response Format & Security', () => {
    it('should return consistent JSON structure across all role dashboards', async () => {
      const tokens = {
        admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token',
        hr_manager: 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token',
        manager: 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.manager.token',
        employee: 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token'
      };
      
      const dashboardTypes = ['admin', 'hr_manager', 'manager', 'employee'];
      
      for (let i = 0; i < dashboardTypes.length; i++) {
        const role = dashboardTypes[i];
        const token = Object.values(tokens)[i];
        
        const response = await fetch(`${API_BASE_URL}/dashboard/${role}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');
        
        const data = await response.json();
        
        // CONTRACT: All dashboards must have consistent structure
        const expectedKeys = [
          'dashboard_id', 'role', 'user_id', 'generated_at', 'widgets', 
          'layout_config', 'customization_options', 'metadata'
        ];
        
        expectedKeys.forEach(key => {
          expect(data).toHaveProperty(key);
        });
      }
    });

    it('should include security headers in dashboard responses', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Security headers must be present
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toContain('default-src');
    });

    it('should not leak sensitive information in error responses', async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer malicious-probe-token',
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      
      // CONTRACT: Error messages must not expose internal details
      expect(data.message).not.toContain('database');
      expect(data.message).not.toContain('widget');
      expect(data.message).not.toContain('internal');
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('dashboard_config');
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 800ms for dashboard loading', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      
      // CONTRACT: Dashboard loading must complete within 800ms
      expect(responseTime).toBeLessThan(800);
      
      const data = await response.json();
      expect(data.metadata.generation_time_ms).toBeLessThan(500);
    });

    it('should implement rate limiting for dashboard requests', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      // CONTRACT: Should implement rate limiting for dashboard requests
      const rapidRequests = Array(20).fill(null).map(() =>
        fetch(`${API_BASE_URL}/dashboard/admin?no_cache=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const responses = await Promise.all(rapidRequests);
      
      // Should have at least one rate limit response
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        const rateLimitData = await rateLimitedResponses[0].json();
        expect(rateLimitData.message).toContain('rate limit exceeded');
        expect(rateLimitData.retry_after).toBeGreaterThan(0);
      }
    });
  });
});