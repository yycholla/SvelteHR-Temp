#!/usr/bin/env python3
"""
Schema Alignment Verifier
Compares frontend GraphQL operations against Rust API implementation
"""

import re
import os
import json
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import List, Dict, Set, Optional

@dataclass
class FrontendOperation:
    name: str  # e.g., "allTasks", "taskById"
    type: str  # query or mutation
    file: str
    raw_query: str

@dataclass
class RustResolver:
    name: str  # e.g., "task", "tasks"
    type: str  # query or mutation
    file: str

class SchemaAlignmentVerifier:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.frontend_ops: List[FrontendOperation] = []
        self.rust_resolvers: List[RustResolver] = []

    def extract_frontend_operations(self):
        """Extract operation names from frontend GraphQL queries"""
        graphql_dir = self.project_root / 'src' / 'lib' / 'graphql'

        for ts_file in graphql_dir.rglob('*.ts'):
            if ts_file.name in ['client.ts', 'config.ts', 'types.ts'] or '.bak' in str(ts_file):
                continue

            content = ts_file.read_text()

            # Find all gql`` template literals
            pattern = r'export const ([A-Z_]+) = gql`\s*(query|mutation|subscription)\s+(\w+)'
            for match in re.finditer(pattern, content):
                const_name = match.group(1)
                op_type = match.group(2)
                op_name = match.group(3)

                # Extract the full query body
                full_pattern = rf'export const {const_name} = gql`(.*?)`'
                full_match = re.search(full_pattern, content, re.DOTALL)
                if full_match:
                    query_body = full_match.group(1)

                    # Extract the actual operation being called (e.g., "allTasks", "taskById")
                    # Look for the first field after the operation type
                    field_pattern = r'(?:query|mutation|subscription)\s+\w+[^{]*\{[\s\n]*(\w+)'
                    field_match = re.search(field_pattern, query_body)

                    if field_match:
                        called_operation = field_match.group(1)
                        self.frontend_ops.append(FrontendOperation(
                            name=called_operation,
                            type=op_type,
                            file=str(ts_file.relative_to(self.project_root)),
                            raw_query=query_body.strip()
                        ))

    def extract_rust_resolvers(self):
        """Extract resolver function names from Rust API"""
        schema_dir = self.project_root / 'graphql-rust-server' / 'src' / 'schema'

        # Extract queries
        query_rs = schema_dir / 'query.rs'
        if query_rs.exists():
            content = query_rs.read_text()
            pattern = r'async fn (\w+)\('
            for match in re.finditer(pattern, content):
                resolver_name = match.group(1)
                self.rust_resolvers.append(RustResolver(
                    name=resolver_name,
                    type='query',
                    file='graphql-rust-server/src/schema/query.rs'
                ))

        # Extract mutations
        mutation_rs = schema_dir / 'mutation.rs'
        if mutation_rs.exists():
            content = mutation_rs.read_text()
            pattern = r'async fn (\w+)\('
            for match in re.finditer(pattern, content):
                resolver_name = match.group(1)
                self.rust_resolvers.append(RustResolver(
                    name=resolver_name,
                    type='mutation',
                    file='graphql-rust-server/src/schema/mutation.rs'
                ))

    def analyze_postgraphile_vs_rust(self):
        """Analyze PostGraphile naming conventions vs Rust implementation"""
        print("\n" + "="*80)
        print("POSTGRAPHILE VS RUST API NAMING ANALYSIS")
        print("="*80 + "\n")

        # Group frontend operations by file
        ops_by_file = defaultdict(list)
        for op in self.frontend_ops:
            ops_by_file[op.file].append(op)

        # Rust resolver lookup
        rust_query_names = {r.name.lower() for r in self.rust_resolvers if r.type == 'query'}
        rust_mutation_names = {r.name.lower() for r in self.rust_resolvers if r.type == 'mutation'}

        total_ops = 0
        missing_ops = []
        naming_mismatches = []

        for file_path in sorted(ops_by_file.keys()):
            ops = ops_by_file[file_path]
            print(f"\n📁 {file_path}")
            print("-" * 80)

            for op in ops:
                total_ops += 1
                op_name_lower = op.name.lower()

                # Check if operation exists in Rust API
                if op.type == 'query':
                    rust_names = rust_query_names
                elif op.type == 'mutation':
                    rust_names = rust_mutation_names
                else:
                    continue

                # PostGraphile naming patterns
                is_postgraphile = any([
                    op.name.startswith('all'),     # allTasks
                    op.name.endswith('ById'),      # taskById
                    op.name.endswith('ByIds'),     # tasksByIds
                    op.name.startswith('create'),  # createTask
                    op.name.startswith('update'),  # updateTaskById
                    op.name.startswith('delete'),  # deleteTaskById
                ])

                # Try to find matching Rust resolver
                found = op_name_lower in rust_names

                # Try alternative names
                alternatives = []
                if op.name.startswith('all'):
                    # allTasks -> tasks
                    alternatives.append(op.name[3:].lower())
                if op.name.endswith('ById'):
                    # taskById -> task
                    alternatives.append(op.name[:-4].lower())
                if op.name.startswith('create'):
                    # createTask -> create_task
                    alternatives.append(op.name.lower())
                if op.name.startswith('update'):
                    # updateTaskById -> update_task
                    base = op.name.replace('ById', '').lower()
                    alternatives.append(base)

                found_alternative = any(alt in rust_names for alt in alternatives)

                if found:
                    status = "✅ FOUND"
                elif found_alternative:
                    status = "⚠️  NAMING MISMATCH"
                    matching_alt = [alt for alt in alternatives if alt in rust_names][0]
                    naming_mismatches.append({
                        'frontend': op.name,
                        'rust': matching_alt,
                        'file': file_path
                    })
                else:
                    status = "❌ MISSING"
                    missing_ops.append({
                        'name': op.name,
                        'type': op.type,
                        'file': file_path,
                        'is_postgraphile': is_postgraphile
                    })

                postgraphile_marker = " (PostGraphile)" if is_postgraphile else ""
                print(f"  {status} - {op.type.upper()}: {op.name}{postgraphile_marker}")

        # Summary
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Total Frontend Operations: {total_ops}")
        print(f"Found in Rust API: {total_ops - len(missing_ops)}")
        print(f"Missing from Rust API: {len(missing_ops)}")
        print(f"Naming Mismatches: {len(naming_mismatches)}")

        if missing_ops:
            print(f"\n❌ MISSING OPERATIONS ({len(missing_ops)}):")
            print("-" * 80)
            postgraphile_missing = [op for op in missing_ops if op['is_postgraphile']]
            custom_missing = [op for op in missing_ops if not op['is_postgraphile']]

            if postgraphile_missing:
                print(f"\nPostGraphile Conventions ({len(postgraphile_missing)}):")
                for op in postgraphile_missing:
                    print(f"  • {op['type'].upper()}: {op['name']} ({op['file']})")

            if custom_missing:
                print(f"\nCustom Operations ({len(custom_missing)}):")
                for op in custom_missing:
                    print(f"  • {op['type'].upper()}: {op['name']} ({op['file']})")

        if naming_mismatches:
            print(f"\n⚠️  NAMING MISMATCHES ({len(naming_mismatches)}):")
            print("-" * 80)
            for mismatch in naming_mismatches[:20]:  # Show first 20
                print(f"  Frontend: {mismatch['frontend']}")
                print(f"  Rust:     {mismatch['rust']}")
                print(f"  File:     {mismatch['file']}")
                print()

        # Calculate actual alignment
        aligned = total_ops - len(missing_ops) - len(naming_mismatches)
        alignment_pct = (aligned / total_ops * 100) if total_ops > 0 else 0

        print(f"\n🎯 ACTUAL ALIGNMENT RATE: {alignment_pct:.1f}%")
        print(f"   ({aligned}/{total_ops} operations correctly aligned)")

        return {
            'total': total_ops,
            'aligned': aligned,
            'missing': len(missing_ops),
            'naming_mismatches': len(naming_mismatches),
            'alignment_pct': alignment_pct
        }

    def run(self):
        print("🔍 Extracting frontend GraphQL operations...")
        self.extract_frontend_operations()
        print(f"   Found {len(self.frontend_ops)} frontend operations")

        print("🦀 Extracting Rust API resolvers...")
        self.extract_rust_resolvers()
        print(f"   Found {len(self.rust_resolvers)} Rust resolvers")

        return self.analyze_postgraphile_vs_rust()

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    verifier = SchemaAlignmentVerifier(project_root)
    results = verifier.run()
