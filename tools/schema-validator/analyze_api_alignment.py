#!/usr/bin/env python3
"""
Complete API Alignment Analyzer
Extracts all GraphQL operations from frontend and maps to database schema
"""

import re
import os
import json
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import List, Dict, Set, Optional

@dataclass
class GraphQLOperation:
    name: str
    operation_type: str  # query, mutation, subscription
    file_path: str
    fields: List[str]
    arguments: List[str]
    raw_query: str

@dataclass
class DatabaseTable:
    schema_name: str
    table_name: str
    columns: List[Dict[str, str]]
    indexes: List[str]
    foreign_keys: List[str]

class APIAlignmentAnalyzer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.graphql_operations: List[GraphQLOperation] = []
        self.database_tables: Dict[str, DatabaseTable] = {}
        self.rust_resolvers: Set[str] = set()

    def extract_graphql_operations(self):
        """Extract all GraphQL operations from frontend files"""
        graphql_dir = self.project_root / 'src' / 'lib' / 'graphql'

        for ts_file in graphql_dir.rglob('*.ts'):
            if ts_file.name in ['client.ts', 'config.ts', 'types.ts'] or '.bak' in str(ts_file):
                continue

            content = ts_file.read_text()

            # Pattern to match: export const OPERATION_NAME = gql`...`
            pattern = r'export const ([A-Z_]+) = gql`\n(.*?)\n`'
            matches = re.finditer(pattern, content, re.DOTALL)

            for match in matches:
                op_name = match.group(1)
                query_body = match.group(2)

                # Determine operation type
                op_type = 'query'
                if query_body.strip().startswith('mutation'):
                    op_type = 'mutation'
                elif query_body.strip().startswith('subscription'):
                    op_type = 'subscription'

                # Extract fields (simplified - would need proper GraphQL parser for accuracy)
                fields = self._extract_fields(query_body)

                # Extract arguments
                args = self._extract_arguments(query_body)

                operation = GraphQLOperation(
                    name=op_name,
                    operation_type=op_type,
                    file_path=str(ts_file.relative_to(self.project_root)),
                    fields=fields,
                    arguments=args,
                    raw_query=query_body
                )

                self.graphql_operations.append(operation)

    def _extract_fields(self, query: str) -> List[str]:
        """Extract field names from GraphQL query"""
        # Simplified extraction - looks for field names
        fields = []
        for line in query.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('}'):
                # Extract word before colon or opening brace
                match = re.match(r'([a-zA-Z_][a-zA-Z0-9_]*)', line)
                if match:
                    fields.append(match.group(1))
        return list(set(fields))  # Unique fields

    def _extract_arguments(self, query: str) -> List[str]:
        """Extract argument names from GraphQL query"""
        args = []
        # Look for $argumentName: Type pattern
        pattern = r'\$([a-zA-Z_][a-zA-Z0-9_]*)'
        for match in re.finditer(pattern, query):
            args.append(match.group(1))
        return list(set(args))

    def extract_database_schema(self):
        """Extract database schema from migrations"""
        migrations_dir = self.project_root / 'migrations'

        # Read main schema file
        main_schema = migrations_dir / '20250925_002_create_schema.sql'
        if main_schema.exists():
            content = main_schema.read_text()
            self._parse_schema_sql(content)

    def _parse_schema_sql(self, sql: str):
        """Parse SQL to extract table definitions"""
        # Pattern to match CREATE TABLE statements
        pattern = r'CREATE TABLE ([a-z_]+\.[a-z_]+) \((.*?)\);'
        matches = re.finditer(pattern, sql, re.DOTALL | re.IGNORECASE)

        for match in matches:
            full_table_name = match.group(1)
            columns_sql = match.group(2)

            schema_name, table_name = full_table_name.split('.')

            columns = []
            for line in columns_sql.split(',\n'):
                line = line.strip()
                if line and not line.startswith('CONSTRAINT'):
                    # Extract column name and type
                    col_match = re.match(r'([a-z_]+)\s+([a-z_\(\),\s]+)', line, re.IGNORECASE)
                    if col_match:
                        columns.append({
                            'name': col_match.group(1),
                            'type': col_match.group(2).strip()
                        })

            self.database_tables[table_name] = DatabaseTable(
                schema_name=schema_name,
                table_name=table_name,
                columns=columns,
                indexes=[],
                foreign_keys=[]
            )

    def extract_rust_resolvers(self):
        """Extract resolver names from Rust API"""
        rust_dir = self.project_root / 'graphql-rust-server' / 'src'

        # Check query.rs
        query_rs = rust_dir / 'schema' / 'query.rs'
        if query_rs.exists():
            content = query_rs.read_text()
            # Pattern: async fn resolver_name(...) -> Result
            pattern = r'async fn ([a-z_]+)\('
            for match in re.finditer(pattern, content):
                self.rust_resolvers.add(match.group(1))

        # Check mutation.rs
        mutation_rs = rust_dir / 'schema' / 'mutation.rs'
        if mutation_rs.exists():
            content = mutation_rs.read_text()
            pattern = r'async fn ([a-z_]+)\('
            for match in re.finditer(pattern, content):
                self.rust_resolvers.add(match.group(1))

    def generate_alignment_report(self) -> str:
        """Generate comprehensive alignment report"""
        report = []
        report.append("# COMPLETE API ALIGNMENT ANALYSIS")
        report.append("**SvelteHR - Frontend → PostgreSQL → Rust GraphQL API**\n")
        report.append(f"**Generated: {self._current_timestamp()}**\n")
        report.append("---\n")

        # Summary
        report.append("## Executive Summary\n")
        report.append(f"- **GraphQL Operations**: {len(self.graphql_operations)}")
        report.append(f"- **Database Tables**: {len(self.database_tables)}")
        report.append(f"- **Rust Resolvers**: {len(self.rust_resolvers)}\n")

        # Operations by type
        queries = [op for op in self.graphql_operations if op.operation_type == 'query']
        mutations = [op for op in self.graphql_operations if op.operation_type == 'mutation']
        subscriptions = [op for op in self.graphql_operations if op.operation_type == 'subscription']

        report.append(f"- **Queries**: {len(queries)}")
        report.append(f"- **Mutations**: {len(mutations)}")
        report.append(f"- **Subscriptions**: {len(subscriptions)}\n")
        report.append("---\n")

        # Operations organized by file
        report.append("## All GraphQL Operations\n")

        operations_by_file = defaultdict(list)
        for op in self.graphql_operations:
            operations_by_file[op.file_path].append(op)

        for file_path in sorted(operations_by_file.keys()):
            report.append(f"### {file_path}\n")

            for op in operations_by_file[file_path]:
                report.append(f"#### `{op.name}` ({op.operation_type.upper()})\n")

                if op.arguments:
                    report.append("**Arguments:**")
                    for arg in sorted(op.arguments):
                        report.append(f"- `${arg}`")
                    report.append("")

                if op.fields:
                    report.append("**Fields Used:**")
                    for field in sorted(op.fields)[:20]:  # Limit to first 20
                        report.append(f"- `{field}`")
                    if len(op.fields) > 20:
                        report.append(f"- *... and {len(op.fields) - 20} more*")
                    report.append("")

                report.append("```graphql")
                report.append(op.raw_query.strip())
                report.append("```\n")

        # Database Tables
        report.append("---\n")
        report.append("## Database Schema\n")

        for table_name in sorted(self.database_tables.keys()):
            table = self.database_tables[table_name]
            report.append(f"### `{table.schema_name}.{table.table_name}`\n")

            report.append("**Columns:**\n")
            for col in table.columns:
                report.append(f"- `{col['name']}`: {col['type']}")
            report.append("")

        # Rust Resolvers
        report.append("---\n")
        report.append("## Rust API Resolvers\n")
        report.append(f"Total resolvers implemented: {len(self.rust_resolvers)}\n")

        for resolver in sorted(self.rust_resolvers):
            report.append(f"- `{resolver}()`")
        report.append("")

        # Alignment Analysis
        report.append("---\n")
        report.append("## Alignment Analysis\n")

        # Check which operations have corresponding resolvers
        operation_names = {op.name.lower() for op in self.graphql_operations}
        resolver_names = {r.lower() for r in self.rust_resolvers}

        missing_resolvers = operation_names - resolver_names
        if missing_resolvers:
            report.append("### Missing Rust Resolvers\n")
            report.append("These GraphQL operations don't have corresponding Rust resolvers:\n")
            for name in sorted(missing_resolvers):
                report.append(f"- `{name}`")
            report.append("")

        # Check which tables are queried
        tables_referenced = set()
        for op in self.graphql_operations:
            for field in op.fields:
                # Try to match field to table name (simplified)
                field_lower = field.lower()
                for table_name in self.database_tables.keys():
                    if table_name.lower() in field_lower or field_lower in table_name.lower():
                        tables_referenced.add(table_name)

        unreferenced_tables = set(self.database_tables.keys()) - tables_referenced
        if unreferenced_tables:
            report.append("### Potentially Unreferenced Tables\n")
            report.append("These database tables might not be queried by frontend:\n")
            for table in sorted(unreferenced_tables):
                report.append(f"- `{table}`")
            report.append("")

        return "\n".join(report)

    def _current_timestamp(self) -> str:
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def run(self):
        """Run complete analysis"""
        print("🔍 Extracting GraphQL operations from frontend...")
        self.extract_graphql_operations()
        print(f"   Found {len(self.graphql_operations)} operations")

        print("🗄️  Extracting database schema from migrations...")
        self.extract_database_schema()
        print(f"   Found {len(self.database_tables)} tables")

        print("🦀 Extracting Rust API resolvers...")
        self.extract_rust_resolvers()
        print(f"   Found {len(self.rust_resolvers)} resolvers")

        print("📊 Generating alignment report...")
        report = self.generate_alignment_report()

        output_file = self.project_root / 'COMPLETE_API_CATALOG.md'
        output_file.write_text(report)
        print(f"✅ Complete report generated: {output_file}")

        return report

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    analyzer = APIAlignmentAnalyzer(project_root)
    analyzer.run()
