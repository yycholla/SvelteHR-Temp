#!/usr/bin/env python3
"""
Fix SeaORM migrations to use execute_unprepared() for raw SQL
instead of Query::select().expr(Expr::cust(...))
"""

import re
import sys
from pathlib import Path

def fix_migration_file(filepath):
    """Fix a single migration file"""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Pattern 1: Multi-line format with exec_stmt + Query::select() + expr(Expr::cust(...))
    pattern1 = r'manager\s*\n\s*\.exec_stmt\(\s*\n\s*sea_query::Query::select\(\)\s*\n\s*\.expr\(Expr::cust\(\s*\n\s*"([^"]+)"\s*\n\s*\)\)\s*\n\s*\.to_owned\(\),?\s*\n\s*\)\s*\n\s*\.await\?'
    replacement1 = r'manager\n            .get_connection()\n            .execute_unprepared("\1")\n            .await?'
    content = re.sub(pattern1, replacement1, content)

    # Pattern 2: Single-line format
    pattern2 = r'manager\s*\.exec_stmt\(\s*sea_query::Query::select\(\)\s*\.expr\(Expr::cust\("([^"]+)"\)\)\s*\.to_owned\(\),?\s*\)\s*\.await\?'
    replacement2 = r'manager.get_connection().execute_unprepared("\1").await?'
    content = re.sub(pattern2, replacement2, content)

    # Pattern 3: More variations with different whitespace
    pattern3 = r'manager\s*\n\s*\.exec_stmt\(\s*\n\s*sea_query::Query::select\(\)\s*\n\s*\.expr\(Expr::cust\("([^"]+)"\)\)\s*\n\s*\.to_owned\(\),?\s*\n\s*\)\s*\n\s*\.await\?'
    replacement3 = r'manager\n            .get_connection()\n            .execute_unprepared("\1")\n            .await?'
    content = re.sub(pattern3, replacement3, content)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    migration_dir = Path(__file__).parent / 'migration'

    if not migration_dir.exists():
        print(f"Migration directory not found: {migration_dir}")
        return 1

    fixed_count = 0
    for migration_file in migration_dir.glob('m*.rs'):
        if fix_migration_file(migration_file):
            print(f"Fixed: {migration_file.name}")
            fixed_count += 1
        else:
            print(f"No changes: {migration_file.name}")

    print(f"\nFixed {fixed_count} file(s)")
    return 0

if __name__ == '__main__':
    sys.exit(main())
