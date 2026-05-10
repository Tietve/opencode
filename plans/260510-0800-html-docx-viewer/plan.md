---
title: "HTML & DOCX viewer in opencode review sidebar"
status: in-progress
priority: P2
mode: fast
scope: project
created: 2026-05-10
branch: claude/add-file-type-support-Rcpui
repo: tietve/opencode
---

# HTML & DOCX viewer in opencode review sidebar

## Problem
Khi click file `.docx` ở review sidebar (right panel) của opencode → hiển thị "Binary file / {{path}} is binary". File `.html` → render raw source code.
User muốn xem được nội dung trực tiếp.

## Goal
Frontend-only: thêm renderer cho `.html` (iframe sandbox) và `.docx` (mammoth.js → HTML). Không động vào backend — endpoint `sdk.client.file.read` đã trả binary base64 sẵn.

## Out of Scope
- Backend / endpoint thay đổi
- File `.doc` (định dạng cũ, không được mammoth hỗ trợ tốt) — skip
- File `.pdf`, `.xlsx`, `.pptx` — không trong yêu cầu
- Edit/save back: chỉ view-only

## Architecture

### Current flow
```
Click file → SessionReview → File component (file.tsx)
  → FileMedia (file-media.tsx)
    → mediaKindFromPath() → "image" | "audio" | "svg" | undefined
    → if undefined + binary → "Binary file" message
    → if undefined + text → TextViewer fallback (raw source)
```

### After change
```
mediaKindFromPath() → "image" | "audio" | "svg" | "html" | "docx" | undefined
  → "html" → iframe sandbox srcdoc={text}
  → "docx" → readFile → base64 → ArrayBuffer → mammoth.convertToHtml → iframe sandbox srcdoc={sanitized}
```

### Security
- HTML rendered trong `<iframe sandbox>` (no `allow-scripts`, no `allow-same-origin`) → JS, network, top navigation đều bị block.
- DOCX output từ mammoth là static HTML → dù an toàn vẫn cho qua iframe sandbox để defense-in-depth.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Types + dep + i18n | pending |
| 2 | HTML iframe renderer | pending |
| 3 | DOCX mammoth renderer | pending |
| 4 | Verify + commit + PR + review + merge | pending |

## Files Modified

- `packages/ui/src/pierre/media.ts` — extend `MediaKind`, add extension detection
- `packages/ui/src/components/file-media.tsx` — add `<Match>` cases for html/docx
- `packages/ui/package.json` — add `mammoth` dep
- `packages/ui/src/i18n/en.ts` — add new strings (other locales fall back to en)

## Risks

| Risk | Mitigation |
|------|-----------|
| Mammoth bundle size (~500KB) | Lazy import via dynamic `import()` only when DOCX clicked |
| HTML XSS via malicious file | Iframe sandbox blocks scripts/network |
| Mammoth output XSS | Sandboxed iframe + DOMPurify pass before render |
| Locale missing key | i18n already falls back to en for unknown keys (verify) |
| Large DOCX OOM | Cap at e.g. 25MB; show error otherwise |

## Success Criteria
- [ ] Click `.html` file in review sidebar → renders styled HTML in iframe
- [ ] Click `.docx` file → renders Word doc as HTML (headings, lists, tables, basic styles)
- [ ] Click `.htm` and unknown variations work correctly
- [ ] Other file types unchanged (image/audio/svg/binary/text)
- [ ] `bun run typecheck` clean in `packages/ui`
- [ ] No console errors on load
- [ ] PR created on `claude/add-file-type-support-Rcpui`, reviewed by agent, merged

## Cook Command
```
/cook /home/user/opencode/plans/260510-0800-html-docx-viewer/plan.md
```
