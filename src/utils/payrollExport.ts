import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { message } from 'antd';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';

/**
 * Payroll "Muster Roll" export — Excel + PDF.
 * Shares one column layout with the on-screen payroll tables:
 * Employee | Basic | Allowances | Benefits | Overtime | Gross |
 * SHIF | NSSF | Housing Levy | WHT | PAYE | <one column per custom
 * deduction name> | Total Deductions |
 * Net Pay | NSSF Employer | AHL Employer | NITA Employer
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

// Fixed columns before and after the dynamic per-name custom deduction ones
const PRE_CUSTOM_HEADERS = [
  'Employee Name',
  'Basic Pay',
  'Allowances',
  'Benefits',
  'Overtime',
  'Gross Pay',
  'S.H.I.F.',
  'N.S.S.F.',
  'Housing Levy',
  'WHT',
  'PAYE (Tax)',
];
const POST_CUSTOM_HEADERS = [
  'Total Deductions',
  'Net Pay',
  'N.S.S.F. Employer',
  'AHL Employer',
  'NITA Employer Contribution',
];

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
const buildMusterRoll = (lines: any[], withDepartment = false): MusterRoll => {
  const customNames = collectCustomNames(lines);
  const headers = withDepartment
    ? [PRE_CUSTOM_HEADERS[0], 'Department', ...PRE_CUSTOM_HEADERS.slice(1), ...customNames, ...POST_CUSTOM_HEADERS]
    : [...PRE_CUSTOM_HEADERS, ...customNames, ...POST_CUSTOM_HEADERS];

  const perLineNums = (line: any): (string | number)[] => {
    const d = line.deductions || {};
    const customByName = new Map((d.custom || []).map((c: any) => [c.name, num(c.amount)]));
    return [
      lineName(line),
      ...(withDepartment ? [line._department || '—'] : []),
      num(line.basic_salary),
      num(line.allowances),
      num(line.benefits),
      num(line.overtime_pay),
      num(line.gross_salary),
      num(d.nhif),           // SHIF (stored under nhif)
      num(d.nssf),
      num(d.housing_levy),
      num(d.withholding_tax),
      num(d.paye),
      ...customNames.map((n) => customByName.get(n) ?? 0),
      num(d.total),
      num(line.net_pay),
      num(d.employer_nssf ?? d.nssf),                 // employer NSSF matches employee share
      num(d.employer_housing_levy ?? d.housing_levy), // employer AHL matches employee share
      num(d.employer_nita ?? d.nita),                 // statutory KES 50 employer levy
    ];
  };

  const bodyNums = lines.map(perLineNums);
  const firstMoneyCol = withDepartment ? 2 : 1;
  const bodyText = bodyNums.map((r) =>
    r.map((c, i) => (i < firstMoneyCol ? String(c) : fmt(c)))
  );

  const sum = (col: number) =>
    bodyNums.reduce((s: number, r) => s + (typeof r[col] === 'number' ? (r[col] as number) : 0), 0);

  const totalsNums: (string | number)[] = [
    'GRAND TOTALS',
    ...(withDepartment ? [''] : []),
    ...headers.slice(withDepartment ? 2 : 1).map((_, i) => sum(firstMoneyCol + i)),
  ];
  const totalsText = totalsNums.map((c, i) => (i === 0 ? String(c) : typeof c === 'number' ? fmt(c) : c));

  // Deductions summary (employee deductions + employer contributions)
  const o = firstMoneyCol; // money-column offset
  const N = customNames.length;
  const payeTotal = sum(o + 9), shifTotal = sum(o + 5), nssfTotal = sum(o + 6);
  const ahlTotal = sum(o + 7), whtTotal = sum(o + 8);
  const customTotals = customNames.map((_, i) => sum(o + 10 + i));
  const dedTotal = sum(o + 10 + N), netTotal = sum(o + 11 + N);
  const nssfErTotal = sum(o + 12 + N), ahlErTotal = sum(o + 13 + N), nitaTotal = sum(o + 14 + N);
  const employerTotal = nssfErTotal + ahlErTotal + nitaTotal; // employer-paid — not employee deductions

  // One row per levy — the combined employee + employer total, matching the
  // single NSSF / Housing Levy columns shown on-screen
  const summary: [string, string | number][] = [
    ['PAYE', payeTotal],
    ['SHIF', shifTotal],
    ['NSSF', nssfTotal + nssfErTotal],
    ['Withholding Tax', whtTotal],
    ['Housing Levy', ahlTotal + ahlErTotal],
    ['NITA (Employer)', nitaTotal],
    ...customNames.map(
      (n, i) => [n, customTotals[i]] as [string, string | number]
    ),
    ['Total Deductions', dedTotal],
    ['Employer Contributions (NSSF + AHL + NITA)', employerTotal],
    ['Total Payments', dedTotal + employerTotal],
    ['Employees', lines.length],
    ['Net Salaries', netTotal],
  ];

  return { headers, customNames, bodyText, bodyNums, totalsText, totalsNums, summary };
};

const getCompanyName = async (payroll: any): Promise<string> => {
  try {
    const s = await fetchSystemSetupDetailsById();
    return s?.name || payroll?.shop_id?.name || 'Company';
  } catch {
    return payroll?.shop_id?.name || 'Company';
  }
};

const payrollTitle = (payroll: any, company: string) =>
  `${company} Muster Roll for ${payroll.period_label || ''}`.trim();

// ═════════════════════════════════════════════════════════════════════════════
// EXCEL
// ═════════════════════════════════════════════════════════════════════════════
const buildMusterRollSheet = (
  payroll: any,
  company: string,
  lines: any[],
  withDepartment: boolean
) => {
  const { headers, bodyNums, totalsNums, summary } = buildMusterRoll(lines, withDepartment);

  const aoa: any[][] = [
    [payrollTitle(payroll, company)],
    [],
    headers,
    ...bodyNums,
    totalsNums,
    [],
    [],
    ['Deductions Summary', ''],
    ...summary,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 26 }, ...headers.slice(1).map(() => ({ wch: 14 }))];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },   // title
  ];

  // Numeric formatting — every non-name cell below the header
  const headerRow = 2; // 0-based index of HEADERS row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    for (let c = 1; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
  }
  return ws;
};

const sanitizeSheetName = (name: string, fallback: string) =>
  (name || fallback).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || fallback;

export const exportPayrollToExcel = async (payroll: any) => {
  const company = await getCompanyName(payroll);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildMusterRollSheet(payroll, company, payroll.lines || [], false),
    'Muster Roll'
  );
  XLSX.writeFile(wb, `${payroll.payroll_id || 'payroll'}_muster_roll.xlsx`);
};

/**
 * Filtered export — merges every payroll into ONE muster roll sheet.
 * A Department column is added so combined rows stay attributable.
 */
export const exportPayrollsToExcel = async (payrolls: any[]) => {
  if (!payrolls.length) {
    message.warning('No payrolls to export for the current filter');
    return;
  }
  console.info('[payroll-export] exporting payrolls:', payrolls.map((p) => p.payroll_id || p._id));
  const merged = payrolls.length > 1;
  const company = await getCompanyName(payrolls[0]);
  const wb = XLSX.utils.book_new();

  try {
    const display = merged
      ? { ...payrolls[0], payroll_id: `${payrolls.length} payrolls`, department_id: null }
      : payrolls[0];
    const lines = merged ? mergedLines(payrolls) : payrolls[0].lines || [];
    const ws = buildMusterRollSheet(display, company, lines, merged);
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
  XLSX.writeFile(wb, `payroll_muster_rolls_${firstPeriod}.xlsx`);
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
  withDepartment: boolean
) => {
  const { headers, customNames, bodyText, totalsText, summary } = buildMusterRoll(lines, withDepartment);
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

  // Sub-header labels for the grouped sections — one column per custom
  // deduction name sits between PAYE and Total Deductions
  const subHead = [
    'Basic Pay', 'Allowances', 'Benefits', 'Overtime', 'Gross Pay',
    'SHIF', 'NSSF', 'Housing', 'WHT', 'PAYE',
    ...customNames,
    'Total Ded.',
    'NSSF', 'AHL', 'NITA',
  ];

  // ── Main table with grouped section headers ──
  autoTable(doc, {
    startY: 62,
    head: [
      [
        { content: 'Employee Name', rowSpan: 2 },
        ...(withDepartment
          ? [{ content: 'Department', rowSpan: 2 }]
          : []),
        { content: 'Earnings', colSpan: 5, styles: { halign: 'center' } },
        { content: 'Employee Deductions', colSpan: 6 + customNames.length, styles: { halign: 'center' } },
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
      fillColor: [30, 41, 59],
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
        { halign: 'right' as const, cellWidth: 56 },
      ]),
    ]),
    margin: { left: margin, right: margin },
    tableWidth: 'wrap',
  });

  // ── Deductions summary block ──
  const afterTable = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions Summary', margin, afterTable);

  autoTable(doc, {
    startY: afterTable + 6,
    body: summary.map(([k, v]) => [k, typeof v === 'number' ? fmt(v) : v]),
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

export const exportPayrollToPDF = async (payroll: any) => {
  const company = await getCompanyName(payroll);
  // A3 landscape — the muster roll has ~17 columns; a wider page keeps every
  // column readable and lets the viewer scroll sideways if needed
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const primary = hexToRgb(getPrimaryColor());
  renderPayrollPage(doc, payroll, company, primary, payroll.lines || [], false);
  addPageFooters(doc, primary);
  doc.save(`${payroll.payroll_id || 'payroll'}_muster_roll.pdf`);
};

/**
 * Filtered export — merges every payroll into ONE muster roll document
 * (Department column added when several payrolls are combined).
 */
export const exportPayrollsToPDF = async (payrolls: any[]) => {
  if (!payrolls.length) {
    message.warning('No payrolls to export for the current filter');
    return;
  }
  console.info('[payroll-export] exporting payrolls:', payrolls.map((p) => p.payroll_id || p._id));
  const merged = payrolls.length > 1;
  const company = await getCompanyName(payrolls[0]);
  // A3 landscape — keeps all muster-roll columns readable on a merged export
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const primary = hexToRgb(getPrimaryColor());
  const lines = merged ? mergedLines(payrolls) : payrolls[0].lines || [];

  try {
    const display = merged
      ? { ...payrolls[0], payroll_id: `${payrolls.length} payrolls`, department_id: null }
      : payrolls[0];
    renderPayrollPage(doc, display, company, primary, lines, merged);
  } catch (err) {
    console.error('Failed to render muster roll page:', err);
    message.error('Export failed — could not render payrolls');
    return;
  }

  addPageFooters(doc, primary);
  const firstPeriod = payrolls[0].period_label?.replace(/\s+/g, '_') || 'export';
  doc.save(`payroll_muster_rolls_${firstPeriod}.pdf`);
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

const writeFilingSheet = (
  payrolls: any[],
  headers: string[],
  rowOf: (line: any, index: number) => (string | number)[],
  filePrefix: string,
  employeeIds?: string[]
) => {
  const lines = filingLines(payrolls, employeeIds);
  if (!lines.length) {
    message.warning('Selected payrolls have no employee lines');
    return;
  }
  const aoa = [headers, ...lines.map((l, i) => rowOf(l, i + 1))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const period = payrolls[0].period_label?.replace(/\s+/g, '_') || 'export';
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
 * PAYE return — KRA iTax payroll register layout (Excel upload for the
 * PAYE/P10 monthly return). Blank columns are left for values we don't
 * track (housing benefit, directors fees…) so they can be filled in Excel.
 */
export const exportPayeFiling = (payrolls: any[], employeeIds?: string[]) =>
  writeFilingSheet(
    payrolls,
    [
      'PIN of Employee', 'Name of Employee', 'Residential Status', 'Type of Employee',
      'Primary Employee', 'Basic Salary', 'Housing Allowance', 'Transport Allowance',
      'Leave Pay', 'Overtime Allowance', 'Directors Fee', 'Lump Sum Payment',
      'Other Allowance', 'Total Cash Pay', 'Value of Car Benefit',
      'Other Non-Cash Benefits', 'Total Non-Cash Pay', 'Global Income',
      'Type of Housing', 'Rent of House', 'Computed Rent of House', 'Rent Recovered',
      'Net Value of Housing', 'Total Gross Pay', 'Total Taxable Pay',
      'Tax Payable on Taxable Pay', 'Amount of Relief', 'Insurance Relief', 'PAYE Tax',
    ],
    (line) => {
      const emp = empOf(line);
      const d = line.deductions || {};
      const allowances = num(line.allowances);
      const benefits = num(line.benefits);
      const overtime = num(line.overtime_pay);
      const gross = num(line.gross_salary);
      const taxable = num(d.taxable_pay ?? gross);
      const paye = num(d.paye);
      const relief = num(d.personal_relief);
      const incomeTax = num(d.income_tax ?? paye + relief);
      return [
        emp.kra_pin || '',
        lineName(line),
        'Resident',
        'Primary Employee',
        'Yes',
        num(line.basic_salary),
        0,                    // Housing Allowance
        0,                    // Transport Allowance
        0,                    // Leave Pay
        overtime,
        0,                    // Directors Fee
        0,                    // Lump Sum Payment
        allowances + benefits, // Other Allowance
        gross,                // Total Cash Pay
        0,                    // Value of Car Benefit
        0,                    // Other Non-Cash Benefits
        0,                    // Total Non-Cash Pay
        gross,                // Global Income
        'Benefit not provided', // Type of Housing
        0, 0, 0, 0,           // Rent / computed / recovered / net housing
        gross,                // Total Gross Pay
        taxable,              // Total Taxable Pay
        incomeTax,            // Tax Payable on Taxable Pay
        relief,               // Amount of Relief (personal relief)
        0,                    // Insurance Relief
        paye,                 // PAYE Tax
      ];
    },
    'PAYE_Return',
    employeeIds
  );
