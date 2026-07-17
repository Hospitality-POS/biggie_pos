import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

interface ClientStatementData {
  saleCode?: string;
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressObject?: any;
  };
  property?: {
    name?: string;
    propertyType?: string;
  };
  unit?: {
    name?: string;
    unitNumber?: string;
    apartmentName?: string;
    floor?: string;
    block?: string;
  };
  list_price?: number;
  discount?: number;
  sale_price?: number;
  paymentTotals?: {
    totalPaid?: number;
    depositPaid?: number;
    outstandingBalance?: number;
    paymentPercentage?: number;
  };
  paymentPlans?: Array<{
    startDate?: string;
    endDate?: string;
    totalAmount?: number;
    installmentAmount?: number;
    installmentFrequency?: string;
    numberOfInstallments?: number;
    status?: string;
  }>;
  payments?: Array<{
    payment_date?: string;
    amount?: number;
    method_id?: { name?: string };
    payment_type?: string;
    payment_status?: string;
    notes?: string;
  }>;
  sale_date?: string;
  status?: string;
}

export const generateClientStatementPDF = async (data: ClientStatementData, returnAsDataUrl = false): Promise<string | void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 30;

  // Get brand color from tenant or use default
  let rgb = { r: 24, g: 144, b: 255 }; // Default blue
  try {
    const tenantStr = localStorage.getItem('tenant');
    if (tenantStr) {
      const tenant = JSON.parse(tenantStr);
      if (tenant?.brand_color) {
        const hex = tenant.brand_color.replace('#', '');
        rgb = {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }
  } catch (error) {
    console.error('Error parsing tenant for brand color:', error);
  }

  let yPos = 15;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('Client Statement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 15;

  // Add logo
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
    doc.addImage(tenantLogo, 'PNG', 15, yPos, 25, 25);
  } catch (error) {
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(27.5, yPos + 12.5, 12.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('LOGO', 27.5, yPos + 12.5, { align: 'center', baseline: 'middle' });
  }
  yPos += 35;

  // Get system settings
  let systemName = 'Relia POS';
  let systemPhone = '';
  let systemEmail = '';
  let systemAddress = '';

  try {
    const systemSettings = await fetchSystemSetupDetailsById();
    systemName = String(systemSettings?.name || systemSettings?.business_name || 'Relia POS');
    systemPhone = String(systemSettings?.phone || '');
    systemEmail = String(systemSettings?.email || '');
    systemAddress = String(systemSettings?.location || systemSettings?.address || '');
  } catch (error) {
    console.error('Error fetching system settings:', error);
  }

  // Company details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(systemName, pageWidth - 15, yPos - 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  let infoY = yPos - 12;
  if (systemAddress && systemAddress !== '[object Object]' && systemAddress !== '') {
    doc.text(systemAddress, pageWidth - 15, infoY, { align: 'right' });
    infoY += 6;
  }
  if (systemPhone) {
    doc.text(`Tel: ${systemPhone}`, pageWidth - 15, infoY, { align: 'right' });
    infoY += 6;
  }
  if (systemEmail) {
    doc.text(`Email: ${systemEmail}`, pageWidth - 15, infoY, { align: 'right' });
  }

  yPos += 15;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 15;

  // Sale Information
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Sale Information', 15, yPos);
  yPos += 10;

  const saleData = [
    ['Sale Code', data.saleCode || '-'],
    ['Client', data.client?.name || '-'],
    ['Property', data.property?.name || data.property?.propertyType || '-'],
    ['Unit/Apartment', data.unit?.apartmentName || data.unit?.name || '-'],
    ['List Price', `KES ${(data.list_price || 0).toLocaleString()}`],
    ['Discount', `KES ${(data.discount || 0).toLocaleString()}`],
    ['Sale Price', `KES ${(data.sale_price || 0).toLocaleString()}`],
    ['Deposit Paid', `KES ${(data.paymentTotals?.depositPaid || 0).toLocaleString()}`],
    ['Paid Amount', `KES ${(data.paymentTotals?.totalPaid || 0).toLocaleString()}`],
    ['Balance', `KES ${(data.paymentTotals?.outstandingBalance ?? 0).toLocaleString()}`],
    ['Payment Stage', data.status?.replace('_', ' ').toUpperCase() || '-'],
    ['Sale Date', data.sale_date ? dayjs(data.sale_date).format('DD MMM YYYY') : '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Value']],
    body: saleData,
    theme: 'grid',
    headStyles: {
      fillColor: [rgb.r, rgb.g, rgb.b],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Payment Plans
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    if (yPos > maxY) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Plans', 15, yPos);
    yPos += 10;

    const planData = data.paymentPlans.map((plan) => [
      plan.startDate ? dayjs(plan.startDate).format('DD MMM YYYY') : '-',
      plan.endDate ? dayjs(plan.endDate).format('DD MMM YYYY') : '-',
      `KES ${(plan.totalAmount || 0).toLocaleString()}`,
      `KES ${(plan.installmentAmount || 0).toLocaleString()}`,
      plan.installmentFrequency || '-',
      plan.numberOfInstallments || 0,
      plan.status || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Start Date', 'End Date', 'Total Amount', 'Installment Amount', 'Frequency', 'Installments', 'Status']],
      body: planData,
      theme: 'grid',
      headStyles: {
        fillColor: [rgb.r, rgb.g, rgb.b],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Payments
  if (data.payments && data.payments.length > 0) {
    if (yPos > maxY) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Payment History', 15, yPos);
    yPos += 10;

    const paymentData = data.payments.map((payment) => [
      payment.payment_date ? dayjs(payment.payment_date).format('DD MMM YYYY') : '-',
      `KES ${(payment.amount || 0).toLocaleString()}`,
      payment.method_id?.name || '-',
      payment.payment_type || '-',
      payment.payment_status || '-',
      payment.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Payment Date', 'Amount', 'Method', 'Type', 'Status', 'Notes']],
      body: paymentData,
      theme: 'grid',
      headStyles: {
        fillColor: [rgb.r, rgb.g, rgb.b],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${dayjs().format('DD MMM YYYY HH:mm')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Return as data URL or save
  if (returnAsDataUrl) {
    return doc.output('dataurlstring');
  }

  // Save PDF
  const sanitizedClientName = (data.client?.name || 'client').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`client-statement-${sanitizedClientName}-${data.saleCode || 'sale'}.pdf`);
};

// Helper function to fetch system settings
async function fetchSystemSetupDetailsById() {
  try {
    const response = await fetch('/api/system-setup');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching system setup:', error);
    return null;
  }
}
