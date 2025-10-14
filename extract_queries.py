#!/usr/bin/env python3
import re
import os
from pathlib import Path
from collections import defaultdict

# Find all .server.ts files
server_files = list(Path('src/routes').rglob('*.server.ts'))

# Dictionary to store queries by type
queries_by_type = defaultdict(set)

print(f"Found {len(server_files)} server files to analyze\n")

for file_path in server_files:
    try:
        content = file_path.read_text()

        # Extract GraphQL queries using regex
        # Match query blocks between backticks or quotes
        query_pattern = r'query\s+(\w+)[^{]*\{([^}]+\{[^}]*\}[^}]*)*\}'

        matches = re.findall(query_pattern, content, re.DOTALL)

        for query_name, query_body in matches:
            # Determine query type from name or body
            query_type = None
            if 'user' in query_name.lower() or 'employee' in query_name.lower():
                query_type = 'users'
            elif 'department' in query_name.lower():
                query_type = 'departments'
            elif 'event' in query_name.lower():
                query_type = 'events'
            elif 'notification' in query_name.lower():
                query_type = 'notifications'
            elif 'task' in query_name.lower():
                query_type = 'tasks'
            elif 'leave' in query_name.lower():
                query_type = 'leave_requests'
            elif 'review' in query_name.lower() or 'performance' in query_name.lower():
                query_type = 'performance_reviews'

            if query_type:
                # Extract field names from query body
                field_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s|$|\{)'
                fields = re.findall(field_pattern, query_body)
                # Filter out GraphQL keywords
                keywords = {'query', 'mutation', 'subscription', 'fragment', 'on', 'Int', 'String', 'Boolean', 'Float', 'ID', 'limit', 'offset', 'first', 'condition'}
                fields = [f for f in fields if f not in keywords]
                queries_by_type[query_type].update(fields)

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# Print results
print("="*60)
print("FRONTEND GRAPHQL QUERY EXPECTATIONS")
print("="*60)
print()

for query_type, fields in sorted(queries_by_type.items()):
    print(f"\n=== {query_type.upper()} ===")
    for field in sorted(fields):
        print(f"  {field}")

print("\n" + "="*60)
print(f"Total types analyzed: {len(queries_by_type)}")
