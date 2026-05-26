/**
 * Firlaw file panel action buttons — Upload file + Tạo folder mới.
 *
 * Shown in the file tree tab header when the "all files" tab is active.
 * Extracted from session-side-panel.tsx to minimize upstream merge conflicts.
 */
import { showToast } from "@opencode-ai/ui/toast"
import { useFile } from "@/context/file"

function errorMessageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return fallback
}

export function FirlawSidePanelActions() {
  const file = useFile()

  async function uploadAtRoot(): Promise<void> {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) return
      try {
        for (const item of Array.from(files)) {
          await file.firlawFiles.upload("/", item)
        }
        await file.tree.refresh("")
        showToast({ variant: "success", title: "Đã upload" })
      } catch (e) {
        showToast({ variant: "error", title: errorMessageOf(e, "Upload thất bại") })
      }
    }
    input.click()
  }

  async function mkdirAtRoot(): Promise<void> {
    const name = window.prompt("Tên folder mới:")
    if (!name) return
    try {
      await file.firlawFiles.mkdir(`/${name}`)
      await file.tree.refresh("")
      showToast({ variant: "success", title: "Đã tạo folder" })
    } catch (e) {
      showToast({ variant: "error", title: errorMessageOf(e, "Tạo folder thất bại") })
    }
  }

  return (
    <>
      <button
        type="button"
        title="Upload file"
        aria-label="Upload file"
        class="px-2 py-1 text-14-medium text-text-base hover:bg-surface-base-hover rounded shrink-0"
        onClick={() => void uploadAtRoot()}
      >
        ⬆
      </button>
      <button
        type="button"
        title="Tạo folder mới"
        aria-label="Tạo folder mới"
        class="px-2 py-1 text-14-medium text-text-base hover:bg-surface-base-hover rounded shrink-0"
        onClick={() => void mkdirAtRoot()}
      >
        +
      </button>
    </>
  )
}
