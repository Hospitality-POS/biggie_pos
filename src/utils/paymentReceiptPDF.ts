import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

interface PaymentReceiptData {
  receiptNumber?: string;
  receiptNo?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentType?: string;
  currency?: string;
  reference?: string;
  transactionReference?: string;
  etimsRefNumber?: string;
  notes?: string;
  status?: string;
  saleCode?: string;
  unitId?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  property?: {
    name?: string;
    propertyType?: string;
    location?: string | { address?: string };
  };
  processedBy?: string;
  createdAt?: string;
}

export const generatePaymentReceiptPDF = async (data: PaymentReceiptData, returnAsDataUrl = false): Promise<string | void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Get brand color from tenant or use default
    const primaryColor = localStorage.getItem('primaryColor') || '#6C1C2C';

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

    // Get tenant details for logo and company info
    let tenantName = '';
    let tenantAddress = '';
    let tenantPhone = '';
    let tenantEmail = '';
    const defaultLogoUrl = '/chestnut-logo.png';
    let logoUrl = defaultLogoUrl;

    try {
      const tenantStr = localStorage.getItem('tenant');
      if (tenantStr) {
        const tenant = JSON.parse(tenantStr);
        tenantName = String(tenant?.name || tenant?.business_name || '');
        tenantAddress = String(tenant?.address || tenant?.location || '');
        tenantPhone = String(tenant?.phone || '');
        tenantEmail = String(tenant?.email || '');
        logoUrl = tenant?.tenant_logo?.url || defaultLogoUrl;
      }
    } catch (error) {
      console.error('Error parsing tenant details:', error);
    }

    // Add logo if available
    try {
      doc.addImage(logoUrl, 'PNG', 15, yPos, 25, 25);
    } catch (error) {
      // If logo fails to load, draw a placeholder with brand color
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(27.5, yPos + 12.5, 12.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('LOGO', 27.5, yPos + 12.5, { align: 'center', baseline: 'middle' });
    }

    // Company details
    yPos += 5;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(tenantName, pageWidth - 15, yPos, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  let infoY = yPos + 8;
  if (tenantAddress && tenantAddress !== '[object Object]' && tenantAddress !== '') {
    doc.text(tenantAddress, pageWidth - 15, infoY, { align: 'right' });
    infoY += 6;
  }
  if (tenantPhone) {
    doc.text(`Tel: ${tenantPhone}`, pageWidth - 15, infoY, { align: 'right' });
    infoY += 6;
  }
  if (tenantEmail) {
    doc.text(`Email: ${tenantEmail}`, pageWidth - 15, infoY, { align: 'right' });
  }

  yPos += 35;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Receipt Number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const receiptNum = data.receiptNo || data.receiptNumber || 'N/A';
  doc.text(`Receipt No: ${receiptNum}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Divider
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 15;

  // Payment Amount
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text(`KES ${data.amount.toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Payment Amount', pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 15;

  // Payment Details Table
  const detailsRows: string[][] = [];

  if (data.paymentDate) {
    detailsRows.push(['Payment Date', dayjs(data.paymentDate).format('DD MMM YYYY')]);
  }
  if (data.paymentMethod) {
    detailsRows.push(['Payment Method', getPaymentMethodDisplay(data.paymentMethod)]);
  }
  if (data.paymentType) {
    detailsRows.push(['Payment Type', data.paymentType]);
  }
  if (data.currency) {
    detailsRows.push(['Currency', data.currency]);
  }
  if (data.status) {
    detailsRows.push(['Status', getStatusDisplay(data.status)]);
  }
  if (data.reference || data.transactionReference) {
    detailsRows.push(['Transaction Reference', data.reference || data.transactionReference || '']);
  }
  if (data.etimsRefNumber) {
    detailsRows.push(['eTIMS Reference', data.etimsRefNumber]);
  }
  if (data.saleCode) {
    detailsRows.push(['Sale Code', data.saleCode]);
  }
  if (data.unitId) {
    detailsRows.push(['Unit ID', data.unitId]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: detailsRows,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 100 },
    },
  });

  yPos = (doc as any).lastY || yPos + 40;
  yPos += 15;

  // Customer Details
  const customerRows: string[][] = [];

  if (data.customer?.name) {
    customerRows.push(['Name', data.customer.name]);
  }
  if (data.customer?.phone) {
    customerRows.push(['Phone', String(data.customer.phone)]);
  }
  if (data.customer?.email) {
    customerRows.push(['Email', data.customer.email]);
  }
  if (data.customer?.address) {
    customerRows.push(['Address', data.customer.address]);
  }

  if (customerRows.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Customer Details', 15, yPos);
    yPos += 10;
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: customerRows,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 100 },
    },
  });

  yPos = (doc as any).lastY || yPos + 40;
  yPos += 15;

  // Property Details
  const propertyRows: string[][] = [];

  if (data.property?.name) {
    propertyRows.push(['Property Name', data.property.name]);
  }
  if (data.property?.propertyType) {
    propertyRows.push(['Property Type', data.property.propertyType]);
  }
  if (data.property?.location) {
    const locationValue = typeof data.property.location === 'string'
      ? data.property.location
      : data.property.location?.address || '';
    if (locationValue) {
      propertyRows.push(['Location', locationValue]);
    }
  }

  if (propertyRows.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Property Details', 15, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: propertyRows,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 100 },
      },
    });

    yPos = (doc as any).lastY || yPos + 40;
    yPos += 15;
  }

  // Notes
  if (data.notes) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
    yPos += splitNotes.length * 5 + 15;
  }

  // Footer
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Processed By: ${data.processedBy || 'N/A'}`, 15, yPos);
  yPos += 6;
  doc.text(`Generated On: ${dayjs().format('DD MMM YYYY HH:mm')}`, 15, yPos);
  yPos += 6;
  doc.text('This is a computer-generated receipt.', 15, yPos);

  // Return as data URL or save
  if (returnAsDataUrl) {
    console.log('Returning PDF as data URL');
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    console.log('Blob URL generated:', blobUrl);
    return blobUrl;
  }

  // Save PDF
  const sanitizedReceiptNum = (data.receiptNo || data.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`payment-receipt-${sanitizedReceiptNum}.pdf`);
  } catch (error) {
    console.error('Error generating payment receipt PDF:', error);
    throw error;
  }
};

function getPaymentMethodDisplay(method?: string): string {
  if (!method) return 'Unknown';

  const methodMap: Record<string, string> = {
    mpesa: 'M-Pesa',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    cheque: 'Cheque',
    card: 'Card',
  };

  return methodMap[method] || method;
}

function getStatusDisplay(status?: string): string {
  if (!status) return 'Unknown';

  const statusMap: Record<string, string> = {
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
