-- Migration: Final PostGraphile Naming Fixes
-- Created: 2025-09-15
-- Description: Completely resolve remaining type naming conflicts

-- Fix the CreatePayrollCyclePayload conflict by using unique naming
COMMENT ON FUNCTION hr_public.create_payroll_period(VARCHAR, hr_public.pay_frequency, DATE, DATE, DATE) IS
'@name createNewPayrollPeriod
@resultFieldName newPayrollPeriod
Create a new payroll period for processing employee payments';

-- Ensure table has distinct naming to avoid conflicts
COMMENT ON TABLE hr_public.payroll_periods IS '@name PayrollPeriod
Payroll processing periods with status and totals';

-- Add similar unique naming for any other potential conflicts
COMMENT ON FUNCTION hr_public.create_employee_compensation(UUID, DECIMAL, hr_public.compensation_type, hr_public.employment_status, hr_public.pay_frequency, DATE, BOOLEAN, BOOLEAN, BOOLEAN) IS
'@name createNewEmployeeCompensation
@resultFieldName newEmployeeCompensation
Create new employee compensation record (HR Admin only)';

-- Add explicit function naming for time-off functions to prevent future conflicts
COMMENT ON FUNCTION hr_public.submit_time_off_request(UUID, UUID, DATE, DATE, DECIMAL, TEXT) IS
'@name submitNewTimeOffRequest
@resultFieldName newTimeOffRequest
Submit a new time-off request for approval';

COMMENT ON FUNCTION hr_public.approve_time_off_request(UUID, TEXT) IS
'@name approveTimeOffRequest
@resultFieldName approvedTimeOffRequest
Approve a pending time-off request';

COMMENT ON FUNCTION hr_public.reject_time_off_request(UUID, TEXT) IS
'@name rejectTimeOffRequest
@resultFieldName rejectedTimeOffRequest
Reject a pending time-off request';

-- Ensure analytics functions have unique names
COMMENT ON FUNCTION hr_public.refresh_dashboard_metrics() IS
'@name refreshAnalyticsDashboard
Refresh the dashboard metrics materialized view';

COMMENT ON FUNCTION hr_public.get_turnover_rate(DATE, DATE) IS
'@name calculateTurnoverRate
Calculate employee turnover rate for a given period';

-- Add unique naming for employee self-service functions
COMMENT ON FUNCTION hr_public.update_my_contact_info(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) IS
'@name updateMyContactInformation
@resultFieldName updatedContactInfo
Update own contact information (employee self-service)';

COMMENT ON FUNCTION hr_public.get_my_profile() IS
'@name getMyEmployeeProfile
Get comprehensive profile information for current user';

COMMENT ON FUNCTION hr_public.get_my_time_off_summary() IS
'@name getMyTimeOffSummary
Get time-off balances and request summary for current user';

COMMENT ON FUNCTION hr_public.get_my_goals(BOOLEAN) IS
'@name getMyEmployeeGoals
Get goals and progress for current user';

COMMENT ON FUNCTION hr_public.request_document_access(UUID, VARCHAR, TEXT) IS
'@name requestDocumentAccess
@resultFieldName documentAccessRequest
Request access to a document (employee self-service)';

COMMENT ON FUNCTION hr_public.get_my_recent_activities(INTEGER, INTEGER) IS
'@name getMyRecentActivities
Get recent activities and updates for current user';