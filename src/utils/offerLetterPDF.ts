import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';

interface OfferLetterData {
  saleCode?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyName?: string;
  propertyType?: string;
  unitName?: string;
  apartmentName?: string;
  salePrice?: number;
  initialPayment?: number;
  paymentPlan?: string;
  saleDate?: string;
  salesAgent?: string;
  propertyManager?: string;
  companyDetails?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  paymentPlans?: any[];
  payments?: any[];
  paymentTotals?: any;
  isJointPurchase?: boolean;
  customers?: any[];
}

export const generateOfferLetterPDF = async (data: OfferLetterData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Get brand primary color
  const primaryColor = localStorage.getItem('primaryColor') || '#6c1c2c';
  
  // Convert hex to RGB for jsPDF
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 108, g: 28, b: 44 };
  };
  
  const rgb = hexToRgb(primaryColor);
  
  // Title at the top
  doc.setFontSize(22);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('OFFER LETTER', pageWidth / 2, 15, { align: 'center' });
  
  // Divider line after title
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 20, pageWidth - 15, 20);
  
  // Add logo (use tenant logo from tenant object, fallback to relia.png)
  const defaultLogoUrl = '/relia.png';
  let tenantLogo = defaultLogoUrl;
  
  try {
    const tenantStr = localStorage.getItem('tenant');
    if (tenantStr) {
      const tenant = JSON.parse(tenantStr);
      tenantLogo = tenant?.tenant_logo?.url || defaultLogoUrl;
    }
  } catch (error) {
    console.error('Error parsing tenant for logo:', error);
  }
  
  try {
    doc.addImage(tenantLogo, 'PNG', 15, 25, 25, 25);
  } catch (error) {
    // If logo fails to load, draw a placeholder with brand color
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(27.5, 37.5, 12.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('LOGO', 27.5, 37.5, { align: 'center', baseline: 'middle' });
  }
  
  // Get system settings for company information
  let systemName = data.companyDetails?.name || 'Relia POS';
  let systemPhone = data.companyDetails?.phone || '';
  let systemEmail = data.companyDetails?.email || '';
  let systemAddress = data.companyDetails?.address || '';
  
  try {
    const systemSettings = await fetchSystemSetupDetailsById();
    systemName = String(systemSettings?.name || systemSettings?.business_name || data.companyDetails?.name || 'Relia POS');
    systemPhone = String(systemSettings?.phone || data.companyDetails?.phone || '');
    systemEmail = String(systemSettings?.email || data.companyDetails?.email || '');
    systemAddress = String(systemSettings?.location || systemSettings?.address || data.companyDetails?.address || '');
  } catch (error) {
    console.error('Error fetching system settings:', error);
  }
  
  // Company details on the far right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(systemName), pageWidth - 15, 30, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  let yPos = 38;
  if (systemAddress && systemAddress !== '[object Object]' && systemAddress !== '') {
    doc.text(String(systemAddress), pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
  }
  if (systemPhone) {
    doc.text(String(`Tel: ${systemPhone}`), pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
  }
  if (systemEmail) {
    doc.text(String(`Email: ${systemEmail}`), pageWidth - 15, yPos, { align: 'right' });
  }
  
  // Divider line after company details
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 55, pageWidth - 15, 55);
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const currentDate = dayjs().format('DD MMMM YYYY');
  doc.text(String(`Date: ${currentDate}`), 15, 65);
  
  // Client section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('To:', 15, 75);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  if (data.isJointPurchase && data.customers && data.customers.length > 0) {
    // Display all customers for joint purchase
    let customerY = 82;
    data.customers.forEach((customer: any, index: number) => {
      const customerName = customer.name || customer.customer_name || customer.email || 'N/A';
      doc.text(String(`${index + 1}. ${customerName}`), 15, customerY);
      customerY += 6;
      if (customer.email) {
        doc.text(String(customer.email), 15, customerY);
        customerY += 6;
      }
      if (customer.phone) {
        doc.text(String(customer.phone), 15, customerY);
        customerY += 6;
      }
      customerY += 2; // Extra spacing between customers
    });
  } else {
    // Single customer
    doc.text(String(data.clientName || 'Valued Customer'), 15, 82);
    if (data.clientEmail) {
      doc.text(String(data.clientEmail), 15, 88);
    }
    if (data.clientPhone) {
      doc.text(String(data.clientPhone), 15, 94);
    }
  }
  
  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let textY = data.isJointPurchase && data.customers && data.customers.length > 0 ? 82 + (data.customers.length * 20) + 10 : 105;
  doc.text('Dear Sir/Madam,', 15, textY);
  textY += 10;
  
  // Offer letter body
  const bodyText = [
    `We are pleased to confirm your offer to purchase the following property:`,
    '',
    `Property: ${data.propertyName || 'N/A'}`,
    `Type: ${data.propertyType || 'N/A'}`,
  ];

  // Add unit/apartment line
  if (data.unitName && data.unitName !== 'N/A') {
    bodyText.push(`Unit: ${data.unitName}${data.apartmentName ? ` (${data.apartmentName})` : ''}`);
  } else if (data.apartmentName && data.apartmentName !== 'N/A') {
    bodyText.push(`Apartment: ${data.apartmentName}`);
  }

  bodyText.push(
    `Sale Price: KES ${(data.salePrice || 0).toLocaleString()}`,
    '',
    `Payment Details:`,
    `- Initial Payment: KES ${(data.initialPayment || 0).toLocaleString()}`,
    `- Payment Plan: ${data.paymentPlan?.replace('_', ' ').toUpperCase() || 'N/A'}`,
  );
  
  bodyText.forEach((line) => {
    doc.text(line, 15, textY);
    textY += 6;
  });

  // Payment Terms Table
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    textY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Terms', 15, textY);
    textY += 8;

    const paymentPlansData = data.paymentPlans.map((plan: any) => [
      dayjs(plan.startDate).format('DD MMM YYYY'),
      dayjs(plan.endDate).format('DD MMM YYYY'),
      `KES ${(plan.totalAmount || 0).toLocaleString()}`,
      `KES ${(plan.installmentAmount || 0).toLocaleString()}`,
      plan.installmentFrequency || 'N/A',
      plan.numberOfInstallments || 0,
      plan.status || 'N/A',
    ]);

    autoTable(doc, {
      startY: textY,
      head: [['Start Date', 'End Date', 'Total Amount', 'Installment Amount', 'Frequency', 'Installments', 'Status']],
      body: paymentPlansData,
      theme: 'grid',
      headStyles: { fillColor: [rgb.r, rgb.g, rgb.b], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 3 },
    });

    textY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Payments Table
  if (data.payments && data.payments.length > 0) {
    if (textY > pageHeight - 80) {
      doc.addPage();
      textY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment History', 15, textY);
    textY += 8;

    const paymentsData = data.payments.map((payment: any) => [
      dayjs(payment.payment_date).format('DD MMM YYYY'),
      payment.payment_type || 'N/A',
      `KES ${(payment.amount || 0).toLocaleString()}`,
      payment.method_id?.name || 'N/A',
      payment.payment_status || 'N/A',
      payment.notes || '-',
    ]);

    autoTable(doc, {
      startY: textY,
      head: [['Payment Date', 'Type', 'Amount', 'Method', 'Status', 'Notes']],
      body: paymentsData,
      theme: 'grid',
      headStyles: { fillColor: [rgb.r, rgb.g, rgb.b], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 3 },
    });

    textY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Payment Summary
  if (data.paymentTotals) {
    if (textY > pageHeight - 60) {
      doc.addPage();
      textY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Summary', 15, textY);
    textY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(String(`Total Paid: KES ${(data.paymentTotals.totalPaid || 0).toLocaleString()}`), 15, textY);
    textY += 6;
    doc.text(String(`Deposit Paid: KES ${(data.paymentTotals.depositPaid || 0).toLocaleString()}`), 15, textY);
    textY += 6;
    doc.text(String(`Outstanding Balance: KES ${(data.paymentTotals.outstandingBalance || 0).toLocaleString()}`), 15, textY);
    textY += 6;
    doc.text(String(`Payment Progress: ${data.paymentTotals.paymentPercentage?.toFixed(1) || 0}%`), 15, textY);
    textY += 10;
  }

  // Terms and Conditions Section
  if (textY > pageHeight - 80) {
    doc.addPage();
    textY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('This offer is subject to the following terms and conditions:', 15, textY);
  textY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const termsText = [
    `1. The initial payment of KES ${(data.initialPayment || 0).toLocaleString()} is non-refundable and reserves the property for 30 working days.`,
    `2. Full payment must be completed as per the agreed payment plan.`,
    `3. All payments should be made to the company bank account details provided separately.`,
    `4. The company reserves the right to accept or reject this offer at its discretion.`,
    `5. This offer letter is valid for 30 days from the date of issue.`,
  ];
  
  termsText.forEach((term) => {
    doc.text(term, 15, textY);
    textY += 6;
  });
  textY += 10;

  // Signature Section
  if (textY > pageHeight - 50) {
    doc.addPage();
    textY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Please sign below to accept this offer:', 15, textY);
  textY += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('_________________________', 15, textY);
  textY += 6;
  doc.text('Client Signature', 15, textY);
  textY += 15;
  doc.text('_________________________', 15, textY);
  textY += 6;
  doc.text('Company Representative', 15, textY);
  textY += 15;
  
  // Sales details at bottom
  if (textY > pageHeight - 60) {
    doc.addPage();
    textY = 20;
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(String(`Sales Agent: ${data.salesAgent || 'N/A'}`), 15, textY);
  doc.text(String(`Property Manager: ${data.propertyManager || 'N/A'}`), 15, textY + 6);
  doc.text(String(`Sale Code: ${data.saleCode || 'N/A'}`), 15, textY + 12);
  doc.text(String(`Sale Date: ${data.saleDate ? dayjs(data.saleDate).format('DD MMM YYYY') : 'N/A'}`), 15, textY + 18);
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated: ${dayjs().format('DD MMM YYYY HH:mm')} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF with client name
  const clientName = data.clientName || 'client';
  const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`offer-letter-${sanitizedClientName}-${data.saleCode || 'sale'}.pdf`);
};
