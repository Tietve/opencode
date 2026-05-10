---
phase: 2
title: "HTML iframe sandbox renderer"
status: pending
priority: P2
effort: "45m"
dependencies: [1]
---

# Phase 2: HTML renderer

## Overview
Render HTML files trong `<iframe sandbox>` với srcdoc — browser tự render, JS bị block.

## Architecture
HTML files là text → có sẵn trong `media.current` cho diff mode, hoặc phải gọi `readFile` cho non-diff. Tận dụng cả 2:
1. Nếu `current` là string → dùng luôn
2. Nếu không → dùng `createResource` với `readFile` (giống pattern image/audio)

Render: `<iframe sandbox="" srcdoc={html}>` — sandbox rỗng = full restriction (no script, no same-origin, no forms, no popups, no top nav).

## Related Code Files
- Modify: `packages/ui/src/components/file-media.tsx`

## Implementation Steps

1. Trong `FileMedia`, sau `kind` memo, thêm helper để extract HTML text:
   ```ts
   function htmlTextFromValue(value: unknown): string | undefined {
     if (typeof value === "string") return value
     const record = mediaRecord(value)
     if (!record || typeof record.content !== "string") return
     if (record.encoding === "base64") return decodeBase64Utf8(record.content)
     return record.content
   }
   ```
   (export from `pierre/media.ts` để reuse)

2. Thêm resource loader cho html:
   - Nếu `kind() === "html"` && không có text trong `media.current` && có `readFile` → fetch
   - Resource trả `{ key, html }` hoặc `{ key, error: true }`

3. Thêm `<Match when={kind() === "html"}>`:
   ```tsx
   <Match when={kind() === "html"}>
     <Show when={htmlContent()} fallback={<LoadingOrError />}>
       {(html) => (
         <iframe
           sandbox=""
           srcdoc={html()}
           class="w-full min-h-[60vh] rounded border border-border-weak-base bg-white"
           onLoad={onLoad}
         />
       )}
     </Show>
   </Match>
   ```

4. Size cap: nếu html string > 5MB → show "tooLarge" message thay vì render.

## Success Criteria
- [ ] `.html` file trong review sidebar render trong iframe
- [ ] Script trong HTML không chạy (kiểm bằng file test có `<script>alert(1)</script>`)
- [ ] CSS inline render đúng
- [ ] File quá lớn → message thay vì freeze
- [ ] Diff mode (modified .html) vẫn hiện diff text — chỉ "current/after" view mới render

## Risk Assessment
- Iframe height: dùng `min-h` để không bị clip; user scroll trong iframe
- srcdoc encoding: SolidJS attr binding tự escape — OK
- Memory: nếu file lớn, srcdoc copy 2x trong DOM. Cap 5MB an toàn.
