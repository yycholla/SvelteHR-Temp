#!/usr/bin/env python3
"""
Fix SeaORM migration syntax errors by adding .to_owned() where needed.
"""

import re
from pathlib import Path

def fix_migration_file(filepath):
    """Fix a single migration file."""
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    fixed_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Pattern 1: Table/Index creation needs .to_owned() before ),
        # Look for:                     ), followed by newline with             )
        if (i < len(lines) - 1 and
            line.strip() == '),' and
            i > 0 and
            (lines[i-1].strip().startswith('.col(') or
             lines[i-1].strip().startswith('.unique()') or
             lines[i-1].strip().endswith(')'))):

            # Check if next line is a closing paren for manager.create_table/create_index
            next_line = lines[i+1] if i+1 < len(lines) else ''
            if next_line.strip() == ')':
                # This is a Table::create() or Index::create() closing
                # Replace ), with .to_owned(),
                fixed_lines.append(line.replace('),', '.to_owned(),'))
                i += 1
                continue

        # Pattern 2: Standalone create_foreign_key needs .to_owned() before ),
        # Look for .on_delete(...) followed by ),
        if (line.strip() == '),' and
            i > 0 and
            '.on_delete(ForeignKeyAction::' in lines[i-1]):

            # Check if this is standalone create_foreign_key (not inline .foreign_key())
            # Look back to see if we're inside .create_foreign_key(
            lookback = min(i, 10)
            is_standalone = False
            for j in range(i-1, max(0, i-lookback), -1):
                if '.create_foreign_key(' in lines[j]:
                    is_standalone = True
                    break
                if '.foreign_key(' in lines[j]:
                    is_standalone = False
                    break

            if is_standalone:
                fixed_lines.append(line.replace('),', '.to_owned(),'))
                i += 1
                continue

        # Pattern 3: Inline .foreign_key() should NOT have ), after .on_delete(...)
        # Just keep the line as-is (already fixed by manual edits or bash script)

        fixed_lines.append(line)
        i += 1

    # Write back
    with open(filepath, 'w') as f:
        f.write('\n'.join(fixed_lines))

    print(f"✓ Fixed {filepath.name}")

def main():
    migration_dir = Path('/home/chanway/Projects/SvelteHR/graphql-rust-server/migration')

    # Fix all migration files except lib.rs and main.rs
    for migration_file in sorted(migration_dir.glob('m20251017_*.rs')):
        fix_migration_file(migration_file)

    print("\n✅ All migration files fixed!")

if __name__ == '__main__':
    main()
