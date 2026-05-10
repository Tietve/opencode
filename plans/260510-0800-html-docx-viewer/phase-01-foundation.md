---
phase: 1
title: "Foundation: types, dep, i18n"
status: pending
priority: P2
effort: "30m"
dependencies: []
---

# Phase 1: Foundation

## Overview
Mở rộng `MediaKind` enum, thêm `mammoth` dependency, thêm i18n strings cho 2 loại file mới.

## Architecture
`pierre/media.ts` là source of truth cho file type detection. Nó được `file-media.tsx` consume. Mở rộng `MediaKind` → `"html" | "docx"` và detect extension.

## Related Code Files
- Modify: `packages/ui/src/pierre/media.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/src/i18n/en.ts`

## Implementation Steps

1. **`pierre/media.ts`**
   - Extend `MediaKind` type to: `"image" | "audio" | "svg" | "html" | "docx"`
   - Add extension sets:
     ```ts
     const htmlExtensions = new Set(["html", "htm"])
     const docxExtensions = new Set(["docx"])
     ```
   - Update `mediaKindFromPath()`:
     ```ts
     if (htmlExtensions.has(ext)) return "html"
     if (docxExtensions.has(ext)) return "docx"
     ```

2. **`packages/ui/package.json`**
   - Add `"mammoth": "1.8.0"` to `dependencies`

3. **`packages/ui/src/i18n/en.ts`**
   - Add keys:
     ```
     "ui.fileMedia.kind.html": "HTML",
     "ui.fileMedia.kind.docx": "Word document",
     "ui.fileMedia.state.tooLarge": "{{kind}} too large to preview ({{size}}).",
     "ui.fileMedia.state.unsupportedDoc": "Unable to render {{kind}} document.",
     ```
   - Other locales: do NOT touch initially. i18n falls back to en.

## Success Criteria
- [ ] `MediaKind` type updated, no TS errors
- [ ] `mediaKindFromPath("foo.docx")` returns `"docx"`
- [ ] `mediaKindFromPath("page.html")` returns `"html"`
- [ ] `mammoth` listed in `dependencies`
- [ ] New i18n keys present in `en.ts`

## Risk Assessment
- Bundle size: mammoth itself is ~500KB but will be loaded lazily in phase 3
- Type breaking: adding to union is non-breaking (existing consumers narrow with switch/match)
