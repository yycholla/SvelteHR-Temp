#!/usr/bin/env python3
import os
import re
from pathlib import Path

def fix_object_names():
    models_dir = Path("graphql-rust-server/src/models")

    for rs_file in models_dir.rglob("*.rs"):
        content = rs_file.read_text()
        original_content = content

        # Find all #[Object] without name attribute
        pattern = r'(#\[Object\])(?!\s*\(?\s*name\s*=)'

        def replace_object(match):
            # Get the next impl line to determine the type name
            start_pos = match.end()
            impl_match = re.search(r'impl\s+(\w+)', content[start_pos:])
            if impl_match:
                type_name = impl_match.group(1)
                # Create a unique name based on file path and type
                file_parts = rs_file.relative_to(models_dir).parts
                module_name = '_'.join(file_parts[:-1] + (rs_file.stem,))
                unique_name = f"{module_name}_{type_name}".replace('/', '_').replace('\\', '_')
                return f'#[Object(name = "{unique_name}")]'
            return match.group(0)

        content = re.sub(pattern, replace_object, content)

        if content != original_content:
            rs_file.write_text(content)
            print(f"Updated {rs_file}")

if __name__ == "__main__":
    fix_object_names()