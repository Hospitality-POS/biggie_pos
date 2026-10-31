import { useEffect, useState } from 'react';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';

/**
 * Colour templates for payroll exports (muster roll + payslips, PDF and
 * Excel). Like the invoice templates, the user picks one at export time; the
 * choice is remembered in this browser and every payroll/payslip download
 * (including emailed payslip PDFs) uses it.
 */

export type RGB = [number, number, number];

export type ExportTemplateId = 'minimal' | 'slate' | 'accent' | 'branded';

export interface ExportTheme {
  id: ExportTemplateId;
  /** Company / document title */
  title: RGB;
  /** Rule under the title block */
  rule: RGB;
  /** Column and section headers */
  headFill: RGB;
  headText: RGB;
  headLine: RGB;
  /** Totals rows; null = no fill (bold text only) */
  totalFill: RGB | null;
  totalText: RGB;
  /** Net pay banner; null fill = outlined box */
  netFill: RGB | null;
  netText: RGB;
  netBorder: RGB;
  /** Alternate body rows; null = plain */
  zebra: RGB | null;
  /** Shaded label cells (payslip employee info, statutory summary) */
  labelFill: RGB | null;
  /** Muster roll PDF: full-width coloured title band instead of plain text */
  headerBand: boolean;
}

const WHITE: RGB = [255, 255, 255];
const INK: RGB = [17, 24, 39];
const SLATE: RGB = [51, 65, 85];
const SLATE_DARK: RGB = [30, 41, 59];
const SLATE_50: RGB = [248, 250, 252];
const SLATE_100: RGB = [241, 245, 249];

export const EXPORT_TEMPLATES: { id: ExportTemplateId; name: string; description: string }[] = [
  { id: 'minimal', name: 'Minimal', description: 'Black & white, no colour fills' },
  { id: 'slate', name: 'Slate', description: 'Dark grey headers, light totals' },
  { id: 'accent', name: 'Accent', description: 'Brand colour on title & net pay only' },
  { id: 'branded', name: 'Branded', description: 'Full brand colour (previous look)' },
];

export const DEFAULT_EXPORT_TEMPLATE: ExportTemplateId = 'minimal';

const STORAGE_KEY = 'payrollExportTemplate';
const CHANGE_EVENT = 'payroll-export-template-change';

const isTemplateId = (v: unknown): v is ExportTemplateId =>
  EXPORT_TEMPLATES.some((t) => t.id === v);

export const getExportTemplate = (): ExportTemplateId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isTemplateId(v) ? v : DEFAULT_EXPORT_TEMPLATE;
  } catch {
    return DEFAULT_EXPORT_TEMPLATE;
  }
};

export const setExportTemplate = (id: ExportTemplateId) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable — choice lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
};

/** Current template, kept in sync across the payroll and payslip pages. */
export const useExportTemplate = (): [ExportTemplateId, (id: ExportTemplateId) => void] => {
  const [id, setId] = useState<ExportTemplateId>(getExportTemplate);
  useEffect(() => {
    const sync = () => setId(getExportTemplate());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return [id, setExportTemplate];
};

export const getExportTheme = (id: ExportTemplateId = getExportTemplate()): ExportTheme => {
  const brand = hexToRgb(getPrimaryColor()) as RGB;
  switch (id) {
    case 'slate':
      return {
        id,
        title: SLATE_DARK,
        rule: SLATE_DARK,
        headFill: SLATE,
        headText: WHITE,
        headLine: SLATE,
        totalFill: SLATE_100,
        totalText: INK,
        netFill: SLATE_DARK,
        netText: WHITE,
        netBorder: SLATE_DARK,
        zebra: SLATE_50,
        labelFill: SLATE_100,
        headerBand: false,
      };
    case 'accent':
      return {
        id,
        title: brand,
        rule: brand,
        headFill: SLATE_100,
        headText: SLATE_DARK,
        headLine: [203, 213, 225],
        totalFill: SLATE_50,
        totalText: INK,
        netFill: null,
        netText: brand,
        netBorder: brand,
        zebra: null,
        labelFill: SLATE_50,
        headerBand: false,
      };
    case 'branded':
      return {
        id,
        title: brand,
        rule: brand,
        headFill: brand,
        headText: WHITE,
        headLine: brand,
        totalFill: brand,
        totalText: WHITE,
        netFill: brand,
        netText: WHITE,
        netBorder: brand,
        zebra: SLATE_50,
        labelFill: SLATE_100,
        headerBand: true,
      };
    case 'minimal':
    default:
      return {
        id: 'minimal',
        title: INK,
        rule: INK,
        headFill: WHITE,
        headText: INK,
        headLine: INK,
        totalFill: null,
        totalText: INK,
        netFill: null,
        netText: INK,
        netBorder: INK,
        zebra: null,
        labelFill: null,
        headerBand: false,
      };
  }
};

/** "FFRRGGBB" for xlsx-js-style colours */
export const argb = ([r, g, b]: RGB) =>
  `FF${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** xlsx-js-style fill, or nothing for a null colour */
export const xlsxFill = (c: RGB | null) => (c ? { fill: { fgColor: { rgb: argb(c) } } } : {});

/** CSS colour for UI swatches */
export const cssRgb = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;
