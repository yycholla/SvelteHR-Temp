CREATE MIGRATION m1u4kzlaaqpcs2duvawbjibc2ly5mho3idjtv4ro7pzacbdxr6peea
    ONTO initial
{
  CREATE MODULE compliance_performance IF NOT EXISTS;
  CREATE MODULE hr_workflows IF NOT EXISTS;
  CREATE MODULE onboarding_offboarding IF NOT EXISTS;
  CREATE MODULE payroll IF NOT EXISTS;
  CREATE MODULE performance IF NOT EXISTS;
  CREATE MODULE portal_communication IF NOT EXISTS;
  CREATE MODULE rbac IF NOT EXISTS;
  CREATE MODULE recruitment IF NOT EXISTS;
  CREATE MODULE time_attendance IF NOT EXISTS;
  CREATE SCALAR TYPE default::ApprovalStatus EXTENDING enum<Pending, Approved, Rejected, Skipped, Escalated>;
  CREATE SCALAR TYPE default::AttendanceStatus EXTENDING enum<Present, Absent, Late, LeftEarly, Holiday>;
  CREATE SCALAR TYPE default::BankAccountType EXTENDING enum<Checking, Savings>;
  CREATE SCALAR TYPE default::ComplianceStatus EXTENDING enum<Active, ExpiringSoon, Expired, PendingReview>;
  CREATE SCALAR TYPE default::ExpenseStatus EXTENDING enum<Draft, Submitted, Approved, Rejected, Reimbursed>;
  CREATE SCALAR TYPE default::NotificationType EXTENDING enum<Info, Success, Warning, Error, Reminder>;
  CREATE SCALAR TYPE default::OnboardingStatus EXTENDING enum<PreHire, Onboarding, Active, Terminated>;
  CREATE SCALAR TYPE default::PayType EXTENDING enum<Hourly, Salary, Commission, Contractor>;
  CREATE SCALAR TYPE default::RenewalPeriod EXTENDING enum<None, Monthly, Quarterly, SemiAnnually, Yearly, BiYearly>;
  CREATE SCALAR TYPE default::TaskStatus EXTENDING enum<Pending, InProgress, Completed, Blocked>;
  CREATE SCALAR TYPE default::TimeEntryType EXTENDING enum<ClockIn, ClockOut, BreakStart, BreakEnd>;
  CREATE SCALAR TYPE payroll::DeductionType EXTENDING enum<Tax, Insurance, Retirement, Union, Garnishment, Other>;
  CREATE SCALAR TYPE payroll::PayPeriodStatus EXTENDING enum<Draft, Open, Processing, Finalized, Paid>;
  CREATE SCALAR TYPE payroll::PayPeriodType EXTENDING enum<Weekly, BiWeekly, SemiMonthly, Monthly>;
  CREATE SCALAR TYPE payroll::PayType EXTENDING enum<Salary, Hourly, Commission, Contract>;
  CREATE SCALAR TYPE payroll::PaystubStatus EXTENDING enum<Draft, Generated, Delivered, Viewed>;
  CREATE SCALAR TYPE payroll::TaxType EXTENDING enum<Federal, State, Local, SocialSecurity, Medicare, Unemployment>;
  CREATE SCALAR TYPE performance::FeedbackType EXTENDING enum<Continuous, Formal, Peer, Upward, Downward>;
  CREATE SCALAR TYPE performance::GoalStatus EXTENDING enum<NotStarted, InProgress, OnTrack, AtRisk, Completed, Cancelled>;
  CREATE SCALAR TYPE performance::QuestionType EXTENDING enum<Text, Textarea, Rating, Scale, MultipleChoice, Checkbox, YesNo, FileUpload>;
  CREATE SCALAR TYPE performance::ReviewStatus EXTENDING enum<Draft, InProgress, Submitted, UnderReview, Completed, Overdue>;
  CREATE SCALAR TYPE performance::ReviewType EXTENDING enum<Annual, Quarterly, Probationary, ProjectBased, SelfReview, PeerReview, ManagerReview>;
  CREATE SCALAR TYPE recruitment::ApplicationStatus EXTENDING enum<Applied, Screening, PhoneInterview, TechnicalInterview, OnSiteInterview, FinalInterview, BackgroundCheck, OfferExtended, OfferAccepted, OfferDeclined, Rejected, Withdrawn>;
  CREATE SCALAR TYPE recruitment::EmploymentType EXTENDING enum<FullTime, PartTime, Contract, Internship, Temporary>;
  CREATE SCALAR TYPE recruitment::ExperienceLevel EXTENDING enum<EntryLevel, Junior, Mid, Senior, Lead, Principal>;
  CREATE SCALAR TYPE recruitment::InterviewStatus EXTENDING enum<Scheduled, InProgress, Completed, Cancelled, Rescheduled>;
  CREATE SCALAR TYPE recruitment::InterviewType EXTENDING enum<Phone, Video, InPerson, Technical, Behavioral, Panel>;
  CREATE SCALAR TYPE recruitment::JobStatus EXTENDING enum<Draft, Open, OnHold, Closed, Cancelled>;
  CREATE SCALAR TYPE recruitment::OfferStatus EXTENDING enum<Draft, Extended, Negotiating, Accepted, Declined, Expired>;
  CREATE SCALAR TYPE time_attendance::AttendanceStatus EXTENDING enum<Present, Late, Absent, PartialDay, Excused>;
  CREATE SCALAR TYPE time_attendance::OvertimeType EXTENDING enum<Regular, Premium, Double>;
  CREATE SCALAR TYPE time_attendance::ScheduleStatus EXTENDING enum<Scheduled, Published, Cancelled>;
  CREATE SCALAR TYPE time_attendance::TimeEntryType EXTENDING enum<ClockIn, ClockOut, BreakStart, BreakEnd, LunchStart, LunchEnd>;
  CREATE SCALAR TYPE time_attendance::TimeOffStatus EXTENDING enum<Pending, Approved, Denied, Cancelled>;
  CREATE SCALAR TYPE time_attendance::TimeOffType EXTENDING enum<Vacation, Sick, Personal, Holiday, Bereavement, Jury, Military, FMLA>;
  CREATE SCALAR TYPE time_attendance::TimesheetStatus EXTENDING enum<Draft, Submitted, UnderReview, Approved, Rejected>;
  CREATE ABSTRACT TYPE default::Auditable {
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
          CREATE REWRITE
              INSERT 
              USING (std::datetime_current());
          CREATE REWRITE
              UPDATE 
              USING (std::datetime_current());
      };
  };
  CREATE TYPE compliance_performance::ComplianceItem EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY item_type: std::str;
      CREATE INDEX ON (.item_type);
      CREATE PROPERTY due_date: std::cal::local_date;
      CREATE INDEX ON (.due_date);
      CREATE PROPERTY status: default::ComplianceStatus {
          SET default := (default::ComplianceStatus.Active);
      };
      CREATE INDEX ON (.status);
      CREATE PROPERTY completion_date: std::cal::local_date;
      CREATE PROPERTY is_completed := (EXISTS (.completion_date));
      CREATE PROPERTY compliance_score: std::decimal;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY external_id: std::str;
      CREATE PROPERTY next_renewal_date: std::cal::local_date;
      CREATE PROPERTY renewal_period: default::RenewalPeriod {
          SET default := (default::RenewalPeriod.None);
      };
      CREATE PROPERTY required_for_role: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE ABSTRACT TYPE rbac::Auditable {
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
          CREATE REWRITE
              INSERT 
              USING (std::datetime_current());
          CREATE REWRITE
              UPDATE 
              USING (std::datetime_current());
      };
  };
  CREATE TYPE rbac::User EXTENDING rbac::Auditable {
      CREATE PROPERTY onboarding_status: default::OnboardingStatus {
          SET default := (default::OnboardingStatus.PreHire);
      };
      CREATE PROPERTY first_name: std::str;
      CREATE PROPERTY last_name: std::str;
      CREATE PROPERTY full_name := (((.first_name ++ ' ') ++ .last_name));
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON ((.onboarding_status, .is_active));
      CREATE REQUIRED PROPERTY username: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY search_name := (std::str_lower(((((.first_name ++ ' ') ++ .last_name) ++ ' ') ++ .username)));
      CREATE INDEX ON (.search_name);
      CREATE INDEX ON ((.first_name, .last_name));
      CREATE PROPERTY employee_id: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.employee_id);
      CREATE INDEX ON (.username);
      CREATE INDEX ON (.is_active);
      CREATE LINK manager: rbac::User;
      CREATE INDEX ON (.manager);
      CREATE REQUIRED PROPERTY email: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.email);
      CREATE PROPERTY direct_report_count := (std::count(.<manager[IS rbac::User]));
      CREATE PROPERTY is_manager := (EXISTS (.<manager[IS rbac::User]));
      CREATE PROPERTY management_level := ((1 IF EXISTS (.manager) ELSE 0));
      CREATE PROPERTY display_name := ((.full_name IF EXISTS (.first_name) ELSE .username));
      CREATE PROPERTY failed_login_attempts: std::int16 {
          SET default := 0;
      };
      CREATE PROPERTY is_verified: std::bool {
          SET default := false;
      };
      CREATE PROPERTY last_login: std::datetime;
      CREATE PROPERTY locked_until: std::datetime;
      CREATE PROPERTY middle_name: std::str;
      CREATE PROPERTY password_hash: std::str;
  };
  ALTER TYPE compliance_performance::ComplianceItem {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
  };
  CREATE TYPE compliance_performance::DisciplinaryAction EXTENDING default::Auditable {
      CREATE PROPERTY action_date: std::cal::local_date {
          SET default := (std::cal::to_local_date(std::datetime_current(), 'UTC'));
      };
      CREATE INDEX ON (.action_date);
      CREATE PROPERTY severity_level: std::int32 {
          SET default := 1;
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 1) AND (__subject__ <= 5)));
      };
      CREATE INDEX ON (.severity_level);
      CREATE REQUIRED PROPERTY action_type: std::str;
      CREATE INDEX ON (.action_type);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK issued_by: rbac::User;
      CREATE LINK witness: rbac::User;
      CREATE PROPERTY appeal_deadline: std::cal::local_date;
      CREATE PROPERTY appeal_submitted: std::bool {
          SET default := false;
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY follow_up_date: std::cal::local_date;
      CREATE PROPERTY follow_up_required: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY reason: std::str;
      CREATE PROPERTY resolution: std::str;
  };
  CREATE TYPE compliance_performance::Document EXTENDING default::Auditable {
      CREATE PROPERTY expiry_date: std::cal::local_date;
      CREATE INDEX ON (.expiry_date);
      CREATE LINK owner: rbac::User;
      CREATE INDEX ON (.owner);
      CREATE REQUIRED PROPERTY file_path: std::str;
      CREATE INDEX ON (.file_path);
      CREATE PROPERTY document_type: std::str;
      CREATE INDEX ON (.document_type);
      CREATE LINK parent_document: compliance_performance::Document;
      CREATE PROPERTY is_latest_version := (NOT (EXISTS (.<parent_document[IS compliance_performance::Document])));
      CREATE LINK uploaded_by: rbac::User;
      CREATE PROPERTY access_level: std::str {
          SET default := 'private';
      };
      CREATE PROPERTY document_hash: std::str;
      CREATE PROPERTY file_size: std::int64;
      CREATE PROPERTY file_size_mb := (((<std::decimal>.file_size / <std::decimal>1024.0) / <std::decimal>1024.0));
      CREATE REQUIRED PROPERTY filename: std::str;
      CREATE PROPERTY is_confidential: std::bool {
          SET default := false;
      };
      CREATE PROPERTY metadata: std::json;
      CREATE PROPERTY mime_type: std::str;
      CREATE PROPERTY retention_period: std::int32;
      CREATE PROPERTY version: std::int32 {
          SET default := 1;
      };
  };
  CREATE TYPE compliance_performance::PerformanceGoal EXTENDING default::Auditable {
      CREATE PROPERTY due_date: std::cal::local_date;
      CREATE INDEX ON (.due_date);
      CREATE PROPERTY status: default::TaskStatus {
          SET default := (default::TaskStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE LINK manager: rbac::User;
      CREATE PROPERTY completion_date: std::cal::local_date;
      CREATE PROPERTY current_value: std::str;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_completed := ((.status = default::TaskStatus.Completed));
      CREATE PROPERTY measurement_criteria: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY priority: std::str {
          SET default := 'medium';
      };
      CREATE PROPERTY progress_percentage: std::decimal {
          SET default := 0;
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 0) AND (__subject__ <= 100)));
      };
      CREATE PROPERTY target_value: std::str;
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE compliance_performance::PerformanceReview EXTENDING default::Auditable {
      CREATE PROPERTY review_period_end: std::cal::local_date;
      CREATE PROPERTY review_period_start: std::cal::local_date;
      CREATE CONSTRAINT std::expression ON ((.review_period_start <= .review_period_end));
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.review_period_start);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE PROPERTY overall_score: std::decimal;
      CREATE INDEX ON (.overall_score);
      CREATE INDEX ON (.review_period_end);
      CREATE LINK reviewer: rbac::User;
      CREATE PROPERTY is_self_review := ((.employee = .reviewer));
      CREATE PROPERTY comments: std::str;
      CREATE PROPERTY final_review_completed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY finalized_at: std::datetime;
      CREATE PROPERTY goals: std::json;
      CREATE PROPERTY manager_review_completed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY responses: std::json;
      CREATE PROPERTY reviewed_at: std::datetime;
      CREATE PROPERTY self_review_completed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY submitted_at: std::datetime;
  };
  ALTER TYPE compliance_performance::PerformanceGoal {
      CREATE LINK review: compliance_performance::PerformanceReview;
  };
  CREATE TYPE compliance_performance::PerformanceTemplate EXTENDING default::Auditable {
      CREATE PROPERTY is_default: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_default);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY description: std::str;
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE PROPERTY review_period: std::str;
      CREATE PROPERTY target_roles: std::json;
      CREATE REQUIRED PROPERTY template_data: std::json;
  };
  ALTER TYPE compliance_performance::PerformanceReview {
      CREATE REQUIRED LINK template: compliance_performance::PerformanceTemplate;
  };
  ALTER TYPE compliance_performance::PerformanceTemplate {
      CREATE PROPERTY avg_score := (std::math::mean(.<template[IS compliance_performance::PerformanceReview].overall_score));
      CREATE PROPERTY reviews_count := (std::count(.<template[IS compliance_performance::PerformanceReview]));
  };
  CREATE TYPE default::Compensation EXTENDING default::Auditable {
      CREATE PROPERTY currency: std::str {
          SET default := 'USD';
      };
      CREATE PROPERTY pay_type: default::PayType;
      CREATE INDEX ON ((.pay_type, .currency));
      CREATE PROPERTY bonus_eligible: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.bonus_eligible);
      CREATE REQUIRED LINK employee: rbac::User {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.employee);
      CREATE PROPERTY salary_review_date: std::cal::local_date;
      CREATE INDEX ON (.salary_review_date);
      CREATE PROPERTY pay_rate: std::decimal;
      CREATE PROPERTY annual_salary := (((.pay_rate * 2080) IF (.pay_type = default::PayType.Hourly) ELSE (.pay_rate IF (.pay_type = default::PayType.Salary) ELSE <std::decimal>0)));
      CREATE PROPERTY bank_account_number: std::str;
      CREATE PROPERTY bank_account_type: default::BankAccountType;
      CREATE PROPERTY bank_name: std::str;
      CREATE PROPERTY bank_routing_number: std::str;
      CREATE PROPERTY direct_deposit_enabled: std::bool {
          SET default := false;
      };
      CREATE PROPERTY overtime_eligible: std::bool {
          SET default := false;
      };
      CREATE PROPERTY pay_frequency := (('Hourly' IF (.pay_type = default::PayType.Hourly) ELSE ('Annual' IF (.pay_type = default::PayType.Salary) ELSE 'Variable')));
  };
  CREATE TYPE default::ContactInformation EXTENDING default::Auditable {
      CREATE PROPERTY email: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.email);
      CREATE REQUIRED LINK employee: rbac::User {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY phone_number: std::str;
      CREATE PROPERTY address_city: std::str;
      CREATE PROPERTY address_state: std::str;
      CREATE PROPERTY address_street: std::str;
      CREATE PROPERTY address_zip: std::str;
      CREATE PROPERTY emergency_contact_name: std::str;
      CREATE PROPERTY emergency_contact_phone: std::str;
      CREATE PROPERTY emergency_contact_relationship: std::str;
      CREATE PROPERTY work_phone_number: std::str;
  };
  CREATE TYPE default::Department EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.name);
      CREATE LINK parent_department: default::Department;
      CREATE INDEX ON (.parent_department);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK manager: rbac::User;
      CREATE INDEX ON (.manager);
      CREATE PROPERTY department_hierarchy := ((.name ++ ((' > ' ++ .parent_department.name) IF EXISTS (.parent_department) ELSE '')));
      CREATE PROPERTY subdepartment_count := (std::count(.<parent_department[IS default::Department]));
      CREATE PROPERTY budget: std::decimal;
      CREATE PROPERTY description: std::str;
  };
  CREATE TYPE default::JobInformation EXTENDING default::Auditable {
      CREATE LINK department: default::Department;
      CREATE REQUIRED LINK employee: rbac::User {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY termination_date: std::cal::local_date;
      CREATE PROPERTY is_current_employee := (NOT (EXISTS (.termination_date)));
      CREATE INDEX ON ((.department, .is_current_employee));
      CREATE PROPERTY job_title: std::str;
      CREATE INDEX ON ((.job_title, .is_current_employee));
      CREATE PROPERTY employment_type: std::str;
      CREATE INDEX ON ((.employment_type, .is_current_employee));
      CREATE PROPERTY work_location: std::str;
      CREATE INDEX ON ((.work_location, .is_current_employee));
      CREATE PROPERTY hire_date: std::cal::local_date;
      CREATE INDEX ON (.hire_date);
      CREATE INDEX ON (.employee);
      CREATE PROPERTY is_remote: std::bool {
          SET default := false;
      };
      CREATE PROPERTY reports_to: std::str;
      CREATE PROPERTY work_schedule: std::str;
  };
  CREATE TYPE default::Permission EXTENDING default::Auditable {
      CREATE PROPERTY action: std::str;
      CREATE PROPERTY description: std::str;
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY resource: std::str;
  };
  CREATE TYPE default::PersonalInformation EXTENDING default::Auditable {
      CREATE REQUIRED LINK employee: rbac::User {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY date_of_birth: std::cal::local_date;
      CREATE PROPERTY drivers_license_number: std::str;
      CREATE PROPERTY gender: std::str;
      CREATE PROPERTY marital_status: std::str;
      CREATE PROPERTY nationality: std::str;
      CREATE PROPERTY passport_number: std::str;
      CREATE PROPERTY social_security_number: std::str;
  };
  CREATE TYPE default::Role EXTENDING default::Auditable {
      CREATE MULTI LINK permissions: default::Permission;
      CREATE PROPERTY permission_count := (std::count(.permissions));
      CREATE PROPERTY description: std::str;
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE TYPE hr_workflows::Attendance EXTENDING default::Auditable {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE REQUIRED PROPERTY date: std::cal::local_date;
      CREATE CONSTRAINT std::exclusive ON ((.employee, .date));
      CREATE PROPERTY clock_in_time: std::cal::local_time;
      CREATE PROPERTY clock_out_time: std::cal::local_time;
      CREATE CONSTRAINT std::expression ON (((.clock_out_time ?? <std::cal::local_time>{}) >= (.clock_in_time ?? <std::cal::local_time>{})));
      CREATE INDEX ON (.date);
      CREATE PROPERTY status: default::AttendanceStatus {
          SET default := (default::AttendanceStatus.Present);
      };
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.employee);
      CREATE LINK approved_by: rbac::User;
      CREATE PROPERTY approval_status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE PROPERTY break_duration: std::duration;
      CREATE PROPERTY is_late := (((.clock_in_time ?? <std::cal::local_time>'09:00:00') > <std::cal::local_time>'09:00:00'));
      CREATE PROPERTY left_early := (((.clock_out_time ?? <std::cal::local_time>'17:00:00') < <std::cal::local_time>'17:00:00'));
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY overtime_hours: std::decimal;
      CREATE PROPERTY total_hours: std::decimal;
  };
  CREATE TYPE hr_workflows::ChangeRequest EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY change_type: std::str;
      CREATE INDEX ON (.change_type);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE LINK reviewed_by: rbac::User;
      CREATE REQUIRED PROPERTY field_name: std::str;
      CREATE PROPERTY is_pending := ((.status = default::ApprovalStatus.Pending));
      CREATE PROPERTY new_value: std::str;
      CREATE PROPERTY old_value: std::str;
      CREATE PROPERTY reason: std::str;
      CREATE PROPERTY reviewed_at: std::datetime;
      CREATE PROPERTY supporting_documents: std::json;
  };
  CREATE TYPE hr_workflows::HRRequest EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY request_type: std::str;
      CREATE INDEX ON (.request_type);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE LINK assigned_to_user: rbac::User;
      CREATE REQUIRED PROPERTY description: std::str;
      CREATE PROPERTY is_resolved := ((.status = default::ApprovalStatus.Approved));
      CREATE PROPERTY priority: std::str {
          SET default := 'medium';
      };
      CREATE PROPERTY resolution: std::str;
      CREATE PROPERTY resolved_at: std::datetime;
      CREATE REQUIRED PROPERTY subject: std::str;
  };
  CREATE TYPE hr_workflows::Leave EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY end_date: std::cal::local_date;
      CREATE REQUIRED PROPERTY start_date: std::cal::local_date;
      CREATE CONSTRAINT std::expression ON ((.start_date <= .end_date));
      CREATE INDEX ON (.start_date);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.end_date);
      CREATE LINK approver: rbac::User;
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY comments: std::str;
      CREATE PROPERTY days_requested: std::decimal;
      CREATE PROPERTY is_approved := ((.status = default::ApprovalStatus.Approved));
      CREATE PROPERTY is_emergency: std::bool {
          SET default := false;
      };
      CREATE PROPERTY is_pending := ((.status = default::ApprovalStatus.Pending));
      CREATE PROPERTY reason: std::str;
  };
  CREATE TYPE hr_workflows::LeaveBalance EXTENDING default::Auditable {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE REQUIRED PROPERTY leave_type: std::str;
      CREATE CONSTRAINT std::exclusive ON ((.employee, .leave_type));
      CREATE INDEX ON (.leave_type);
      CREATE INDEX ON (.employee);
      CREATE PROPERTY accrual_rate: std::decimal;
      CREATE PROPERTY balance: std::decimal {
          SET default := 0;
      };
      CREATE PROPERTY projected_balance := ((.balance + (.accrual_rate * 26)));
      CREATE PROPERTY accrued_ytd: std::decimal {
          SET default := 0;
      };
      CREATE PROPERTY used_ytd: std::decimal {
          SET default := 0;
      };
      CREATE PROPERTY available_balance := ((.balance - .used_ytd));
      CREATE PROPERTY carry_over_limit: std::decimal;
      CREATE PROPERTY last_updated: std::datetime;
  };
  CREATE TYPE hr_workflows::Task EXTENDING default::Auditable {
      CREATE PROPERTY due_date: std::datetime;
      CREATE INDEX ON (.due_date);
      CREATE REQUIRED LINK assigned_to: rbac::User;
      CREATE INDEX ON (.assigned_to);
      CREATE PROPERTY status: default::TaskStatus {
          SET default := (default::TaskStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE LINK created_by: rbac::User;
      CREATE MULTI LINK dependencies: hr_workflows::Task;
      CREATE LINK parent_task: hr_workflows::Task;
      CREATE MULTI LINK subtasks := (.<parent_task[IS hr_workflows::Task]);
      CREATE PROPERTY completion_percentage := ((((std::count(.subtasks FILTER
          (.status = default::TaskStatus.Completed)
      ) / std::count(.subtasks)) * 100) IF (std::count(.subtasks) > 0) ELSE (100 IF (.status = default::TaskStatus.Completed) ELSE 0)));
      CREATE PROPERTY actual_hours: std::decimal;
      CREATE PROPERTY completion_date: std::datetime;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY estimated_hours: std::decimal;
      CREATE PROPERTY priority: std::str {
          SET default := 'medium';
      };
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE hr_workflows::TaskTemplate EXTENDING default::Auditable {
      CREATE LINK default_assignee: rbac::User;
      CREATE PROPERTY days_to_complete: std::int32;
      CREATE PROPERTY default_priority: std::str {
          SET default := 'medium';
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY estimated_hours: std::decimal;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE hr_workflows::TimeEntry EXTENDING default::Auditable {
      CREATE REQUIRED LINK attendance: hr_workflows::Attendance;
      CREATE INDEX ON (.attendance);
      CREATE REQUIRED PROPERTY entry_type: default::TimeEntryType;
      CREATE INDEX ON (.entry_type);
      CREATE REQUIRED PROPERTY timestamp: std::datetime;
      CREATE INDEX ON (.timestamp);
      CREATE PROPERTY date := (std::cal::to_local_date(.timestamp, 'UTC'));
      CREATE PROPERTY device_info: std::str;
      CREATE PROPERTY ip_address: std::str;
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY notes: std::str;
  };
  CREATE TYPE onboarding_offboarding::EquipmentAssignment EXTENDING default::Auditable {
      CREATE PROPERTY is_returned: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_returned);
      CREATE REQUIRED PROPERTY equipment_id: std::str;
      CREATE INDEX ON (.equipment_id);
      CREATE PROPERTY assigned_date: std::cal::local_date {
          SET default := (std::cal::to_local_date(std::datetime_current(), 'UTC'));
      };
      CREATE INDEX ON (.assigned_date);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE LINK assigned_by: rbac::User;
      CREATE LINK returned_to: rbac::User;
      CREATE PROPERTY brand: std::str;
      CREATE PROPERTY condition_at_assignment: std::str {
          SET default := 'new';
      };
      CREATE PROPERTY condition_at_return: std::str;
      CREATE REQUIRED PROPERTY equipment_type: std::str;
      CREATE PROPERTY estimated_value: std::decimal;
      CREATE PROPERTY maintenance_schedule: std::str;
      CREATE PROPERTY model: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY return_date: std::cal::local_date;
      CREATE PROPERTY serial_number: std::str;
      CREATE PROPERTY warranty_expiry: std::cal::local_date;
  };
  CREATE TYPE onboarding_offboarding::ExitInterview EXTENDING default::Auditable {
      CREATE PROPERTY overall_satisfaction: std::int32 {
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 1) AND (__subject__ <= 5)));
      };
      CREATE INDEX ON (.overall_satisfaction);
      CREATE PROPERTY would_recommend_company: std::bool;
      CREATE INDEX ON (.would_recommend_company);
      CREATE PROPERTY interview_date: std::datetime;
      CREATE INDEX ON (.interview_date);
      CREATE LINK conducted_by: rbac::User;
      CREATE PROPERTY confidential_notes: std::str;
      CREATE PROPERTY feedback_summary: std::str;
      CREATE PROPERTY follow_up_notes: std::str;
      CREATE PROPERTY follow_up_required: std::bool {
          SET default := false;
      };
      CREATE PROPERTY improvement_suggestions: std::str;
      CREATE PROPERTY interview_method: std::str {
          SET default := 'in_person';
      };
      CREATE PROPERTY is_positive_exit := (((.overall_satisfaction >= 4) AND .would_recommend_company));
      CREATE PROPERTY likelihood_to_return: std::int32 {
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 1) AND (__subject__ <= 5)));
      };
      CREATE PROPERTY responses: std::json;
  };
  CREATE TYPE onboarding_offboarding::OffboardingProcess EXTENDING default::Auditable {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE CONSTRAINT std::exclusive ON (.employee);
      CREATE PROPERTY last_working_day: std::cal::local_date;
      CREATE INDEX ON (.last_working_day);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.employee);
      CREATE LINK hr_contact: rbac::User;
      CREATE LINK initiated_by: rbac::User;
      CREATE LINK manager: rbac::User;
      CREATE PROPERTY access_revoked: std::bool {
          SET default := false;
      };
      CREATE PROPERTY completion_date: std::cal::local_date;
      CREATE PROPERTY equipment_returned: std::bool {
          SET default := false;
      };
      CREATE PROPERTY exit_interview_completed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY exit_interview_date: std::datetime;
      CREATE PROPERTY exit_interview_scheduled: std::bool {
          SET default := false;
      };
      CREATE PROPERTY final_pay_processed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY is_completed := ((.status = default::ApprovalStatus.Approved));
      CREATE PROPERTY knowledge_transfer_completed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY notice_given_date: std::cal::local_date;
      CREATE PROPERTY notice_period_days: std::int32;
      CREATE PROPERTY offboarding_type: std::str {
          SET default := 'voluntary';
      };
      CREATE PROPERTY progress_percentage: std::decimal {
          SET default := 0;
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 0) AND (__subject__ <= 100)));
      };
      CREATE PROPERTY reason: std::str;
      CREATE PROPERTY rehire_eligible: std::bool;
  };
  CREATE TYPE onboarding_offboarding::OnboardingDocument EXTENDING default::Auditable {
      CREATE PROPERTY expiry_date: std::cal::local_date;
      CREATE INDEX ON (.expiry_date);
      CREATE REQUIRED PROPERTY document_type: std::str;
      CREATE INDEX ON (.document_type);
      CREATE PROPERTY review_status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.review_status);
      CREATE LINK reviewed_by: rbac::User;
      CREATE LINK submitted_by: rbac::User;
      CREATE PROPERTY document_name: std::str;
      CREATE PROPERTY file_path: std::str;
      CREATE PROPERTY file_size: std::int64;
      CREATE PROPERTY is_approved := ((.review_status = default::ApprovalStatus.Approved));
      CREATE PROPERTY is_required: std::bool {
          SET default := true;
      };
      CREATE PROPERTY is_signed: std::bool {
          SET default := false;
      };
      CREATE PROPERTY is_submitted: std::bool {
          SET default := false;
      };
      CREATE PROPERTY needs_review := ((.is_submitted AND (.review_status = default::ApprovalStatus.Pending)));
      CREATE PROPERTY mime_type: std::str;
      CREATE PROPERTY requires_signature: std::bool {
          SET default := false;
      };
      CREATE PROPERTY review_date: std::datetime;
      CREATE PROPERTY review_notes: std::str;
      CREATE PROPERTY signature_date: std::datetime;
      CREATE PROPERTY submission_date: std::datetime;
  };
  CREATE TYPE onboarding_offboarding::OnboardingProcess EXTENDING default::Auditable {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE CONSTRAINT std::exclusive ON (.employee);
      CREATE PROPERTY expected_completion_date: std::cal::local_date;
      CREATE INDEX ON (.expected_completion_date);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.employee);
      CREATE LINK assigned_buddy: rbac::User;
      CREATE LINK assigned_hr: rbac::User;
      CREATE LINK assigned_manager: rbac::User;
      CREATE PROPERTY actual_completion_date: std::cal::local_date;
      CREATE PROPERTY current_step: std::int32 {
          SET default := 1;
      };
      CREATE PROPERTY is_completed := ((.status = default::ApprovalStatus.Approved));
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY progress_percentage: std::decimal {
          SET default := 0;
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 0) AND (__subject__ <= 100)));
      };
      CREATE PROPERTY start_date: std::cal::local_date;
  };
  CREATE TYPE onboarding_offboarding::OnboardingStep EXTENDING default::Auditable {
      CREATE REQUIRED LINK process: onboarding_offboarding::OnboardingProcess;
      CREATE REQUIRED PROPERTY step_number: std::int32;
      CREATE CONSTRAINT std::exclusive ON ((.process, .step_number));
      CREATE INDEX ON (.process);
      CREATE PROPERTY due_date: std::cal::local_date;
      CREATE INDEX ON (.due_date);
      CREATE LINK assigned_to: rbac::User;
      CREATE INDEX ON (.assigned_to);
      CREATE PROPERTY status: default::TaskStatus {
          SET default := (default::TaskStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE LINK approved_by: rbac::User;
      CREATE LINK completed_by: rbac::User;
      CREATE PROPERTY actual_hours: std::decimal;
      CREATE PROPERTY approval_date: std::datetime;
      CREATE PROPERTY can_complete := ((.status IN {default::TaskStatus.Pending, default::TaskStatus.InProgress}));
      CREATE PROPERTY completion_date: std::cal::local_date;
      CREATE PROPERTY completion_notes: std::str;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY estimated_hours: std::decimal;
      CREATE PROPERTY is_completed := ((.status = default::TaskStatus.Completed));
      CREATE PROPERTY is_required: std::bool {
          SET default := true;
      };
      CREATE PROPERTY requires_approval: std::bool {
          SET default := false;
      };
      CREATE PROPERTY step_type: std::str;
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE onboarding_offboarding::OnboardingTemplate EXTENDING default::Auditable {
      CREATE PROPERTY target_role: std::str;
      CREATE INDEX ON (.target_role);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY assigned_buddy_role: std::str;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY duration_days: std::int32 {
          SET default := 30;
      };
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE PROPERTY required_documents: std::json;
      CREATE PROPERTY template_steps: std::json;
      CREATE PROPERTY step_count := (std::len(<array<std::json>>.template_steps));
      CREATE PROPERTY target_department: std::str;
  };
  CREATE TYPE portal_communication::ActivityLog EXTENDING default::Auditable {
      CREATE PROPERTY ip_address: std::str;
      CREATE INDEX ON (.ip_address);
      CREATE INDEX ON (.created_at);
      CREATE REQUIRED PROPERTY action_type: std::str;
      CREATE INDEX ON (.action_type);
      CREATE PROPERTY entity_type: std::str;
      CREATE INDEX ON (.entity_type);
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE PROPERTY action_date := (std::cal::to_local_date(.created_at, 'UTC'));
      CREATE PROPERTY is_data_modification := ((.action_type IN {'create', 'update', 'delete'}));
      CREATE PROPERTY is_security_event := ((.action_type IN {'login', 'logout', 'failed_login', 'password_change', 'permission_change'}));
      CREATE REQUIRED PROPERTY description: std::str;
      CREATE PROPERTY details: std::json;
      CREATE PROPERTY entity_id: std::uuid;
      CREATE PROPERTY error_message: std::str;
      CREATE PROPERTY session_id: std::str;
      CREATE PROPERTY success: std::bool {
          SET default := true;
      };
      CREATE PROPERTY user_agent: std::str;
  };
  CREATE TYPE portal_communication::Announcement EXTENDING default::Auditable {
      CREATE PROPERTY priority: std::str {
          SET default := 'normal';
      };
      CREATE INDEX ON (.priority);
      CREATE PROPERTY announcement_type: std::str {
          SET default := 'general';
      };
      CREATE INDEX ON (.announcement_type);
      CREATE PROPERTY is_pinned: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_pinned);
      CREATE PROPERTY publish_date: std::datetime;
      CREATE INDEX ON (.publish_date);
      CREATE PROPERTY is_published: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_published);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY attachments: std::json;
      CREATE REQUIRED PROPERTY content: std::str;
      CREATE PROPERTY expiry_date: std::datetime;
      CREATE PROPERTY tags: array<std::str>;
      CREATE PROPERTY target_audience: std::json;
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE PROPERTY view_count: std::int32 {
          SET default := 0;
      };
  };
  CREATE TYPE portal_communication::CompanyEvent EXTENDING default::Auditable {
      CREATE PROPERTY status: std::str {
          SET default := 'scheduled';
      };
      CREATE INDEX ON (.status);
      CREATE PROPERTY event_type: std::str;
      CREATE INDEX ON (.event_type);
      CREATE PROPERTY is_public: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_public);
      CREATE REQUIRED PROPERTY event_date: std::datetime;
      CREATE INDEX ON (.event_date);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY max_attendees: std::int32;
      CREATE PROPERTY budget: std::decimal;
      CREATE PROPERTY cost_per_person: std::decimal;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY end_date: std::datetime;
      CREATE PROPERTY is_virtual: std::bool {
          SET default := false;
      };
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY recurring_pattern: std::str;
      CREATE PROPERTY registration_deadline: std::datetime;
      CREATE PROPERTY registration_required: std::bool {
          SET default := false;
      };
      CREATE PROPERTY tags: array<std::str>;
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE PROPERTY virtual_link: std::str;
  };
  CREATE TYPE portal_communication::EventInvitation EXTENDING default::Auditable {
      CREATE REQUIRED LINK event: portal_communication::CompanyEvent;
      CREATE REQUIRED LINK invited_employee: rbac::User;
      CREATE CONSTRAINT std::exclusive ON ((.event, .invited_employee));
      CREATE INDEX ON (.event);
      CREATE INDEX ON (.invited_employee);
      CREATE LINK invited_by: rbac::User;
      CREATE PROPERTY custom_message: std::str;
      CREATE PROPERTY invitation_method: std::str {
          SET default := 'email';
      };
      CREATE PROPERTY invitation_sent_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY is_required: std::bool {
          SET default := false;
      };
  };
  CREATE TYPE portal_communication::EventRSVP EXTENDING default::Auditable {
      CREATE REQUIRED LINK event: portal_communication::CompanyEvent;
      CREATE REQUIRED PROPERTY status: std::str;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE CONSTRAINT std::exclusive ON ((.employee, .event));
      CREATE INDEX ON (.event);
      CREATE INDEX ON (.status);
      CREATE INDEX ON (.employee);
      CREATE PROPERTY dietary_restrictions: std::str;
      CREATE PROPERTY emergency_contact: std::str;
      CREATE PROPERTY is_attending := ((.status = 'attending'));
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY plus_one: std::bool {
          SET default := false;
      };
      CREATE PROPERTY response_date: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE portal_communication::Form EXTENDING default::Auditable {
      CREATE LINK created_by: rbac::User;
      CREATE INDEX ON (.created_by);
      CREATE PROPERTY is_public: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_public);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE PROPERTY auto_approve: std::bool {
          SET default := false;
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY end_date: std::datetime;
      CREATE REQUIRED PROPERTY form_schema: std::json;
      CREATE PROPERTY notification_emails: array<std::str>;
      CREATE PROPERTY requires_authentication: std::bool {
          SET default := true;
      };
      CREATE PROPERTY start_date: std::datetime;
      CREATE PROPERTY submission_limit: std::int32;
      CREATE PROPERTY target_audience: std::json;
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE portal_communication::FormSubmission EXTENDING default::Auditable {
      CREATE REQUIRED LINK form: portal_communication::Form;
      CREATE INDEX ON (.form);
      CREATE PROPERTY status: default::ApprovalStatus {
          SET default := (default::ApprovalStatus.Pending);
      };
      CREATE INDEX ON (.status);
      CREATE LINK submitted_by: rbac::User;
      CREATE INDEX ON (.submitted_by);
      CREATE PROPERTY submission_id: std::str {
          SET default := (<std::str>std::uuid_generate_v4());
      };
      CREATE INDEX ON (.submission_id);
      CREATE LINK reviewed_by: rbac::User;
      CREATE PROPERTY submitter_name := ((.submitted_by.full_name ?? 'Anonymous'));
      CREATE PROPERTY is_complete: std::bool {
          SET default := true;
      };
      CREATE PROPERTY is_pending := ((.status = default::ApprovalStatus.Pending));
      CREATE PROPERTY review_notes: std::str;
      CREATE PROPERTY reviewed_at: std::datetime;
      CREATE REQUIRED PROPERTY submission_data: std::json;
      CREATE PROPERTY submission_ip: std::str;
      CREATE PROPERTY user_agent: std::str;
  };
  CREATE TYPE portal_communication::Notification EXTENDING default::Auditable {
      CREATE PROPERTY priority: std::int32 {
          SET default := 5;
          CREATE CONSTRAINT std::expression ON (((__subject__ >= 1) AND (__subject__ <= 10)));
      };
      CREATE INDEX ON (.priority);
      CREATE PROPERTY is_read: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_read);
      CREATE PROPERTY notification_type: default::NotificationType {
          SET default := (default::NotificationType.Info);
      };
      CREATE INDEX ON (.notification_type);
      CREATE INDEX ON (.created_at);
      CREATE LINK employee: rbac::User;
      CREATE INDEX ON (.employee);
      CREATE PROPERTY action_text: std::str;
      CREATE PROPERTY action_url: std::str;
      CREATE PROPERTY expires_at: std::datetime;
      CREATE PROPERTY is_dismissible: std::bool {
          SET default := true;
      };
      CREATE PROPERTY is_high_priority := ((.priority >= 8));
      CREATE PROPERTY is_unread := (NOT (.is_read));
      CREATE REQUIRED PROPERTY message: std::str;
      CREATE PROPERTY read_at: std::datetime;
      CREATE PROPERTY related_entity_id: std::uuid;
      CREATE PROPERTY related_entity_type: std::str;
  };
  ALTER TYPE rbac::User {
      CREATE PROPERTY contact_email := (SELECT
          .<employee[IS default::ContactInformation].email 
      LIMIT
          1
      );
      CREATE PROPERTY phone_number := (SELECT
          .<employee[IS default::ContactInformation].phone_number 
      LIMIT
          1
      );
      CREATE PROPERTY department_name := (SELECT
          .<employee[IS default::JobInformation].department.name 
      LIMIT
          1
      );
      CREATE PROPERTY employment_type := (SELECT
          .<employee[IS default::JobInformation].employment_type 
      LIMIT
          1
      );
      CREATE PROPERTY hire_date := (SELECT
          .<employee[IS default::JobInformation].hire_date 
      LIMIT
          1
      );
      CREATE PROPERTY job_title := (SELECT
          .<employee[IS default::JobInformation].job_title 
      LIMIT
          1
      );
  };
  ALTER TYPE default::Department {
      CREATE PROPERTY active_employee_count := (std::count(.<department[IS default::JobInformation].employee FILTER
          (.onboarding_status = default::OnboardingStatus.Active)
      ));
      CREATE PROPERTY employee_count := (std::count(.<department[IS default::JobInformation].employee));
      CREATE PROPERTY budget_per_employee := (((.budget / std::max({.employee_count, 1})) IF EXISTS (.budget) ELSE <std::decimal>0));
  };
  CREATE TYPE performance::PerformanceMetric {
      CREATE LINK department: default::Department;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE PROPERTY context: std::json;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY metric_name: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY metric_type: std::str;
      CREATE PROPERTY metric_unit: std::str;
      CREATE REQUIRED PROPERTY metric_value: std::float32;
      CREATE PROPERTY period_end: std::datetime;
      CREATE PROPERTY period_start: std::datetime;
  };
  CREATE TYPE performance::ReviewTemplate {
      CREATE MULTI LINK departments: default::Department;
      CREATE MULTI LINK roles: default::Role;
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY is_default: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY review_type: performance::ReviewType {
          SET default := (performance::ReviewType.Annual);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY version: std::int32 {
          SET default := 1;
      };
  };
  ALTER TYPE hr_workflows::Leave {
      CREATE REQUIRED LINK leave_balance: hr_workflows::LeaveBalance;
      CREATE INDEX ON (.leave_balance);
  };
  ALTER TYPE onboarding_offboarding::ExitInterview {
      CREATE REQUIRED LINK offboarding: onboarding_offboarding::OffboardingProcess;
      CREATE CONSTRAINT std::exclusive ON (.offboarding);
  };
  ALTER TYPE onboarding_offboarding::OnboardingDocument {
      CREATE REQUIRED LINK process: onboarding_offboarding::OnboardingProcess;
      CREATE INDEX ON (.process);
  };
  ALTER TYPE onboarding_offboarding::OnboardingProcess {
      CREATE REQUIRED LINK template: onboarding_offboarding::OnboardingTemplate;
  };
  ALTER TYPE onboarding_offboarding::OnboardingTemplate {
      CREATE PROPERTY processes_created := (std::count(.<template[IS onboarding_offboarding::OnboardingProcess]));
  };
  CREATE TYPE payroll::CompensationChange {
      CREATE PROPERTY approved_by_id: std::uuid;
      CREATE PROPERTY approved_date: std::datetime;
      CREATE REQUIRED PROPERTY change_type: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY created_by_id: std::uuid;
      CREATE REQUIRED PROPERTY effective_date: std::datetime;
      CREATE PROPERTY end_date: std::datetime;
      CREATE PROPERTY market_adjustment_percent: std::float32;
      CREATE PROPERTY merit_increase_percent: std::float32;
      CREATE PROPERTY new_base_salary: std::int32;
      CREATE PROPERTY new_department: std::str;
      CREATE PROPERTY new_hourly_rate: std::float32;
      CREATE PROPERTY new_manager_id: std::uuid;
      CREATE PROPERTY new_pay_type: payroll::PayType;
      CREATE PROPERTY new_salary_band_id: std::uuid;
      CREATE PROPERTY new_title: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY performance_rating: std::str;
      CREATE PROPERTY previous_base_salary: std::int32;
      CREATE PROPERTY previous_department: std::str;
      CREATE PROPERTY previous_hourly_rate: std::float32;
      CREATE PROPERTY previous_manager_id: std::uuid;
      CREATE PROPERTY previous_pay_type: payroll::PayType;
      CREATE PROPERTY previous_salary_band_id: std::uuid;
      CREATE PROPERTY previous_title: std::str;
      CREATE REQUIRED PROPERTY reason: std::str;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE payroll::PayrollEmployee {
      CREATE PROPERTY account_number: std::str;
      CREATE PROPERTY account_type: std::str;
      CREATE PROPERTY additional_federal_withholding: std::float32;
      CREATE PROPERTY additional_state_withholding: std::float32;
      CREATE PROPERTY annual_salary: std::int32;
      CREATE PROPERTY bank_name: std::str;
      CREATE REQUIRED PROPERTY base_salary: std::int32;
      CREATE PROPERTY commission_rate: std::float32;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY dental_insurance_deduction: std::float32;
      CREATE REQUIRED PROPERTY employee_id: std::uuid {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY end_date: std::datetime;
      CREATE PROPERTY exempt_federal: std::bool {
          SET default := false;
      };
      CREATE PROPERTY exempt_state: std::bool {
          SET default := false;
      };
      CREATE PROPERTY federal_allowances: std::int32;
      CREATE PROPERTY health_insurance_deduction: std::float32;
      CREATE PROPERTY hourly_rate: std::float32;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY overtime_rate: std::float32;
      CREATE PROPERTY pay_day: std::int32;
      CREATE REQUIRED PROPERTY pay_period_type: payroll::PayPeriodType;
      CREATE REQUIRED PROPERTY pay_type: payroll::PayType;
      CREATE PROPERTY retirement_contribution_amount: std::float32;
      CREATE PROPERTY retirement_contribution_percent: std::float32;
      CREATE PROPERTY routing_number: std::str;
      CREATE PROPERTY start_date: std::datetime;
      CREATE PROPERTY state_allowances: std::int32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY vision_insurance_deduction: std::float32;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE REQUIRED LINK payroll_employee: payroll::PayrollEmployee;
  };
  ALTER TYPE payroll::PayrollEmployee {
      CREATE MULTI LINK compensation_changes := (.<payroll_employee[IS payroll::CompensationChange]);
  };
  CREATE TYPE payroll::PayPeriod {
      CREATE LINK payroll_employee: payroll::PayrollEmployee;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY finalized_by_id: std::uuid;
      CREATE PROPERTY finalized_date: std::datetime;
      CREATE PROPERTY has_adjustments: std::bool {
          SET default := false;
      };
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY paid_date: std::datetime;
      CREATE REQUIRED PROPERTY pay_date: std::datetime;
      CREATE REQUIRED PROPERTY pay_period_type: payroll::PayPeriodType;
      CREATE REQUIRED PROPERTY period_end: std::datetime;
      CREATE PROPERTY period_number: std::int32;
      CREATE REQUIRED PROPERTY period_start: std::datetime;
      CREATE PROPERTY processed_by_id: std::uuid;
      CREATE PROPERTY processed_date: std::datetime;
      CREATE PROPERTY quarter: std::int32;
      CREATE REQUIRED PROPERTY status: payroll::PayPeriodStatus {
          SET default := (payroll::PayPeriodStatus.Draft);
      };
      CREATE PROPERTY total_deductions: std::float32;
      CREATE PROPERTY total_employees: std::int32;
      CREATE PROPERTY total_gross_pay: std::float32;
      CREATE PROPERTY total_net_pay: std::float32;
      CREATE PROPERTY total_taxes: std::float32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY year: std::int32;
  };
  ALTER TYPE payroll::PayrollEmployee {
      CREATE MULTI LINK pay_periods := (.<payroll_employee[IS payroll::PayPeriod]);
  };
  CREATE TYPE payroll::Paystub {
      CREATE REQUIRED LINK pay_period: payroll::PayPeriod;
      CREATE REQUIRED LINK payroll_employee: payroll::PayrollEmployee;
      CREATE CONSTRAINT std::exclusive ON ((.payroll_employee, .pay_period));
      CREATE PROPERTY adjustments: std::json;
      CREATE PROPERTY bonus_amount: std::float32;
      CREATE PROPERTY check_amount: std::float32;
      CREATE PROPERTY commission_amount: std::float32;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY delivered_date: std::datetime;
      CREATE PROPERTY dental_insurance: std::float32;
      CREATE PROPERTY direct_deposit_amount: std::float32;
      CREATE PROPERTY federal_income_tax: std::float32;
      CREATE PROPERTY garnishments: std::float32;
      CREATE PROPERTY generated_date: std::datetime;
      CREATE REQUIRED PROPERTY gross_pay: std::float32;
      CREATE PROPERTY health_insurance: std::float32;
      CREATE PROPERTY holiday_hours: std::float32;
      CREATE PROPERTY holiday_pay: std::float32;
      CREATE PROPERTY is_direct_deposit: std::bool {
          SET default := true;
      };
      CREATE PROPERTY local_income_tax: std::float32;
      CREATE PROPERTY medicare_tax: std::float32;
      CREATE PROPERTY memo: std::str;
      CREATE REQUIRED PROPERTY net_pay: std::float32;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY other_deductions: std::float32;
      CREATE PROPERTY other_earnings: std::float32;
      CREATE PROPERTY overtime_hours: std::float32;
      CREATE PROPERTY overtime_pay: std::float32;
      CREATE PROPERTY paystub_pdf_url: std::str;
      CREATE PROPERTY regular_hours: std::float32;
      CREATE PROPERTY regular_pay: std::float32;
      CREATE PROPERTY retirement_contribution: std::float32;
      CREATE PROPERTY sick_hours: std::float32;
      CREATE PROPERTY sick_pay: std::float32;
      CREATE PROPERTY social_security_tax: std::float32;
      CREATE PROPERTY state_income_tax: std::float32;
      CREATE REQUIRED PROPERTY status: payroll::PaystubStatus {
          SET default := (payroll::PaystubStatus.Draft);
      };
      CREATE PROPERTY total_deductions: std::float32;
      CREATE PROPERTY total_taxes: std::float32;
      CREATE PROPERTY unemployment_tax: std::float32;
      CREATE PROPERTY union_dues: std::float32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY vacation_hours: std::float32;
      CREATE PROPERTY vacation_pay: std::float32;
      CREATE PROPERTY viewed_date: std::datetime;
      CREATE PROPERTY vision_insurance: std::float32;
      CREATE PROPERTY ytd_deductions: std::float32;
      CREATE PROPERTY ytd_gross_pay: std::float32;
      CREATE PROPERTY ytd_net_pay: std::float32;
      CREATE PROPERTY ytd_taxes: std::float32;
  };
  ALTER TYPE payroll::PayPeriod {
      CREATE MULTI LINK paystubs := (.<pay_period[IS payroll::Paystub]);
  };
  CREATE TYPE payroll::PayrollRun {
      CREATE REQUIRED LINK pay_period: payroll::PayPeriod;
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY approved_by_id: std::uuid;
      CREATE PROPERTY completed_at: std::datetime;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY employees_failed: std::int32;
      CREATE PROPERTY employees_processed: std::int32;
      CREATE PROPERTY errors: std::json;
      CREATE PROPERTY finalized_at: std::datetime;
      CREATE PROPERTY finalized_by_id: std::uuid;
      CREATE PROPERTY processing_log: std::str;
      CREATE PROPERTY processing_time_seconds: std::int32;
      CREATE PROPERTY requires_approval: std::bool {
          SET default := true;
      };
      CREATE REQUIRED PROPERTY run_date: std::datetime;
      CREATE PROPERTY started_at: std::datetime;
      CREATE PROPERTY started_by_id: std::uuid;
      CREATE REQUIRED PROPERTY status: std::str;
      CREATE PROPERTY total_deductions: std::float32;
      CREATE PROPERTY total_gross_pay: std::float32;
      CREATE PROPERTY total_net_pay: std::float32;
      CREATE PROPERTY total_taxes: std::float32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY warnings: std::json;
  };
  ALTER TYPE payroll::PayrollEmployee {
      CREATE MULTI LINK paystubs := (.<payroll_employee[IS payroll::Paystub]);
  };
  CREATE TYPE payroll::SalaryBand {
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY currency: std::str {
          SET default := 'USD';
      };
      CREATE PROPERTY department: std::str;
      CREATE PROPERTY experience_level: std::str;
      CREATE PROPERTY grade_level: std::int32;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY location: std::str;
      CREATE REQUIRED PROPERTY max_salary: std::int32;
      CREATE REQUIRED PROPERTY min_salary: std::int32;
      CREATE PROPERTY notes: std::str;
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE payroll::PayrollEmployee {
      CREATE LINK salary_band: payroll::SalaryBand;
  };
  ALTER TYPE payroll::SalaryBand {
      CREATE MULTI LINK employees := (.<salary_band[IS payroll::PayrollEmployee]);
  };
  CREATE TYPE payroll::TaxRate {
      CREATE PROPERTY filing_status: std::str;
      CREATE REQUIRED PROPERTY jurisdiction: std::str;
      CREATE PROPERTY pay_frequency: std::str;
      CREATE REQUIRED PROPERTY tax_type: payroll::TaxType;
      CREATE REQUIRED PROPERTY year: std::int32;
      CREATE CONSTRAINT std::exclusive ON ((.tax_type, .jurisdiction, .year, .filing_status, .pay_frequency));
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY flat_amount: std::float32;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY max_income: std::float32;
      CREATE PROPERTY min_income: std::float32;
      CREATE REQUIRED PROPERTY rate_percent: std::float32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE performance::DevelopmentActivity {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE PROPERTY activity_type: std::str;
      CREATE PROPERTY certification_earned: std::str;
      CREATE PROPERTY completion_date: std::datetime;
      CREATE PROPERTY cost: std::float32;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY duration_hours: std::int32;
      CREATE PROPERTY learning_outcomes: std::str;
      CREATE PROPERTY status: performance::GoalStatus {
          SET default := (performance::GoalStatus.NotStarted);
      };
      CREATE REQUIRED PROPERTY title: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE performance::DevelopmentPlan {
      CREATE MULTI LINK activities: performance::DevelopmentActivity;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE LINK manager: rbac::User;
      CREATE LINK mentor: rbac::User;
      CREATE PROPERTY budget_allocated: std::float32;
      CREATE PROPERTY budget_used: std::float32;
      CREATE PROPERTY completion_date: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY learning_resources: std::json;
      CREATE PROPERTY skills_to_develop: array<std::str>;
      CREATE PROPERTY status: performance::GoalStatus {
          SET default := (performance::GoalStatus.NotStarted);
      };
      CREATE REQUIRED PROPERTY target_date: std::datetime;
      CREATE REQUIRED PROPERTY title: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE performance::DevelopmentActivity {
      CREATE REQUIRED LINK plan: performance::DevelopmentPlan;
  };
  CREATE TYPE performance::Feedback {
      CREATE LINK giver: rbac::User;
      CREATE REQUIRED LINK recipient: rbac::User;
      CREATE REQUIRED PROPERTY content: std::str;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY feedback_type: performance::FeedbackType {
          SET default := (performance::FeedbackType.Continuous);
      };
      CREATE PROPERTY is_anonymous: std::bool {
          SET default := false;
      };
      CREATE PROPERTY is_public: std::bool {
          SET default := false;
      };
      CREATE PROPERTY rating: std::int32 {
          CREATE CONSTRAINT std::max_value(5);
          CREATE CONSTRAINT std::min_value(1);
      };
      CREATE PROPERTY tags: array<std::str>;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE performance::PerformanceGoal {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE LINK manager: rbac::User;
      CREATE PROPERTY completion_date: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_smart_goal: std::bool {
          SET default := false;
      };
      CREATE PROPERTY measurable_criteria: std::str;
      CREATE PROPERTY progress_percentage: std::int32 {
          SET default := 0;
          CREATE CONSTRAINT std::max_value(100);
          CREATE CONSTRAINT std::min_value(0);
      };
      CREATE PROPERTY status: performance::GoalStatus {
          SET default := (performance::GoalStatus.NotStarted);
      };
      CREATE PROPERTY success_metrics: std::json;
      CREATE PROPERTY target_date: std::datetime;
      CREATE REQUIRED PROPERTY title: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY weight: std::float32 {
          SET default := 1.0;
      };
  };
  ALTER TYPE performance::Feedback {
      CREATE LINK related_goal: performance::PerformanceGoal;
  };
  CREATE TYPE performance::PerformanceReview {
      CREATE MULTI LINK goals: performance::PerformanceGoal;
      CREATE LINK created_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE LINK reviewer: rbac::User;
      CREATE REQUIRED LINK template: performance::ReviewTemplate;
      CREATE PROPERTY completion_date: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY due_date: std::datetime;
      CREATE PROPERTY employee_comments: std::str;
      CREATE PROPERTY manager_comments: std::str;
      CREATE PROPERTY manager_review_complete: std::bool {
          SET default := false;
      };
      CREATE PROPERTY overall_score: std::float32;
      CREATE REQUIRED PROPERTY review_period_end: std::datetime;
      CREATE REQUIRED PROPERTY review_period_start: std::datetime;
      CREATE PROPERTY self_assessment_complete: std::bool {
          SET default := false;
      };
      CREATE PROPERTY status: performance::ReviewStatus {
          SET default := (performance::ReviewStatus.Draft);
      };
      CREATE PROPERTY submit_date: std::datetime;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE performance::Feedback {
      CREATE LINK related_review: performance::PerformanceReview;
  };
  CREATE TYPE performance::GoalProgressUpdate {
      CREATE REQUIRED LINK goal: performance::PerformanceGoal;
      CREATE REQUIRED LINK updated_by: rbac::User;
      CREATE PROPERTY challenges: std::str;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY is_milestone: std::bool {
          SET default := false;
      };
      CREATE PROPERTY next_steps: std::str;
      CREATE PROPERTY progress_percentage: std::int32 {
          CREATE CONSTRAINT std::max_value(100);
          CREATE CONSTRAINT std::min_value(0);
      };
      CREATE REQUIRED PROPERTY update_text: std::str;
  };
  ALTER TYPE performance::PerformanceGoal {
      CREATE MULTI LINK progress_updates: performance::GoalProgressUpdate;
      CREATE LINK review: performance::PerformanceReview;
  };
  ALTER TYPE performance::PerformanceMetric {
      CREATE LINK review: performance::PerformanceReview;
  };
  CREATE TYPE performance::ReviewResponse {
      CREATE REQUIRED LINK review: performance::PerformanceReview;
      CREATE LINK responder: rbac::User;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY is_complete: std::bool {
          SET default := false;
      };
      CREATE PROPERTY json_value: std::json;
      CREATE PROPERTY numeric_value: std::float32;
      CREATE PROPERTY score: std::float32;
      CREATE PROPERTY text_value: std::str;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE performance::PerformanceReview {
      CREATE MULTI LINK responses: performance::ReviewResponse;
  };
  CREATE TYPE performance::ReviewQuestion {
      CREATE PROPERTY config: std::json;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_required: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY order_index: std::int32;
      CREATE REQUIRED PROPERTY question_type: performance::QuestionType;
      CREATE REQUIRED PROPERTY title: std::str {
          CREATE CONSTRAINT std::max_len_value(500);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE performance::ReviewTemplateSection {
      CREATE MULTI LINK questions: performance::ReviewQuestion;
      CREATE REQUIRED LINK template: performance::ReviewTemplate;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_required: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY order_index: std::int32;
      CREATE REQUIRED PROPERTY title: std::str {
          CREATE CONSTRAINT std::max_len_value(255);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY weight: std::float32 {
          SET default := 1.0;
      };
  };
  ALTER TYPE performance::ReviewQuestion {
      CREATE REQUIRED LINK section: performance::ReviewTemplateSection;
  };
  ALTER TYPE performance::ReviewResponse {
      CREATE REQUIRED LINK question: performance::ReviewQuestion;
  };
  ALTER TYPE performance::ReviewTemplate {
      CREATE MULTI LINK sections: performance::ReviewTemplateSection;
  };
  ALTER TYPE portal_communication::CompanyEvent {
      CREATE PROPERTY attendee_count := (std::count(.<event[IS portal_communication::EventRSVP] FILTER
          (.status = 'attending')
      ));
      CREATE PROPERTY spots_available := ((((.max_attendees ?? 0) - .attendee_count) IF EXISTS (.max_attendees) ELSE <std::int32>999999));
  };
  ALTER TYPE portal_communication::Form {
      CREATE PROPERTY submission_count := (std::count(.<form[IS portal_communication::FormSubmission]));
  };
  CREATE TYPE rbac::Permission EXTENDING rbac::Auditable {
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.name);
      CREATE PROPERTY action: std::str;
      CREATE PROPERTY resource: std::str;
      CREATE INDEX ON ((.resource, .action));
      CREATE PROPERTY is_system: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_system);
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY display_name: std::str;
      CREATE PROPERTY scope: std::str;
  };
  CREATE TYPE rbac::Role EXTENDING rbac::Auditable {
      CREATE REQUIRED PROPERTY name: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE INDEX ON (.name);
      CREATE PROPERTY is_system: std::bool {
          SET default := false;
      };
      CREATE INDEX ON (.is_system);
      CREATE PROPERTY level: std::int16 {
          SET default := 0;
      };
      CREATE INDEX ON (.level);
      CREATE LINK parent_role: rbac::Role;
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY display_name: std::str;
  };
  CREATE TYPE rbac::RolePermission EXTENDING rbac::Auditable {
      CREATE REQUIRED LINK permission: rbac::Permission {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED LINK role: rbac::Role {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE CONSTRAINT std::exclusive ON ((.role, .permission));
      CREATE INDEX ON (.permission);
      CREATE INDEX ON (.role);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK granted_by: rbac::User;
  };
  CREATE TYPE rbac::UserRole EXTENDING rbac::Auditable {
      CREATE REQUIRED LINK role: rbac::Role {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED LINK user: rbac::User {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE CONSTRAINT std::exclusive ON ((.user, .role));
      CREATE INDEX ON (.role);
      CREATE INDEX ON (.user);
      CREATE LINK granted_by: rbac::User;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE PROPERTY expires_at: std::datetime;
  };
  ALTER TYPE rbac::Permission {
      CREATE PROPERTY role_count := (std::count(.<permission[IS rbac::RolePermission]));
  };
  ALTER TYPE rbac::Role {
      CREATE PROPERTY permission_count := (std::count(.<role[IS rbac::RolePermission]));
      CREATE PROPERTY user_count := (std::count(.<role[IS rbac::UserRole]));
  };
  CREATE TYPE time_attendance::AttendanceRecord {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE REQUIRED PROPERTY attendance_date: std::datetime;
      CREATE CONSTRAINT std::exclusive ON ((.employee, .attendance_date));
      CREATE PROPERTY early_departure_minutes: std::int32 {
          SET default := 0;
      };
      CREATE PROPERTY late_minutes: std::int32 {
          SET default := 0;
      };
      CREATE PROPERTY attendance_score := (((100 - (.late_minutes * 0.5)) - (.early_departure_minutes * 0.5)));
      CREATE PROPERTY break_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY clock_in_time: std::datetime;
      CREATE PROPERTY clock_out_time: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY is_early_departure := ((.early_departure_minutes > 0));
      CREATE PROPERTY is_late := ((.late_minutes > 0));
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY overtime_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY scheduled_end: std::datetime;
      CREATE PROPERTY scheduled_start: std::datetime;
      CREATE REQUIRED PROPERTY status: time_attendance::AttendanceStatus;
      CREATE PROPERTY total_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::TimeOffBalance {
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE REQUIRED PROPERTY accrual_year: std::int32;
      CREATE REQUIRED PROPERTY time_off_type: time_attendance::TimeOffType;
      CREATE CONSTRAINT std::exclusive ON ((.employee, .time_off_type, .accrual_year));
      CREATE PROPERTY accrual_rate: std::float32;
      CREATE PROPERTY allocated_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY carryover_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY pending_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY used_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY available_hours := ((((.allocated_hours + .carryover_hours) - .used_hours) - .pending_hours));
      CREATE PROPERTY utilization_percentage := (((.used_hours / (.allocated_hours + .carryover_hours)) * 100));
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY expires_at: std::datetime;
      CREATE PROPERTY max_balance: std::float32;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::TimeEntry {
      CREATE LINK approved_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY entry_type: time_attendance::TimeEntryType;
      CREATE REQUIRED PROPERTY timestamp: std::datetime;
      CREATE PROPERTY formatted_timestamp := (std::to_str(.timestamp, 'YYYY-MM-DD HH24:MI:SS'));
      CREATE PROPERTY ip_address: std::str;
      CREATE PROPERTY is_manual: std::bool {
          SET default := false;
      };
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY manual_reason: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::TimeOffRequest {
      CREATE LINK approved_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE LINK requested_by: rbac::User;
      CREATE LINK reviewed_by: rbac::User;
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY days_requested: std::float32;
      CREATE PROPERTY denied_reason: std::str;
      CREATE PROPERTY documentation_received: std::bool {
          SET default := false;
      };
      CREATE PROPERTY documentation_required: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY end_date: std::datetime;
      CREATE REQUIRED PROPERTY start_date: std::datetime;
      CREATE PROPERTY duration_days := ((std::duration_to_seconds((.end_date - .start_date)) / 86400));
      CREATE PROPERTY employee_notes: std::str;
      CREATE PROPERTY is_paid: std::bool {
          SET default := true;
      };
      CREATE PROPERTY manager_notes: std::str;
      CREATE PROPERTY reason: std::str;
      CREATE PROPERTY requested_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY reviewed_at: std::datetime;
      CREATE REQUIRED PROPERTY status: time_attendance::TimeOffStatus {
          SET default := (time_attendance::TimeOffStatus.Pending);
      };
      CREATE REQUIRED PROPERTY time_off_type: time_attendance::TimeOffType;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::Timesheet {
      CREATE LINK approved_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE LINK reviewed_by: rbac::User;
      CREATE LINK submitted_by: rbac::User;
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY employee_notes: std::str;
      CREATE PROPERTY manager_notes: std::str;
      CREATE REQUIRED PROPERTY period_end: std::datetime;
      CREATE REQUIRED PROPERTY period_start: std::datetime;
      CREATE PROPERTY period_days := ((std::duration_to_seconds((.period_end - .period_start)) / 86400));
      CREATE PROPERTY reviewed_at: std::datetime;
      CREATE REQUIRED PROPERTY status: time_attendance::TimesheetStatus {
          SET default := (time_attendance::TimesheetStatus.Draft);
      };
      CREATE PROPERTY submitted_at: std::datetime;
      CREATE PROPERTY total_break_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY total_overtime_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY total_regular_hours: std::float32 {
          SET default := 0.0;
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::WorkSession {
      CREATE LINK approved_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE MULTI LINK time_entries: time_attendance::TimeEntry {
          ON TARGET DELETE ALLOW;
      };
      CREATE PROPERTY approved_at: std::datetime;
      CREATE PROPERTY break_duration: std::duration;
      CREATE PROPERTY end_time: std::datetime;
      CREATE PROPERTY lunch_duration: std::duration;
      CREATE REQUIRED PROPERTY start_time: std::datetime;
      CREATE PROPERTY effective_work_time := ((((.end_time - .start_time) - .break_duration) - .lunch_duration));
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY duration := ((.end_time - .start_time));
      CREATE PROPERTY is_approved: std::bool {
          SET default := false;
      };
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY overtime_hours: std::float32;
      CREATE PROPERTY overtime_type: time_attendance::OvertimeType;
      CREATE PROPERTY work_date := (std::to_str(.start_time, 'YYYY-MM-DD'));
      CREATE PROPERTY total_hours: std::float32;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::EmployeeSchedule {
      CREATE LINK assigned_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY effective_date: std::datetime;
      CREATE PROPERTY end_date: std::datetime;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::OvertimePolicy {
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY daily_threshold: std::float32 {
          SET default := 8.0;
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY double_time_multiplier: std::float32 {
          SET default := 2.0;
      };
      CREATE PROPERTY double_time_threshold: std::float32;
      CREATE PROPERTY effective_date: std::datetime;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE PROPERTY premium_multiplier: std::float32 {
          SET default := 1.5;
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY weekly_threshold: std::float32 {
          SET default := 40.0;
      };
  };
  CREATE TYPE time_attendance::ScheduleTemplate {
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY friday_end: std::str;
      CREATE PROPERTY friday_start: std::str;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE PROPERTY weekly_hours: std::float32;
      CREATE PROPERTY is_full_time := ((.weekly_hours >= 40.0));
      CREATE PROPERTY is_part_time := ((.weekly_hours < 40.0));
      CREATE PROPERTY monday_end: std::str;
      CREATE PROPERTY monday_start: std::str;
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE PROPERTY saturday_end: std::str;
      CREATE PROPERTY saturday_start: std::str;
      CREATE PROPERTY sunday_end: std::str;
      CREATE PROPERTY sunday_start: std::str;
      CREATE PROPERTY thursday_end: std::str;
      CREATE PROPERTY thursday_start: std::str;
      CREATE PROPERTY tuesday_end: std::str;
      CREATE PROPERTY tuesday_start: std::str;
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY wednesday_end: std::str;
      CREATE PROPERTY wednesday_start: std::str;
  };
  CREATE TYPE time_attendance::Shift {
      CREATE LINK created_by: rbac::User;
      CREATE REQUIRED LINK employee: rbac::User;
      CREATE PROPERTY break_duration: std::duration;
      CREATE REQUIRED PROPERTY end_time: std::datetime;
      CREATE PROPERTY lunch_duration: std::duration;
      CREATE REQUIRED PROPERTY start_time: std::datetime;
      CREATE PROPERTY scheduled_hours := ((std::duration_to_seconds((.end_time - .start_time)) / 3600));
      CREATE PROPERTY net_hours := (((.scheduled_hours - (std::duration_to_seconds((.break_duration ?? <std::duration>'0')) / 3600)) - (std::duration_to_seconds((.lunch_duration ?? <std::duration>'0')) / 3600)));
      CREATE PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE REQUIRED PROPERTY schedule_date: std::datetime;
      CREATE REQUIRED PROPERTY status: time_attendance::ScheduleStatus {
          SET default := (time_attendance::ScheduleStatus.Scheduled);
      };
      CREATE PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE recruitment::Candidate {
      CREATE PROPERTY availability_date: std::datetime;
      CREATE PROPERTY certifications: array<std::str>;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY current_company: std::str;
      CREATE PROPERTY current_title: std::str;
      CREATE PROPERTY education: std::str;
      CREATE REQUIRED PROPERTY email: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY first_name: std::str;
      CREATE PROPERTY github_url: std::str;
      CREATE REQUIRED PROPERTY last_name: std::str;
      CREATE PROPERTY linkedin_url: std::str;
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY phone: std::str;
      CREATE PROPERTY portfolio_url: std::str;
      CREATE PROPERTY salary_expectation: std::int32;
      CREATE PROPERTY skills: array<std::str>;
      CREATE PROPERTY source: std::str;
      CREATE PROPERTY status: std::str {
          SET default := 'Active';
      };
      CREATE PROPERTY summary: std::str;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY years_of_experience: std::int32;
  };
  CREATE TYPE recruitment::JobApplication {
      CREATE REQUIRED LINK candidate: recruitment::Candidate;
      CREATE PROPERTY additional_documents: array<std::str>;
      CREATE PROPERTY applied_date: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY cover_letter: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY custom_fields: std::json;
      CREATE PROPERTY referrer_id: std::uuid;
      CREATE PROPERTY rejected_at: std::datetime;
      CREATE PROPERTY rejected_by_id: std::uuid;
      CREATE PROPERTY rejection_reason: std::str;
      CREATE PROPERTY resume_url: std::str;
      CREATE PROPERTY screened_at: std::datetime;
      CREATE PROPERTY screened_by_id: std::uuid;
      CREATE PROPERTY screening_notes: std::str;
      CREATE PROPERTY screening_score: std::int32;
      CREATE PROPERTY source: std::str;
      CREATE REQUIRED PROPERTY status: recruitment::ApplicationStatus {
          SET default := (recruitment::ApplicationStatus.Applied);
      };
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE recruitment::Candidate {
      CREATE MULTI LINK applications := (.<candidate[IS recruitment::JobApplication]);
  };
  CREATE TYPE recruitment::JobPosting {
      CREATE PROPERTY benefits: std::str;
      CREATE PROPERTY certifications_required: array<std::str>;
      CREATE PROPERTY closing_date: std::datetime;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY created_by_id: std::uuid;
      CREATE REQUIRED PROPERTY department: std::str;
      CREATE REQUIRED PROPERTY description: std::str;
      CREATE PROPERTY education_requirements: std::str;
      CREATE PROPERTY employment_type: recruitment::EmploymentType {
          SET default := (recruitment::EmploymentType.FullTime);
      };
      CREATE PROPERTY experience_level: recruitment::ExperienceLevel {
          SET default := (recruitment::ExperienceLevel.Mid);
      };
      CREATE PROPERTY hiring_manager_id: std::uuid;
      CREATE PROPERTY is_remote: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY location: std::str;
      CREATE PROPERTY positions_available: std::int32 {
          SET default := 1;
      };
      CREATE PROPERTY posted_date: std::datetime;
      CREATE PROPERTY preferred_skills: array<std::str>;
      CREATE PROPERTY remote_policy: std::str;
      CREATE PROPERTY required_skills: array<std::str>;
      CREATE PROPERTY requirements: std::str;
      CREATE PROPERTY responsibilities: std::str;
      CREATE PROPERTY salary_max: std::int32;
      CREATE PROPERTY salary_min: std::int32;
      CREATE REQUIRED PROPERTY status: recruitment::JobStatus {
          SET default := (recruitment::JobStatus.Draft);
      };
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  ALTER TYPE recruitment::JobApplication {
      CREATE REQUIRED LINK job_posting: recruitment::JobPosting;
      CREATE CONSTRAINT std::exclusive ON ((.candidate, .job_posting));
  };
  CREATE TYPE recruitment::Interview {
      CREATE REQUIRED LINK application: recruitment::JobApplication;
      CREATE LINK candidate := (.application.candidate);
      CREATE LINK job_posting := (.application.job_posting);
      CREATE PROPERTY agenda: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY created_by_id: std::uuid;
      CREATE PROPERTY duration_minutes: std::int32 {
          SET default := 60;
      };
      CREATE PROPERTY feedback: std::str;
      CREATE PROPERTY follow_up_required: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY interview_type: recruitment::InterviewType;
      CREATE PROPERTY interviewer_ids: array<std::uuid>;
      CREATE PROPERTY location: std::str;
      CREATE PROPERTY meeting_link: std::str;
      CREATE PROPERTY meeting_room: std::str;
      CREATE PROPERTY next_steps: std::str;
      CREATE PROPERTY notes: std::str;
      CREATE PROPERTY primary_interviewer_id: std::uuid;
      CREATE PROPERTY questions: array<std::str>;
      CREATE PROPERTY recommendation: std::str;
      CREATE REQUIRED PROPERTY scheduled_date: std::datetime;
      CREATE PROPERTY score: std::int32;
      CREATE REQUIRED PROPERTY status: recruitment::InterviewStatus {
          SET default := (recruitment::InterviewStatus.Scheduled);
      };
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE recruitment::JobOffer {
      CREATE REQUIRED LINK application: recruitment::JobApplication;
      CREATE LINK candidate := (.application.candidate);
      CREATE LINK job_posting := (.application.job_posting);
      CREATE PROPERTY accepted_date: std::datetime;
      CREATE PROPERTY approval_notes: std::str;
      CREATE PROPERTY approved_by_id: std::uuid;
      CREATE PROPERTY approved_date: std::datetime;
      CREATE REQUIRED PROPERTY base_salary: std::int32;
      CREATE PROPERTY benefits_summary: std::str;
      CREATE PROPERTY bonus: std::int32;
      CREATE PROPERTY contract_url: std::str;
      CREATE PROPERTY counter_offer_details: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY created_by_id: std::uuid;
      CREATE PROPERTY decline_reason: std::str;
      CREATE PROPERTY declined_date: std::datetime;
      CREATE PROPERTY employment_type: recruitment::EmploymentType {
          SET default := (recruitment::EmploymentType.FullTime);
      };
      CREATE PROPERTY equity: std::str;
      CREATE PROPERTY expiration_date: std::datetime;
      CREATE PROPERTY offer_date: std::datetime;
      CREATE PROPERTY offer_letter_url: std::str;
      CREATE REQUIRED PROPERTY position_title: std::str;
      CREATE PROPERTY probation_period_months: std::int32;
      CREATE PROPERTY reporting_manager_id: std::uuid;
      CREATE PROPERTY requires_approval: std::bool {
          SET default := true;
      };
      CREATE PROPERTY response_deadline: std::datetime;
      CREATE PROPERTY signed_contract_url: std::str;
      CREATE PROPERTY start_date: std::datetime;
      CREATE REQUIRED PROPERTY status: recruitment::OfferStatus {
          SET default := (recruitment::OfferStatus.Draft);
      };
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY vacation_days: std::int32;
      CREATE PROPERTY work_location: std::str;
  };
  ALTER TYPE recruitment::JobApplication {
      CREATE MULTI LINK interviews := (.<application[IS recruitment::Interview]);
      CREATE MULTI LINK offers := (.<application[IS recruitment::JobOffer]);
  };
  CREATE TYPE recruitment::InterviewFeedback {
      CREATE REQUIRED LINK interview: recruitment::Interview;
      CREATE PROPERTY additional_comments: std::str;
      CREATE PROPERTY communication_skills_rating: std::int32;
      CREATE PROPERTY concerns: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY cultural_fit_rating: std::int32;
      CREATE PROPERTY detailed_feedback: std::str;
      CREATE REQUIRED PROPERTY interviewer_id: std::uuid;
      CREATE PROPERTY meets_requirements: std::bool;
      CREATE REQUIRED PROPERTY overall_rating: std::int32;
      CREATE PROPERTY problem_solving_rating: std::int32;
      CREATE PROPERTY recommendation: std::str;
      CREATE PROPERTY strengths: std::str;
      CREATE PROPERTY technical_skills_rating: std::int32;
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY would_work_with_again: std::bool;
  };
  ALTER TYPE recruitment::JobPosting {
      CREATE MULTI LINK applications := (.<job_posting[IS recruitment::JobApplication]);
  };
  CREATE TYPE recruitment::RecruitmentStage {
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE CONSTRAINT std::exclusive ON (.name);
      CREATE PROPERTY auto_advance: std::bool {
          SET default := false;
      };
      CREATE PROPERTY color: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY description: std::str;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE REQUIRED PROPERTY order_index: std::int32;
      CREATE PROPERTY requires_approval: std::bool {
          SET default := false;
      };
      CREATE PROPERTY requires_interview: std::bool {
          SET default := false;
      };
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE time_attendance::AttendanceAnalytics {
      CREATE PROPERTY absent_count: std::int32;
      CREATE PROPERTY attendance_rate: std::float32;
      CREATE PROPERTY average_hours_per_employee: std::float32;
      CREATE PROPERTY generated_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY late_count: std::int32;
      CREATE PROPERTY period_end: std::datetime;
      CREATE PROPERTY period_start: std::datetime;
      CREATE PROPERTY present_count: std::int32;
      CREATE PROPERTY punctuality_rate: std::float32;
      CREATE PROPERTY total_employees: std::int32;
      CREATE PROPERTY total_overtime_hours: std::float32;
  };
  ALTER TYPE time_attendance::AttendanceRecord {
      CREATE LINK shift: time_attendance::Shift;
      CREATE LINK work_session: time_attendance::WorkSession;
  };
  ALTER TYPE time_attendance::EmployeeSchedule {
      CREATE REQUIRED LINK schedule_template: time_attendance::ScheduleTemplate;
  };
  ALTER TYPE time_attendance::Timesheet {
      CREATE MULTI LINK work_sessions: time_attendance::WorkSession {
          ON TARGET DELETE ALLOW;
      };
  };
};
