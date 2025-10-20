#!/usr/bin/env python3
"""
Remove .to_owned() from inline .foreign_key() calls.
These should be mutable references, not owned values.
"""

from pathlib import Path

def fix_file(filepath):
    """Remove .to_owned() from inline foreign_key calls."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    fixed_lines = []
    in_foreign_key = False
    in_table_create = False

    for i, line in enumerate(lines):
        # Track if we're inside a .foreign_key() call
        if '.foreign_key(' in line:
            in_foreign_key = True

        # Track table creation context
        if 'Table::create()' in line:
            in_table_create = True

        # If we're in a .foreign_key() call and see .to_owned(), remove it
        if in_foreign_key and in_table_create and '.on_delete(ForeignKeyAction::' in line and '.to_owned(),' in line:
            line = line.replace('.to_owned(),', ',')

        fixed_lines.append(line)

        # Exit foreign_key context when we see the closing ) at the right indentation
        if in_foreign_key and line.strip().startswith(')') and not line.strip().startswith('),'):
            # Check if this closes the .foreign_key() call
            if i + 1 < len(lines) and (
                '.foreign_key(' in lines[i+1] or
                '.to_owned()' in lines[i+1] or
                ')' in lines[i+1] or
                '.await' in lines[i+1]
            ):
                in_foreign_key = False

        # Exit table create when we see the final .to_owned() or )
        if in_table_create and ('.await?' in line):
            in_table_create = False

    with open(filepath, 'w') as f:
        f.writelines(fixed_lines)

    print(f"✓ Fixed {filepath.name}")

def main():
    migration_dir = Path('/home/chanway/Projects/SvelteHR/graphql-rust-server/migration')
    for migration_file in sorted(migration_dir.glob('m20251017_*.rs')):
        fix_file(migration_file)

    print("\n✅ Fixed all inline foreign_key calls!")

if __name__ == '__main__':
    main()
