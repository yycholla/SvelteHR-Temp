#!/usr/bin/env python3
"""
Create PostGraphile → Rust Schema Migration Mapping
Generates a detailed mapping for frontend migration
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# PostGraphile to Rust naming conventions
NAMING_RULES = {
    'query_patterns': [
        # PostGraphile: allTasks → Rust: tasks
        (r'^all([A-Z]\w+)$', r'\1'),  # allTasks → Tasks (then lowercase first)
        # PostGraphile: taskById → Rust: task
        (r'^(\w+)ById$', r'\1'),
        # PostGraphile: tasksByIds → Rust: tasks
        (r'^(\w+)sByIds$', r'\1'),
        # PostGraphile: usersByDepartment → Rust: users_by_department
        (r'^(\w+)By([A-Z]\w+)$', r'\1_by_\2'),
    ],
    'mutation_patterns': [
        # PostGraphile: createTask → Rust: create_task
        (r'^create([A-Z]\w+)$', r'create_\1'),
        # PostGraphile: updateTaskById → Rust: update_task
        (r'^update([A-Z]\w+)ById$', r'update_\1'),
        # PostGraphile: deleteTaskById → Rust: delete_task
        (r'^delete([A-Z]\w+)ById$', r'delete_\1'),
    ]
}

def to_snake_case(name):
    """Convert camelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def to_plural(name):
    """Simple pluralization"""
    if name.endswith('s'):
        return name
    if name.endswith('y'):
        return name[:-1] + 'ies'
    return name + 's'

def convert_postgraphile_to_rust(postgraphile_name, operation_type='query'):
    """Convert PostGraphile naming to Rust naming"""

    patterns = NAMING_RULES['query_patterns'] if operation_type == 'query' else NAMING_RULES['mutation_patterns']

    for pattern, replacement in patterns:
        match = re.match(pattern, postgraphile_name)
        if match:
            if pattern.startswith('^all'):
                # allTasks → tasks
                entity = match.group(1)
                return to_snake_case(to_plural(entity.lower()))
            elif pattern.endswith('ById$'):
                # taskById → task
                entity = match.group(1)
                return to_snake_case(entity)
            elif pattern.startswith('^create'):
                # createTask → create_task
                entity = match.group(1)
                return 'create_' + to_snake_case(entity)
            elif pattern.startswith('^update'):
                # updateTaskById → update_task
                entity = match.group(1)
                return 'update_' + to_snake_case(entity)
            elif pattern.startswith('^delete'):
                # deleteTaskById → delete_task
                entity = match.group(1)
                return 'delete_' + to_snake_case(entity)

    # Default: just convert to snake_case
    return to_snake_case(postgraphile_name)

def load_rust_resolvers(project_root):
    """Load actual Rust resolver names"""
    rust_queries = set()
    rust_mutations = set()

    schema_dir = Path(project_root) / 'graphql-rust-server' / 'src' / 'schema'

    # Load queries
    query_rs = schema_dir / 'query.rs'
    if query_rs.exists():
        content = query_rs.read_text()
        pattern = r'async fn (\w+)\('
        for match in re.finditer(pattern, content):
            rust_queries.add(match.group(1))

    # Load mutations
    mutation_rs = schema_dir / 'mutation.rs'
    if mutation_rs.exists():
        content = mutation_rs.read_text()
        pattern = r'async fn (\w+)\('
        for match in re.finditer(pattern, content):
            rust_mutations.add(match.group(1))

    return rust_queries, rust_mutations

def generate_migration_mapping(project_root):
    """Generate complete migration mapping"""

    rust_queries, rust_mutations = load_rust_resolvers(project_root)

    print("="*80)
    print("POSTGRAPHILE → RUST SCHEMA MIGRATION MAPPING")
    print("="*80)
    print()

    # Core naming pattern examples
    print("## Core Naming Patterns\n")
    print("| PostGraphile Pattern | Rust Pattern | Example |")
    print("|---------------------|--------------|---------|")
    print("| `all<Type>` | `<type>s` (plural) | `allTasks` → `tasks` |")
    print("| `<type>ById` | `<type>` | `taskById` → `task` |")
    print("| `create<Type>` | `create_<type>` | `createTask` → `create_task` |")
    print("| `update<Type>ById` | `update_<type>` | `updateTaskById` → `update_task` |")
    print("| `delete<Type>ById` | `delete_<type>` | `deleteTaskById` → `delete_task` |")
    print()

    # Connection type changes
    print("## Connection Type Changes\n")
    print("**PostGraphile:**")
    print("```graphql")
    print("allTasks(first: Int, offset: Int) {")
    print("  nodes { id title }")
    print("  totalCount")
    print("  pageInfo { hasNextPage }")
    print("}")
    print("```")
    print()
    print("**Rust:**")
    print("```graphql")
    print("tasks(limit: Int, offset: Int) {")
    print("  id")
    print("  title")
    print("}")
    print("```")
    print()
    print("**Changes:**")
    print("- Remove `.nodes` wrapper")
    print("- `first` parameter → `limit`")
    print("- No `totalCount` or `pageInfo` (implement separately if needed)")
    print("- `nodeId` field removed (use `id` directly)")
    print()

    # Input type changes
    print("## Input Type Changes\n")
    print("**PostGraphile:**")
    print("```graphql")
    print("createTask(input: CreateTaskInput!) {")
    print("  task { id title }")
    print("  clientMutationId")
    print("}")
    print()
    print("# Input wrapped:")
    print("input CreateTaskInput {")
    print("  task: TaskInput!")
    print("  clientMutationId: String")
    print("}")
    print("```")
    print()
    print("**Rust:**")
    print("```graphql")
    print("create_task(input: CreateTaskInput!) {")
    print("  id")
    print("  title")
    print("}")
    print()
    print("# Direct input:")
    print("input CreateTaskInput {")
    print("  title: String!")
    print("  description: String")
    print("  # ... direct fields")
    print("}")
    print("```")
    print()
    print("**Changes:**")
    print("- No nested `task` wrapper in input")
    print("- No `clientMutationId` (not needed)")
    print("- Direct field return (no `task` wrapper in response)")
    print()

    # Common operations mapping
    print("## Common Operations Mapping\n")

    common_mappings = [
        # Tasks
        ("allTasks", "tasks", "query", "List all tasks"),
        ("taskById", "task", "query", "Get single task"),
        ("createTask", "create_task", "mutation", "Create task"),
        ("updateTaskById", "update_task", "mutation", "Update task"),
        ("deleteTaskById", "delete_task", "mutation", "Delete task"),

        # Events
        ("allEvents", "events", "query", "List all events"),
        ("eventById", "event", "query", "Get single event"),
        ("createEvent", "create_event", "mutation", "Create event"),
        ("updateEventById", "update_event", "mutation", "Update event"),
        ("deleteEvent", "delete_event", "mutation", "Delete event"),

        # Users
        ("allUsers", "users", "query", "List all users"),
        ("userById", "user", "query", "Get single user"),
        ("createUser", "create_user", "mutation", "Create user"),
        ("updateUserById", "update_user", "mutation", "Update user"),
        ("deleteUserById", "delete_user", "mutation", "Delete user"),

        # Departments
        ("allDepartments", "departments", "query", "List all departments"),
        ("departmentById", "department", "query", "Get single department"),
        ("createDepartment", "create_department", "mutation", "Create department"),
        ("updateDepartment", "update_department", "mutation", "Update department"),
        ("deleteDepartment", "delete_department", "mutation", "Delete department"),

        # Notifications
        ("allNotifications", "notifications", "query", "List all notifications"),
        ("notificationById", "notification", "query", "Get single notification"),

        # Leave Requests
        ("allLeaveRequests", "leave_requests_by_user", "query", "List leave requests"),
        ("leaveRequestById", "leave_request", "query", "Get single leave request"),
        ("createLeaveRequest", "create_leave_request", "mutation", "Create leave request"),
        ("updateLeaveRequest", "update_leave_request", "mutation", "Update leave request"),
        ("approveLeaveRequest", "approve_leave_request", "mutation", "Approve leave request"),
        ("rejectLeaveRequest", "reject_leave_request", "mutation", "Reject leave request"),

        # Performance Reviews
        ("allPerformanceReviews", "performance_reviews", "query", "List performance reviews"),
        ("performanceReviewById", "performance_review", "query", "Get single review"),
        ("createPerformanceReview", "create_performance_review", "mutation", "Create review"),
        ("updatePerformanceReview", "update_performance_review", "mutation", "Update review"),

        # Goals
        ("allEmployeeGoals", "employee_goals", "query", "List employee goals"),
        ("employeeGoalById", "employee_goal", "query", "Get single goal"),
        ("createEmployeeGoal", "create_employee_goal", "mutation", "Create goal"),
        ("updateEmployeeGoal", "update_employee_goal", "mutation", "Update goal"),

        # Roles & Permissions
        ("allRoles", "roles", "query", "List all roles"),
        ("roleById", "role", "query", "Get single role"),
        ("allPermissions", "permissions", "query", "List all permissions"),
        ("permissionById", "permission", "query", "Get single permission"),
    ]

    print("| PostGraphile | Rust | Type | Description | Status |")
    print("|-------------|------|------|-------------|--------|")

    for pg_name, rust_name, op_type, description in common_mappings:
        # Check if Rust resolver exists
        if op_type == 'query':
            exists = rust_name in rust_queries
        else:
            exists = rust_name in rust_mutations

        status = "✅" if exists else "❌"
        print(f"| `{pg_name}` | `{rust_name}` | {op_type} | {description} | {status} |")

    print()

    # Files that need updating
    print("## Frontend Files Requiring Updates\n")

    graphql_dir = Path(project_root) / 'src' / 'lib' / 'graphql'
    files_needing_update = []

    for ts_file in graphql_dir.rglob('*.ts'):
        if ts_file.name in ['client.ts', 'config.ts', 'types.ts']:
            continue

        content = ts_file.read_text()

        # Check for PostGraphile patterns
        has_all_pattern = bool(re.search(r'\ball[A-Z]\w+\b', content))
        has_by_id_pattern = bool(re.search(r'\w+ById\b', content))
        has_create_pattern = bool(re.search(r'\bcreate[A-Z]\w+\b', content))
        has_update_pattern = bool(re.search(r'\bupdate[A-Z]\w+ById\b', content))
        has_nodes_pattern = bool(re.search(r'\.nodes\s*\{', content))
        has_total_count = bool(re.search(r'\btotalCount\b', content))

        if any([has_all_pattern, has_by_id_pattern, has_create_pattern, has_update_pattern, has_nodes_pattern, has_total_count]):
            files_needing_update.append({
                'path': str(ts_file.relative_to(project_root)),
                'patterns': {
                    'all<Type>': has_all_pattern,
                    '<type>ById': has_by_id_pattern,
                    'create<Type>': has_create_pattern,
                    'update<Type>ById': has_update_pattern,
                    '.nodes': has_nodes_pattern,
                    'totalCount': has_total_count,
                }
            })

    for file_info in sorted(files_needing_update, key=lambda x: x['path']):
        print(f"\n### {file_info['path']}")
        print("\n**Patterns to update:**")
        for pattern, has_pattern in file_info['patterns'].items():
            if has_pattern:
                print(f"- ✓ `{pattern}`")

    print()
    print("="*80)
    print(f"TOTAL FILES TO UPDATE: {len(files_needing_update)}")
    print("="*80)

    return files_needing_update

if __name__ == '__main__':
    import os
    project_root = Path(__file__).parent.parent.parent
    files_to_update = generate_migration_mapping(project_root)

    # Save to JSON for programmatic use
    output = {
        'files_to_update': files_to_update,
        'total_count': len(files_to_update)
    }

    output_path = project_root / 'tools' / 'schema-validator' / 'migration_mapping.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Migration mapping saved to: {output_path}")
