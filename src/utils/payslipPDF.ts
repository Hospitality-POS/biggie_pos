import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUser } from '@services/tenants';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';

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
  
  // Use system settings or tenant data for company info
  const companyName = systemSettings?.name || systemSettings?.business_name || tenant.tenant_name || 'Company Name';
  const companyAddress = systemSettings?.location || systemSettings?.address || tenant.address;
  const companyPhone = systemSettings?.phone || tenant.phone;
  const companyEmail = systemSettings?.email || tenant.email;
  const companyLogo = systemSettings?.logo || tenant.tenant_logo;
  
  // Colors
  const primaryColor: [number, number, number] = [108, 28, 44]; // #6c1c2c
  const textColor: [number, number, number] = [15, 23, 42]; // #0f172a
  const subTextColor: [number, number, number] = [100, 116, 139]; // #64748b
  
  // Page width and margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);
  
  // ── Header with Logo and Letterhead ────────────────────────────────────────
  
  // Add logo if available
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', margin, 10, 30, 30);
    } catch (error) {
      console.log('Could not add logo to PDF');
    }
  }
  
  // Company name and letterhead
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text(companyName, margin + 35, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(...subTextColor);
  if (companyAddress) {
    const addressStr = typeof companyAddress === 'string' ? companyAddress : JSON.stringify(companyAddress);
    doc.text(addressStr, margin + 35, 26);
  }
  if (companyPhone) {
    doc.text(`Phone: ${companyPhone}`, margin + 35, 31);
  }
  if (companyEmail) {
    doc.text(`Email: ${companyEmail}`, margin + 35, 36);
  }
  
  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, 45, pageWidth - margin, 45);
  
  // ── Payslip Title ─────────────────────────────────────────────────────────
  
  doc.setFontSize(16);
  doc.setTextColor(...textColor);
  doc.text('Payslip', pageWidth / 2, 55, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(...subTextColor);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 61, { align: 'center' });
  
  // ── Employee Information ──────────────────────────────────────────────────
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Employee Information', margin, 75);
  
  doc.setFontSize(9);
  doc.setTextColor(...subTextColor);
  const employeeNumber = payslip.employee_id?.employee_number || 'N/A';
  const jobTitle = payslip.employee_id?.job_title || 'N/A';
  const gender = payslip.employee_id?.gender || 'N/A';
  const bloodGroup = payslip.employee_id?.blood_group || 'N/A';
  const dateOfBirth = payslip.employee_id?.date_of_birth 
    ? new Date(payslip.employee_id.date_of_birth).toLocaleDateString() 
    : 'N/A';
  
  doc.text(`Employee Number: ${employeeNumber}`, margin, 82);
  doc.text(`Job Title: ${jobTitle}`, margin, 88);
  doc.text(`Gender: ${gender}`, margin, 94);
  doc.text(`Blood Group: ${bloodGroup}`, margin, 100);
  doc.text(`Date of Birth: ${dateOfBirth}`, margin, 106);
  
  // ── Pay Period ─────────────────────────────────────────────────────────────
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Pay Period', margin, 118);
  
  doc.setFontSize(9);
  doc.setTextColor(...subTextColor);
  doc.text(`Period: ${payslip.period_label}`, margin, 125);
  doc.text(`From: ${new Date(payslip.period_start).toLocaleDateString()}`, margin, 131);
  doc.text(`To: ${new Date(payslip.period_end).toLocaleDateString()}`, margin, 137);
  
  // ── Earnings Table ────────────────────────────────────────────────────────
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Earnings', margin, 150);
  
  autoTable(doc, {
    startY: 155,
    head: [['Description', 'Amount (KES)']],
    body: [
      ['Basic Salary', (payslip.earnings?.basic_salary || 0).toLocaleString()],
      ['Allowances', (payslip.earnings?.allowances || 0).toLocaleString()],
      ['Benefits', (payslip.earnings?.benefits || 0).toLocaleString()],
      ['Overtime Pay', (payslip.earnings?.overtime_pay || 0).toLocaleString()],
      ['', ''],
      ['Gross Salary', (payslip.earnings?.gross_salary || 0).toLocaleString()],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.4, halign: 'right' },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  
  // ── Deductions Table ─────────────────────────────────────────────────────
  
  const earningsTableEnd = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Deductions', margin, earningsTableEnd);
  
  const deductionsBody = [
    ['PAYE', (payslip.deductions?.paye || 0).toLocaleString()],
    ['NSSF', (payslip.deductions?.nssf || 0).toLocaleString()],
    ['NHIF', (payslip.deductions?.nhif || 0).toLocaleString()],
    ['Housing Levy', (payslip.deductions?.housing_levy || 0).toLocaleString()],
  ];
  
  // Add custom deductions if any
  if (payslip.deductions?.custom && Array.isArray(payslip.deductions.custom)) {
    payslip.deductions.custom.forEach((deduction) => {
      deductionsBody.push([deduction.name, deduction.amount.toLocaleString()]);
    });
  }
  
  deductionsBody.push(['', '']);
  deductionsBody.push(['Total Deductions', (payslip.deductions?.total || 0).toLocaleString()]);
  
  autoTable(doc, {
    startY: earningsTableEnd + 5,
    head: [['Description', 'Amount (KES)']],
    body: deductionsBody,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.4, halign: 'right' },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      const totalRowIndex = deductionsBody.length - 1;
      if (rowIndex === totalRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  
  // ── Summary ───────────────────────────────────────────────────────────────
  
  const deductionsTableEnd = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Summary', margin, deductionsTableEnd);
  
  doc.setFontSize(9);
  doc.setTextColor(...subTextColor);
  doc.text(`Days Worked: ${payslip.days_worked || 0}`, margin, deductionsTableEnd + 7);
  doc.text(`Overtime Hours: ${payslip.overtime_hours || 0}`, margin, deductionsTableEnd + 13);
  
  // ── Net Pay (Highlighted) ─────────────────────────────────────────────────
  
  const netPayY = deductionsTableEnd + 25;
  
  doc.setFillColor(16, 185, 129); // Green background
  doc.rect(margin, netPayY - 5, contentWidth, 15, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Net Pay', margin + 5, netPayY + 4);
  
  doc.setFontSize(14);
  doc.text(`${(payslip.net_pay || 0).toLocaleString()} KES`, pageWidth - margin - 5, netPayY + 4, { align: 'right' });
  
  // ── Footer ────────────────────────────────────────────────────────────────
  
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(...subTextColor);
  doc.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated by ${user?.name || 'System'}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  const periodLabel = payslip.period_label || 'unknown_period';
  const filename = `Payslip_${employeeNumber}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
