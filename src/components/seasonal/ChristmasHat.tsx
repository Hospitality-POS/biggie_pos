import React from "react";
import { isChristmasSeason } from "./christmasConfig";

interface ChristmasHatProps {
  children: React.ReactNode;
  /** Hat width in px. Roughly half the logo height looks right. */
  size?: number;
}

/**
 * Wraps a logo and perches a Santa hat on its top-left corner while it's
 * Christmas season (see christmasConfig). Outside the season it renders the
 * logo untouched.
 */
const ChristmasHat: React.FC<ChristmasHatProps> = ({ children, size = 28 }) => {
  if (!isChristmasSeason()) return <>{children}</>;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 64 56"
        width={size}
        height={(size * 56) / 64}
        style={{
          position: "absolute",
          top: -size * 0.5,
          left: -size * 0.3,
          transform: "rotate(-18deg)",
          pointerEvents: "none",
          zIndex: 1,
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
        }}
      >
        {/* Red cap, flopping over to the right */}
        <path d="M8 42 C 12 20, 26 6, 44 8 C 52 9, 58 16, 56 26 C 50 18, 42 18, 38 22 C 46 28, 50 36, 52 42 Z" fill="#D62828" />
        <path d="M38 22 C 46 28, 50 36, 52 42 L 44 42 C 42 34, 40 28, 38 22 Z" fill="#A4161A" />
        {/* White fur trim */}
        <rect x="4" y="40" width="52" height="12" rx="6" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
        {/* Pom-pom */}
        <circle cx="56" cy="27" r="6.5" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      </svg>
    </span>
  );
};

export default ChristmasHat;
