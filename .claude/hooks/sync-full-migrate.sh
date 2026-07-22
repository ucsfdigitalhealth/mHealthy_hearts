#!/bin/bash
# PostToolUse hook (Write|Edit|MultiEdit): reminds Claude to keep
# backend/migrations/full_migrate.sql in sync with other migration files.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [[ -z "$file_path" ]]; then
  exit 0
fi

if [[ "$file_path" =~ backend/migrations/[^/]+\.sql$ ]] && [[ "$file_path" != */full_migrate.sql ]]; then
  echo "You just edited/created a SQL migration file ($file_path). Review whether this schema change (new table, ALTER, column change, etc.) needs to be reflected in backend/migrations/full_migrate.sql (the single from-scratch DB setup file), and update it accordingly to keep it in sync."
fi

exit 0
