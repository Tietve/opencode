import { createSignal, onMount, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { useTheme } from "@opencode-ai/ui/theme/context"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export function FirlawTitlebarExtras() {
  const theme = useTheme()
  const [mount, setMount] = createSignal<HTMLElement | null>(null)
  const [userName, setUserName] = createSignal("")
  const [userInitials, setUserInitials] = createSignal("FL")

  onMount(() => {
    setMount(document.getElementById("opencode-titlebar-right"))
    fetchUser()
  })

  const fetchUser = async () => {
    try {
      const r = await fetch("/api/v2/auth/get-session", { credentials: "include" })
      if (!r.ok) return
      const data = await r.json()
      const name = data?.user?.name || ""
      setUserName(name)
      const parts = name.split(" ").filter(Boolean)
      if (parts.length >= 2) {
        setUserInitials(parts[0][0] + parts[parts.length - 1][0])
      } else if (parts.length === 1) {
        setUserInitials(parts[0].slice(0, 2).toUpperCase())
      }
    } catch {}
  }

  const toggleTheme = () => {
    const current = theme.colorScheme()
    const next = current === "dark" ? "light" : current === "light" ? "system" : "dark"
    theme.setColorScheme(next)
  }

  const logout = async () => {
    try {
      await fetch("/api/v2/auth/sign-out", { method: "POST", credentials: "include" })
    } catch {
      return
    }
    window.location.href = "/login.html"
  }

  return (
    <Show when={mount()}>
      {(el) => (
        <Portal mount={el()}>
          <div class="flex items-center gap-1" style={{ order: "-1" }}>
            <Tooltip placement="bottom" value="Thông báo">
              <button class="firlaw-top-btn" aria-label="Thông báo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
              </button>
            </Tooltip>

            <Tooltip placement="bottom" value={theme.colorScheme() === "dark" ? "Chế độ sáng" : theme.colorScheme() === "light" ? "Theo hệ thống" : "Chế độ tối"}>
              <button class="firlaw-top-btn" onClick={toggleTheme} aria-label="Đổi giao diện">
                <Show
                  when={theme.colorScheme() === "dark"}
                  fallback={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  }
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                </Show>
              </button>
            </Tooltip>

            <Tooltip placement="bottom" value="Trợ giúp">
              <button class="firlaw-top-btn" aria-label="Trợ giúp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </Tooltip>

            <Show when={userName()}>
              <Tooltip placement="bottom" value="Đăng xuất">
                <button class="firlaw-user-chip" onClick={logout} aria-label={`${userName()} — Đăng xuất`}>
                  <div class="firlaw-user-avatar">{userInitials()}</div>
                  <span class="firlaw-user-name">{userName()}</span>
                </button>
              </Tooltip>
            </Show>
          </div>
        </Portal>
      )}
    </Show>
  )
}
