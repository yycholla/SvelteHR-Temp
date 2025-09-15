-- Authentication Functions for PostGraphile
-- SECURITY DEFINER functions for secure credential verification

-- Main authentication function - exposed to PostGraphile
CREATE OR REPLACE FUNCTION hr_public.authenticate(
    email TEXT,
    password TEXT
) RETURNS hr_public.jwt_token
LANGUAGE plpgsql STRICT SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    account hr_private.employee_account;
    employee hr_public.employees;
    token hr_public.jwt_token;
    attempt_count INTEGER;
BEGIN
    -- Input validation
    IF email IS NULL OR email = '' THEN
        RAISE EXCEPTION 'Email is required';
    END IF;
    
    IF password IS NULL OR password = '' THEN
        RAISE EXCEPTION 'Password is required';
    END IF;
    
    -- Find employee account
    SELECT a.* INTO account
    FROM hr_private.employee_account a
    WHERE LOWER(a.email) = LOWER(authenticate.email);
    
    -- Check if account exists
    IF NOT FOUND THEN
        -- Log failed attempt for non-existent email
        PERFORM hr_hidden.log_failed_login_attempt(authenticate.email, 'account_not_found');
        -- Don't reveal whether email exists
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Check if account is locked
    IF account.locked_until IS NOT NULL AND account.locked_until > CURRENT_TIMESTAMP THEN
        -- Log locked account attempt
        PERFORM hr_hidden.log_failed_login_attempt(authenticate.email, 'account_locked');
        RAISE EXCEPTION 'Account is temporarily locked due to too many failed attempts. Try again later.';
    END IF;
    
    -- Verify password
    IF account.password_hash != crypt(password, account.password_hash) THEN
        -- Increment failed attempts
        UPDATE hr_private.employee_account 
        SET 
            failed_attempts = failed_attempts + 1,
            locked_until = CASE 
                WHEN failed_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                ELSE NULL
            END
        WHERE id = account.id;
        
        -- Log failed attempt
        PERFORM hr_hidden.log_failed_login_attempt(authenticate.email, 'invalid_password');
        
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Get employee details
    SELECT e.* INTO employee
    FROM hr_public.employees e
    WHERE e.id = account.employee_id;
    
    -- Check if employee is active
    IF employee.status != 'ACTIVE' THEN
        PERFORM hr_hidden.log_failed_login_attempt(authenticate.email, 'employee_inactive');
        RAISE EXCEPTION 'Employee account is not active';
    END IF;
    
    -- Authentication successful - reset failed attempts and update last login
    UPDATE hr_private.employee_account 
    SET 
        failed_attempts = 0,
        locked_until = NULL,
        last_login = CURRENT_TIMESTAMP
    WHERE id = account.id;
    
    -- Create JWT token
    token := hr_hidden.create_jwt_token(employee, 15); -- 15 minute expiry
    
    -- Log successful login
    PERFORM hr_hidden.log_successful_login(employee.id, employee.email);
    
    RETURN token;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging (but don't expose details to client)
        PERFORM hr_hidden.log_authentication_error(authenticate.email, SQLERRM);
        -- Re-raise with generic message for security
        IF SQLSTATE = 'P0001' THEN -- User-defined exception
            RAISE; -- Re-raise our custom exceptions as-is
        ELSE
            RAISE EXCEPTION 'Authentication failed'; -- Generic message for system errors
        END IF;
END;
$$;

-- Refresh token function
CREATE OR REPLACE FUNCTION hr_public.refresh_token(
    refresh_token TEXT
) RETURNS hr_public.jwt_token
LANGUAGE plpgsql STRICT SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    account hr_private.employee_account;
    employee hr_public.employees;
    token hr_public.jwt_token;
BEGIN
    -- Input validation
    IF refresh_token IS NULL OR refresh_token = '' THEN
        RAISE EXCEPTION 'Refresh token is required';
    END IF;
    
    -- Find account by refresh token hash
    SELECT a.* INTO account
    FROM hr_private.employee_account a
    WHERE a.refresh_token_hash = crypt(refresh_token, a.refresh_token_hash)
      AND a.refresh_token_expires_at > CURRENT_TIMESTAMP;
    
    -- Check if refresh token is valid
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired refresh token';
    END IF;
    
    -- Get employee details
    SELECT e.* INTO employee
    FROM hr_public.employees e
    WHERE e.id = account.employee_id;
    
    -- Check if employee is still active
    IF employee.status != 'ACTIVE' THEN
        -- Clear refresh token for inactive employee
        UPDATE hr_private.employee_account
        SET refresh_token_hash = NULL, refresh_token_expires_at = NULL
        WHERE id = account.id;
        
        RAISE EXCEPTION 'Employee account is not active';
    END IF;
    
    -- Create new JWT token
    token := hr_hidden.create_jwt_token(employee, 15); -- 15 minute expiry
    
    -- Log token refresh
    PERFORM hr_hidden.log_token_refresh(employee.id, employee.email);
    
    RETURN token;
    
EXCEPTION
    WHEN OTHERS THEN
        PERFORM hr_hidden.log_authentication_error('refresh_token', SQLERRM);
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        ELSE
            RAISE EXCEPTION 'Token refresh failed';
        END IF;
END;
$$;

-- Logout function (invalidate refresh token)
CREATE OR REPLACE FUNCTION hr_public.logout()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
BEGIN
    -- Get current employee ID from session variables
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    
    -- Clear refresh token
    UPDATE hr_private.employee_account
    SET 
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL
    WHERE employee_id = current_employee_id;
    
    -- Log logout
    PERFORM hr_hidden.log_logout(current_employee_id);
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Change password function
CREATE OR REPLACE FUNCTION hr_public.change_password(
    current_password TEXT,
    new_password TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql STRICT SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    account hr_private.employee_account;
    password_hash_new TEXT;
BEGIN
    -- Get current employee ID
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    
    -- Input validation
    IF current_password IS NULL OR current_password = '' THEN
        RAISE EXCEPTION 'Current password is required';
    END IF;
    
    IF new_password IS NULL OR LENGTH(new_password) < 8 THEN
        RAISE EXCEPTION 'New password must be at least 8 characters';
    END IF;
    
    -- Get account
    SELECT a.* INTO account
    FROM hr_private.employee_account a
    WHERE a.employee_id = current_employee_id;
    
    -- Verify current password
    IF account.password_hash != crypt(current_password, account.password_hash) THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;
    
    -- Generate new password hash
    password_hash_new := crypt(new_password, gen_salt('bf'));
    
    -- Update password
    UPDATE hr_private.employee_account
    SET 
        password_hash = password_hash_new,
        password_changed_at = CURRENT_TIMESTAMP,
        failed_attempts = 0,
        locked_until = NULL,
        -- Invalidate refresh token for security
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL
    WHERE employee_id = current_employee_id;
    
    -- Log password change
    PERFORM hr_hidden.log_password_change(current_employee_id);
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        PERFORM hr_hidden.log_authentication_error('password_change', SQLERRM);
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        ELSE
            RAISE EXCEPTION 'Password change failed';
        END IF;
END;
$$;

-- Helper function to generate refresh token
CREATE OR REPLACE FUNCTION hr_hidden.generate_refresh_token(
    p_employee_id INTEGER
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    refresh_token TEXT;
    token_hash TEXT;
BEGIN
    -- Generate random refresh token
    refresh_token := encode(gen_random_bytes(32), 'base64');
    
    -- Hash the token for storage
    token_hash := crypt(refresh_token, gen_salt('bf'));
    
    -- Store in employee account
    UPDATE hr_private.employee_account
    SET 
        refresh_token_hash = token_hash,
        refresh_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
    WHERE employee_id = p_employee_id;
    
    -- Return unhashed token to client
    RETURN refresh_token;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION hr_public.authenticate(TEXT, TEXT) IS 'Authenticates user credentials and returns JWT token';
COMMENT ON FUNCTION hr_public.refresh_token(TEXT) IS 'Refreshes JWT token using refresh token';
COMMENT ON FUNCTION hr_public.logout() IS 'Logs out current user by invalidating refresh token';
COMMENT ON FUNCTION hr_public.change_password(TEXT, TEXT) IS 'Changes user password with current password verification';
COMMENT ON FUNCTION hr_hidden.generate_refresh_token(INTEGER) IS 'Generates and stores refresh token for employee';

-- Grant execute permissions to PostGraphile app user
GRANT EXECUTE ON FUNCTION hr_public.authenticate(TEXT, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.refresh_token(TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.logout() TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.change_password(TEXT, TEXT) TO postgraphile_app;