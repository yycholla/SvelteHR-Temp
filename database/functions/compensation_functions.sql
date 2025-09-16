-- Compensation Management Functions
-- Created: 2025-09-15
-- Description: Secure functions for compensation and payroll management

-- Function to create employee compensation record (HR Admin only)
CREATE OR REPLACE FUNCTION hr_public.create_employee_compensation(
    p_employee_id UUID,
    p_base_amount DECIMAL(12,2),
    p_compensation_type hr_public.compensation_type DEFAULT 'BASE_SALARY',
    p_employment_status hr_public.employment_status DEFAULT 'FULL_TIME',
    p_pay_frequency hr_public.pay_frequency DEFAULT 'BI_WEEKLY',
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_overtime_eligible BOOLEAN DEFAULT true,
    p_health_insurance_eligible BOOLEAN DEFAULT true,
    p_retirement_plan_eligible BOOLEAN DEFAULT true
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    compensation_id UUID;
    current_user_id UUID;
    current_user_role_level INTEGER;
BEGIN
    -- Get current user and verify HR Admin access
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        
        SELECT MAX(ur.level) INTO current_user_role_level
        FROM hr_public.user_role_assignments ura
        JOIN hr_public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = current_user_id AND ura.is_active = true;
        
        IF COALESCE(current_user_role_level, 0) < 80 THEN
            RAISE EXCEPTION 'Access denied: HR Admin privileges required';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Validate employee exists and is active
    IF NOT EXISTS (SELECT 1 FROM hr_public.users WHERE id = p_employee_id AND is_active = true) THEN
        RAISE EXCEPTION 'Employee not found or inactive';
    END IF;
    
    -- Validate compensation amount
    IF p_base_amount <= 0 THEN
        RAISE EXCEPTION 'Base amount must be positive';
    END IF;
    
    -- End any existing active compensation for this employee
    UPDATE hr_private.employee_compensation
    SET end_date = p_effective_date - INTERVAL '1 day',
        updated_at = NOW()
    WHERE employee_id = p_employee_id 
      AND end_date IS NULL 
      AND effective_date < p_effective_date;
    
    -- Create new compensation record
    INSERT INTO hr_private.employee_compensation (
        employee_id, base_amount, compensation_type, employment_status,
        pay_frequency, effective_date, overtime_eligible,
        health_insurance_eligible, retirement_plan_eligible,
        approved_by, created_by
    ) VALUES (
        p_employee_id, p_base_amount, p_compensation_type, p_employment_status,
        p_pay_frequency, p_effective_date, p_overtime_eligible,
        p_health_insurance_eligible, p_retirement_plan_eligible,
        current_user_id, current_user_id
    ) RETURNING id INTO compensation_id;
    
    -- Log the compensation creation
    INSERT INTO hr_hidden.compensation_history (
        compensation_id, employee_id, change_type, change_reason,
        new_values, new_amount, effective_date, approved_by
    ) VALUES (
        compensation_id, p_employee_id, 'CREATED', 'Initial compensation setup',
        jsonb_build_object(
            'base_amount', p_base_amount,
            'compensation_type', p_compensation_type,
            'employment_status', p_employment_status,
            'pay_frequency', p_pay_frequency
        ),
        p_base_amount, p_effective_date, current_user_id
    );
    
    -- Log audit event
    PERFORM hr_hidden.log_audit_event(
        'hr_private.employee_compensation',
        compensation_id,
        'INSERT',
        current_user_id,
        NULL,
        jsonb_build_object('employee_id', p_employee_id, 'base_amount', p_base_amount),
        format('Compensation created for employee %s: %s %s', p_employee_id, p_base_amount, p_compensation_type),
        'INFO',
        'DATA_CHANGE'
    );
    
    -- Log sensitive data access
    PERFORM hr_hidden.log_sensitive_access(
        current_user_id, p_employee_id, 'SALARY', 'hr_private.employee_compensation',
        ARRAY[compensation_id], 'Compensation record creation'
    );
    
    RETURN compensation_id;
END;
$$;

-- Function to get employee compensation (restricted access)
CREATE OR REPLACE FUNCTION hr_public.get_employee_compensation(
    p_employee_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    compensation_id UUID,
    base_amount DECIMAL(12,2),
    compensation_type hr_public.compensation_type,
    employment_status hr_public.employment_status,
    pay_frequency hr_public.pay_frequency,
    effective_date DATE,
    overtime_eligible BOOLEAN,
    health_insurance_eligible BOOLEAN,
    retirement_plan_eligible BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_user_role_level INTEGER;
    is_manager BOOLEAN := false;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        
        SELECT MAX(ur.level) INTO current_user_role_level
        FROM hr_public.user_role_assignments ura
        JOIN hr_public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = current_user_id AND ura.is_active = true;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Check access permissions
    IF current_user_id = p_employee_id THEN
        -- Employees can view their own compensation
        NULL;
    ELSIF COALESCE(current_user_role_level, 0) >= 80 THEN
        -- HR Admin and above can view all compensation
        NULL;
    ELSIF EXISTS (
        -- Check if current user is the employee's manager
        SELECT 1 FROM hr_public.job_information ji
        WHERE ji.employee_id = p_employee_id
          AND (ji.manager_id = current_user_id OR ji.reports_to = current_user_id)
          AND ji.end_date IS NULL
    ) THEN
        is_manager := true;
    ELSE
        RAISE EXCEPTION 'Access denied: insufficient permissions to view compensation data';
    END IF;
    
    -- Log sensitive data access
    PERFORM hr_hidden.log_sensitive_access(
        current_user_id, p_employee_id, 'SALARY', 'hr_private.employee_compensation',
        ARRAY(SELECT ec.id FROM hr_private.employee_compensation ec 
              WHERE ec.employee_id = p_employee_id 
                AND ec.effective_date <= p_as_of_date 
                AND (ec.end_date IS NULL OR ec.end_date >= p_as_of_date)),
        CASE WHEN is_manager THEN 'Manager access' ELSE 'Direct access' END
    );
    
    -- Return compensation data
    RETURN QUERY
    SELECT 
        ec.id,
        CASE 
            WHEN is_manager THEN NULL  -- Managers don't see exact amounts
            ELSE ec.base_amount 
        END,
        ec.compensation_type,
        ec.employment_status,
        ec.pay_frequency,
        ec.effective_date,
        ec.overtime_eligible,
        ec.health_insurance_eligible,
        ec.retirement_plan_eligible
    FROM hr_private.employee_compensation ec
    WHERE ec.employee_id = p_employee_id
      AND ec.effective_date <= p_as_of_date
      AND (ec.end_date IS NULL OR ec.end_date >= p_as_of_date)
    ORDER BY ec.effective_date DESC
    LIMIT 1;
END;
$$;

-- Function to calculate payroll for an employee in a period
CREATE OR REPLACE FUNCTION hr_hidden.calculate_employee_payroll(
    p_employee_id UUID,
    p_payroll_period_id UUID,
    p_regular_hours DECIMAL(6,2) DEFAULT 80,
    p_overtime_hours DECIMAL(6,2) DEFAULT 0
) RETURNS hr_private.payroll_entries
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    period_record hr_public.payroll_periods%ROWTYPE;
    compensation_record hr_private.employee_compensation%ROWTYPE;
    payroll_entry hr_private.payroll_entries;
    hourly_rate DECIMAL(10,4);
    annual_salary DECIMAL(12,2);
    periods_per_year INTEGER;
    gross_pay DECIMAL(12,2);
    federal_tax DECIMAL(10,2);
    state_tax DECIMAL(10,2);
    social_security_tax DECIMAL(10,2);
    medicare_tax DECIMAL(10,2);
    total_deductions DECIMAL(12,2);
    net_pay DECIMAL(12,2);
BEGIN
    -- Get payroll period
    SELECT * INTO period_record
    FROM hr_public.payroll_periods
    WHERE id = p_payroll_period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll period not found';
    END IF;
    
    -- Get current compensation
    SELECT * INTO compensation_record
    FROM hr_private.employee_compensation
    WHERE employee_id = p_employee_id
      AND effective_date <= period_record.period_end_date
      AND (end_date IS NULL OR end_date >= period_record.period_start_date)
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No compensation record found for employee in this period';
    END IF;
    
    -- Calculate periods per year based on pay frequency
    periods_per_year := CASE compensation_record.pay_frequency
        WHEN 'WEEKLY' THEN 52
        WHEN 'BI_WEEKLY' THEN 26
        WHEN 'SEMI_MONTHLY' THEN 24
        WHEN 'MONTHLY' THEN 12
        WHEN 'QUARTERLY' THEN 4
        WHEN 'ANNUALLY' THEN 1
        ELSE 26  -- Default to bi-weekly
    END;
    
    -- Calculate regular pay
    IF compensation_record.compensation_type = 'HOURLY_WAGE' THEN
        hourly_rate := compensation_record.base_amount;
        payroll_entry.regular_pay := p_regular_hours * hourly_rate;
        payroll_entry.overtime_pay := p_overtime_hours * hourly_rate * compensation_record.overtime_rate_multiplier;
    ELSE
        -- Salary calculation
        annual_salary := compensation_record.base_amount;
        payroll_entry.regular_pay := annual_salary / periods_per_year;
        payroll_entry.overtime_pay := 0; -- Salaried employees typically don't get overtime
    END IF;
    
    -- Set hours
    payroll_entry.regular_hours := p_regular_hours;
    payroll_entry.overtime_hours := p_overtime_hours;
    
    -- Calculate gross pay
    gross_pay := payroll_entry.regular_pay + payroll_entry.overtime_pay + 
                COALESCE(payroll_entry.commission_pay, 0) + COALESCE(payroll_entry.bonus_pay, 0) + 
                COALESCE(payroll_entry.other_pay, 0);
    
    -- Calculate taxes (simplified calculation)
    social_security_tax := LEAST(gross_pay * 0.062, (168600 / periods_per_year) * 0.062);
    medicare_tax := gross_pay * 0.0145;
    federal_tax := gross_pay * 0.15; -- Simplified federal tax rate
    state_tax := gross_pay * 0.05;   -- Simplified state tax rate
    
    -- Calculate benefit deductions
    payroll_entry.health_insurance := CASE 
        WHEN compensation_record.health_insurance_eligible THEN 200 / periods_per_year 
        ELSE 0 
    END;
    
    payroll_entry.retirement_contribution := CASE 
        WHEN compensation_record.retirement_plan_eligible THEN gross_pay * 0.05 
        ELSE 0 
    END;
    
    -- Total deductions
    total_deductions := federal_tax + state_tax + social_security_tax + medicare_tax + 
                       payroll_entry.health_insurance + payroll_entry.retirement_contribution;
    
    -- Net pay
    net_pay := gross_pay - total_deductions;
    
    -- Build the payroll entry record
    payroll_entry.id := gen_random_uuid();
    payroll_entry.payroll_period_id := p_payroll_period_id;
    payroll_entry.employee_id := p_employee_id;
    payroll_entry.compensation_id := compensation_record.id;
    payroll_entry.commission_pay := COALESCE(payroll_entry.commission_pay, 0);
    payroll_entry.bonus_pay := COALESCE(payroll_entry.bonus_pay, 0);
    payroll_entry.other_pay := COALESCE(payroll_entry.other_pay, 0);
    payroll_entry.gross_pay := gross_pay;
    payroll_entry.federal_tax := federal_tax;
    payroll_entry.state_tax := state_tax;
    payroll_entry.social_security_tax := social_security_tax;
    payroll_entry.medicare_tax := medicare_tax;
    payroll_entry.other_deductions := COALESCE(payroll_entry.other_deductions, 0);
    payroll_entry.total_deductions := total_deductions;
    payroll_entry.net_pay := net_pay;
    payroll_entry.created_at := NOW();
    payroll_entry.updated_at := NOW();
    
    RETURN payroll_entry;
END;
$$;

-- Function to create payroll period (HR Admin only)
CREATE OR REPLACE FUNCTION hr_public.create_payroll_period(
    p_period_name VARCHAR(100),
    p_pay_frequency hr_public.pay_frequency,
    p_period_start_date DATE,
    p_period_end_date DATE,
    p_pay_date DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    period_id UUID;
    current_user_id UUID;
    current_user_role_level INTEGER;
BEGIN
    -- Verify HR Admin access
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        
        SELECT MAX(ur.level) INTO current_user_role_level
        FROM hr_public.user_role_assignments ura
        JOIN hr_public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = current_user_id AND ura.is_active = true;
        
        IF COALESCE(current_user_role_level, 0) < 80 THEN
            RAISE EXCEPTION 'Access denied: HR Admin privileges required';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Validate dates
    IF p_period_start_date > p_period_end_date THEN
        RAISE EXCEPTION 'Period start date must be before end date';
    END IF;
    
    IF p_pay_date < p_period_end_date THEN
        RAISE EXCEPTION 'Pay date must be on or after period end date';
    END IF;
    
    -- Check for overlapping periods
    IF EXISTS (
        SELECT 1 FROM hr_public.payroll_periods
        WHERE pay_frequency = p_pay_frequency
          AND status != 'CANCELLED'
          AND (
              (p_period_start_date BETWEEN period_start_date AND period_end_date) OR
              (p_period_end_date BETWEEN period_start_date AND period_end_date) OR
              (period_start_date BETWEEN p_period_start_date AND p_period_end_date)
          )
    ) THEN
        RAISE EXCEPTION 'Overlapping payroll period exists for this frequency';
    END IF;
    
    -- Create payroll period
    INSERT INTO hr_public.payroll_periods (
        period_name, pay_frequency, period_start_date, period_end_date,
        pay_date, status, created_by
    ) VALUES (
        p_period_name, p_pay_frequency, p_period_start_date, p_period_end_date,
        p_pay_date, 'DRAFT', current_user_id
    ) RETURNING id INTO period_id;
    
    -- Log the creation
    PERFORM hr_hidden.log_audit_event(
        'hr_public.payroll_periods',
        period_id,
        'INSERT',
        current_user_id,
        NULL,
        jsonb_build_object(
            'period_name', p_period_name,
            'pay_frequency', p_pay_frequency,
            'period_start_date', p_period_start_date,
            'period_end_date', p_period_end_date,
            'pay_date', p_pay_date
        ),
        format('Payroll period created: %s (%s to %s)', p_period_name, p_period_start_date, p_period_end_date),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN period_id;
END;
$$;

-- Comments
COMMENT ON FUNCTION hr_public.create_employee_compensation(UUID, DECIMAL, hr_public.compensation_type, hr_public.employment_status, hr_public.pay_frequency, DATE, BOOLEAN, BOOLEAN, BOOLEAN) IS
'Create new employee compensation record (HR Admin only)';

COMMENT ON FUNCTION hr_public.get_employee_compensation(UUID, DATE) IS
'Get employee compensation data with access controls';

COMMENT ON FUNCTION hr_hidden.calculate_employee_payroll(UUID, UUID, DECIMAL, DECIMAL) IS
'Calculate payroll entry for employee in given period';

COMMENT ON FUNCTION hr_public.create_payroll_period(VARCHAR, hr_public.pay_frequency, DATE, DATE, DATE) IS
'Create new payroll period (HR Admin only)';

-- Grant permissions (very restrictive)
GRANT EXECUTE ON FUNCTION hr_public.create_employee_compensation(UUID, DECIMAL, hr_public.compensation_type, hr_public.employment_status, hr_public.pay_frequency, DATE, BOOLEAN, BOOLEAN, BOOLEAN) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_employee_compensation(UUID, DATE) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.create_payroll_period(VARCHAR, hr_public.pay_frequency, DATE, DATE, DATE) TO hr_admin, hr_super_admin;