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
 * SHIF | NSSF | Housing Levy | WHT | PAYE | Other | Total Deductions |
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

const lineCustomTotal = (line: any) =>
  (line.deductions?.custom || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);

const HEADERS = [
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
  'Other',
  'Total Deductions',
  'Net Pay',
  'N.S.S.F. Employer',
  'AHL Employer',
  'NITA Employer Contribution',
];

// Flatten every payroll's lines into one list, tagged with the source department
const mergedLines = (payrolls: any[]) =>
  payrolls.flatMap((p: any) =>
    (p.lines || []).map((l: any) => ({ ...l, _department: p.department_id?.name || '—' }))
  );

interface MusterRoll {
  headers: string[];
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
  const headers = withDepartment
    ? [HEADERS[0], 'Department', ...HEADERS.slice(1)]
    : HEADERS;

  const perLineNums = (line: any): (string | number)[] => {
    const d = line.deductions || {};
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
      num(lineCustomTotal(line)),
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
    ...HEADERS.slice(1).map((_, i) => sum(firstMoneyCol + i)),
  ];
  const totalsText = totalsNums.map((c, i) => (i === 0 ? String(c) : typeof c === 'number' ? fmt(c) : c));

  // Deductions summary (employee deductions + employer contributions)
  const o = firstMoneyCol; // money-column offset
  const payeTotal = sum(o + 9), shifTotal = sum(o + 5), nssfTotal = sum(o + 6);
  const ahlTotal = sum(o + 7), whtTotal = sum(o + 8), otherTotal = sum(o + 10);
  const dedTotal = sum(o + 11), netTotal = sum(o + 12);
  const nssfErTotal = sum(o + 13), ahlErTotal = sum(o + 14), nitaTotal = sum(o + 15);
  const employerTotal = nssfErTotal + ahlErTotal + nitaTotal; // employer-paid — not employee deductions

  // One row per levy — employee / employer amounts, with the combined total
  const summary: [string, string | number][] = [
    ['PAYE', payeTotal],
    ['SHIF', shifTotal],
    ['NSSF (EE / ER)', `${fmt(nssfTotal)} / ${fmt(nssfErTotal)}`],
    ['NSSF — Total', nssfTotal + nssfErTotal],
    ['Withholding Tax', whtTotal],
    ['AHL (EE / ER)', `${fmt(ahlTotal)} / ${fmt(ahlErTotal)}`],
    ['AHL — Total', ahlTotal + ahlErTotal],
    ['NITA (Employer)', nitaTotal],
    ['Other Deductions', otherTotal],
    ['Total Deductions', dedTotal],
    ['Employer Contributions (NSSF + AHL + NITA)', employerTotal],
    ['Total Payments', dedTotal + employerTotal],
    ['Employees', lines.length],
    ['Net Salaries', netTotal],
  ];

  return { headers, bodyText, bodyNums, totalsText, totalsNums, summary };
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
  const { headers, bodyText, totalsText, summary } = buildMusterRoll(lines, withDepartment);
  const [pr, pg, pb] = primary;
  const margin = 24;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header band ──
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageWidth, 52, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(company.toUpperCase(), margin, 22);
  doc.setFontSize(10);
  doc.text(`MUSTER ROLL — ${payroll.period_label || ''}`, margin, 37);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Sub-header labels for the grouped sections
  const subHead = [
    'Basic Pay', 'Allowances', 'Benefits', 'Overtime', 'Gross Pay',
    'SHIF', 'NSSF', 'Housing', 'NITA', 'PAYE', 'Other', 'Total Ded.',
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
        { content: 'Employee Deductions', colSpan: 7, styles: { halign: 'center' } },
        { content: 'Net Pay', rowSpan: 2 },
        { content: 'Employer Contributions', colSpan: 3, styles: { halign: 'center' } },
      ],
      subHead,
    ],
    body: bodyText,
    foot: [totalsText],
    theme: 'grid',
    styles: {
      fontSize: 6.6,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: [pr, pg, pb],
      textColor: 255,
      fontSize: 6.6,
      fontStyle: 'bold',
      lineColor: [pr, pg, pb],
    },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6.8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries([
      [0, { cellWidth: withDepartment ? 74 : 88, halign: 'left' as const }],
      ...(withDepartment ? [[1, { cellWidth: 62, halign: 'left' as const }]] : []),
      ...headers.slice(withDepartment ? 2 : 1).map((_, i) => [
        i + (withDepartment ? 2 : 1),
        { halign: 'right' as const, cellWidth: withDepartment ? 44 : 47 },
      ]),
    ]),
    margin: { left: margin, right: margin },
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
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
