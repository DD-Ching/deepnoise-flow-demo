# Public Release Plan (Safety First)

## Goal

Publish DeepNoise Flow as a **new public repository with a single clean initial commit** and no private/internal history.

## Plan

1. Sanitize working tree.
- Remove legacy private/internal content.
- Remove logs, caches, temp files, local artifacts, and stale outputs.
- Keep only files required for the public demo.

2. Run security checks.
- Run `./scripts/security_scan.sh`.
- Run `./scripts/public_release_check.sh`.
- Fix any findings before export.

3. Prepare a fresh public snapshot.
- Use the current sanitized working tree as the source.
- Create a new directory for public release export.
- Initialize a brand-new git repository there.
- Create one initial commit only.

4. Publish the new repository.
- Push the clean repo to a brand-new GitHub repository.
- Do not push old private history.

## Recommended Safe Workflow

```bash
# from sanitized private repo
./scripts/security_scan.sh
./scripts/public_release_check.sh

# export tracked clean snapshot
mkdir -p ../DeepNoise-public
git archive --format=tar HEAD | tar -x -C ../DeepNoise-public

# initialize fresh history
cd ../DeepNoise-public
git init -b main
git add .
git commit -m "Initial public release: DeepNoise Flow showcase"
```

## Optional History-Rewrite Path (if needed)

If you must keep the same repository, use history rewrite and force-push.

1. Ensure credentials are rotated first if they may have leaked.
2. Rewrite history with `git filter-repo` (preferred) or `git filter-branch`.
3. Force-push rewritten branches/tags.
4. Require all collaborators to re-clone.

This path is riskier than creating a new clean repository.

Example `git filter-repo` command:

```bash
pip install git-filter-repo
git filter-repo --force --invert-paths \
  --path .runlogs \
  --path .firebase \
  --path frontend/.vite \
  --path ui/.vite \
  --path _reactflow_examples \
  --path "Screenshot 2026-03-06 at 16.46.48.png" \
  --path "Screenshot 2026-03-06 at 16.47.03.png" \
  --path TEST0001.m4a \
  --path TEST0002.m4a \
  --path AGENTS.md \
  --path .firebaserc \
  --path firebase.json
```
