import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUser } from '@services/tenants';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';

/**
 * Official KRA P9 layout — landscape A4 income tax deduction card:
 * KRA crest, employer/employee PIN block, columns A–O, TOTALS row,
 * employer year-end totals and the IMPORTANT notes.
 */

const fmt = (n?: number | null) =>
  Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const loadImageAsDataUrl = async (path: string): Promise<string | null> => {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const buildP9FormDoc = async (payslips: any[], year: number): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const user = getUser();
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

  let settings: any = {};
  try {
    settings = await fetchSystemSetupDetailsById();
  } catch {
    /* fall back to tenant data */
  }
  const employerName = settings?.name || settings?.business_name || tenant.tenant_name || 'Company Name';
  const employerPin = settings?.kra_pin || tenant.kra_pin || '';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  let y = 28;

  // ── KRA crest + titles ──────────────────────────────────────────────────────
  const logo = await loadImageAsDataUrl('/kra.png');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', pageWidth / 2 - 26, y, 52, 52);
    } catch {
      /* logo optional */
    }
  }
  y += 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text('KENYA REVENUE AUTHORITY', pageWidth / 2, y, { align: 'center' });
  doc.setFontSize(11);
  doc.text('DOMESTIC TAXES DEPARTMENT', pageWidth / 2, y + 14, { align: 'center' });
  doc.setFontSize(11.5);
  doc.text(`INCOME TAX DEDUCTION CARD YEAR ${year}`, pageWidth / 2, y + 28, { align: 'center' });
  y += 44;

  // ── Employer / employee info — official two-column layout ──────────────────
  const emp = payslips[0]?.employee_id || {};
  const employeeName = emp.fullname || emp.user_id?.fullname || emp.employee_number || '';

  const infoLine = (label: string, value: string, x: number, yy: number, lineWidth: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${label}:`, x, yy);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', x + labelW + 4, yy);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(x + labelW + 4, yy + 2, x + labelW + 4 + lineWidth, yy + 2);
  };

  const leftX = margin;
  const rightX = pageWidth / 2 + 30;
  const lineW = pageWidth / 2 - margin - 150;
  infoLine("Employer's Name", employerName, leftX, y, lineW);
  infoLine("Employer's P.I.N.", employerPin, rightX, y, lineW - 40);
  infoLine("Employee's Main Name", employeeName, leftX, y + 15, lineW);
  infoLine("Employee's P.I.N.", emp.kra_pin || '', rightX, y + 15, lineW - 40);
  infoLine("Employee's Other Names", emp.other_names || '', leftX, y + 30, lineW);
  y += 44;

  // ── Monthly grid — official columns A–O ────────────────────────────────────
  const E3_FIXED = 30000;
  const monthly: Record<number, any> = {};
  payslips.forEach((p: any) => {
    const m = new Date(p.period_start).getMonth();
    if (!monthly[m]) {
      monthly[m] = { a: 0, b: 0, d: 0, e2: 0, f: 0, g: 0, l: 0, mm: 0, o: 0 };
    }
    const e = p.earnings || {};
    const d = p.deductions || {};
    const basic = e.basic_salary || 0;
    const gross = e.gross_salary || 0;
    monthly[m].a += basic;
    monthly[m].b += gross - basic; // allowances + benefits + overtime
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

  const body: any[][] = monthNames.map((name, i) => {
    const r = monthly[i];
    if (!r) return [{ content: name, styles: { fontStyle: 'bold' } }, ...Array(17).fill('')];
    const e1 = r.a * 0.3;
    const eUsed = Math.min(e1, r.e2, E3_FIXED);
    const j = eUsed + r.f + r.g;
    const k = r.d - j;
    return [
      { content: name, styles: { fontStyle: 'bold' } },
      fmt(r.a), fmt(r.b), fmt(0), fmt(r.d),
      fmt(e1), fmt(r.e2), fmt(E3_FIXED),
      fmt(r.f), fmt(r.g), fmt(0), fmt(0), fmt(j),
      fmt(k), fmt(r.l), fmt(r.mm), fmt(0), fmt(r.o),
    ];
  });

  const total = (fn: (r: any) => number) =>
    Object.values(monthly).reduce((s: number, r: any) => s + fn(r), 0);
  const totE1 = total((r) => r.a * 0.3);
  const totE2 = total((r) => r.e2);
  const monthsWithData = Object.keys(monthly).length;
  const totJ = Object.values(monthly).reduce(
    (s: number, r: any) => s + Math.min(r.a * 0.3, r.e2, E3_FIXED) + r.f + r.g, 0
  );
  const totK = total((r) => r.d) - totJ;

  body.push([
    { content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
    ...[
      total((r) => r.a), total((r) => r.b), 0, total((r) => r.d),
      totE1, totE2, monthsWithData * E3_FIXED,
      total((r) => r.f), total((r) => r.g), 0, 0, totJ,
      totK, total((r) => r.l), total((r) => r.mm), 0, total((r) => r.o),
    ].map((v) => ({ content: fmt(v as number), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } })),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: 'MONTH', rowSpan: 3 },
        'Basic Salary', 'Benefits Non-Cash', 'Value of Quarters', 'Total Gross Pay',
        { content: 'Defined Contribution Retirement Scheme', colSpan: 3 },
        'Affordable Housing Levy (AHL)', 'Social Health Insurance Fund (SHIF)',
        'Post Retirement Medical Fund (PRMF)', 'Owner Occupied Interest',
        'Total Deductions (E+F+G+H+I)', 'Chargeable Pay', 'Tax Charged',
        'Personal Relief', 'Insurance Relief', 'P.A.Y.E. Tax (L–M–N)',
      ],
      ['A', 'B', 'C', 'D', 'E1', 'E2', 'E3', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
      [
        'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.',
        'E1 30% of A', 'E2 Actual', 'E3 Fixed',
        'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.',
        'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.', 'Kshs.',
      ],
    ],
    body,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 3,
      textColor: 0,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      halign: 'right',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 5.8,
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 62 },
    },
    margin: { left: margin, right: margin },
  });

  // ── Employer year-end totals ────────────────────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('To be completed by Employer at end of year', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  y += 13;
  doc.text(`TOTAL CHARGEABLE PAY (COL K)  Kshs. ${fmt(totK)}`, margin, y);
  doc.text(`TOTAL TAX (COL O)  Kshs. ${fmt(total((r) => r.o))}`, pageWidth / 2 + 40, y);
  y += 18;

  // ── IMPORTANT notes ─────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('IMPORTANT', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const note = doc.splitTextToSize(
    '1. Use P9A (a) for all liable employees and where director/employee received benefits in addition to cash emoluments.\n' +
    '     (b) Where an employee is eligible to deduction on owner occupier interest.\n' +
    '     (c) Where an employee contributes to a post retirement medical fund.\n' +
    '2. (a) Deductible interest in respect of any month must not exceed Kshs. 30,000/=.\n' +
    '     (b) Deductible contributions to a post retirement medical fund in respect of any month must not exceed Kshs. 15,000.',
    pageWidth / 2 - margin - 10
  );
  const note2 = doc.splitTextToSize(
    '(d) Personal relief is Kshs. 2,400 per month or 28,800 per year.\n' +
    '(e) Insurance relief is 15% of the premium up to a maximum of Kshs. 5,000 per month or 60,000 per year.\n' +
    '(f) Attach (i) Photostat copy of interest certificate and statement of account from the financial institution.\n' +
    '        (ii) The DECLARATION duly signed by the employee.',
    pageWidth / 2 - margin - 10
  );
  doc.text(note, margin, y + 10);
  doc.text(note2, pageWidth / 2 + 10, y + 10);

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated by ${user?.name || 'System'} · ${employerName}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 14,
    { align: 'center' }
  );

  return doc;
};

export const generateP9FormPDF = async (payslips: any[], year: number) => {
  const doc = await buildP9FormDoc(payslips, year);
  const empNo = payslips[0]?.employee_id?.employee_number || 'employee';
  doc.save(`P9_Form_${empNo}_${year}.pdf`);
};
