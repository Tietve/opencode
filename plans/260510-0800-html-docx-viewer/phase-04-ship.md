---
phase: 4
title: "Verify, commit, PR, review, merge"
status: pending
priority: P2
effort: "30m"
dependencies: [1, 2, 3]
---

# Phase 4: Ship

## Overview
Run typecheck + lint, commit on the designated branch, push, open PR, spawn an agent to review the PR, merge once review passes.

## Implementation Steps

1. **Typecheck**
   - `cd /home/user/opencode/packages/ui && bun run typecheck`
   - Fix any errors before proceeding

2. **Install dep** (only if lockfile sync needed for typecheck)
   - `cd /home/user/opencode && bun install` (best-effort; may fail offline → still commit, CI handles)

3. **Branch + commit**
   - Repo: `tietve/opencode`
   - Branch: `claude/add-file-type-support-Rcpui`
   - `git checkout -b claude/add-file-type-support-Rcpui` (or checkout if exists)
   - Stage only files in scope (no `git add -A`):
     - `packages/ui/src/pierre/media.ts`
     - `packages/ui/src/components/file-media.tsx`
     - `packages/ui/src/i18n/en.ts`
     - `packages/ui/package.json`
     - `bun.lock` (if regenerated)
     - `plans/260510-0800-html-docx-viewer/`
   - Conventional commit:
     ```
     feat(ui): add HTML and DOCX preview in review sidebar

     Adds renderers for `.html`, `.htm`, `.docx` files to FileMedia.
     HTML files render via sandboxed iframe (no scripts/network).
     DOCX files convert client-side via lazy-loaded mammoth.js
     and render through the same sandboxed iframe.

     Backend untouched — sdk.client.file.read already returns
     binary content as base64.
     ```

4. **Push**
   - `git push -u origin claude/add-file-type-support-Rcpui`
   - Retry up to 4x with exponential backoff on network errors only

5. **Open PR**
   - Use `mcp__github__create_pull_request`
   - Repo: `tietve/opencode`, base: `dev` (or default branch — verify via list_branches)
   - Title: `feat(ui): preview HTML and DOCX in review sidebar`
   - Body: summary + screenshot placeholder + test plan

6. **Agent review**
   - Spawn `code-review` skill / general-purpose agent against the PR diff
   - Focus: XSS surface, iframe sandbox correctness, mammoth lazy import, type safety, i18n key coverage
   - Wait for review report

7. **Merge**
   - If review clean → `mcp__github__merge_pull_request` with squash
   - If review has blockers → fix, push, re-review, then merge

## Success Criteria
- [ ] Typecheck passes
- [ ] PR open on `tietve/opencode`
- [ ] Agent review report attached / posted as PR comment
- [ ] PR merged

## Risk Assessment
- Branch may already exist from prior session → check + fast-forward
- Default branch may not be `main` — verify before opening PR
- bun install offline → skip; CI will resolve
