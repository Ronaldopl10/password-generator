import { ImageResponse } from "next/og";

export const alt = "IronKey — Generador de contraseñas y bóveda cifrada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#a88144";
const BACKGROUND = "#0d1117";
const MUTED = "#8b949e";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: BACKGROUND,
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 300,
            marginRight: 72,
          }}
        >
          <svg
            width="300"
            height="300"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 4 L18 20 L18 48 C18 68 32 84 50 96 C68 84 82 68 82 48 L82 20 Z"
              stroke={GOLD}
              strokeWidth="2.5"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M50 12 L26 24 L26 48 C26 64 37 78 50 88 C63 78 74 64 74 48 L74 24 Z"
              stroke={GOLD}
              strokeWidth="1.2"
              strokeLinejoin="round"
              fill="none"
              opacity="0.4"
            />
            <circle cx="50" cy="32" r="12" stroke={GOLD} strokeWidth="2" fill="none" />
            <circle cx="50" cy="32" r="6" stroke={GOLD} strokeWidth="1.5" fill="none" />
            <rect x="47" y="44" width="6" height="38" rx="1.5" fill={GOLD} />
            <path d="M53 58 L60 58 L60 61 L53 61" fill={GOLD} />
            <path d="M53 64 L58 64 L58 67 L53 67" fill={GOLD} />
            <path d="M53 72 L62 72 L62 75 L53 75" fill={GOLD} />
            <line x1="38" y1="48" x2="38" y2="72" stroke={GOLD} strokeWidth="1" opacity="0.3" />
            <line x1="62" y1="48" x2="62" y2="72" stroke={GOLD} strokeWidth="1" opacity="0.3" />
            <line
              x1="50"
              y1="82"
              x2="50"
              y2="88"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            IronKey
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 30,
              color: "#ffffff",
              lineHeight: 1.3,
            }}
          >
            Generador de contraseñas y bóveda cifrada
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 26,
              color: MUTED,
            }}
          >
            iron-key.vercel.app
          </div>
        </div>
      </div>
    ),
    size
  );
}
