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
    address?: string | { city?: string; county?: string; country?: string; address_type?: string; is_primary?: boolean };
    entity_type?: string;
    company_name?: string;
    customer_name?: string;
  };
  property?: {
    name?: string;
    propertyType?: string;
    location?: string | { address?: string };
    description?: string;
    category?: string;
    purpose?: string;
    status?: string;
    amenities?: any[];
    features?: any[];
  };
  unit?: {
    unitNumber?: string;
    name?: string;
    unitType?: string;
    description?: string;
    areaSqm?: number;
    areaUnit?: string;
    bedrooms?: number;
    bathrooms?: number;
    furnished?: string;
  };
  processedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  entityType?: string;
}

export const generatePaymentReceiptPDF = async (data: PaymentReceiptData, returnAsDataUrl = false): Promise<string | void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

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

    // Add logo if available (smaller size)
    try {
      doc.addImage(logoUrl, 'PNG', 15, yPos, 20, 20);
    } catch (error) {
      // If logo fails to load, draw a placeholder with brand color
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(25, yPos + 10, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text('LOGO', 25, yPos + 10, { align: 'center', baseline: 'middle' });
    }

    // Company details (more compact)
    yPos += 3;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(tenantName, pageWidth - 15, yPos, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  let infoY = yPos + 6;
  if (tenantAddress && tenantAddress !== '[object Object]' && tenantAddress !== '') {
    doc.text(tenantAddress, pageWidth - 15, infoY, { align: 'right' });
    infoY += 5;
  }
  if (tenantPhone) {
    doc.text(`Tel: ${tenantPhone}`, pageWidth - 15, infoY, { align: 'right' });
    infoY += 5;
  }
  if (tenantEmail) {
    doc.text(`Email: ${tenantEmail}`, pageWidth - 15, infoY, { align: 'right' });
  }

  yPos += 25;

  // Header (smaller)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Receipt Number (smaller)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const receiptNum = data.receiptNo || data.receiptNumber || 'N/A';
  doc.text(`Receipt No: ${receiptNum}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Divider
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Payment Amount (smaller)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text(`KES ${data.amount.toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Payment Amount', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Payment Details Table (simplified - 2-column layout)
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
  if (data.status) {
    detailsRows.push(['Status', getStatusDisplay(data.status)]);
  }
  if (data.reference || data.transactionReference) {
    detailsRows.push(['Reference', data.reference || data.transactionReference || '']);
  }

  // Convert to 2-column layout
  const twoColumnDetails: string[][] = [];
  for (let i = 0; i < detailsRows.length; i += 2) {
    const row: string[] = [];
    if (detailsRows[i]) {
      row.push(detailsRows[i][0], detailsRows[i][1]);
    } else {
      row.push('', '');
    }
    if (detailsRows[i + 1]) {
      row.push(detailsRows[i + 1][0], detailsRows[i + 1][1]);
    } else {
      row.push('', '');
    }
    twoColumnDetails.push(row);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: twoColumnDetails,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 45 },
    },
  });

  yPos = (doc as any).lastY || yPos + 30;
  yPos += 8;

  // Customer Details (2-column layout)
  const customerRows: string[][] = [];

  // Use company_name if name doesn't exist, fallback to customer_name, then email
  const customerName = data.customer?.name || data.customer?.company_name || data.customer?.customer_name || data.customer?.email;
  if (customerName) {
    customerRows.push(['Name', customerName]);
  }
  // Only show phone if it's a complete number (more than just country code)
  if (data.customer?.phone && String(data.customer.phone).length > 5) {
    customerRows.push(['Phone', String(data.customer.phone)]);
  }
  if (data.customer?.email) {
    customerRows.push(['Email', data.customer.email]);
  }
  if (data.customer?.entity_type) {
    customerRows.push(['Entity Type', data.customer.entity_type]);
  }
  // Handle address object
  if (data.customer?.address) {
    const addressValue = typeof data.customer.address === 'string'
      ? data.customer.address
      : (data.customer.address as any)?.city || (data.customer.address as any)?.county || (data.customer.address as any)?.country || '';
    if (addressValue) {
      customerRows.push(['Address', addressValue]);
    }
  }

  if (customerRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Customer Details', 15, yPos);
    yPos += 6;
  }

  // Convert to 2-column layout
  const twoColumnCustomer: string[][] = [];
  for (let i = 0; i < customerRows.length; i += 2) {
    const row: string[] = [];
    if (customerRows[i]) {
      row.push(customerRows[i][0], customerRows[i][1]);
    } else {
      row.push('', '');
    }
    if (customerRows[i + 1]) {
      row.push(customerRows[i + 1][0], customerRows[i + 1][1]);
    } else {
      row.push('', '');
    }
    twoColumnCustomer.push(row);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: twoColumnCustomer,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 45 },
    },
  });

  yPos = (doc as any).lastY || yPos + 30;
  yPos += 8;

  // Property Details (2-column layout)
  const propertyRows: string[][] = [];

  if (data.property?.name) {
    propertyRows.push(['Property Name', data.property.name]);
  }
  if (data.property?.description) {
    propertyRows.push(['Description', data.property.description]);
  }
  if (data.property?.propertyType) {
    propertyRows.push(['Property Type', data.property.propertyType]);
  }
  if (data.property?.category) {
    propertyRows.push(['Category', data.property.category]);
  }
  if (data.property?.purpose) {
    propertyRows.push(['Purpose', data.property.purpose]);
  }
  if (data.property?.status) {
    propertyRows.push(['Status', data.property.status]);
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
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Property Details', 15, yPos);
    yPos += 6;

    // Convert to 2-column layout
    const twoColumnProperty: string[][] = [];
    for (let i = 0; i < propertyRows.length; i += 2) {
      const row: string[] = [];
      if (propertyRows[i]) {
        row.push(propertyRows[i][0], propertyRows[i][1]);
      } else {
        row.push('', '');
      }
      if (propertyRows[i + 1]) {
        row.push(propertyRows[i + 1][0], propertyRows[i + 1][1]);
      } else {
        row.push('', '');
      }
      twoColumnProperty.push(row);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: twoColumnProperty,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 40, fontStyle: 'bold' },
        3: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastY || yPos + 30;
    yPos += 8;
  }

  // Unit Details (2-column layout)
  const unitRows: string[][] = [];

  if (data.unit?.unitNumber) {
    unitRows.push(['Unit Number', data.unit.unitNumber]);
  }
  if (data.unit?.name) {
    unitRows.push(['Unit Name', data.unit.name]);
  }
  if (data.unit?.unitType) {
    unitRows.push(['Unit Type', data.unit.unitType]);
  }
  if (data.unit?.areaSqm) {
    unitRows.push(['Area', `${data.unit.areaSqm} ${data.unit.areaUnit || 'sqm'}`]);
  }
  if (data.unit?.bedrooms !== undefined) {
    unitRows.push(['Bedrooms', String(data.unit.bedrooms)]);
  }
  if (data.unit?.bathrooms !== undefined) {
    unitRows.push(['Bathrooms', String(data.unit.bathrooms)]);
  }
  if (data.unit?.furnished) {
    unitRows.push(['Furnished', data.unit.furnished]);
  }

  if (unitRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Unit Details', 15, yPos);
    yPos += 6;

    // Convert to 2-column layout
    const twoColumnUnit: string[][] = [];
    for (let i = 0; i < unitRows.length; i += 2) {
      const row: string[] = [];
      if (unitRows[i]) {
        row.push(unitRows[i][0], unitRows[i][1]);
      } else {
        row.push('', '');
      }
      if (unitRows[i + 1]) {
        row.push(unitRows[i + 1][0], unitRows[i + 1][1]);
      } else {
        row.push('', '');
      }
      twoColumnUnit.push(row);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: twoColumnUnit,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 40, fontStyle: 'bold' },
        3: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastY || yPos + 30;
    yPos += 8;
  }

  // Notes (more compact)
  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes', 15, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
    yPos += splitNotes.length * 4 + 8;
  }

  // Footer (more compact)
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const footerText = `Processed By: ${data.processedBy || 'N/A'} | Generated On: ${dayjs().format('DD MMM YYYY HH:mm')} | This is a computer-generated receipt.`;
  doc.text(footerText, 15, yPos);

  // Add watermark with tenant name (multiple times on all pages)
  if (tenantName) {
    const pageCount = (doc as any).internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.saveGraphicsState();
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      
      // Rotate the watermark
      const angle = 45;
      doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
      
      const textWidth = doc.getStringUnitWidth(tenantName) * 60 / doc.internal.scaleFactor;
      
      // Watermark positions (center and corners)
      const positions = [
        { x: (pageWidth - textWidth) / 2, y: pageHeight / 2 }, // Center
        { x: pageWidth * 0.2, y: pageHeight * 0.2 }, // Top-left
        { x: pageWidth * 0.8, y: pageHeight * 0.2 }, // Top-right
        { x: pageWidth * 0.2, y: pageHeight * 0.8 }, // Bottom-left
        { x: pageWidth * 0.8, y: pageHeight * 0.8 }, // Bottom-right
      ];
      
      positions.forEach((pos) => {
        doc.text(tenantName, pos.x, pos.y, {
          angle: angle,
          align: 'center',
          renderingMode: 'fill'
        });
      });
      
      doc.restoreGraphicsState();
    }
  }

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
