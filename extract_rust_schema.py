#!/usr/bin/env python3
"""
Extract database schema from Rust SeaORM models.
Generates a complete SQL schema definition.
"""

import re
import os
from pathlib import Path
from collections import defaultdict

def parse_rust_model(file_path):
    """Parse a Rust model file and extract table schema."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract table name
    table_match = re.search(r'#\[sea_orm\(table_name = "([^"]+)"(?:, schema_name = "([^"]+)")?\)\]', content)
    if not table_match:
        return None

    table_name = table_match.group(1)
    schema_name = table_match.group(2) or "public"

    # Extract struct fields
    struct_match = re.search(r'pub struct Model \{(.*?)\}', content, re.DOTALL)
    if not struct_match:
        return None

    struct_body = struct_match.group(1)

    fields = []
    for line in struct_body.split('\n'):
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith('//') or line.startswith('#'):
            continue

        # Parse field definition
        field_match = re.match(r'pub (\w+): (.+),?$', line)
        if field_match:
            field_name = field_match.group(1)
            field_type = field_match.group(2).rstrip(',')

            # Check for primary_key attribute
            is_primary = '#[sea_orm(primary_key' in content and field_name in content

            fields.append({
                'name': field_name,
                'rust_type': field_type,
                'is_primary': is_primary
            })

    # Extract enums
    enums = re.findall(r'pub enum (\w+) \{(.*?)\}', content, re.DOTALL)

    # Extract relations
    relation_match = re.search(r'pub enum Relation \{(.*?)\}', content, re.DOTALL)
    relations = []
    if relation_match:
        relation_body = relation_match.group(1)
        for rel in re.finditer(r'#\[sea_orm\((.*?)\)\]', relation_body, re.DOTALL):
            relations.append(rel.group(1))

    return {
        'table_name': table_name,
        'schema_name': schema_name,
        'fields': fields,
        'enums': enums,
        'relations': relations
    }

def rust_type_to_sql(rust_type):
    """Convert Rust type to PostgreSQL type."""
    type_map = {
        'Uuid': 'UUID',
        'String': 'TEXT',
        'i32': 'INTEGER',
        'i64': 'BIGINT',
        'f64': 'DOUBLE PRECISION',
        'bool': 'BOOLEAN',
        'DateTime<Utc>': 'TIMESTAMPTZ',
        'JsonValue': 'JSONB',
    }

    # Handle Option types
    if rust_type.startswith('Option<'):
        inner = rust_type[7:-1]
        base_type = type_map.get(inner, 'TEXT')
        return f'{base_type}'

    return type_map.get(rust_type, 'TEXT')

def main():
    models_dir = Path('/home/chanway/Projects/SvelteHR/graphql-rust-server/src/models')

    schemas = defaultdict(list)

    for model_file in models_dir.rglob('*.rs'):
        if 'generated' in str(model_file) or model_file.name == 'mod.rs':
            continue

        schema = parse_rust_model(model_file)
        if schema:
            schemas[schema['schema_name']].append(schema)
            print(f"✓ {schema['table_name']}: {len(schema['fields'])} fields")

    print(f"\n📊 Summary:")
    for schema_name, tables in schemas.items():
        print(f"  Schema '{schema_name}': {len(tables)} tables")

    print(f"\n📋 Tables by schema:")
    for schema_name, tables in sorted(schemas.items()):
        print(f"\n{schema_name}:")
        for table in sorted(tables, key=lambda t: t['table_name']):
            print(f"  - {table['table_name']}")

if __name__ == '__main__':
    main()
