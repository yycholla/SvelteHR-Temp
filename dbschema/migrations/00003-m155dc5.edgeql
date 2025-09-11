CREATE MIGRATION m155dc5jgsp2v2iadbvahdjvdrdxtvg5ntas742imazbaxzf2vhvfa
    ONTO m1i5gnv77rzbx7eotsh73qcl7jdvmz2znibymrh4yynmhzs3jmbzpa
{
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK approved_by: rbac::User;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK created_by: rbac::User;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK new_manager: rbac::User;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK new_salary_band: payroll::SalaryBand;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK previous_manager: rbac::User;
  };
  ALTER TYPE payroll::CompensationChange {
      CREATE LINK previous_salary_band: payroll::SalaryBand;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY approved_by_id;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY created_by_id;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY new_manager_id;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY new_salary_band_id;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY previous_manager_id;
  };
  ALTER TYPE payroll::CompensationChange {
      DROP PROPERTY previous_salary_band_id;
  };
  ALTER TYPE payroll::PayPeriod {
      CREATE LINK finalized_by: rbac::User;
  };
  ALTER TYPE payroll::PayPeriod {
      CREATE LINK processed_by: rbac::User;
  };
  ALTER TYPE payroll::PayPeriod {
      DROP PROPERTY finalized_by_id;
  };
  ALTER TYPE payroll::PayPeriod {
      DROP PROPERTY processed_by_id;
  };
  ALTER TYPE payroll::PayrollEmployee {
      CREATE REQUIRED LINK employee: rbac::User {
          SET REQUIRED USING (<rbac::User>{});
          CREATE CONSTRAINT std::exclusive;
      };
      DROP PROPERTY employee_id;
  };
  ALTER TYPE payroll::PayrollRun {
      CREATE LINK approved_by: rbac::User;
  };
  ALTER TYPE payroll::PayrollRun {
      CREATE LINK finalized_by: rbac::User;
  };
  ALTER TYPE payroll::PayrollRun {
      CREATE LINK started_by: rbac::User;
  };
  ALTER TYPE payroll::PayrollRun {
      DROP PROPERTY approved_by_id;
  };
  ALTER TYPE payroll::PayrollRun {
      DROP PROPERTY finalized_by_id;
  };
  ALTER TYPE payroll::PayrollRun {
      DROP PROPERTY started_by_id;
  };
  ALTER TYPE recruitment::Interview {
      CREATE LINK created_by: rbac::User;
  };
  ALTER TYPE recruitment::Interview {
      CREATE LINK primary_interviewer: rbac::User;
  };
  ALTER TYPE recruitment::Interview {
      DROP PROPERTY created_by_id;
  };
  ALTER TYPE recruitment::Interview {
      DROP PROPERTY primary_interviewer_id;
  };
  ALTER TYPE recruitment::InterviewFeedback {
      CREATE REQUIRED LINK interviewer: rbac::User {
          SET REQUIRED USING (<rbac::User>{});
      };
  };
  ALTER TYPE recruitment::InterviewFeedback {
      DROP PROPERTY interviewer_id;
  };
  ALTER TYPE recruitment::JobApplication {
      CREATE LINK referrer: rbac::User;
  };
  ALTER TYPE recruitment::JobApplication {
      CREATE LINK rejected_by: rbac::User;
  };
  ALTER TYPE recruitment::JobApplication {
      CREATE LINK screened_by: rbac::User;
  };
  ALTER TYPE recruitment::JobApplication {
      DROP PROPERTY referrer_id;
  };
  ALTER TYPE recruitment::JobApplication {
      DROP PROPERTY rejected_by_id;
  };
  ALTER TYPE recruitment::JobApplication {
      DROP PROPERTY screened_by_id;
  };
  ALTER TYPE recruitment::JobOffer {
      CREATE LINK approved_by: rbac::User;
  };
  ALTER TYPE recruitment::JobOffer {
      CREATE LINK created_by: rbac::User;
  };
  ALTER TYPE recruitment::JobOffer {
      CREATE LINK reporting_manager: rbac::User;
  };
  ALTER TYPE recruitment::JobOffer {
      DROP PROPERTY approved_by_id;
  };
  ALTER TYPE recruitment::JobOffer {
      DROP PROPERTY created_by_id;
  };
  ALTER TYPE recruitment::JobOffer {
      DROP PROPERTY reporting_manager_id;
  };
  ALTER TYPE recruitment::JobPosting {
      CREATE LINK created_by: rbac::User;
  };
  ALTER TYPE recruitment::JobPosting {
      CREATE LINK hiring_manager: rbac::User;
  };
  ALTER TYPE recruitment::JobPosting {
      DROP PROPERTY created_by_id;
  };
  ALTER TYPE recruitment::JobPosting {
      DROP PROPERTY hiring_manager_id;
  };
};
