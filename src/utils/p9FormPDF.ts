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

export const generateP9FormPDF = async (payslips: PayslipData[], year: number) => {
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
  
  // Colors
  const primaryColor: [number, number, number] = [108, 28, 44]; // #6c1c2c
  const textColor: [number, number, number] = [15, 23, 42]; // #0f172a
  const subTextColor: [number, number, number] = [100, 116, 139]; // #64748b
  
  // Page width and margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);
  
  // ── Header with KRA Logo ────────────────────────────────────────
  
  // Add KRA logo
  try {
    doc.addImage('/kra.png', 'PNG', margin, 10, 40, 40);
  } catch (error) {
    console.log('Could not add KRA logo to PDF');
  }
  
  // P9 Form Title
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('P9 FORM', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(...subTextColor);
  doc.text('KENYA REVENUE AUTHORITY', pageWidth / 2, 26, { align: 'center' });
  doc.text(`Year of Income: ${year}`, pageWidth / 2, 32, { align: 'center' });
  
  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, 40, pageWidth - margin, 40);
  
  // ── Employee Information ────────────────────────────────────────
  
  const employee = payslips[0]?.employee_id;
  const employeeNumber = employee?.employee_number || 'N/A';
  const jobTitle = employee?.job_title || 'N/A';
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Employee Information', margin, 50);
  
  doc.setFontSize(9);
  doc.setTextColor(...subTextColor);
  doc.text(`Employee Number: ${employeeNumber}`, margin, 57);
  doc.text(`Job Title: ${jobTitle}`, margin, 63);
  doc.text(`Employer: ${companyName}`, margin, 69);
  
  // ── Monthly Summary Table ────────────────────────────────────────
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Monthly Income and Deductions', margin, 82);
  
  // Group payslips by month
  const monthlyData = payslips.reduce((acc: any, payslip) => {
    const month = new Date(payslip.period_start).toLocaleString('default', { month: 'short' });
    if (!acc[month]) {
      acc[month] = {
        basic: 0,
        benefits: 0,
        gross: 0,
        paye: 0,
        nssf: 0,
        nhif: 0,
        housing: 0,
        net: 0,
      };
    }
    acc[month].basic += payslip.earnings?.basic_salary || 0;
    acc[month].benefits += (payslip.earnings?.allowances || 0) + (payslip.earnings?.benefits || 0) + (payslip.earnings?.overtime_pay || 0);
    acc[month].gross += payslip.earnings?.gross_salary || 0;
    acc[month].paye += payslip.deductions?.paye || 0;
    acc[month].nssf += payslip.deductions?.nssf || 0;
    acc[month].nhif += payslip.deductions?.nhif || 0;
    acc[month].housing += payslip.deductions?.housing_levy || 0;
    acc[month].net += payslip.net_pay || 0;
    return acc;
  }, {});
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const tableBody = months.map(month => {
    const data = monthlyData[month] || { basic: 0, benefits: 0, gross: 0, paye: 0, nssf: 0, nhif: 0, housing: 0, net: 0 };
    return [
      month,
      data.basic.toLocaleString(),
      data.benefits.toLocaleString(),
      data.gross.toLocaleString(),
      data.paye.toLocaleString(),
      data.nssf.toLocaleString(),
      data.nhif.toLocaleString(),
      data.housing.toLocaleString(),
      data.net.toLocaleString(),
    ];
  });
  
  // Calculate totals
  const totals = tableBody.reduce((acc, row) => {
    for (let i = 1; i < row.length; i++) {
      acc[i] = (acc[i] || 0) + parseFloat(row[i].replace(/,/g, ''));
    }
    return acc;
  }, new Array(9).fill(0));
  
  const totalRow = ['TOTAL', ...totals.map((t: number) => t.toLocaleString())];
  tableBody.push(totalRow);
  
  autoTable(doc, {
    startY: 87,
    head: [['Month', 'Basic Salary', 'Benefits', 'Gross Pay', 'PAYE', 'NSSF', 'NHIF', 'Housing Levy', 'Net Pay']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.12 },
      1: { cellWidth: contentWidth * 0.11, halign: 'right' },
      2: { cellWidth: contentWidth * 0.11, halign: 'right' },
      3: { cellWidth: contentWidth * 0.11, halign: 'right' },
      4: { cellWidth: contentWidth * 0.11, halign: 'right' },
      5: { cellWidth: contentWidth * 0.11, halign: 'right' },
      6: { cellWidth: contentWidth * 0.11, halign: 'right' },
      7: { cellWidth: contentWidth * 0.11, halign: 'right' },
      8: { cellWidth: contentWidth * 0.11, halign: 'right' },
    },
  });
  
  // ── Annual Summary ────────────────────────────────────────────────
  
  const tableEnd = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text('Annual Summary', margin, tableEnd);
  
  const annualBasic = totals[1];
  const annualBenefits = totals[2];
  const annualGross = totals[3];
  const annualPAYE = totals[4];
  const annualNSSF = totals[5];
  const annualNHIF = totals[6];
  const annualHousing = totals[7];
  const annualNet = totals[8];
  
  doc.setFontSize(9);
  doc.setTextColor(...subTextColor);
  doc.text(`Total Basic Salary: ${annualBasic.toLocaleString()} KES`, margin, tableEnd + 7);
  doc.text(`Total Benefits: ${annualBenefits.toLocaleString()} KES`, margin, tableEnd + 13);
  doc.text(`Total Gross Pay: ${annualGross.toLocaleString()} KES`, margin, tableEnd + 19);
  doc.text(`Total PAYE: ${annualPAYE.toLocaleString()} KES`, margin, tableEnd + 25);
  doc.text(`Total NSSF: ${annualNSSF.toLocaleString()} KES`, margin, tableEnd + 31);
  doc.text(`Total NHIF: ${annualNHIF.toLocaleString()} KES`, margin, tableEnd + 37);
  doc.text(`Total Housing Levy: ${annualHousing.toLocaleString()} KES`, margin, tableEnd + 43);
  
  // Highlight Net Pay
  doc.setFillColor(16, 185, 129); // Green background
  doc.rect(margin, tableEnd + 48, contentWidth, 12, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Total Net Pay: ${annualNet.toLocaleString()} KES`, margin + 5, tableEnd + 55);
  
  // ── Footer ────────────────────────────────────────────────────────
  
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(...subTextColor);
  doc.text('This is a computer-generated P9 form and does not require a signature.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated by ${user?.name || 'System'}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  const filename = `P9_Form_${employeeNumber}_${year}.pdf`;
  doc.save(filename);
};
