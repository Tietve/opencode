import { ComponentProps } from "solid-js"

// Firlaw brand: stylized F mark + burgundy/gold accents.
// Original colors: dark #1F2937, burgundy #722F37, gold #C9A961, cream #F5F1E8.
// We use `var(--icon-strong-base)` for the structural strokes so the mark
// stays legible across light/dark themes; brand accents stay hardcoded.

const FMark = () => (
  <g>
    <rect x="60" y="40" width="16" height="120" fill="var(--icon-strong-base)" />
    <rect x="48" y="40" width="40" height="8" fill="var(--icon-strong-base)" />
    <rect x="48" y="152" width="40" height="8" fill="var(--icon-strong-base)" />
    <rect x="76" y="40" width="68" height="18" fill="#722F37" />
    <rect x="144" y="40" width="6" height="26" fill="#722F37" />
    <rect x="76" y="90" width="52" height="16" fill="#722F37" />
    <rect x="128" y="90" width="5" height="22" fill="#722F37" />
    <circle cx="160" cy="51" r="5" fill="#C9A961" />
  </g>
)

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <FMark />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <FMark />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 200"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <FMark />
      <text
        x="210"
        y="155"
        font-family="Georgia, 'Times New Roman', 'Cormorant Garamond', serif"
        font-size="135"
        font-weight="700"
        fill="var(--icon-strong-base)"
        letter-spacing="-3"
      >
        irlaw
      </text>
      <rect x="210" y="170" width="120" height="3" fill="#C9A961" />
    </svg>
  )
}
