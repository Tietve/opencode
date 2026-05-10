import type { FileContent } from "@opencode-ai/sdk/v2"
import { createEffect, createMemo, createResource, Match, on, Show, Switch, type JSX } from "solid-js"
import { useI18n } from "../context/i18n"
import {
  base64FromValue,
  dataUrlFromMediaValue,
  decodeBase64Bytes,
  hasMediaValue,
  htmlTextFromValue,
  isBinaryContent,
  mediaKindFromPath,
  normalizeMimeType,
  svgTextFromValue,
} from "../pierre/media"

const HTML_MAX_CHARS = 5 * 1024 * 1024
// 35 MB of base64 ~= 26 MB of decoded binary (base64 inflates 4/3).
const DOCX_MAX_BASE64 = 35 * 1024 * 1024

function wrapHtmlDocument(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#222;line-height:1.6;max-width:860px;margin:0 auto;background:#fff}h1,h2,h3,h4,h5,h6{line-height:1.3}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #d4d4d4;padding:6px 10px}img{max-width:100%;height:auto}pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f4f4f4;padding:2px 4px;border-radius:3px}pre{padding:12px;overflow:auto}</style></head><body>${body}</body></html>`
}

export type FileMediaOptions = {
  mode?: "auto" | "off"
  path?: string
  current?: unknown
  before?: unknown
  after?: unknown
  deleted?: boolean
  readFile?: (path: string) => Promise<FileContent | undefined>
  onLoad?: () => void
  onError?: (ctx: { kind: "image" | "audio" | "svg" | "html" | "docx" }) => void
}

function mediaValue(cfg: FileMediaOptions, mode: "image" | "audio") {
  if (cfg.current !== undefined) return cfg.current
  if (mode === "image") return cfg.after ?? cfg.before
  return cfg.after ?? cfg.before
}

export function FileMedia(props: { media?: FileMediaOptions; fallback: () => JSX.Element }) {
  const i18n = useI18n()
  const cfg = () => props.media
  const kind = createMemo(() => {
    const media = cfg()
    if (!media || media.mode === "off") return
    return mediaKindFromPath(media.path)
  })

  const isBinary = createMemo(() => {
    const media = cfg()
    if (!media || media.mode === "off") return false
    if (kind()) return false
    return isBinaryContent(media.current as any)
  })

  const onLoad = () => props.media?.onLoad?.()

  const deleted = createMemo(() => {
    const media = cfg()
    const k = kind()
    if (!media || !k) return false
    if (media.deleted) return true
    if (k === "svg") return false
    if (media.current !== undefined) return false
    return !hasMediaValue(media.after as any) && hasMediaValue(media.before as any)
  })

  const direct = createMemo(() => {
    const media = cfg()
    const k = kind()
    if (!media || (k !== "image" && k !== "audio")) return
    return dataUrlFromMediaValue(mediaValue(media, k), k)
  })

  const request = createMemo(() => {
    const media = cfg()
    const k = kind()
    if (!media || (k !== "image" && k !== "audio")) return
    if (media.current !== undefined) return
    if (deleted()) return
    if (direct()) return
    if (!media.path || !media.readFile) return

    return {
      key: `${k}:${media.path}`,
      kind: k,
      path: media.path,
      readFile: media.readFile,
      onError: media.onError,
    }
  })

  const [loaded] = createResource(request, async (input) => {
    return input.readFile(input.path).then(
      (result) => {
        const src = dataUrlFromMediaValue(result as any, input.kind)
        if (!src) {
          input.onError?.({ kind: input.kind })
          return { key: input.key, error: true as const }
        }

        return {
          key: input.key,
          src,
          mime: input.kind === "audio" ? normalizeMimeType(result?.mimeType) : undefined,
        }
      },
      () => {
        input.onError?.({ kind: input.kind })
        return { key: input.key, error: true as const }
      },
    )
  })

  const remote = createMemo(() => {
    const input = request()
    const value = loaded()
    if (!input || !value || value.key !== input.key) return
    return value
  })

  const src = createMemo(() => {
    const value = remote()
    return direct() ?? (value && "src" in value ? value.src : undefined)
  })
  const status = createMemo(() => {
    if (direct()) return "ready" as const
    if (!request()) return "idle" as const
    if (loaded.loading) return "loading" as const
    if (remote()?.error) return "error" as const
    if (src()) return "ready" as const
    return "idle" as const
  })
  const audioMime = createMemo(() => {
    const value = remote()
    return value && "mime" in value ? value.mime : undefined
  })

  const svgSource = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "svg") return
    return svgTextFromValue(media.current as any)
  })
  const svgSrc = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "svg") return
    return dataUrlFromMediaValue(media.current as any, "svg")
  })
  const svgInvalid = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "svg") return
    if (svgSource() !== undefined) return
    if (!hasMediaValue(media.current as any)) return
    return [media.path, media.current] as const
  })

  createEffect(
    on(
      svgInvalid,
      (value) => {
        if (!value) return
        cfg()?.onError?.({ kind: "svg" })
      },
      { defer: true },
    ),
  )

  const kindLabel = (value: "image" | "audio" | "html" | "docx") =>
    i18n.t(`ui.fileMedia.kind.${value}`)

  // ---- HTML ---------------------------------------------------------------

  const htmlDirect = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "html") return
    return htmlTextFromValue(media.current)
  })

  const htmlRequest = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "html") return
    if (deleted()) return
    if (htmlDirect() !== undefined) return
    if (!media.path || !media.readFile) return
    return {
      key: `html:${media.path}`,
      path: media.path,
      readFile: media.readFile,
      onError: media.onError,
    }
  })

  const [htmlLoaded] = createResource(htmlRequest, async (input) => {
    return input.readFile(input.path).then(
      (result) => {
        const text = htmlTextFromValue(result)
        if (text === undefined) {
          input.onError?.({ kind: "html" })
          return { key: input.key, error: true as const }
        }
        return { key: input.key, html: text }
      },
      () => {
        input.onError?.({ kind: "html" })
        return { key: input.key, error: true as const }
      },
    )
  })

  const htmlText = createMemo(() => {
    const direct = htmlDirect()
    if (direct !== undefined) return direct
    const input = htmlRequest()
    const value = htmlLoaded()
    if (!input || !value || value.key !== input.key) return
    if ("error" in value) return
    return value.html
  })

  const htmlTooLarge = createMemo(() => {
    const text = htmlText()
    if (text === undefined) return false
    return text.length > HTML_MAX_CHARS
  })

  const htmlSrcdoc = createMemo(() => {
    if (kind() !== "html") return
    if (htmlTooLarge()) return
    const text = htmlText()
    if (text === undefined) return
    return text
  })

  const htmlStatus = createMemo(() => {
    if (kind() !== "html") return "idle" as const
    if (deleted()) return "removed" as const
    if (htmlTooLarge()) return "tooLarge" as const
    if (htmlSrcdoc() !== undefined) return "ready" as const
    if (!htmlRequest()) return "idle" as const
    if (htmlLoaded.loading) return "loading" as const
    const value = htmlLoaded()
    if (value && "error" in value) return "error" as const
    return "idle" as const
  })

  // ---- DOCX ---------------------------------------------------------------

  const docxRequest = createMemo(() => {
    const media = cfg()
    if (!media || kind() !== "docx") return
    if (deleted()) return
    const inline = base64FromValue(media.current)
    if (inline) {
      return { key: `docx-inline:${media.path ?? ""}`, base64: inline, onError: media.onError }
    }
    if (!media.path || !media.readFile) return
    return {
      key: `docx:${media.path}`,
      path: media.path,
      readFile: media.readFile,
      onError: media.onError,
    }
  })

  const [docxLoaded] = createResource(docxRequest, async (input) => {
    try {
      const base64 =
        "base64" in input
          ? input.base64
          : base64FromValue(await input.readFile(input.path))
      if (!base64) {
        input.onError?.({ kind: "docx" })
        return { key: input.key, error: true as const }
      }
      if (base64.length > DOCX_MAX_BASE64) {
        return { key: input.key, tooLarge: true as const }
      }
      const bytes = decodeBase64Bytes(base64)
      if (!bytes) {
        input.onError?.({ kind: "docx" })
        return { key: input.key, error: true as const }
      }
      const mod: any = await import("mammoth/mammoth.browser.js")
      const mammoth = mod?.default ?? mod
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
      const body = typeof result?.value === "string" ? result.value : ""
      return { key: input.key, html: wrapHtmlDocument(body) }
    } catch (err) {
      console.debug("[file-media] docx render failed", err)
      input.onError?.({ kind: "docx" })
      return { key: input.key, error: true as const }
    }
  })

  const docxSrcdoc = createMemo(() => {
    const input = docxRequest()
    const value = docxLoaded()
    if (!input || !value || value.key !== input.key) return
    if ("error" in value || "tooLarge" in value) return
    return value.html
  })

  const docxStatus = createMemo(() => {
    if (kind() !== "docx") return "idle" as const
    if (deleted()) return "removed" as const
    const input = docxRequest()
    if (!input) return "idle" as const
    if (docxLoaded.loading) return "loading" as const
    const value = docxLoaded()
    if (!value || value.key !== input.key) return "loading" as const
    if ("tooLarge" in value) return "tooLarge" as const
    if ("error" in value) return "error" as const
    return "ready" as const
  })

  return (
    <Switch>
      <Match when={kind() === "image" || kind() === "audio"}>
        <Show
          when={src()}
          fallback={(() => {
            const media = cfg()
            const k = kind()
            if (!media || (k !== "image" && k !== "audio")) return props.fallback()
            const label = kindLabel(k)

            if (deleted()) {
              return (
                <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                  {i18n.t("ui.fileMedia.state.removed", { kind: label })}
                </div>
              )
            }
            if (status() === "loading") {
              return (
                <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                  {i18n.t("ui.fileMedia.state.loading", { kind: label })}
                </div>
              )
            }
            if (status() === "error") {
              return (
                <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                  {i18n.t("ui.fileMedia.state.error", { kind: label })}
                </div>
              )
            }
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.unavailable", { kind: label })}
              </div>
            )
          })()}
        >
          {(value) => {
            const k = kind()
            if (k !== "image" && k !== "audio") return props.fallback()
            if (k === "image") {
              return (
                <div class="flex justify-center bg-background-stronger px-6 py-4">
                  <img
                    src={value()}
                    alt={cfg()?.path}
                    class="max-h-[60vh] max-w-full rounded border border-border-weak-base bg-background-base object-contain"
                    onLoad={onLoad}
                  />
                </div>
              )
            }

            return (
              <div class="flex justify-center bg-background-stronger px-6 py-4">
                <audio class="w-full max-w-xl" controls preload="metadata" onLoadedMetadata={onLoad}>
                  <source src={value()} type={audioMime()} />
                </audio>
              </div>
            )
          }}
        </Show>
      </Match>
      <Match when={kind() === "svg"}>
        {(() => {
          if (svgSource() === undefined && svgSrc() == null) return props.fallback()

          return (
            <div class="flex flex-col gap-4 px-6 py-4">
              <Show when={svgSource() !== undefined}>{props.fallback()}</Show>
              <Show when={svgSrc()}>
                {(value) => (
                  <div class="flex justify-center">
                    <img
                      src={value()}
                      alt={cfg()?.path}
                      class="max-h-[60vh] max-w-full rounded border border-border-weak-base bg-background-base object-contain"
                      onLoad={onLoad}
                    />
                  </div>
                )}
              </Show>
            </div>
          )
        })()}
      </Match>
      <Match when={kind() === "html"}>
        {(() => {
          const label = kindLabel("html")
          const status = htmlStatus()
          const srcdoc = htmlSrcdoc()
          if (srcdoc !== undefined) {
            return (
              <div class="flex justify-center bg-background-stronger px-6 py-4">
                <iframe
                  sandbox=""
                  srcdoc={srcdoc}
                  title={cfg()?.path ?? label}
                  class="min-h-[60vh] w-full max-w-full rounded border border-border-weak-base bg-background-base"
                  onLoad={onLoad}
                />
              </div>
            )
          }
          if (status === "removed") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.removed", { kind: label })}
              </div>
            )
          }
          if (status === "loading") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.loading", { kind: label })}
              </div>
            )
          }
          if (status === "tooLarge") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.tooLarge", { kind: label })}
              </div>
            )
          }
          if (status === "error") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.error", { kind: label })}
              </div>
            )
          }
          return props.fallback()
        })()}
      </Match>
      <Match when={kind() === "docx"}>
        {(() => {
          const label = kindLabel("docx")
          const status = docxStatus()
          if (status === "ready") {
            return (
              <div class="flex justify-center bg-background-stronger px-6 py-4">
                <iframe
                  sandbox=""
                  srcdoc={docxSrcdoc()}
                  title={cfg()?.path ?? label}
                  class="min-h-[60vh] w-full max-w-full rounded border border-border-weak-base bg-background-base"
                  onLoad={onLoad}
                />
              </div>
            )
          }
          if (status === "removed") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.removed", { kind: label })}
              </div>
            )
          }
          if (status === "loading") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.loading", { kind: label })}
              </div>
            )
          }
          if (status === "tooLarge") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.tooLarge", { kind: label })}
              </div>
            )
          }
          if (status === "error") {
            return (
              <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
                {i18n.t("ui.fileMedia.state.error", { kind: label })}
              </div>
            )
          }
          return (
            <div class="flex min-h-40 items-center justify-center px-6 py-4 text-center text-text-weak">
              {i18n.t("ui.fileMedia.state.unavailable", { kind: label })}
            </div>
          )
        })()}
      </Match>
      <Match when={isBinary()}>
        <div class="flex min-h-56 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <div class="text-14-semibold text-text-strong">
            {cfg()?.path?.split("/").pop() ?? i18n.t("ui.fileMedia.binary.title")}
          </div>
          <div class="text-14-regular text-text-weak">
            {(() => {
              const path = cfg()?.path
              if (!path) return i18n.t("ui.fileMedia.binary.description.default")
              return i18n.t("ui.fileMedia.binary.description.path", { path })
            })()}
          </div>
        </div>
      </Match>
      <Match when={true}>{props.fallback()}</Match>
    </Switch>
  )
}
