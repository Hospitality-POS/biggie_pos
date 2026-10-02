import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { message } from 'antd';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';

/**
 * Payroll "Muster Roll" export — Excel + PDF.
 * Employee | Basic | <one column per employee allowance name> |
 * <one column per employee benefit name> | Overtime | Gross |
 * SHIF | NSSF | Housing Levy | WHT | PAYE | <one column per custom
 * deduction name> | Total Deductions |
 * Net Pay | NSSF Employer | AHL Employer | NITA Employer.
 * The Overtime column is hidden when every line is zero, matching the
 * on-screen table. The document title can be the company or the payroll's
 * department name (export option, same as payslips).
 */

const fmt = (v: any) =>
  Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v: any) => Number(v || 0);

const lineName = (line: any) =>
  line.employee_id?.user_id?.fullname ||
  line.employee_id?.fullname ||
  line.fullname ||
  line.employee_id?.employee_number ||
  line.employee_number ||
  '—';

// Money columns — Allowances/Benefits/Overtime hide when every line is zero
// (same rule as the on-screen payroll table); custom deductions get one column
// per name, between PAYE and Total Deductions.
interface MoneyCol {
  header: string;
  get: (line: any) => number;
  hideZero?: boolean;
  custom?: boolean;
}

// One column per custom deduction name — same approach as the on-screen table
const collectCustomNames = (lines: any[]) => {
  const names: string[] = [];
  for (const l of lines)
    for (const c of l.deductions?.custom || [])
      if (c?.name && !names.includes(c.name)) names.push(c.name);
  return names;
};

// Flatten every payroll's lines into one list, tagged with the source department
const mergedLines = (payrolls: any[]) =>
  payrolls.flatMap((p: any) =>
    (p.lines || []).map((l: any) => ({ ...l, _department: p.department_id?.name || '—' }))
  );

interface MusterRoll {
  headers: string[];
  customNames: string[];
  bodyText: string[][];
  bodyNums: (string | number)[][];
  totalsText: string[];
  totalsNums: (string | number)[];
  summary: [string, string | number][];
}

/**
 * Build the row matrices (text for PDF, numeric for Excel) + summary block.
 * `withDepartment` inserts a Department column after the employee name —
 * used when several payrolls are merged into one document.
 */
const buildMusterRoll = (lines: any[], withDepartment = false, rounded = false): MusterRoll => {
  const customNames = collectCustomNames(lines);

  // rounded → whole-shilling values so exported totals foot exactly
  const rn = (v: any) => (rounded ? Math.round(num(v)) : num(v));
  const fmtV = (v: any) =>
    rounded ? Math.round(num(v)).toLocaleString('en-KE') : fmt(v);

  // Getter-based columns so all-zero columns can be dropped without breaking
  // the totals/summary math.
  const dOf = (l: any) => l.deductions || {};
  // Employer levies match the employee share 1:1 by design. Legacy payrolls
  // predate the employer_* fields and Mongoose fills them as 0 on hydrate —
  // so a `??` fallback never fires. Treat 0/missing alike and fall back to
  // the employee amount.
  const erOf = (l: any, erKey: string, eeKey: string) =>
    num(dOf(l)[erKey]) || num(dOf(l)[eeKey]);

  // Allowances and benefits are itemized per employee record — one column
  // per name (falling back to the configured type key, e.g. "house" →
  // "House", "motor_vehicle" → "Motor Vehicle"). When a line has no
  // itemized entries at all but carries a total (e.g. employee record
  // missing/unpopulated), a single labeled fallback column keeps it visible.
  const typeLabel = (key: any, fallback: string) =>
    key
      ? String(key)
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : fallback;
  // Line-level itemized lists (saved at generation/edit time) win over the
  // employee record — they reflect what was actually paid this period
  const allowanceItems = (l: any): any[] =>
    Array.isArray(l.allowance_items) ? l.allowance_items
    : Array.isArray(empOf(l).allowances) ? empOf(l).allowances : [];
  const benefitItems = (l: any): any[] =>
    Array.isArray(l.benefit_items) ? l.benefit_items
    : Array.isArray(empOf(l).benefits) ? empOf(l).benefits : [];
  const allowanceLabel = (a: any) => a?.name || typeLabel(a?.allowance_type, 'Allowance');
  const benefitLabel = (b: any) => b?.name || typeLabel(b?.benefit_type, 'Benefit');
  const allowanceNames = [
    ...new Set(lines.flatMap((l) => allowanceItems(l).map(allowanceLabel))),
  ];
  const benefitNames = [
    ...new Set(lines.flatMap((l) => benefitItems(l).map(benefitLabel))),
  ];

  const moneyCols: MoneyCol[] = [
    { header: 'Basic Pay', get: (l) => rn(l.basic_salary) },
    ...allowanceNames.map((n): MoneyCol => ({
      header: n,
      get: (l) =>
        rn(
          allowanceItems(l)
            .filter((a: any) => allowanceLabel(a) === n)
            .reduce((s: number, a: any) => s + num(a?.amount), 0)
        ),
    })),
    // Fallback only used when NO named allowance items exist on any line —
    // keeps a bare line total (legacy data / unpopulated employee) visible.
    ...(allowanceNames.length === 0 && lines.some((l) => num(l.allowances) > 0)
      ? [{ header: 'Allowances', get: (l: any) => rn(l.allowances) }]
      : []),
    ...benefitNames.map((n): MoneyCol => ({
      header: n,
      get: (l) =>
        rn(
          benefitItems(l)
            .filter((b: any) => benefitLabel(b) === n)
            .reduce((s: number, b: any) => s + num(b?.value), 0)
        ),
    })),
    ...(benefitNames.length === 0 && lines.some((l) => num(l.benefits) > 0)
      ? [{ header: 'Benefits', get: (l: any) => rn(l.benefits) }]
      : []),
    { header: 'Overtime', get: (l) => rn(l.overtime_pay), hideZero: true },
    { header: 'Gross Pay', get: (l) => rn(l.gross_salary) },
    { header: 'S.H.I.F.', get: (l) => rn(dOf(l).nhif) },
    { header: 'N.S.S.F.', get: (l) => rn(dOf(l).nssf) },
    { header: 'Housing Levy', get: (l) => rn(dOf(l).housing_levy) },
    { header: 'WHT', get: (l) => rn(dOf(l).withholding_tax), hideZero: true },
    { header: 'PAYE (Tax)', get: (l) => rn(dOf(l).paye) },
    ...customNames.map((n): MoneyCol => ({
      header: n,
      custom: true,
      get: (l) => rn((dOf(l).custom || []).find((c: any) => c.name === n)?.amount ?? 0),
    })),
    { header: 'Total Deductions', get: (l) => rn(dOf(l).total) },
    { header: 'Net Pay', get: (l) => rn(l.net_pay) },
    { header: 'N.S.S.F. Employer', get: (l) => rn(erOf(l, 'employer_nssf', 'nssf')) },
    { header: 'AHL Employer', get: (l) => rn(erOf(l, 'employer_housing_levy', 'housing_levy')) },
    { header: 'NITA Employer Contribution', get: (l) => rn(erOf(l, 'employer_nita', 'nita')) },
  ];
  const cols = moneyCols.filter((c) => !c.hideZero || lines.some((l) => c.get(l) !== 0));

  const headers = withDepartment
    ? ['Employee Name', 'Department', ...cols.map((c) => c.header)]
    : ['Employee Name', ...cols.map((c) => c.header)];

  const perLineNums = (line: any): (string | number)[] => [
    lineName(line),
    ...(withDepartment ? [line._department || '—'] : []),
    ...cols.map((c) => c.get(line)),
  ];

  const bodyNums = lines.map(perLineNums);
  const firstMoneyCol = withDepartment ? 2 : 1;
  const bodyText = bodyNums.map((r) =>
    r.map((c, i) => (i < firstMoneyCol ? String(c) : fmtV(c)))
  );

  const sumOf = (get: (l: any) => number) =>
    lines.reduce((s: number, l: any) => s + num(get(l)), 0);

  const totalsNums: (string | number)[] = [
    'GRAND TOTALS',
    ...(withDepartment ? [''] : []),
    ...cols.map((c) => sumOf(c.get)),
  ];
  const totalsText = totalsNums.map((c, i) => (i === 0 ? String(c) : typeof c === 'number' ? fmtV(c) : c));

  // Statutory deductions summary — each row sums the same rounded values the
  // matching table column shows, so the summary always foots against the
  // GRAND TOTALS row above it (employee and employer shares kept on separate
  // rows so nothing is double-counted or hidden in a combined figure).
  const payeTotal = sumOf((l) => rn(dOf(l).paye)), shifTotal = sumOf((l) => rn(dOf(l).nhif));
  const nssfTotal = sumOf((l) => rn(dOf(l).nssf)), ahlTotal = sumOf((l) => rn(dOf(l).housing_levy));
  const whtTotal = sumOf((l) => rn(dOf(l).withholding_tax));
  // Sum the custom columns' getters so the row foots exactly against the
  // named custom columns in the table (Loan, HELB, advances…)
  const customCols = cols.filter((c) => c.custom);
  const customTotal = sumOf((l) => customCols.reduce((s, c) => s + c.get(l), 0));
  const dedTotal = sumOf((l) => rn(dOf(l).total)), netTotal = sumOf((l) => rn(l.net_pay));
  const nssfErTotal = sumOf((l) => rn(erOf(l, 'employer_nssf', 'nssf')));
  const ahlErTotal = sumOf((l) => rn(erOf(l, 'employer_housing_levy', 'housing_levy')));
  const nitaTotal = sumOf((l) => rn(erOf(l, 'employer_nita', 'nita')));
  const employerTotal = nssfErTotal + ahlErTotal + nitaTotal; // employer-paid — not employee deductions

  const summary: [string, string | number][] = [
    ['PAYE', rn(payeTotal)],
    ['SHIF', rn(shifTotal)],
    ['NSSF (EE + ER)', rn(nssfTotal + nssfErTotal)],
    ['Housing Levy (EE + ER)', rn(ahlTotal + ahlErTotal)],
    ...(whtTotal > 0 ? [['Withholding Tax', rn(whtTotal)] as [string, number]] : []),
    ...(customTotal > 0 ? [['Custom Deductions', rn(customTotal)] as [string, number]] : []),
    ['NITA (Employer)', rn(nitaTotal)],
    ['Total Deductions', rn(dedTotal + employerTotal)],
    ['Employees', lines.length],
    ['Net Salaries', rn(netTotal)],
  ];

  return { headers, customNames, bodyText, bodyNums, totalsText, totalsNums, summary };
};

export type MusterRollHeaderMode = 'company' | 'department';

// Title shown at the top of a muster roll — company name, or the payroll's
// department name when department mode is chosen/persisted (same setting as
// payslips: payroll_settings.payslip_export_header).
const getHeaderName = async (payroll: any, override?: MusterRollHeaderMode): Promise<string> => {
  let company = payroll?.shop_id?.name || 'Company';
  let mode: MusterRollHeaderMode = 'company';
  try {
    const s = await fetchSystemSetupDetailsById();
    company = s?.name || company;
    if (s?.payroll_settings?.payslip_export_header === 'department') mode = 'department';
  } catch {
    /* keep fallbacks */
  }
  if (override) mode = override;
  return mode === 'department' ? payroll?.department_id?.name || company : company;
};

// ═════════════════════════════════════════════════════════════════════════════
// EXCEL
// ═════════════════════════════════════════════════════════════════════════════
const buildMusterRollSheet = (
  payroll: any,
  company: string,
  lines: any[],
  withDepartment: boolean,
  rounded = false
) => {
  const { headers, bodyNums, totalsNums, summary } = buildMusterRoll(lines, withDepartment, rounded);
  const brand = (getPrimaryColor() || '#0E388A').replace('#', '').toUpperCase().padStart(6, '0');
  const moneyFmt = rounded ? '#,##0' : '#,##0.00';
  const nCols = headers.length;
  const firstMoneyCol = withDepartment ? 2 : 1;

  // ── Layout: title band → headers → body → totals → statutory summary ──
  const TITLE_ROW = 0, SUB_ROW = 1, META_ROW = 2, HEADER_ROW = 4;
  const bodyStart = HEADER_ROW + 1;
  const totalsRow = bodyStart + bodyNums.length;
  const summaryHeadRow = totalsRow + 3;
  const summaryStart = summaryHeadRow + 1;

  const aoa: any[][] = [
    [company.toUpperCase()],
    [`MUSTER ROLL${payroll.period_label ? ` — ${payroll.period_label}` : ''}`],
    [`Generated ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}${rounded ? ' · Amounts rounded to whole KES' : ''}`],
    [],
    headers,
    ...bodyNums,
    totalsNums,
    [],
    [],
    ['Statutory Deductions', ''],
    ...summary,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 28 }, ...headers.slice(1).map(() => ({ wch: 14 }))];
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 14 }, {}, { hpt: 30 }];
  ws['!merges'] = [
    { s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: nCols - 1 } },
    { s: { r: SUB_ROW, c: 0 }, e: { r: SUB_ROW, c: nCols - 1 } },
    { s: { r: META_ROW, c: 0 }, e: { r: META_ROW, c: nCols - 1 } },
    { s: { r: summaryHeadRow, c: 0 }, e: { r: summaryHeadRow, c: 1 } },
  ];

  // ── Cell styles (xlsx-js-style) — mirrors the payslip sheet styling ──
  const thin = { style: 'thin', color: { rgb: 'FFCBD5E1' } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const companyStyle: any = {
    font: { bold: true, sz: 15, color: { rgb: `FF${brand}` } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const titleStyle: any = {
    font: { bold: true, sz: 10, color: { rgb: 'FF64748B' } },
    alignment: { horizontal: 'center' },
  };
  const metaStyle: any = {
    font: { sz: 8.5, color: { rgb: 'FF94A3B8' } },
    alignment: { horizontal: 'center' },
    border: { bottom: { style: 'medium', color: { rgb: `FF${brand}` } } },
  };
  const headerStyle: any = {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };
  const textCell: any = { font: { sz: 9, color: { rgb: 'FF334155' } }, border, alignment: { horizontal: 'left' } };
  const moneyCell: any = { font: { sz: 9 }, border, alignment: { horizontal: 'right' } };
  const zebraText: any = { ...textCell, fill: { fgColor: { rgb: 'FFF8FAFC' } } };
  const zebraMoney: any = { ...moneyCell, fill: { fgColor: { rgb: 'FFF8FAFC' } } };
  const totalsText: any = {
    font: { bold: true, sz: 9.5, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
    alignment: { horizontal: 'left' },
  };
  const totalsMoney: any = { ...totalsText, alignment: { horizontal: 'right' } };
  const summaryHead: any = {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
  };
  const summaryLabel: any = {
    font: { bold: true, sz: 9, color: { rgb: 'FF475569' } },
    fill: { fgColor: { rgb: 'FFF1F5F9' } },
    border,
  };
  const summaryValue: any = { font: { sz: 9 }, border, alignment: { horizontal: 'right' } };
  const summaryLabelHot: any = {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
  };
  const summaryValueHot: any = { ...summaryLabelHot, alignment: { horizontal: 'right' } };

  const setCell = (r: number, c: number, s: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = s;
  };

  // Title band — merged, centered, brand-coloured
  for (let c = 0; c < nCols; c++) {
    setCell(TITLE_ROW, c, companyStyle);
    setCell(SUB_ROW, c, titleStyle);
    setCell(META_ROW, c, metaStyle);
  }
  // Column headers — white bold on brand fill
  for (let c = 0; c < nCols; c++) setCell(HEADER_ROW, c, headerStyle);
  // Body — bordered, zebra-striped, money right-aligned
  bodyNums.forEach((_, i) => {
    const r = bodyStart + i;
    const zebra = i % 2 === 1;
    for (let c = 0; c < nCols; c++) {
      setCell(r, c, c < firstMoneyCol ? (zebra ? zebraText : textCell) : (zebra ? zebraMoney : moneyCell));
    }
  });
  // Totals — dark band, bold white
  for (let c = 0; c < nCols; c++) setCell(totalsRow, c, c < firstMoneyCol ? totalsText : totalsMoney);
  // Statutory summary — section band + bordered rows; total rows highlighted
  setCell(summaryHeadRow, 0, summaryHead);
  setCell(summaryHeadRow, 1, { ...summaryHead, alignment: { horizontal: 'right' } });
  summary.forEach(([label], i) => {
    const r = summaryStart + i;
    const hot = /total|net salaries/i.test(String(label));
    setCell(r, 0, hot ? summaryLabelHot : summaryLabel);
    setCell(r, 1, hot ? summaryValueHot : summaryValue);
  });

  // Number formats — money cells in body/totals, plus summary values
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = HEADER_ROW + 1; r <= totalsRow; r++) {
    for (let c = firstMoneyCol; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = moneyFmt;
    }
  }
  summary.forEach(([label], i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: summaryStart + i, c: 1 })];
    if (cell && cell.t === 'n') cell.z = label === 'Employees' ? '#,##0' : moneyFmt;
  });
  return ws;
};

const sanitizeSheetName = (name: string, fallback: string) =>
  (name || fallback).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || fallback;

export const exportPayrollToExcel = async (payroll: any, opts: { rounded?: boolean; headerMode?: MusterRollHeaderMode } = {}) => {
  const company = await getHeaderName(payroll, opts.headerMode);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildMusterRollSheet(payroll, company, payroll.lines || [], false, !!opts.rounded),
    'Muster Roll'
  );
  XLSX.writeFile(wb, `${payroll.payroll_id || 'payroll'}_muster_roll${opts.rounded ? '_rounded' : ''}.xlsx`);
};

/**
 * Filtered export — merges every payroll into ONE muster roll sheet.
 * A Department column is added so combined rows stay attributable.
 */
export const exportPayrollsToExcel = async (payrolls: any[], opts: { rounded?: boolean; headerMode?: MusterRollHeaderMode } = {}) => {
  if (!payrolls.length) {
    message.warning('No payrolls to export for the current filter');
    return;
  }
  console.info('[payroll-export] exporting payrolls:', payrolls.map((p) => p.payroll_id || p._id));
  const merged = payrolls.length > 1;
  // A single payroll in department mode shows its department as the title;
  // merged exports have no single department → company name.
  const company = await getHeaderName(merged ? null : payrolls[0], opts.headerMode);
  const wb = XLSX.utils.book_new();

  try {
    const display = merged
      ? { ...payrolls[0], payroll_id: `${payrolls.length} payrolls`, department_id: null }
      : payrolls[0];
    const lines = merged ? mergedLines(payrolls) : payrolls[0].lines || [];
    const ws = buildMusterRollSheet(display, company, lines, merged, !!opts.rounded);
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      merged ? 'Muster Roll' : sanitizeSheetName(display.payroll_id, 'Muster Roll')
    );
  } catch (err) {
    console.error('Failed to build muster roll sheet:', err);
    message.error('Export failed — could not render payrolls');
    return;
  }

  const firstPeriod = payrolls[0].period_label?.replace(/\s+/g, '_') || 'export';
  XLSX.writeFile(wb, `payroll_muster_rolls_${firstPeriod}${opts.rounded ? '_rounded' : ''}.xlsx`);
  message.success(
    merged
      ? `Exported ${payrolls.length} merged payrolls (${mergedLines(payrolls).length} employees) to Excel`
      : 'Exported 1 payroll to Excel'
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// PDF
// ═════════════════════════════════════════════════════════════════════════════
const renderPayrollPage = (
  doc: jsPDF,
  payroll: any,
  company: string,
  primary: [number, number, number],
  lines: any[],
  withDepartment: boolean,
  rounded = false
) => {
  const { headers, bodyText, totalsText, summary } = buildMusterRoll(lines, withDepartment, rounded);
  const fmtV = (v: any) =>
    rounded ? Math.round(num(v)).toLocaleString('en-KE') : fmt(v);
  const [pr, pg, pb] = primary;
  const margin = 24;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header band ──
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageWidth, 52, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(company.toUpperCase(), pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`MUSTER ROLL — ${payroll.period_label || ''}`, pageWidth / 2, 37, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Sub-header labels derived from the actual visible columns (all-zero
  // Allowances/Benefits/Overtime columns are dropped upstream) — Net Pay is a
  // rowSpan column so it is excluded here.
  const firstMoneyCol = withDepartment ? 2 : 1;
  const iShif = headers.indexOf('S.H.I.F.');
  const iTotDed = headers.indexOf('Total Deductions');
  const earnSpan = iShif - firstMoneyCol;
  const dedSpan = iTotDed - iShif + 1;
  const SHORT: Record<string, string> = {
    'S.H.I.F.': 'SHIF', 'N.S.S.F.': 'NSSF', 'Housing Levy': 'Housing',
    'PAYE (Tax)': 'PAYE', 'Total Deductions': 'Total Ded.',
    'N.S.S.F. Employer': 'NSSF', 'AHL Employer': 'AHL', 'NITA Employer Contribution': 'NITA',
  };
  const subHead = headers
    .slice(firstMoneyCol)
    .filter((h) => h !== 'Net Pay')
    .map((h) => SHORT[h] || h);

  // ── Main table with grouped section headers ──
  autoTable(doc, {
    startY: 62,
    head: [
      [
        { content: 'Employee Name', rowSpan: 2 },
        ...(withDepartment
          ? [{ content: 'Department', rowSpan: 2 }]
          : []),
        { content: 'Earnings', colSpan: earnSpan, styles: { halign: 'center' } },
        { content: 'Employee Deductions', colSpan: dedSpan, styles: { halign: 'center' } },
        { content: 'Net Pay', rowSpan: 2 },
        { content: 'Employer Contributions', colSpan: 3, styles: { halign: 'center' } },
      ],
      subHead,
    ],
    body: bodyText,
    foot: [totalsText],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: [pr, pg, pb],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      lineColor: [pr, pg, pb],
    },
    footStyles: {
      fillColor: [pr, pg, pb],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries([
      [0, { cellWidth: 110, halign: 'left' as const }],
      ...(withDepartment ? [[1, { cellWidth: 80, halign: 'left' as const }]] : []),
      ...headers.slice(withDepartment ? 2 : 1).map((_, i) => [
        i + (withDepartment ? 2 : 1),
        { halign: 'right' as const },
      ]),
    ]),
    margin: { left: margin, right: margin },
    // 'auto' stretches the table edge-to-edge between the margins — matching
    // the full-width header band — with money columns flexing evenly
    tableWidth: 'auto',
  });

  // ── Statutory deductions summary block ──
  const afterTable = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Statutory Deductions', margin, afterTable);

  autoTable(doc, {
    startY: afterTable + 6,
    body: summary.map(([k, v]) => [
      k,
      k === 'Employees' ? String(v) : typeof v === 'number' ? fmtV(v) : v,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 180 }, 1: { halign: 'right', cellWidth: 100 } },
    margin: { left: margin },
    tableWidth: 280,
    didParseCell: (data) => {
      // Highlight total rows in the summary
      const label = String((data.row.raw as any)?.[0] ?? '');
      if (/Total|Net Salaries/i.test(label)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });
};

const addPageFooters = (doc: jsPDF, primary: [number, number, number]) => {
  const [pr, pg, pb] = primary;
  const pageCount = doc.getNumberOfPages();
  const margin = 24;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, pageHeight - 12);
    doc.setTextColor(pr, pg, pb);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 40, pageHeight - 12);
  }
};

export const exportPayrollToPDF = async (payroll: any, opts: { rounded?: boolean; headerMode?: MusterRollHeaderMode } = {}) => {
  const company = await getHeaderName(payroll, opts.headerMode);
  // A3 landscape — the muster roll has ~17 columns; a wider page keeps every
  // column readable and lets the viewer scroll sideways if needed
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const primary = hexToRgb(getPrimaryColor());
  renderPayrollPage(doc, payroll, company, primary, payroll.lines || [], false, !!opts.rounded);
  addPageFooters(doc, primary);
  doc.save(`${payroll.payroll_id || 'payroll'}_muster_roll${opts.rounded ? '_rounded' : ''}.pdf`);
};

/**
 * Filtered export — merges every payroll into ONE muster roll document
 * (Department column added when several payrolls are combined).
 */
export const exportPayrollsToPDF = async (payrolls: any[], opts: { rounded?: boolean; headerMode?: MusterRollHeaderMode } = {}) => {
  if (!payrolls.length) {
    message.warning('No payrolls to export for the current filter');
    return;
  }
  console.info('[payroll-export] exporting payrolls:', payrolls.map((p) => p.payroll_id || p._id));
  const merged = payrolls.length > 1;
  const company = await getHeaderName(merged ? null : payrolls[0], opts.headerMode);
  // A3 landscape — keeps all muster-roll columns readable on a merged export
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const primary = hexToRgb(getPrimaryColor());
  const lines = merged ? mergedLines(payrolls) : payrolls[0].lines || [];

  try {
    const display = merged
      ? { ...payrolls[0], payroll_id: `${payrolls.length} payrolls`, department_id: null }
      : payrolls[0];
    renderPayrollPage(doc, display, company, primary, lines, merged, !!opts.rounded);
  } catch (err) {
    console.error('Failed to render muster roll page:', err);
    message.error('Export failed — could not render payrolls');
    return;
  }

  addPageFooters(doc, primary);
  const firstPeriod = payrolls[0].period_label?.replace(/\s+/g, '_') || 'export';
  doc.save(`payroll_muster_rolls_${firstPeriod}${opts.rounded ? '_rounded' : ''}.pdf`);
  message.success(
    merged
      ? `Exported ${payrolls.length} merged payrolls (${lines.length} employees) to PDF`
      : 'Exported 1 payroll to PDF'
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// STATUTORY FILING TEMPLATES (NSSF / SHIF / PAYE) — Excel
// ═════════════════════════════════════════════════════════════════════════════

// Payroll line → employee record (employee_id may be populated or a bare id)
const empOf = (line: any): any =>
  typeof line.employee_id === 'object' && line.employee_id ? line.employee_id : {};

// Split a name into first/last pieces — prefer the employee's stored
// firstname/middle_name/lastname, fall back to splitting fullname.
const splitName = (line: any) => {
  const emp = empOf(line);
  const full = lineName(line);
  const first = emp.firstname || '';
  const middle = emp.middle_name || '';
  const last = emp.lastname || '';
  if (first || last) {
    return { first, middle, last, other: [first, middle].filter(Boolean).join(' ') || first };
  }
  const parts = String(full === '—' ? '' : full).split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || '',
    middle: parts.slice(1, -1).join(' '),
    last: parts.length > 1 ? parts[parts.length - 1] : '',
    other: parts.slice(0, -1).join(' ') || parts[0] || '',
  };
};

const filingLines = (payrolls: any[], employeeIds?: string[]) => {
  const lines = mergedLines(payrolls);
  if (!employeeIds?.length) return lines;
  const ids = new Set(employeeIds.map(String));
  return lines.filter((l: any) => ids.has(String(l.employee_id?._id || l.employee_id)));
};

// RFC-4180-ish CSV cell — quote anything containing commas, quotes or breaks
const csvCell = (v: any) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCsv = (rows: (string | number)[][], filename: string) => {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const writeFilingSheet = (
  payrolls: any[],
  headers: string[],
  rowOf: (line: any, index: number) => (string | number)[],
  filePrefix: string,
  employeeIds?: string[],
  opts: { csv?: boolean; withHeader?: boolean } = {}
) => {
  const lines = filingLines(payrolls, employeeIds);
  if (!lines.length) {
    message.warning('Selected payrolls have no employee lines');
    return;
  }
  const rows = lines.map((l, i) => rowOf(l, i + 1));
  const period = payrolls[0].period_label?.replace(/\s+/g, '_') || 'export';

  if (opts.csv) {
    downloadCsv(
      [...(opts.withHeader === false ? [] : [headers]), ...rows],
      `${filePrefix}_${period}.csv`
    );
    message.success(`${filePrefix} filing file exported (${lines.length} employees)`);
    return;
  }

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filePrefix}_${period}.xlsx`);
  message.success(`${filePrefix} filing file exported (${lines.length} employees)`);
};

/** NSSF by-employer return — matches the "Nssf Data" template layout */
export const exportNssfFiling = (payrolls: any[], employeeIds?: string[]) =>
  writeFilingSheet(
    payrolls,
    ['PAYROLL NUMBER', 'SURNAME', 'OTHER NAMES', 'ID NO', 'KRA PIN', 'NSSF NO', 'GROSS PAY', 'VOLUNTARY'],
    (line) => {
      const emp = empOf(line);
      const n = splitName(line);
      return [
        emp.employee_number || '',
        n.last.toUpperCase(),
        n.other.toUpperCase(),
        emp.id_number || '',
        emp.kra_pin || '',
        emp.nssf_number || '',
        num(line.gross_salary),
        '',
      ];
    },
    'NSSF_Return',
    employeeIds
  );

/** SHIF (by-employer) return — matches the "SHIF temp" layout */
export const exportShifFiling = (payrolls: any[], employeeIds?: string[]) =>
  writeFilingSheet(
    payrolls,
    ['PAYROLL NUMBER', 'FIRSTNAME', 'LAST NAME', 'IDENTITY TYPE', 'ID NO', 'KRA PIN', 'NHIF NO', 'CONTRIBUTION AMOUNT', 'PHONE'],
    (line) => {
      const emp = empOf(line);
      const n = splitName(line);
      return [
        emp.employee_number || '',
        n.first,
        n.last,
        'National ID',
        emp.id_number || '',
        emp.kra_pin || '',
        emp.nhif_number || '',
        num(line.deductions?.nhif), // SHIF contribution (stored under nhif)
        String(emp.phone || ''),
      ];
    },
    'SHIF_Return',
    employeeIds
  );

/**
 * PAYE return — aligned to the KRA "P10 Return Simplified" template
 * (B_Employees_Dtls_Simplified sheet, columns A–Y + AC). Exported as a
 * headerless CSV so rows can be pasted/uploaded straight into the template.
 * Benefit items are split into the KRA columns: motor_vehicle → Car Benefit
 * (B), house → Housing Benefit (F), meals → Value of Meals (C), everything
 * else → Non Cash Benefits (D).
 */
export const exportPayeFiling = (payrolls: any[], employeeIds?: string[]) =>
  writeFilingSheet(
    payrolls,
    [
      'PIN of Employee', 'Name of Employee', 'Resident Status', 'Type of Employee',
      'Persons With Disability (PWD)', 'Exemption Certificate Number',
      'Total Cash Pay (A)', 'Value of Car Benefit (B)', 'Value of Meals (C)',
      'Non Cash Benefits (D)', 'Type of Housing', 'Housing Benefit (F)',
      'Other Benefits (G)', 'Total Gross Pay (Ksh) (H)', 'SHIF (I)',
      'NSSF Contribution (J)', 'Other Pension Contribution (K)',
      'Post Retirement Medical Fund (L)', 'Mortgage Interest (M)',
      'Affordable Housing Levy (N)', 'Taxable Pay (O)', 'Monthly Personal Relief (P)',
      'Amount of Insurance Relief (Q)', 'PAYE Tax (R)', 'Self Assessed PAYE Tax (S)',
      '', '', '', 'Deposit on Home Ownership Saving Plan',
    ],
    (line) => {
      const emp = empOf(line);
      const d = line.deductions || {};
      const gross = num(line.gross_salary);
      const benefits = num(line.benefits);

      // Split the employee's named benefit items into the KRA columns
      const items: any[] = Array.isArray(emp.benefits) ? emp.benefits : [];
      const bSum = (re: RegExp, types: string[]) =>
        items
          .filter((b) => types.includes(String(b?.benefit_type || '')) || re.test(String(b?.name || '')))
          .reduce((s, b) => s + num(b?.value), 0);
      const carBenefit = bSum(/car|motor|vehicle/i, ['motor_vehicle', 'car']);
      const mealBenefit = bSum(/meal/i, ['meal', 'meals']);
      const houseBenefit = bSum(/house|housing|rent|quarters/i, ['house', 'housing']);
      const otherNonCash = Math.max(0, benefits - carBenefit - mealBenefit - houseBenefit);

      return [
        emp.kra_pin || '',                                      // PIN of Employee
        lineName(line),                                         // Name of Employee
        emp.residential_status === 'non_resident' ? 'Non-Resident' : 'Resident',
        'Primary Employee',                                     // Type of Employee
        'No',                                                   // Persons With Disability
        '',                                                     // Exemption Certificate Number
        num(gross - benefits),                                  // Total Cash Pay (A)
        carBenefit,                                             // Value of Car Benefit (B)
        mealBenefit,                                            // Value of Meals (C)
        otherNonCash,                                           // Non Cash Benefits (D)
        houseBenefit > 0 ? "Employer's Rented House" : 'Benefit not given', // Type of Housing
        houseBenefit,                                           // Housing Benefit (F)
        0,                                                      // Other Benefits (G)
        gross,                                                  // Total Gross Pay (H)
        num(d.nhif),                                            // SHIF (I)
        num(d.nssf),                                            // NSSF Contribution (J)
        0,                                                      // Other Pension Contribution (K)
        0,                                                      // Post Retirement Medical Fund (L)
        0,                                                      // Mortgage Interest (M)
        num(d.housing_levy),                                    // Affordable Housing Levy (N)
        num(d.taxable_pay ?? gross),                            // Taxable Pay (O)
        num(d.personal_relief),                                 // Monthly Personal Relief (P)
        0,                                                      // Amount of Insurance Relief (Q)
        num(d.paye),                                            // PAYE Tax (R)
        num(d.paye),                                            // Self Assessed PAYE Tax (S)
        '', '', '',                                             // blank template columns
        0,                                                      // Deposit on Home Ownership Saving Plan
      ];
    },
    'PAYE_Return',
    employeeIds,
    { csv: true, withHeader: false }
  );
