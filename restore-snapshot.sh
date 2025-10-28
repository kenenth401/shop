#!/usr/bin/env bash
set -euo pipefail
TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Usage: ./restore-snapshot.sh <tag>"
  exit 1
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo"; exit 1; }

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Uncommitted changes detected; consider 'git stash' first."
fi

git fetch --all --tags >/dev/null 2>&1 || true
git rev-parse "$TAG" >/dev/null 2>&1 || { echo "Tag not found: $TAG"; exit 1; }

RESTORE_BRANCH="restore-$TAG"
git checkout -B "$RESTORE_BRANCH" "$TAG"
echo "Checked out $RESTORE_BRANCH at $TAG"
