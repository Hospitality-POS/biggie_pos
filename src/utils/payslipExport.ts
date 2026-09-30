import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { message } from 'antd';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { getUser } from '@services/tenants';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';

/**
 * Payslip export — PDF (one page per payslip) and Excel (one sheet per
 * payslip + a Summary sheet). Both use the classic stacked payslip layout:
 * employee info → EARNINGS → PAYE computation → DEDUCTIONS → NET PAY.
 */

const fmt = (n?: number | null) =>
  Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const employeeName = (p: any) =>
  p.employee_id?.user_id?.fullname ||
  p.employee_id?.fullname ||
  [p.employee_id?.first_name, p.employee_id?.last_name].filter(Boolean).join(' ') ||
  p.employee_id?.employee_number ||
  'Employee';

const departmentName = (p: any) =>
  p.payroll_id?.department_id?.name || p.department_id?.name || '—';

// ── Shared payslip data model ──────────────────────────────────────────────────
const payslipRows = (p: any) => {
  const e = p.earnings || {};
  const d = p.deductions || {};
  const taxable =
    d.taxable_pay ??
    Math.max(0, (e.gross_salary || 0) - (d.nssf || 0) - (d.nhif || 0) - (d.housing_levy || 0));
  const incomeTax = d.income_tax ?? 0;
  const relief = d.personal_relief ?? 0;
  const paye = d.paye ?? Math.max(0, incomeTax - relief);
  const custom = Array.isArray(d.custom) ? d.custom : [];

  const infoRows: [string, string][] = [
    ['Name of Employee', employeeName(p)],
    ['Employee No', p.employee_id?.employee_number || '—'],
    ['ID No', p.employee_id?.id_number || '—'],
    ['KRA PIN', p.employee_id?.kra_pin || '—'],
    ['NSSF No', p.employee_id?.nssf_number || '—'],
    ['NHIF No', p.employee_id?.nhif_number || '—'],
    ['Job Title', p.employee_id?.job_title || '—'],
    ['Department', departmentName(p)],
  ];

  const earningsRows: [string, string][] = [
    ['Basic Pay', fmt(e.basic_salary)],
    ['Allowances', (e.allowances || 0) > 0 ? fmt(e.allowances) : '—'],
    ['Benefits', (e.benefits || 0) > 0 ? fmt(e.benefits) : '—'],
    ['Overtime Pay', (e.overtime_pay || 0) > 0 ? fmt(e.overtime_pay) : '—'],
    ['TOTAL EARNINGS', fmt(e.gross_salary)],
  ];

  const payeRows: [string, string][] = [
    ['Liable Pay', fmt(e.gross_salary)],
    ['Less Pension (NSSF)', `(${fmt(d.nssf)})`],
    ['Less SHIF', `(${fmt(d.nhif)})`],
    ['Less Housing Levy (AHL)', `(${fmt(d.housing_levy)})`],
    ['CHARGEABLE AMOUNT', fmt(taxable)],
    ['Tax Charged', fmt(incomeTax)],
    ['Personal Relief', `(${fmt(relief)})`],
    ['P.A.Y.E', fmt(paye)],
  ];

  const deductionRows: [string, string][] = [
    ['P.A.Y.E', fmt(paye)],
    ['N.S.S.F.', fmt(d.nssf)],
    ['SHIF (NHIF)', fmt(d.nhif)],
    ['Housing Levy', fmt(d.housing_levy)],
    ...(d.withholding_tax || 0) > 0 ? [['Withholding Tax', fmt(d.withholding_tax)] as [string, string]] : [],
    ...custom.map((c: any): [string, string] => [c.name, fmt(c.amount)]),
    ['TOTAL DEDUCTIONS', fmt(d.total)],
  ];

  return { infoRows, earningsRows, payeRows, deductionRows, netPay: p.net_pay };
};

export type PayslipHeaderMode = 'company' | 'department';

const getExportContext = async (headerOverride?: PayslipHeaderMode) => {
  const user = getUser();
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
  let company = 'Company';
  let kraPin: string | undefined;
  let address: string | undefined;
  let headerMode: PayslipHeaderMode = 'company';
  let p9HideEmployer = false;
  try {
    const s = await fetchSystemSetupDetailsById();
    company = s?.name || s?.business_name || tenant.tenant_name || 'Company';
    kraPin = s?.kra_pin || tenant.kra_pin;
    address = s?.location || s?.address || tenant.address;
    const ps = s?.payroll_settings || {};
    if (ps.payslip_export_header === 'department') headerMode = 'department';
    p9HideEmployer = !!ps.p9_hide_employer;
  } catch {
    company = tenant.tenant_name || 'Company';
  }
  if (headerOverride) headerMode = headerOverride;
  return { company, kraPin, address, user, primary: hexToRgb(getPrimaryColor()), headerMode, p9HideEmployer };
};

// The name that appears at the top of an exported payslip
const headerName = (p: any, ctx: { company: string; headerMode: PayslipHeaderMode }) =>
  ctx.headerMode === 'department' ? departmentName(p) : ctx.company;

// ═════════════════════════════════════════════════════════════════════════════
// PDF — stacked classic payslip layout (one page per payslip)
// ═════════════════════════════════════════════════════════════════════════════
export const renderPayslipPage = (
  doc: jsPDF,
  payslip: any,
  ctx: {
    company: string;
    kraPin?: string;
    address?: string;
    user?: any;
    primary: [number, number, number];
    headerMode?: PayslipHeaderMode;
  },
  isFirstPage = true
) => {
  const { kraPin, address, user, primary } = ctx;
  const company = headerName(payslip, { company: ctx.company, headerMode: ctx.headerMode || 'company' });
  const [pr, pg, pb] = primary;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // Squeeze the payslip into a centered column — figures stay compact in the
  // middle of the page instead of stretching edge-to-edge (privacy-friendly)
  const contentWidth = Math.min(pageWidth * 0.48, 300);
  const margin = (pageWidth - contentWidth) / 2;
  const { infoRows, earningsRows, payeRows, deductionRows, netPay } = payslipRows(payslip);

  if (!isFirstPage) doc.addPage();

  // ── Company header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(pr, pg, pb);
  doc.text(company.toUpperCase(), pageWidth / 2, margin + 2, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${(payslip.period_label || '').toUpperCase()} PAYSLIP`, pageWidth / 2, margin + 16, { align: 'center' });
  if (address || kraPin) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const bits = [address && `${typeof address === 'string' ? address : ''}`, kraPin && `Employer PIN: ${kraPin}`]
      .filter(Boolean)
      .join('   ·   ');
    if (bits) doc.text(bits, pageWidth / 2, margin + 28, { align: 'center' });
  }

  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(1);
  doc.line(margin, margin + 34, pageWidth - margin, margin + 34);

  let y = margin + 42;

  // ── Employee info — 2 label/value column pairs ──
  const mid = Math.ceil(infoRows.length / 2);
  const infoBody = infoRows.slice(0, mid).map((row, i) => [...row, ...(infoRows[mid + i] || ['', ''])]);
  autoTable(doc, {
    startY: y,
    body: infoBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62, textColor: [71, 85, 105] },
      1: { cellWidth: 68 },
      2: { fontStyle: 'bold', cellWidth: 62, textColor: [71, 85, 105] },
      3: {},
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const sectionTable = (title: string, rows: [string, string][], highlightLast = true) => {
    autoTable(doc, {
      startY: y,
      head: [[{ content: title, styles: { fillColor: [pr, pg, pb] } }, 'KSH']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 190, textColor: [51, 65, 85] },
        1: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (highlightLast && data.section === 'body' && data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [pr, pg, pb];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  sectionTable('EARNINGS', earningsRows);
  sectionTable('PAYE COMPUTATION', payeRows);
  sectionTable('DEDUCTIONS', deductionRows);

  // ── Net pay banner — same brand color as the highlighted totals rows ──
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(margin, y, contentWidth, 26, 4, 4, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAY', margin + 12, y + 17);
  doc.setFontSize(15);
  doc.text(`KES ${fmt(netPay)}`, pageWidth - margin - 12, y + 18, { align: 'right' });

  // ── Footer ──
  const footerY = pageHeight - 26;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, footerY, {
    align: 'center',
  });
  doc.text(`Generated ${fmtDate(new Date().toISOString())} · by ${user?.name || 'System'}`, pageWidth / 2, footerY + 11, {
    align: 'center',
  });
};

// Build a payslip PDF document without saving — returns the jsPDF instance
// (used for email attachments via doc.output('datauristring'))
export const buildPayslipsPDFDoc = async (payslips: any[], headerMode?: PayslipHeaderMode) => {
  if (!payslips.length) return null;
  const ctx = await getExportContext(headerMode);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let rendered = 0;
  for (const p of payslips) {
    try {
      renderPayslipPage(doc, p, ctx, rendered === 0);
      rendered++;
    } catch (err) {
      console.error(`Failed to render payslip ${p?._id}:`, err);
    }
  }
  return rendered ? doc : null;
};

export const generatePayslipsPDF = async (payslips: any[], headerMode?: PayslipHeaderMode) => {
  if (!payslips.length) {
    message.warning('No payslips to export for the current filter');
    return;
  }
  const doc = await buildPayslipsPDFDoc(payslips, headerMode);
  if (!doc) {
    message.error('Export failed — no payslips could be rendered');
    return;
  }

  const period = payslips[0]?.period_label?.replace(/\s+/g, '_') || 'export';
  doc.save(`payslips_${period}.pdf`);
  message.success(`Exported ${payslips.length} payslip${payslips.length === 1 ? '' : 's'} to PDF`);
};

// ═════════════════════════════════════════════════════════════════════════════
// EXCEL — Summary sheet + one payslip-layout sheet per employee
// ═════════════════════════════════════════════════════════════════════════════
const sanitizeSheetName = (name: string, fallback: string) =>
  (name || fallback).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || fallback;

// ═════════════════════════════════════════════════════════════════════════════
// P9 — Excel export of the official KRA income tax deduction card (columns A–O)
// ═════════════════════════════════════════════════════════════════════════════
export const exportP9ToExcel = async (payslips: any[], year: number, opts?: { hideEmployer?: boolean }) => {
  if (!payslips.length) {
    message.warning('No payslips to export for the selected year');
    return;
  }
  const ctx = await getExportContext();
  const hideEmployer = opts?.hideEmployer ?? ctx.p9HideEmployer;
  const company = hideEmployer ? '' : ctx.company;
  const kraPin = hideEmployer ? '' : ctx.kraPin;
  const emp = payslips[0]?.employee_id || {};
  const empName = employeeName(payslips[0]);

  const E3_FIXED = 30000;
  const monthly: Record<number, any> = {};
  payslips.forEach((p: any) => {
    const m = new Date(p.period_start).getMonth();
    if (!monthly[m]) monthly[m] = { a: 0, b: 0, d: 0, e2: 0, f: 0, g: 0, l: 0, mm: 0, o: 0 };
    const e = p.earnings || {};
    const d = p.deductions || {};
    const basic = e.basic_salary || 0;
    const gross = e.gross_salary || 0;
    monthly[m].a += basic;
    monthly[m].b += gross - basic;
    monthly[m].d += gross;
    monthly[m].e2 += d.nssf || 0;
    monthly[m].f += d.housing_levy || 0;
    monthly[m].g += d.nhif || 0;
    monthly[m].l += d.income_tax || 0;
    monthly[m].mm += d.personal_relief || 0;
    monthly[m].o += d.paye || 0;
  });

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];

  const aoa: any[][] = [
    [company.toUpperCase()],
    [`KENYA REVENUE AUTHORITY — INCOME TAX DEDUCTION CARD YEAR ${year}`],
    [],
    // Privacy mode blanks the employer values but keeps the labels
    ["Employer's Name:", company, '', "Employer's P.I.N.:", kraPin || ''],
    ["Employee's Main Name:", empName, '', "Employee's P.I.N.:", emp.kra_pin || ''],
    [],
    [],
    // Header row 1 — grouped
    [
      'MONTH', 'Basic Salary', 'Benefits Non-Cash', 'Value of Quarters', 'Total Gross Pay',
      'Defined Contribution Retirement Scheme', '', '',
      'Affordable Housing Levy (AHL)', 'Social Health Insurance Fund (SHIF)',
      'Post Retirement Medical Fund (PRMF)', 'Owner Occupied Interest',
      'Total Deductions (E+F+G+H+I)', 'Chargeable Pay', 'Tax Charged',
      'Personal Relief', 'Insurance Relief', 'P.A.Y.E. Tax (L-M-N)',
    ],
    // Header row 2 — column letters
    ['', 'A', 'B', 'C', 'D', 'E1', 'E2', 'E3', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
    // Header row 3 — units
    [
      '', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.',
      'E1 30% of A', 'E2 Actual', 'E3 Fixed',
      'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.',
    ],
  ];

  const totals = { a: 0, b: 0, d: 0, e1: 0, e2: 0, f: 0, g: 0, j: 0, k: 0, l: 0, mm: 0, o: 0 };
  monthNames.forEach((name, i) => {
    const r = monthly[i];
    if (!r) {
      aoa.push([name]);
      return;
    }
    const e1 = r.a * 0.3;
    const eUsed = Math.min(e1, r.e2, E3_FIXED);
    const j = eUsed + r.f + r.g;
    const k = r.d - j;
    aoa.push([
      name, r.a, r.b, 0, r.d, e1, r.e2, E3_FIXED,
      r.f, r.g, 0, 0, j, k, r.l, r.mm, 0, r.o,
    ]);
    totals.a += r.a; totals.b += r.b; totals.d += r.d;
    totals.e1 += e1; totals.e2 += r.e2;
    totals.f += r.f; totals.g += r.g;
    totals.j += j; totals.k += k;
    totals.l += r.l; totals.mm += r.mm; totals.o += r.o;
  });
  const monthsWithData = Object.keys(monthly).length;
  aoa.push([
    'TOTALS', totals.a, totals.b, 0, totals.d, totals.e1, totals.e2, monthsWithData * E3_FIXED,
    totals.f, totals.g, 0, 0, totals.j, totals.k, totals.l, totals.mm, 0, totals.o,
  ]);
  aoa.push(
    [],
    ['To be completed by Employer at end of year'],
    [`TOTAL CHARGEABLE PAY (COL K)`, totals.k, '', `TOTAL TAX (COL O)`, totals.o],
    [],
    ['IMPORTANT'],
    ['1. Use P9A (a) for all liable employees and where director/employee received benefits in addition to cash emoluments.'],
    ['     (b) Where an employee is eligible to deduction on owner occupier interest.'],
    ['     (c) Where an employee contributes to a post retirement medical fund.'],
    ['2. (a) Deductible interest in respect of any month must not exceed Kshs. 30,000/=.'],
    ['     (b) Deductible contributions to a post retirement medical fund in respect of any month must not exceed Kshs. 15,000.'],
    ['(d) Personal relief is Kshs. 2,400 per month or 28,800 per year.'],
    ['(e) Insurance relief is 15% of the premium up to a maximum of Kshs. 5,000 per month or 60,000 per year.'],
    ['(f) Attach (i) Photostat copy of interest certificate and statement of account from the financial institution.'],
    ['          (ii) The DECLARATION duly signed by the employee.'],
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 14 },
    ...Array(17).fill({ wch: 12.5 }),
  ];
  // Merge MONTH (3 rows) + the E group + company title + info spans
  ws['!merges'] = [
    { s: { r: 7, c: 0 }, e: { r: 9, c: 0 } },      // MONTH
    { s: { r: 7, c: 5 }, e: { r: 7, c: 7 } },      // Defined Contribution group
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },      // company title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },      // card title
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },      // employer name value
    { s: { r: 3, c: 4 }, e: { r: 3, c: 8 } },      // employer PIN value
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },      // employee name value
    { s: { r: 4, c: 4 }, e: { r: 4, c: 8 } },      // employee PIN value
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },      // other names value
  ];
  // Number format the money cells (cols 1..17, data rows start at index 10)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 10; r <= range.e.r; r++) {
    for (let c = 1; c <= 17; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  const empNo = emp.employee_number || 'employee';
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(`P9 ${empNo} ${year}`, `P9 ${year}`));
  XLSX.writeFile(wb, `P9_Form_${empNo}_${year}.xlsx`);
};

const buildPayslipSheet = (p: any, company: string) => {
  const { infoRows, earningsRows, payeRows, deductionRows, netPay } = payslipRows(p);
  const brand = (getPrimaryColor() || '#0E388A').replace('#', '').toUpperCase().padStart(6, '0');

  const aoa: any[][] = [
    [company.toUpperCase()],
    [`${(p.period_label || '').toUpperCase()} PAYSLIP`],
    [`Period: ${fmtDate(p.period_start)} – ${fmtDate(p.period_end)}`],
    [],
  ];
  const infoStart = aoa.length;
  infoRows.forEach((r) => aoa.push(r));
  aoa.push([]);

  const sectionIdx: number[] = [];
  const dataIdx: number[] = [];
  const totalIdx: number[] = [];
  const pushSection = (title: string, rows: [string, string][]) => {
    sectionIdx.push(aoa.length);
    aoa.push([title, 'KSH']);
    rows.forEach((r) => {
      aoa.push(r);
      dataIdx.push(aoa.length - 1);
    });
    totalIdx.push(aoa.length - 1);
    aoa.push([]);
  };
  pushSection('EARNINGS', earningsRows);
  pushSection('PAYE COMPUTATION', payeRows);
  pushSection('DEDUCTIONS', deductionRows);
  const netPayIdx = aoa.length;
  aoa.push(['NET PAY', `KES ${fmt(netPay)}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 32 }, { wch: 24 }];
  ws['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: 1 } }));
  ws['!rows'] = [{ hpt: 22 }, { hpt: 15 }, { hpt: 15 }];

  // ── Cell styles (written by xlsx-js-style) ──
  const thin = { style: 'thin', color: { rgb: 'FFCBD5E1' } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const companyStyle: any = {
    font: { bold: true, sz: 14, color: { rgb: `FF${brand}` } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const titleStyle: any = {
    font: { bold: true, sz: 10, color: { rgb: 'FF64748B' } },
    alignment: { horizontal: 'center' },
  };
  const periodStyle: any = {
    font: { sz: 9, color: { rgb: 'FF94A3B8' } },
    alignment: { horizontal: 'center' },
    border: { bottom: { style: 'medium', color: { rgb: `FF${brand}` } } },
  };
  const infoLabel: any = {
    font: { bold: true, sz: 9, color: { rgb: 'FF475569' } },
    fill: { fgColor: { rgb: 'FFF1F5F9' } },
    border,
  };
  const infoValue: any = { font: { sz: 9 }, border };
  const sectionLabel: any = {
    font: { bold: true, sz: 9.5, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
  };
  const bodyLabel: any = { font: { sz: 9, color: { rgb: 'FF334155' } }, border };
  const bodyValue: any = { font: { sz: 9 }, border, alignment: { horizontal: 'right' } };
  const totalLabel: any = {
    font: { bold: true, sz: 9.5, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
  };
  const netPayLabel: any = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: `FF${brand}` } },
    border,
  };

  const setCell = (r: number, c: number, s: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = s;
  };

  // Centered, merged company header rows
  [0, 1, 2].forEach((r) =>
    [0, 1].forEach((c) => setCell(r, c, r === 0 ? companyStyle : r === 1 ? titleStyle : periodStyle))
  );
  // Employee info block — bold shaded labels, bordered values
  for (let r = infoStart; r < infoStart + infoRows.length; r++) {
    setCell(r, 0, infoLabel);
    setCell(r, 1, infoValue);
  }
  // Section headers + data borders + brand-highlighted totals
  sectionIdx.forEach((r) => {
    setCell(r, 0, sectionLabel);
    setCell(r, 1, { ...sectionLabel, alignment: { horizontal: 'right' } });
  });
  dataIdx.forEach((r) => {
    setCell(r, 0, bodyLabel);
    setCell(r, 1, bodyValue);
  });
  totalIdx.forEach((r) => {
    setCell(r, 0, totalLabel);
    setCell(r, 1, { ...totalLabel, alignment: { horizontal: 'right' } });
  });
  setCell(netPayIdx, 0, netPayLabel);
  setCell(netPayIdx, 1, { ...netPayLabel, alignment: { horizontal: 'right' } });

  // Number-format all numeric cells in the value column
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 0; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && cell.t === 'n') cell.z = '#,##0.00';
  }
  return ws;
};

/** Single-payslip Excel export — the classic payslip layout on one sheet. */
export const exportPayslipToExcel = async (payslip: any, headerMode?: PayslipHeaderMode) => {
  const ctx = await getExportContext(headerMode);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildPayslipSheet(payslip, headerName(payslip, ctx)),
    sanitizeSheetName(payslip.employee_id?.employee_number || 'Payslip', 'Payslip')
  );
  const period = (payslip.period_label || 'export').replace(/\s+/g, '_');
  const empNo = payslip.employee_id?.employee_number || 'employee';
  XLSX.writeFile(wb, `Payslip_${empNo}_${period}.xlsx`);
};

export const exportPayslipsToExcel = async (payslips: any[], headerMode?: PayslipHeaderMode) => {
  if (!payslips.length) {
    message.warning('No payslips to export for the current filter');
    return;
  }
  const ctx = await getExportContext(headerMode);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  // ── Summary sheet ──
  const summaryHead = [
    'Employee', 'Employee No', 'Department', 'Period',
    'Gross', 'PAYE', 'NSSF', 'SHIF', 'Housing Levy', 'WHT',
    'Other', 'Total Deductions', 'Net Pay', 'Emailed',
  ];
  const summaryBody = payslips.map((p: any) => [
    employeeName(p),
    p.employee_id?.employee_number || '—',
    departmentName(p),
    p.period_label || '—',
    p.earnings?.gross_salary || 0,
    p.deductions?.paye || 0,
    p.deductions?.nssf || 0,
    p.deductions?.nhif || 0,
    p.deductions?.housing_levy || 0,
    p.deductions?.withholding_tax || 0,
    (p.deductions?.custom || []).reduce((s: number, c: any) => s + (c.amount || 0), 0),
    p.deductions?.total || 0,
    p.net_pay || 0,
    p.emailed_at ? 'Yes' : 'No',
  ]);
  const summaryWs = XLSX.utils.aoa_to_sheet([summaryHead, ...summaryBody]);
  summaryWs['!cols'] = [
    { wch: 26 }, { wch: 12 }, { wch: 20 }, { wch: 16 },
    { wch: 12 }, { wch: 11 }, { wch: 10 }, { wch: 10 },
    { wch: 13 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 9 },
  ];
  const sRange = XLSX.utils.decode_range(summaryWs['!ref'] || 'A1');
  for (let r = 1; r <= sRange.e.r; r++) {
    for (let c = 4; c <= 12; c++) {
      const cell = summaryWs[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  usedNames.add('Summary');

  // ── One payslip sheet per employee ──
  let failed = 0;
  for (const p of payslips) {
    try {
      let name = sanitizeSheetName(
        `${p.employee_id?.employee_number || 'EMP'} ${p.period_label || ''}`.trim(),
        p._id || 'payslip'
      );
      let n = 1;
      while (usedNames.has(name)) name = `${name.slice(0, 28)}_${++n}`;
      usedNames.add(name);
      XLSX.utils.book_append_sheet(wb, buildPayslipSheet(p, headerName(p, ctx)), name);
    } catch (err) {
      console.error(`Failed to render payslip sheet ${p?._id}:`, err);
      failed++;
    }
  }

  const period = payslips[0]?.period_label?.replace(/\s+/g, '_') || 'export';
  XLSX.writeFile(wb, `payslips_${period}.xlsx`);
  if (failed) {
    message.warning(`Exported ${wb.SheetNames.length - 1} payslip sheets; ${failed} failed`);
  } else {
    message.success(`Exported ${wb.SheetNames.length - 1} payslip sheet${wb.SheetNames.length - 1 === 1 ? '' : 's'} + summary to Excel`);
  }
};
