/**
 * Firlaw file context menu actions.
 *
 * Wraps any FileTree node trigger element with a right-click context menu
 * providing: open, download, copy-path, delete (recursive), rename,
 * mkdir-child, upload-here, upload-folder.
 *
 * Deliberately separate from upstream file-tree.tsx to keep merge conflicts
 * minimal. All Firlaw file-manager logic lives here.
 */
import { Show } from "solid-js"
import { ContextMenu } from "@opencode-ai/ui/context-menu"
import { showToast } from "@opencode-ai/ui/toast"
import type { FileNode } from "@opencode-ai/sdk/v2"
import type { JSX } from "solid-js"
import { useFile } from "@/context/file"

function parentOf(filePath: string): string {
  const idx = filePath.lastIndexOf("/")
  if (idx === -1) return ""
  return filePath.slice(0, idx)
}

function toApiPath(treePath: string): string {
  if (!treePath) return "/"
  return treePath.startsWith("/") ? treePath : `/${treePath}`
}

function joinApiPath(parentTreePath: string, name: string): string {
  if (!parentTreePath) return `/${name}`
  return `${toApiPath(parentTreePath)}/${name}`
}

function errorMessageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return fallback
}

export function FirlawFileActions(props: {
  node: FileNode
  onFileClick?: (node: FileNode) => void
  children: JSX.Element
}): JSX.Element {
  const file = useFile()

  async function handleAction(action: string): Promise<void> {
    const node = props.node
    const parentKey = parentOf(node.path)
    const apiPath = toApiPath(node.path)
    try {
      switch (action) {
        case "open":
          props.onFileClick?.(node)
          break
        case "copy-path":
          await navigator.clipboard.writeText(node.path)
          showToast({ variant: "success", title: "Đã copy đường dẫn" })
          break
        case "download":
          file.firlawFiles.download(apiPath)
          break
        case "delete": {
          if (!window.confirm(`Xóa "${node.name}"? Thao tác này không thể khôi phục.`)) return
          let res = await file.firlawFiles.delete(apiPath)
          if (res.status === 409) {
            // Folder không rỗng — hỏi user có muốn xóa cả nội dung không.
            const confirmAll = window.confirm(
              `Folder "${node.name}" còn chứa file/folder con.\n\n` +
                `Bạn có chắc muốn XÓA TẤT CẢ không? Thao tác này không thể khôi phục.`,
            )
            if (!confirmAll) return
            res = await file.firlawFiles.delete(apiPath, true)
            if (!res.ok) throw new Error("recursive delete failed")
          }
          await file.tree.refresh(parentKey)
          showToast({ variant: "success", title: "Đã xóa" })
          break
        }
        case "rename": {
          const newName = window.prompt("Tên mới:", node.name)
          if (!newName || newName === node.name) return
          const toApi = joinApiPath(parentKey, newName)
          await file.firlawFiles.rename(apiPath, toApi)
          await file.tree.refresh(parentKey)
          showToast({ variant: "success", title: "Đã đổi tên" })
          break
        }
        case "mkdir-child": {
          const name = window.prompt("Tên folder con:")
          if (!name) return
          const targetApi = joinApiPath(node.path, name)
          await file.firlawFiles.mkdir(targetApi)
          await file.tree.refresh(node.path)
          showToast({ variant: "success", title: "Đã tạo folder" })
          break
        }
        case "upload-here": {
          const input = document.createElement("input")
          input.type = "file"
          input.multiple = true
          input.onchange = async () => {
            const files = input.files
            if (!files || files.length === 0) return
            try {
              for (const item of Array.from(files)) {
                await file.firlawFiles.upload(apiPath, item)
              }
              await file.tree.refresh(node.path)
              showToast({ variant: "success", title: "Đã upload" })
            } catch (e) {
              showToast({ variant: "error", title: errorMessageOf(e, "Upload thất bại") })
            }
          }
          input.click()
          break
        }
        case "upload-folder": {
          const input = document.createElement("input")
          input.type = "file"
          input.multiple = true
          input.setAttribute("webkitdirectory", "")
          input.setAttribute("directory", "")
          input.onchange = async () => {
            const files = input.files
            if (!files || files.length === 0) return
            try {
              const result = await file.firlawFiles.uploadFolder(apiPath, files)
              await file.tree.refresh(node.path)
              showToast({ variant: "success", title: `Đã upload ${result.uploaded} files` })
            } catch (e) {
              showToast({ variant: "error", title: errorMessageOf(e, "Upload folder thất bại") })
            }
          }
          input.click()
          break
        }
      }
    } catch (e) {
      showToast({ variant: "error", title: errorMessageOf(e, "Thao tác thất bại") })
    }
  }

  return (
    <ContextMenu>
      <ContextMenu.Trigger as="div">{props.children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <Show when={props.node.type === "file"}>
            <ContextMenu.Item onSelect={() => void handleAction("open")}>
              <ContextMenu.ItemLabel>Mở</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => void handleAction("download")}>
              <ContextMenu.ItemLabel>Tải về</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </Show>
          <Show when={props.node.type === "directory"}>
            <ContextMenu.Item onSelect={() => void handleAction("mkdir-child")}>
              <ContextMenu.ItemLabel>Tạo folder con</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => void handleAction("upload-here")}>
              <ContextMenu.ItemLabel>Upload vào đây</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => void handleAction("upload-folder")}>
              <ContextMenu.ItemLabel>Upload folder</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </Show>
          <ContextMenu.Item onSelect={() => void handleAction("rename")}>
            <ContextMenu.ItemLabel>Đổi tên</ContextMenu.ItemLabel>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => void handleAction("copy-path")}>
            <ContextMenu.ItemLabel>Copy đường dẫn</ContextMenu.ItemLabel>
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item onSelect={() => void handleAction("delete")}>
            <ContextMenu.ItemLabel>Xóa</ContextMenu.ItemLabel>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  )
}
