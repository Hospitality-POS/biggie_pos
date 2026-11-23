import { useEffect, useState } from "react";

/**
 * Brand fonts: the business picks a body font and a heading font in
 * Settings → Logo & Branding. They're stored on the tenant as
 * `typography: { body_font, heading_font }` and applied to the whole app.
 */

export interface FontOption {
  name: string;
  /** Loaded from Google Fonts; false for fonts already on the device */
  google: boolean;
  category: "Sans serif" | "Serif" | "Display" | "Device";
  fallback: string;
}

export const DEFAULT_BODY_FONT = "Poppins";

export const FONT_OPTIONS: FontOption[] = [
  { name: "Poppins", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Inter", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Roboto", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Open Sans", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Lato", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Montserrat", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Nunito", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "DM Sans", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Manrope", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Plus Jakarta Sans", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Work Sans", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Ubuntu", google: true, category: "Sans serif", fallback: "sans-serif" },
  { name: "Raleway", google: true, category: "Display", fallback: "sans-serif" },
  { name: "Playfair Display", google: true, category: "Display", fallback: "serif" },
  { name: "Merriweather", google: true, category: "Serif", fallback: "serif" },
  { name: "Lora", google: true, category: "Serif", fallback: "serif" },
  { name: "System default", google: false, category: "Device", fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
];

const findFont = (name?: string | null) => FONT_OPTIONS.find((f) => f.name === name);

/** CSS font-family value for a font name, with sensible fallbacks. */
export const fontStack = (name?: string | null): string => {
  const f = findFont(name) || findFont(DEFAULT_BODY_FONT)!;
  return f.google ? `"${f.name}", ${f.fallback}` : f.fallback;
};

/** Add the Google Fonts stylesheet for these fonts (once each). */
export const loadFonts = (names: (string | null | undefined)[]) => {
  if (typeof document === "undefined") return;
  for (const name of names) {
    const f = findFont(name);
    if (!f?.google) continue;
    const id = `brand-font-${f.name.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
};

export interface BrandFonts {
  body: string;
  heading: string;
}

/** The fonts saved on the signed-in tenant (falls back to the defaults). */
export const getBrandFonts = (): BrandFonts => {
  let typo: any = null;
  try {
    typo = JSON.parse(localStorage.getItem("tenant") || "{}")?.typography;
  } catch { /* no tenant yet */ }
  const body = findFont(typo?.body_font)?.name || DEFAULT_BODY_FONT;
  const heading = findFont(typo?.heading_font)?.name || body;
  return { body, heading };
};

/** Load the fonts and point the app's CSS variables at them. */
export const applyBrandFonts = (fonts: BrandFonts = getBrandFonts()) => {
  loadFonts([fonts.body, fonts.heading]);
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.setProperty("--font-body", fontStack(fonts.body));
  root.setProperty("--font-heading", fontStack(fonts.heading));
};

/** Current brand fonts, re-applied whenever the tenant record changes. */
export const useBrandFonts = (): BrandFonts => {
  const [fonts, setFonts] = useState<BrandFonts>(getBrandFonts);

  useEffect(() => {
    applyBrandFonts(fonts);
  }, [fonts]);

  useEffect(() => {
    const refresh = () => setFonts(getBrandFonts());
    const onStorage = (e: StorageEvent) => { if (e.key === "tenant") refresh(); };
    window.addEventListener("tenantUpdated", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("tenantUpdated", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return fonts;
};
