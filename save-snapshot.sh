#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
TAG="snap-$(date +%Y%m%d-%H%M%S)"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo"; exit 1; }

DIRTY=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  DIRTY=1
  STASH_NAME="autosave-$TAG"
  git stash push -u -m "$STASH_NAME" >/dev/null
fi

if git remote get-url origin >/dev/null 2>&1; then
  git fetch origin >/dev/null 2>&1 || true
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git checkout "$BRANCH" >/dev/null 2>&1 || git checkout -B "$BRANCH"
    git pull --rebase origin "$BRANCH" || true
  fi
fi

if [ "$DIRTY" -eq 1 ]; then
  git stash pop >/dev/null 2>&1 || { echo "Resolve conflicts, then 'git add -A && git commit -m fix' and re-run."; exit 1; }
fi

git add -A
git commit -m "chore(snapshot): ${TAG}" --allow-empty

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin "$BRANCH"
  git tag -a "$TAG" -m "snapshot at $(date -u +"%F %T %Z")"
  git push origin "$TAG" || true
else
  git tag -a "$TAG" -m "snapshot at $(date -u +"%F %T %Z")"
fi

echo "Saved snapshot $TAG on $BRANCH"
