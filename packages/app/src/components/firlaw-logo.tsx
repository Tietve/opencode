export function FirlawLogo(props: { height?: number }) {
  const height = props.height ?? 32
  return (
    <svg
      viewBox="0 0 720 200"
      style={{ height: `${height}px`, width: "auto", "flex-shrink": 0 }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Firlaw"
      role="img"
    >
      <g>
        <rect x="60" y="40" width="16" height="120" fill="#1F2937" />
        <rect x="48" y="40" width="40" height="8" fill="#1F2937" />
        <rect x="48" y="152" width="40" height="8" fill="#1F2937" />
        <rect x="76" y="40" width="68" height="18" fill="#722F37" />
        <rect x="144" y="40" width="6" height="26" fill="#722F37" />
        <rect x="76" y="90" width="52" height="16" fill="#722F37" />
        <rect x="128" y="90" width="5" height="22" fill="#722F37" />
        <circle cx="160" cy="51" r="5" fill="#C9A961" />
      </g>
      <text
        x="210"
        y="155"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="135"
        font-weight="700"
        fill="#1F2937"
        letter-spacing="-3"
      >
        irlaw
      </text>
      <rect x="210" y="170" width="120" height="3" fill="#C9A961" />
    </svg>
  )
}
