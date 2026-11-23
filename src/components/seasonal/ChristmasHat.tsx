import React, { useCallback, useEffect, useRef, useState } from "react";
import { isChristmasSeason } from "./christmasConfig";

interface ChristmasHatProps {
  children: React.ReactNode;
  /** Hat width in px. About half the logo height looks right. */
  size?: number;
}

/** Visible (non-transparent) part of an image, as fractions of its natural size. */
type Bounds = { left: number; top: number };

const FULL: Bounds = { left: 0, top: 0 };
const boundsCache = new Map<string, Promise<Bounds>>();

/**
 * Tenant logos often carry transparent padding, so the image's corner is not
 * where the artwork starts. Find the first visible pixel from the top and left.
 * Falls back to the corner when the image can't be read (e.g. no CORS).
 */
const getVisibleBounds = (src: string): Promise<Bounds> => {
  const cached = boundsCache.get(src);
  if (cached) return cached;

  const p = new Promise<Bounds>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(FULL);
    img.onload = () => {
      try {
        const scale = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(FULL);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let top = h, left = w;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 40) {
              if (y < top) top = y;
              if (x < left) left = x;
            }
          }
        }
        if (top === h) return resolve(FULL); // fully transparent
        resolve({ left: left / w, top: top / h });
      } catch {
        resolve(FULL); // tainted canvas
      }
    };
    img.src = src;
  });
  boundsCache.set(src, p);
  return p;
};

/**
 * Wraps a logo and perches a Santa hat on the top-left of its visible artwork
 * while it's Christmas season (see christmasConfig). Outside the season it
 * renders the logo untouched.
 */
const ChristmasHat: React.FC<ChristmasHatProps> = ({ children, size = 28 }) => {
  const active = isChristmasSeason();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const place = useCallback(async () => {
    const wrap = wrapRef.current;
    const img = wrap?.querySelector("img");
    if (!wrap || !img || !img.naturalWidth) return;

    const bounds = await getVisibleBounds(img.currentSrc || img.src);
    const wrapRect = wrap.getBoundingClientRect();
    const box = img.getBoundingClientRect();
    // object-fit: contain letterboxes the picture inside the <img> box.
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const drawnW = img.naturalWidth * scale;
    const drawnH = img.naturalHeight * scale;
    const x = box.left - wrapRect.left + (box.width - drawnW) / 2 + bounds.left * drawnW;
    const y = box.top - wrapRect.top + (box.height - drawnH) / 2 + bounds.top * drawnH;
    setAnchor({ x, y });
  }, []);

  useEffect(() => {
    if (!active) return;
    const img = wrapRef.current?.querySelector("img");
    if (!img) return;
    if (img.complete) place();
    img.addEventListener("load", place);
    window.addEventListener("resize", place);
    return () => {
      img.removeEventListener("load", place);
      window.removeEventListener("resize", place);
    };
  }, [active, place, children]);

  if (!active) return <>{children}</>;

  const x = anchor?.x ?? 0;
  const y = anchor?.y ?? 0;

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 64 56"
        width={size}
        height={(size * 56) / 64}
        style={{
          position: "absolute",
          // Brim overlaps the top of the artwork so the hat sits on it rather than floating above.
          top: y - size * 0.45,
          left: x - size * 0.12,
          transform: "rotate(-12deg)",
          transformOrigin: "30% 90%",
          pointerEvents: "none",
          zIndex: 1,
          visibility: anchor ? "visible" : "hidden",
        }}
      >
        {/* Red cap, flopping over to the right */}
        <path d="M8 42 C 12 20, 26 6, 44 8 C 52 9, 58 16, 56 26 C 50 18, 42 18, 38 22 C 46 28, 50 36, 52 42 Z" fill="#E03131" />
        <path d="M38 22 C 46 28, 50 36, 52 42 L 44 42 C 42 34, 40 28, 38 22 Z" fill="#B02525" />
        {/* White fur trim */}
        <rect x="4" y="40" width="52" height="12" rx="6" fill="#FFFFFF" />
        {/* Pom-pom */}
        <circle cx="56" cy="27" r="6.5" fill="#FFFFFF" />
      </svg>
    </span>
  );
};

export default ChristmasHat;
