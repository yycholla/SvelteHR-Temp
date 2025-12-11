#!/usr/bin/env python3
"""
Script to fix logger API calls across the codebase.
Phase 3 Pattern: Wrap all primitives, convert errors to Error objects.
"""

import re
import os
from pathlib import Path

def fix_logger_info_with_colon(content):
    """Fix logger.info calls with colon and primitive values"""
    # Pattern: logger.info('message:', value)
    pattern = r"logger\.(info|debug|warn)\((['\"])([^'\"]+):\2,\s*([^{][^)]+)\)"

    def replace_fn(match):
        method = match.group(1)
        quote = match.group(2)
        message = match.group(3)
        value = match.group(4).strip()

        # Check if it's a simple primitive
        if not value.startswith('{'):
            # Extract variable name
            var_name = value.split('.')[-1].strip(');')
            return f'logger.{method}({quote}{message}{quote}, {{\n\t\t\t{var_name}: {value}\n\t\t}})'
        return match.group(0)

    return re.sub(pattern, replace_fn, content)

def fix_logger_error_with_non_error(content):
    """Fix logger.error calls that don't pass Error objects"""
    # Pattern: logger.error('message:', non_error_object)
    pattern = r"logger\.error\((['\"])([^'\"]+):\1,\s*([^E][^)]+)\)"

    def replace_fn(match):
        quote = match.group(1)
        message = match.group(2)
        value = match.group(3).strip()

        # If it's an array or object, wrap it in metadata
        if value.endswith('errors') or value.startswith('[') or value.startswith('{'):
            return f"const errorMsg = {value}[0]?.message || '{message}';\n\t\t\tlogger.error('{message}', new Error(errorMsg), {{\n\t\t\t\terrors: {value}\n\t\t\t}})"

        return match.group(0)

    return re.sub(pattern, replace_fn, content)

def fix_logger_error_as_error(content):
    """Fix logger.error calls with 'as Error' cast"""
    # Pattern: logger.error('message:', err as Error)
    pattern = r"logger\.error\((['\"])([^'\"]+):\1,\s*err as Error\)"

    def replace_fn(match):
        quote = match.group(1)
        message = match.group(2)
        return f"logger.error('{message}', err instanceof Error ? err : new Error(String(err)))"

    return re.sub(pattern, replace_fn, content)

def fix_logger_error_details(content):
    """Fix logger.error calls that pass objects as second parameter instead of third"""
    # Pattern: logger.error('message', { ... error: errorResponse ... })
    pattern = r"logger\.error\((['\"])([^'\"]+)\1,\s*\{([^}]*error:\s*errorResponse[^}]*)\}\)"

    def replace_fn(match):
        quote = match.group(1)
        message = match.group(2)
        meta_content = match.group(3)

        # Replace 'error: errorResponse' with 'errorMessage: errorResponse.userMessage'
        new_meta = meta_content.replace('error: errorResponse', 'errorMessage: errorResponse.userMessage')

        return f"logger.error('{message}', undefined, {{\n\t\t\t{new_meta}\n\t\t}})"

    return re.sub(pattern, replace_fn, content)

def fix_template_literals_in_logger(content):
    """Fix logger calls with template literals"""
    # Pattern: logger.info(`message: ${value}`)
    pattern = r"logger\.(info|debug|warn)\(`([^`]+)\$\{([^}]+)\}([^`]*)`\)"

    def replace_fn(match):
        method = match.group(1)
        message_before = match.group(2)
        var_expr = match.group(3)
        message_after = match.group(4)

        # Extract variable name
        var_name = var_expr.split('.')[-1].strip()
        clean_message = (message_before + message_after).rstrip(': ')

        return f"logger.{method}('{clean_message}', {{\n\t\t\t{var_name}: {var_expr}\n\t\t}})"

    return re.sub(pattern, replace_fn, content)

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply all fixes
        content = fix_logger_info_with_colon(content)
        content = fix_logger_error_with_non_error(content)
        content = fix_logger_error_as_error(content)
        content = fix_logger_error_details(content)
        content = fix_template_literals_in_logger(content)

        # Only write if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, file_path

        return False, None

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False, None

def main():
    """Main function"""
    # Target files from the requirements
    files = [
        "src/routes/dashboard/departments/[id]/edit/+page.server.ts",
        "src/routes/dashboard/departments/[id]/+page.server.ts",
        "src/routes/dashboard/departments/new/+page.server.ts",
        "src/routes/dashboard/documents/+page.server.ts",
        "src/routes/dashboard/documents/upload/+page.server.ts",
        "src/routes/dashboard/documents/upload/+page.svelte",
        "src/routes/dashboard/employees2/[id]/+page.server.ts",
        "src/routes/dashboard/employees/[id]/edit/+page.server.ts",
        "src/routes/dashboard/employees/[id]/+page.server.ts",
        "src/routes/dashboard/employees/new/+page.server.ts",
        "src/routes/dashboard/events/[id]/+page.server.ts",
        "src/routes/dashboard/events/+page.server.ts",
        "src/routes/dashboard/events/+page.svelte",
        "src/routes/dashboard/management/leave-approvals/+page.server.ts",
        "src/routes/dashboard/management/reviews/+page.server.ts",
        "src/routes/dashboard/management/reviews/+page.svelte",
        "src/routes/dashboard/notifications/+page.server.ts",
        "src/routes/dashboard/profile/attendance/+page.server.ts",
        "src/routes/dashboard/profile/performance/+page.server.ts",
        "src/routes/dashboard/profile/settings/+page.server.ts",
        "src/routes/dashboard/reviews/create/+page.server.ts",
        "src/routes/dashboard/reviews/+page.server.ts",
        "src/routes/dashboard/tasks/[id]/edit/+page.server.ts",
        "src/routes/dashboard/tasks/my-tasks/+page.server.ts",
        "src/routes/dashboard/tasks/new/+page.server.ts",
        "src/routes/dashboard/tasks/team-tasks/+page.server.ts",
        "src/routes/dashboard/teams/+page.server.ts",
        "src/routes/dashboard/users/[id]/attendance/+page.server.ts",
        "src/routes/dashboard/users/[id]/leave/requests/+page.svelte",
        "src/routes/dashboard/users/[id]/performance/+page.svelte",
        "src/routes/+error.svelte",
        "src/routes/settings/+page.server.ts",
    ]

    fixed_count = 0
    for file_path in files:
        full_path = Path("/home/chanway/Projects/SvelteHR") / file_path
        if full_path.exists():
            changed, path = process_file(full_path)
            if changed:
                fixed_count += 1
                print(f"Fixed: {file_path}")
        else:
            print(f"Not found: {file_path}")

    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == "__main__":
    main()
