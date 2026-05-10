---
phase: 3
title: "DOCX renderer with mammoth"
status: pending
priority: P2
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: DOCX renderer

## Overview
DOCX là binary zip. Dùng mammoth.js (lazy import) decode → HTML → render trong iframe sandbox (reuse cơ chế phase 2).

## Architecture
```
readFile(path) → FileContent { type: "binary", content: <base64>, encoding: "base64", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  → atob → Uint8Array → ArrayBuffer
  → const mammoth = await import("mammoth/mammoth.browser.js")
  → mammoth.convertToHtml({ arrayBuffer }) → { value: htmlString, messages: [] }
  → DOMPurify.sanitize(htmlString)
  → iframe srcdoc
```

## Related Code Files
- Modify: `packages/ui/src/components/file-media.tsx`
- Modify: `packages/ui/src/pierre/media.ts` (export `decodeBase64Utf8` or new `decodeBase64Bytes`)

## Implementation Steps

1. Trong `media.ts`, export helper:
   ```ts
   export function decodeBase64Bytes(value: string): Uint8Array | undefined {
     if (typeof atob !== "function") return
     try {
       const raw = atob(value)
       return Uint8Array.from(raw, (x) => x.charCodeAt(0))
     } catch {}
   }
   ```

2. Trong `file-media.tsx`, tạo loader resource cho `docx`:
   - Trigger khi `kind() === "docx"` && có `readFile` && có `media.path`
   - Steps:
     - `readFile(path)` → record
     - Cap size: nếu `record.content.length > 35_000_000` (≈25MB binary) → error "tooLarge"
     - `decodeBase64Bytes(record.content)` → bytes
     - Lazy import mammoth: `const mammoth = (await import("mammoth/mammoth.browser.js")).default ?? await import("mammoth/mammoth.browser.js")`
     - `await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })`
     - Wrap output trong base HTML doc với basic styling:
       ```html
       <!doctype html><html><head><style>
         body{font-family:system-ui,sans-serif;padding:24px;color:#222;line-height:1.6;max-width:800px;margin:auto}
         table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px}
         img{max-width:100%}
       </style></head><body>{converted}</body></html>
       ```
     - Sanitize body content with DOMPurify before wrapping
   - Resource state: `loading | error | { html }`

3. Thêm `<Match when={kind() === "docx"}>`:
   - Loading → "Loading {kind}..." (reuse i18n)
   - Error → "Unable to render Word document"
   - Ready → iframe sandbox srcdoc (giống phase 2)

4. Update `FileMediaOptions.onError` kind union để include `"html" | "docx"`.

## Success Criteria
- [ ] `.docx` click → spinner → render content
- [ ] Headings, lists, tables hiển thị
- [ ] File hỏng → error message thay vì crash
- [ ] File quá lớn → "tooLarge" message
- [ ] Mammoth chỉ load khi user mở DOCX (verify trong network tab)
- [ ] Không có console error

## Risk Assessment
- Mammoth bundle: lazy import → không ảnh hưởng initial load
- Mammoth import path: `"mammoth/mammoth.browser.js"` exists trong v1.8 — verify
- ArrayBuffer transfer: Uint8Array.buffer có thể là SharedArrayBuffer trong vài env — slice nếu cần
- Empty docx (no body): mammoth trả empty html → show "Empty document" hoặc just blank iframe (acceptable)
