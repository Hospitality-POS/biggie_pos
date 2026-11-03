import type jsPDF from 'jspdf';
import { fetchShop } from '@services/shops';
import { fetchAllDepartments } from '@services/crm/departments';

/**
 * Logo on payroll muster roll / payslip PDFs.
 *
 * Controlled by the shop's payroll_logo_settings (System Setup → Payroll):
 *   show_logo off               → no logo at all
 *   department_logos_enabled on → a department's own logo wins (Staff Management)
 * otherwise the tenant (business) logo is used, and nothing when there is none.
 *
 * Images are pre-loaded and normalised to PNG data URLs up front because the
 * jsPDF page renderers are synchronous.
 */

export interface ExportLogo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ExportLogoResolver {
  /** Logo for a department's document — falls back to the tenant logo, or null */
  forDepartment: (departmentId?: string | null) => ExportLogo | null;
}

const NO_LOGO: ExportLogoResolver = { forDepartment: () => null };

// Keep embedded images small — the logo is drawn at most ~120pt wide
const MAX_PX = 600;

const loadImage = async (url?: string | null): Promise<ExportLogo | null> => {
  if (!url) return null;
  try {
    // Fetch as a blob first so the canvas isn't tainted by a cross-origin image
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const objectUrl = URL.createObjectURL(await res.blob());
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
      });
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return null;
      const scale = Math.min(1, MAX_PX / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (err) {
    console.warn('[export-logo] could not load logo, exporting without it:', url, err);
    return null;
  }
};

const tenantLogoUrl = (): string | undefined => {
  try {
    return JSON.parse(localStorage.getItem('tenant') || '{}')?.tenant_logo?.url;
  } catch {
    return undefined;
  }
};

/** Department id on a payroll or payslip document (populated or bare id) */
export const departmentIdOf = (doc: any): string | undefined => {
  const d =
    doc?.payroll_id?.department_id ??
    doc?.department_id ??
    doc?.employee_id?.department_id;
  const id = typeof d === 'object' && d ? d._id : d;
  return id ? String(id) : undefined;
};

/** Load every logo the given departments' documents will need */
export const loadExportLogos = async (departmentIds: (string | null | undefined)[] = []): Promise<ExportLogoResolver> => {
  const shopId = localStorage.getItem('shopId');
  const shop = shopId ? await fetchShop(shopId).catch(() => null) : null;
  const settings = shop?.payroll_logo_settings || {};
  if (settings.show_logo === false) return NO_LOGO;

  const tenantLogo = await loadImage(tenantLogoUrl());

  const departmentLogos = new Map<string, ExportLogo>();
  const wanted = [...new Set(departmentIds.filter(Boolean).map(String))];
  if (settings.department_logos_enabled && wanted.length) {
    const { departments } = await fetchAllDepartments().catch(() => ({ departments: [] as any[] }));
    await Promise.all(
      wanted.map(async (id) => {
        const url = departments.find((d: any) => String(d._id) === id)?.logo?.url;
        const logo = await loadImage(url);
        if (logo) departmentLogos.set(id, logo);
      })
    );
  }

  return {
    forDepartment: (id) => (id && departmentLogos.get(String(id))) || tenantLogo,
  };
};

/**
 * Draw a logo scaled to fit a box (aspect ratio kept). `align` positions it
 * horizontally inside the box; it sits at the bottom of the box vertically.
 */
export const drawExportLogo = (
  doc: jsPDF,
  logo: ExportLogo,
  box: { x: number; y: number; maxWidth: number; maxHeight: number; align?: 'left' | 'center' }
) => {
  const scale = Math.min(box.maxWidth / logo.width, box.maxHeight / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;
  const x = box.align === 'center' ? box.x + (box.maxWidth - w) / 2 : box.x;
  const y = box.y + (box.maxHeight - h);
  doc.addImage(logo.dataUrl, 'PNG', x, y, w, h);
};
