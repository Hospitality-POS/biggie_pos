import React from "react";
import type { PrintFormat, SavePrintResult } from "../Hooks/usePrintDocument";

export const C = { primary: "#6c1c2c", subText: "#64748b" };

export interface SendEmailValues {
  to: string;
  recipientName?: string;
  cc?: string;
  intro?: string;
}

export interface SendWhatsAppValues {
  phone_number: string;
}

// ── attemptSave ────────────────────────────────────────────────────────────
export async function attemptSave(
  recordPrint: (...args: any[]) => Promise<SavePrintResult | null>,
  opts: { print_format: PrintFormat; reason?: string }
): Promise<{ saved: boolean; blocked: boolean }> {
  try {
    const result = await recordPrint(opts);
    if (result) return { saved: true, blocked: false };
    return { saved: false, blocked: true };
  } catch {
    return { saved: false, blocked: false };
  }
}

// ── Receipt styles helper — supports font size and weight ─────────────────
// fontSize is clamped at 14px for thermal so large UI selections don't
// cause right-side overflow on the 80mm roll. The UI slider still shows
// the user's chosen value; only the printed output is clamped.
export const makeReceiptStyles = (bold: boolean, fontSize: number) => {
  // Clamp: never smaller than 12px (prevents unreadable output from a mis-set system setting)
  const clampedSize = Math.min(Math.max(fontSize, 12), 22);
  const weight = bold ? 700 : 500;
  const headerWeight = bold ? 900 : 700;
  const base = { fontFamily: "'Courier New', Courier, monospace", color: "#000000" };
  const baseFontSize = `${clampedSize}px`;
  const smallFontSize = `${clampedSize - 1}px`;
  const smallerFontSize = `${clampedSize - 1.5}px`;

  return {
    shopName: { ...base, fontSize: `${clampedSize + 2}px`, fontWeight: headerWeight, letterSpacing: "0.5px" },
    docType: { ...base, fontSize: `${clampedSize + 4}px`, fontWeight: headerWeight, textAlign: "center" as const, letterSpacing: "2px" },
    meta: { ...base, fontSize: smallFontSize, fontWeight: weight },
    label: { ...base, fontSize: baseFontSize, fontWeight: bold ? 700 : 600 },
    value: { ...base, fontSize: baseFontSize, fontWeight: weight },
    // ── table cells ──────────────────────────────────────────────────────
    tblHdr: { padding: "5px 3px", fontWeight: headerWeight, fontSize: baseFontSize, color: "#000", borderBottom: "2px solid #000" },
    tblData: { padding: "4px 3px", fontWeight: weight, fontSize: smallFontSize, color: "#000" },
    tblSub: { ...base, fontSize: smallerFontSize, fontWeight: weight, color: "#555" },
    // ── totals ───────────────────────────────────────────────────────────
    total: { ...base, fontSize: `${clampedSize + 3}px`, fontWeight: headerWeight },
    footer: { ...base, fontSize: smallerFontSize, fontWeight: weight, textAlign: "center" as const },
    clientHdr: { ...base, fontSize: baseFontSize, fontWeight: headerWeight, letterSpacing: "1px" },
  };
};

// ── Divider helpers ────────────────────────────────────────────────────────
export const DashedLine: React.FC = () => (
  <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
);

export const SolidLine: React.FC = () => (
  <div style={{ borderTop: "1px solid #000", margin: "6px 0" }} />
);

export const DoubleLine: React.FC = () => (
  <div style={{ margin: "6px 0" }}>
    <div style={{ borderTop: "2px solid #000" }} />
    <div style={{ borderTop: "1px solid #000", marginTop: "2px" }} />
  </div>
);

// ── Thermal row — label + value aligned with space-between ─────────────────
export const MetaRow: React.FC<{
  left: React.ReactNode;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ left, right, style }) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, ...style }}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);

// Strip trailing .00 from whole numbers to save column space on thermal receipts
export const fmtN = (n: number) => (n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2));

export const fontSizes = [
  { value: 10, label: "Small" },
  { value: 13, label: "Normal" },
  { value: 15, label: "Large" },
  { value: 17, label: "X-Large" },
  { value: 19, label: "XX-Large" },
  { value: 22, label: "Huge" },
  { value: 25, label: "25px" },
  { value: 30, label: "30px" },
  { value: 35, label: "35px" },
  { value: 40, label: "40px" },
  { value: 45, label: "45px" },
  { value: 50, label: "50px" },
];
