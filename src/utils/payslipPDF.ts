import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUser } from '@services/tenants';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { BASE_URL } from '@utils/config';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';

interface PayslipData {
  _id: string;
  payroll_id: {
    _id: string;
    payroll_id: string;
    department_id: {
      _id: string;
      name: string;
      code: string;
    };
    period_label: string;
  };
  employee_id: {
    _id: string;
    employee_number: string;
    job_title: string;
    fullname?: string;
    email?: string;
    user_id?: { fullname?: string; email?: string } | null;
    blood_group?: string;
    date_of_birth?: string;
    gender?: string;
  };
  earnings: {
    basic_salary: number;
    allowances: number;
    benefits: number;
    overtime_pay: number;
    gross_salary: number;
  };
  deductions: {
    paye: number;
    nssf: number;
    nhif: number;
    housing_levy: number;
    taxable_pay?: number;
    income_tax?: number;
    personal_relief?: number;
    custom: Array<{ name: string; amount: number }>;
    total: number;
  };
  net_pay: number;
  period_start: string;
  period_end: string;
  period_label: string;
  days_worked: number;
  overtime_hours: number;
  pdf_url?: string | null;
  generated_at: string;
  emailed_at?: string | null;
  email_to?: string | null;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

// Resolve a stored logo reference (URL, path, or base64) into a data URL
const loadLogoAsDataUrl = async (logo?: string | null): Promise<string | null> => {
  if (!logo) return null;
  try {
    const url = logo.startsWith('data:')
      ? logo
      : logo.startsWith('http')
        ? logo
        : `${BASE_URL.replace(/\/$/, '')}${logo.startsWith('/') ? '' : '/'}${logo}`;
    const res = await fetch(url);
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

const fmt = (n?: number | null) => (n ?? 0).toLocaleString();
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

export const generatePayslipPDF = async (payslip: PayslipData) => {
  const doc = new jsPDF();
  const user = getUser();
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

  // Fetch system settings for company details
  let systemSettings: any = {};
  try {
    systemSettings = await fetchSystemSetupDetailsById();
  } catch (error) {
    console.log('Could not fetch system settings');
  }

  const companyName =
    systemSettings?.name || systemSettings?.business_name || tenant.tenant_name || 'Company Name';
  const companyAddress = systemSettings?.location || systemSettings?.address || tenant.address;
  const companyPhone = systemSettings?.phone || tenant.phone;
  const companyEmail = systemSettings?.email || tenant.email;
  const logoData = await loadLogoAsDataUrl(systemSettings?.logo || tenant.tenant_logo);

  // Colors
  const primaryColor: [number, number, number] = hexToRgb(getPrimaryColor());
  const textColor: [number, number, number] = [15, 23, 42];
  const subTextColor: [number, number, number] = [100, 116, 139];
  const cardBg: [number, number, number] = [248, 250, 252];
  const borderColor: [number, number, number] = [226, 232, 240];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Logo (left) or placeholder tile
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 12, 26, 26);
    } catch (error) {
      console.log('Could not add logo to PDF');
    }
  } else {
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, 12, 26, 26, 3, 3, 'FD');
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.charAt(0).toUpperCase(), margin + 13, 28, { align: 'center' });
  }

  // Company details next to logo
  let cx = margin + 32;
  doc.setFontSize(18);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, cx, 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...subTextColor);
  let cy = 26;
  if (companyAddress) {
    const addressStr = typeof companyAddress === 'string' ? companyAddress : JSON.stringify(companyAddress);
    doc.text(addressStr, cx, cy);
    cy += 4.5;
  }
  const contactBits = [companyPhone && `Phone: ${companyPhone}`, companyEmail && `Email: ${companyEmail}`]
    .filter(Boolean)
    .join('   ');
  if (contactBits) {
    doc.text(contactBits, cx, cy);
  }

  // Payslip title block (right side)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PAYSLIP', pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...subTextColor);
  doc.text(payslip.period_label || '', pageWidth - margin, 26, { align: 'right' });
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin, 31, { align: 'right' });

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(margin, 44, pageWidth - margin, 44);

  // ── Employee / Period info cards ───────────────────────────────────────────
  const cardY = 50;
  const cardH = 34;
  const colW = (contentWidth - 6) / 2;

  // Employee card
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, cardY, colW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...subTextColor);
  doc.text('EMPLOYEE', margin + 5, cardY + 7);

  const empName =
    payslip.employee_id?.user_id?.fullname ||
    payslip.employee_id?.fullname ||
    payslip.employee_id?.employee_number ||
    'N/A';
  const empEmail = payslip.employee_id?.user_id?.email || payslip.employee_id?.email || 'N/A';

  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(empName, margin + 5, cardY + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...subTextColor);
  doc.text(`${payslip.employee_id?.employee_number || 'N/A'} · ${payslip.employee_id?.job_title || 'N/A'}`, margin + 5, cardY + 20);
  doc.text(empEmail, margin + 5, cardY + 25.5);
  doc.text(`Dept: ${payslip.payroll_id?.department_id?.name || 'N/A'}`, margin + 5, cardY + 31);

  // Period card
  const periodX = margin + colW + 6;
  doc.setFillColor(...cardBg);
  doc.roundedRect(periodX, cardY, colW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...subTextColor);
  doc.text('PAY PERIOD', periodX + 5, cardY + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${payslip.period_label}`, periodX + 5, cardY + 14);
  doc.text(`From ${fmtDate(payslip.period_start)} to ${fmtDate(payslip.period_end)}`, periodX + 5, cardY + 20);
  doc.text(
    `Days worked: ${payslip.days_worked ?? 0}   Overtime: ${payslip.overtime_hours ?? 0} hrs`,
    periodX + 5,
    cardY + 26
  );

  // ── Earnings & Deductions — side-by-side tables ────────────────────────────
  const tableTop = cardY + cardH + 8;
  const halfWidth = (contentWidth - 6) / 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Earnings', margin, tableTop);
  doc.text('Deductions', margin + halfWidth + 6, tableTop);

  autoTable(doc, {
    startY: tableTop + 2,
    margin: { left: margin, right: margin + halfWidth + 6 },
    head: [['Description', 'Amount (KES)']],
    body: [
      ['Basic Salary', fmt(payslip.earnings?.basic_salary)],
      ['Allowances', fmt(payslip.earnings?.allowances)],
      ['Benefits', fmt(payslip.earnings?.benefits)],
      ['Overtime Pay', fmt(payslip.earnings?.overtime_pay)],
      ['Gross Salary', fmt(payslip.earnings?.gross_salary)],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 8.5, cellPadding: 2.4 },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = cardBg;
      }
    },
  });
  const earningsEnd = (doc as any).lastAutoTable.finalY;

  const deductionsBody: string[][] = [
    ['NSSF', fmt(payslip.deductions?.nssf)],
    ['SHIF', fmt(payslip.deductions?.nhif)],
    ['Housing Levy', fmt(payslip.deductions?.housing_levy)],
    ['Taxable Pay', fmt(payslip.deductions?.taxable_pay)],
    ['Income Tax', fmt(payslip.deductions?.income_tax)],
    ['Personal Relief', payslip.deductions?.personal_relief != null ? `-${fmt(payslip.deductions.personal_relief)}` : '-'],
    ['P.A.Y.E', fmt(payslip.deductions?.paye)],
  ];
  if (Array.isArray(payslip.deductions?.custom)) {
    payslip.deductions.custom.forEach((d) => {
      deductionsBody.push([d.name, fmt(d.amount)]);
    });
  }
  deductionsBody.push(['Total Deductions', fmt(payslip.deductions?.total)]);

  autoTable(doc, {
    startY: tableTop + 2,
    margin: { left: margin + halfWidth + 6, right: margin },
    head: [['Description', 'Amount (KES)']],
    body: deductionsBody,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 8.5, cellPadding: 2.4 },
    didParseCell: (data) => {
      if (data.row.index === deductionsBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = cardBg;
      }
    },
  });
  const deductionsEnd = (doc as any).lastAutoTable.finalY;

  // ── Net pay banner ─────────────────────────────────────────────────────────
  const netY = Math.max(earningsEnd, deductionsEnd) + 8;

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, netY, contentWidth, 16, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAY', margin + 6, netY + 10);

  doc.setFontSize(15);
  doc.text(`KES ${fmt(payslip.net_pay)}`, pageWidth - margin - 6, netY + 11, { align: 'right' });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 14;
  doc.setDrawColor(...borderColor);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...subTextColor);
  doc.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, footerY + 1, {
    align: 'center',
  });
  doc.text(`Generated by ${user?.name || 'System'}`, pageWidth / 2, footerY + 5.5, { align: 'center' });

  const periodLabel = (payslip.period_label || 'unknown_period').replace(/\s+/g, '_');
  const empNo = payslip.employee_id?.employee_number || 'employee';
  doc.save(`Payslip_${empNo}_${periodLabel}.pdf`);
};
