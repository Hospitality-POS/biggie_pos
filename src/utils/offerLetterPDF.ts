import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

interface OfferLetterData {
  saleCode?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientIdNumber?: string;
  clientAddress?: string;
  clientAddressObject?: {
    county?: string;
    postal_code?: string;
    country?: string;
    address_type?: string;
  };
  clientKraPin?: string;
  propertyName?: string;
  propertyType?: string;
  unitName?: string;
  unitNumber?: string;
  unitType?: string;
  apartmentName?: string;
  floor?: string;
  block?: string;
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
    companyRegNo?: string;
    poBox?: string;
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
    payment_type?: string;
    amount?: number;
    method_id?: { name?: string };
    payment_status?: string;
    notes?: string;
  }>;
  paymentTotals?: {
    totalPaid?: number;
    depositPaid?: number;
    outstandingBalance?: number;
    paymentPercentage?: number;
  };
  isJointPurchase?: boolean;
  customers?: Array<{
    name?: string;
    customer_name?: string;
    email?: string;
    phone?: string;
    _id?: string;
  }>;
  // Chestnut City specific fields
  propertyTitleNumber?: string;
  location?: string;
  leaseTerm?: string;
  managementCompany?: string;
  completionDate?: string;
  bankDetails?: {
    beneficiary?: string;
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
    branchCode?: string;
    swiftCode?: string;
  };
  lawyerDetails?: {
    name?: string;
    address?: string;
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
  };
  serviceCharge?: number;
  serviceChargeDeposit?: number;
}

export const generateOfferLetterPDF = async (data: OfferLetterData, returnAsDataUrl = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 55; // Reserve 55px for footer signature area
  let yPos = 30;
  
  // Get brand primary color - default to Chestnut City color
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
  
  // LETTER OF OFFER header - place at top
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('LETTER OF OFFER', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('(Subject to Contract)', pageWidth / 2, 21, { align: 'center' });
  
  // Divider line
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(15, 25, pageWidth - 15, 25);
  
  // Add Chestnut City logo (use tenant logo from tenant object, fallback to chestnut logo)
  // Position logo below the divider line to avoid overlap
  const defaultLogoUrl = '/chestnut-logo.png';
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
    doc.addImage(tenantLogo, 'PNG', pageWidth - 40, 30, 25, 25);
  } catch (error) {
    // If logo fails to load, draw a placeholder with brand color
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(pageWidth - 27.5, 42.5, 12.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('CHESTNUT', pageWidth - 27.5, 40, { align: 'center', baseline: 'middle' });
    doc.text('CITY', pageWidth - 27.5, 45, { align: 'center', baseline: 'middle' });
  }
  
  // To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('To;', 15, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  
  // Purchaser details
  doc.text(`PURCHASER: ${data.clientName || '_______________________________'}`, 15, yPos);
  yPos += 8;
  
  // Format address from address object - use only county
  let formattedAddress = '__________________________________';
  if (data.clientAddressObject && typeof data.clientAddressObject === 'object') {
    formattedAddress = data.clientAddressObject.county || '__________________________________';
  } else if (data.clientAddress && typeof data.clientAddress === 'string') {
    formattedAddress = data.clientAddress;
  }
  doc.text(`Address: ${formattedAddress}`, 15, yPos);
  yPos += 8;
  // Format telephone number with leading 0 if needed
  const formattedPhone = data.clientPhone ? 
    (data.clientPhone.startsWith('0') ? data.clientPhone : `0${data.clientPhone}`) : 
    '________________________________';
  doc.text(`Telephone: ${formattedPhone}`, 15, yPos);
  yPos += 8;
  
  // Date
  const currentDate = data.saleDate ? dayjs(data.saleDate).format('DD MMMM YYYY') : dayjs().format('DD MMMM YYYY');
  doc.text(`Date: ${currentDate}`, 15, yPos);
  yPos += 15;
  
  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dear Sir/Madam,', 15, yPos);
  yPos += 12;
  
  // RE section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const titleNumber = data.propertyTitleNumber || 'LR 111199 (Originally 4761/)';
  // Handle location - if it's an ID format, default to NANYUKI
  let location = data.location || 'NANYUKI';
  if (location.match(/^[a-f0-9]{24}$/i)) {
    location = 'NANYUKI'; // Default if location is an ID
  }
  doc.text(`RE: LETTER OF OFFER IN RESPECT OF SALE OF APARTMENT NUMBER ${data.unitNumber || '________'} IN CHESTNUT CITY LIMITED APARTMENTS ERECTED ON PROPERTY TITLE NUMBER ${titleNumber}, ${location}.`, 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  // Introduction paragraph
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const introText = 'The above matter refers. Chestnut City Limited (hereinafter referred to as "the Vendor") is undertaking a residential development known as Chestnut City on land measuring approximately Eight (8) Acres (hereinafter referred to as "the Development").';
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 30);
  doc.text(splitIntro, 15, yPos);
  yPos += splitIntro.length * 7 + 10;
  
  const offerText = `We are pleased to offer to you Unit No. ${data.unitNumber || '________'}, being part of the residential apartments to be developed within the said project (hereinafter referred to as "the Unit"), subject to the terms and conditions set out herein and those to be contained in the formal Agreement for Sale.`;
  const splitOffer = doc.splitTextToSize(offerText, pageWidth - 30);
  doc.text(splitOffer, 15, yPos);
  yPos += splitOffer.length * 7 + 10;
  
  const developmentText = 'The development shall be constructed in accordance with the approved architectural and structural drawings and specifications previously made available to prospective purchasers.';
  const splitDevelopment = doc.splitTextToSize(developmentText, pageWidth - 30);
  doc.text(splitDevelopment, 15, yPos);
  yPos += splitDevelopment.length * 7 + 10;
  
  const leaseText = `The Unit shall be sold on a long leasehold interest for a term of ${data.leaseTerm || 'Ninety-Nine (99) years less the last seven (7) days thereof'}. There shall be a Management Company that shall be established for purposes of managing the common areas and facilities within the development.`;
  const splitLease = doc.splitTextToSize(leaseText, pageWidth - 30);
  doc.text(splitLease, 15, yPos);
  yPos += splitLease.length * 7 + 15;
  
  // TERMS AND CONDITIONS
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('TERMS AND CONDITIONS', 15, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // 1. Vendor
  doc.text('1. Vendor', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CHESTNUT CITY LIMITED', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Company Reg No. ${data.companyDetails?.companyRegNo || 'PVT-RXU2E3RV'}`, 15, yPos);
  yPos += 6;
  doc.text(`P.O Box ${data.companyDetails?.poBox || '45721-00100 Nairobi'}`, 15, yPos);
  yPos += 10;
  
  // 2. Purchaser
  if (yPos + 16 > maxY) { doc.addPage(); yPos = 20; }
  doc.text('2. Purchaser', 15, yPos);
  yPos += 6;
  doc.text(data.clientName || '_______________________________', 15, yPos);
  yPos += 10;
  
  // 3. Unit/Property
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }

  doc.text('3. Unit/Property;', 15, yPos);
  yPos += 6;
  const unitNumberDisplay = data.unitNumber || data.apartmentName || '_____________________';
  doc.text(`Unit Number: ${unitNumberDisplay}`, 15, yPos);
  yPos += 6;
  
  // Format unit type to full names
  let formattedUnitType = data.unitType || '_______________________';
  if (formattedUnitType) {
    const typeLower = formattedUnitType.toLowerCase();
    if (typeLower.includes('studio') || typeLower === 's') {
      formattedUnitType = 'Studio';
    } else if (typeLower.includes('1') || typeLower.includes('one') || typeLower.includes('1br') || typeLower.includes('1 br')) {
      formattedUnitType = 'One Bedroom';
    } else if (typeLower.includes('2') || typeLower.includes('two') || typeLower.includes('2br') || typeLower.includes('2 br')) {
      formattedUnitType = 'Two Bedroom';
    } else if (typeLower.includes('3') || typeLower.includes('three') || typeLower.includes('3br') || typeLower.includes('3 br')) {
      formattedUnitType = 'Three Bedroom';
    } else if (typeLower.includes('4') || typeLower.includes('four') || typeLower.includes('4br') || typeLower.includes('4 br')) {
      formattedUnitType = 'Four Bedroom';
    }
  }
  doc.text(`Unit Type: ${formattedUnitType}`, 15, yPos);
  yPos += 6;
  
  const floorInfo = (data.floor || '________').replace(/\s*\([+-]?\d+(\.\d+)?\)/g, '').trim();
  const blockInfo = data.block || '________';
  const apartmentDisplay = data.apartmentName || data.unitNumber || '________';
  doc.text(`Apartment No. ${apartmentDisplay} situated on ${floorInfo}, ${blockInfo}`, 15, yPos);
  yPos += 10;

  // 4. Purchase Price
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }

  doc.text('4. Purchase Price;', 15, yPos);
  yPos += 6;
  doc.text(`The purchase price is Kenya Shillings (KES ${(data.salePrice || 0).toLocaleString()}) being the agreed purchase price for the Unit.`, 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  doc.text('The Purchase Prices for the various unit types are as follows:', 15, yPos);
  yPos += 15;

  // 5. Deposit/Commitment Fee
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('5. Deposit/Commitment Fee', 15, yPos);
  yPos += 6;
  const commitmentText = `Upon acceptance of this Offer Letter, the Purchaser shall pay a Commitment Fee of Kenya Shillings ${(data.initialPayment || 0).toLocaleString()} to the Vendor. The amount of the Commitment Fee shall be determined by the Purchase Price of the specific Unit selected by the Purchaser. The said commitment fee shall be refundable; however, any refund shall be subject to a deduction in respect of all processing charges and legal fees incurred in connection with the purchase of the property.`;
  const splitCommitment = doc.splitTextToSize(commitmentText, pageWidth - 30);
  if (yPos + splitCommitment.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitCommitment, 15, yPos);
  yPos += splitCommitment.length * 7 + 10;
  
  const acceptanceText = 'The Purchaser shall signify acceptance of this Offer Letter by:';
  const splitAcceptance = doc.splitTextToSize(acceptanceText, pageWidth - 30);
  doc.text(splitAcceptance, 15, yPos);
  yPos += splitAcceptance.length * 7 + 8;
  doc.text('a) Signing and returning a copy of this Offer Letter to the Vendor; and', 20, yPos);
  yPos += 7;
  doc.text('b) Providing proof of payment of the said Commitment Fee by way of a bank deposit slip or bank transfer confirmation or electronic funds transfer.', 20, yPos);
  yPos += 10;
  
  const instructionText = 'Upon receipt of the duly executed Offer Letter together with proof of payment of the Commitment Fee, the Vendor shall instruct its advocates to prepare and forward to the Purchaser or the Purchaser\'s advocates the Agreement for Sale.';
  const splitInstruction = doc.splitTextToSize(instructionText, pageWidth - 30);
  if (yPos + splitInstruction.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitInstruction, 15, yPos);
  yPos += splitInstruction.length * 7 + 12;
  
  // 6. Mode of Payment
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('6. Mode of Payment;', 15, yPos);
  yPos += 6;
  doc.text('The Purchaser shall pay the purchase price to the vendor\'s account directly whose details are at Schedule 1 below.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 10;
  doc.text('The Purchaser shall select one (1) of the following payment options by ticking the appropriate box below. The selected option shall constitute the Purchaser\'s binding commitment for the settlement of the balance of the Purchase Price after accounting for the Commitment Fee paid pursuant to Clause 5 herein:', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 15;
  
  // Payment options checkboxes
  const paymentOptions = [
    'Option 1: Cash Payment - Full payment within 30 days',
    'Option 2: Installment Payment - Payment in installments over agreed period',
    'Option 3: Mortgage Financing - Through bank or financial institution',
    'Option 4: SACCO Financing - Through SACCO or cooperative society'
  ];
  
  paymentOptions.forEach((option) => {
    if (yPos + 10 > maxY) { doc.addPage(); yPos = 20; }
    doc.text(`[   ] ${option}`, 20, yPos);
    yPos += 10;
  });
  yPos += 10;
  
  // 7. Deposit under Agreement for Sale
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('7. Deposit under the Agreement for Sale', 15, yPos);
  yPos += 6;
  const depositText = 'The Agreement for Sale shall require the Purchaser to pay a deposit equivalent to Ten Percent (10%) of the Purchase Price of the Unit.';
  const splitDeposit = doc.splitTextToSize(depositText, pageWidth - 30);
  doc.text(splitDeposit, 15, yPos);
  yPos += splitDeposit.length * 7 + 8;
  
  const commitmentComparison = `Where the Commitment Fee of KES ${(data.initialPayment || 0).toLocaleString()} paid pursuant to this Offer Letter is less than the required Ten Percent (10%) deposit, the Purchaser shall, upon execution of the Agreement for Sale within the fourteen (14) days as indicated herein, pay the balance necessary to constitute the full Ten Percent (10%) deposit based on the agreed Purchase Price of the Unit.`;
  const splitComparison = doc.splitTextToSize(commitmentComparison, pageWidth - 30);
  doc.text(splitComparison, 15, yPos);
  yPos += splitComparison.length * 7 + 8;
  
  const excessText = 'Where the Commitment Fee equals or exceeds the required Ten Percent (10%) deposit, the said amount shall be applied toward satisfaction of the deposit payable under the Agreement for Sale.';
  const splitExcess = doc.splitTextToSize(excessText, pageWidth - 30);
  doc.text(splitExcess, 15, yPos);
  yPos += splitExcess.length * 7 + 12;
  
  // 8. Agreement for Sale
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('8. Agreement for Sale', 15, yPos);
  yPos += 6;
  const agreementText = 'The Vendor\'s Advocates shall prepare a standard Agreement for Sale applicable to all purchasers within the development. The Purchaser shall execute the Agreement for Sale within fourteen (14) days of its presentation.';
  const splitAgreement = doc.splitTextToSize(agreementText, pageWidth - 30);
  doc.text(splitAgreement, 15, yPos);
  yPos += splitAgreement.length * 7 + 8;
  
  const failureText = 'Failure by the Purchaser to execute the Agreement for Sale within the stipulated period may result in withdrawal of this offer at the Vendor\'s discretion.';
  const splitFailure = doc.splitTextToSize(failureText, pageWidth - 30);
  doc.text(splitFailure, 15, yPos);
  yPos += splitFailure.length * 7 + 12;
  
  // 9. Title
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('9. Title', 15, yPos);
  yPos += 6;
  const titleText = 'The sale shall be concluded by way of Sectional Title in accordance with the provisions of the Sectional Properties Act, 2020, upon completion of the development and registration of the sectional plan.';
  const splitTitle = doc.splitTextToSize(titleText, pageWidth - 30);
  doc.text(splitTitle, 15, yPos);
  yPos += splitTitle.length * 7 + 12;
  
  // 10. Transfer
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('10. Transfer', 15, yPos);
  yPos += 6;
  const transferText = 'The transfer of the property shall be by way of a sectional title in accordance with the Land Act 2012, the Land Registration Act 2012, or the Sectional Properties Act 2020 in a standard form applicable to all the purchasers of other apartments on the property and no material amendments will be accepted.';
  const splitTransfer = doc.splitTextToSize(transferText, pageWidth - 30);
  doc.text(splitTransfer, 15, yPos);
  yPos += splitTransfer.length * 7 + 12;
  
  // 11. Legal and Statutory Costs
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('11. Legal and Statutory Costs', 15, yPos);
  yPos += 6;
  const legalCostsText = 'The Purchaser shall be responsible for payment of Stamp Duty, registration fees, and other incidental costs associated with the transfer and registration of the Unit in the Purchaser\'s name.';
  const splitLegalCosts = doc.splitTextToSize(legalCostsText, pageWidth - 30);
  doc.text(splitLegalCosts, 15, yPos);
  yPos += splitLegalCosts.length * 7 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Fees:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const legalFeesText = 'The Purchaser shall pay the Vendor\'s Advocates fees in the amount of 1.5% of the purchase price inclusive of VAT. This rate includes all applicable Value Added Tax (VAT) at the prevailing rate and represents the total legal fees payable by the Purchaser for the conveyancing services rendered in connection with the purchase of the Unit.';
  const splitLegalFees = doc.splitTextToSize(legalFeesText, pageWidth - 30);
  if (yPos + splitLegalFees.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitLegalFees, 15, yPos);
  yPos += splitLegalFees.length * 7 + 8;
  if (yPos + 14 > maxY) { doc.addPage(); yPos = 20; }
  doc.text('>>50% of the legal fees shall be payable upon execution of the Agreement for Sale.', 20, yPos);
  yPos += 7;
  doc.text('>>50% of the legal fees shall be payable before commencement of the transfer process.', 20, yPos);
  yPos += 12;
  
  // 12. Administrative & Handling Charges
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('12. Administrative & Handling Charges;', 15, yPos);
  yPos += 6;
  doc.text('The Purchaser shall pay the Vendor\'s Advocates fees plus the attendant disbursements more specifically described under Schedule 2 below.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  // 13. Vendor's Advocates
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('13. Vendor\'s Advocates;', 15, yPos);
  yPos += 6;
  const lawyerName = data.lawyerDetails?.name || 'Messrs. JASON & COMPANY ADVOCATES';
  const lawyerAddress = data.lawyerDetails?.address || '62 Lower Plains Road, P.O. Box 61850-00200 Nairobi';
  doc.text(`The vendor's Advocates are ${lawyerName}, ${lawyerAddress}.`, 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  // 14. Management
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('14. Management;', 15, yPos);
  yPos += 6;
  const managementText = 'The management of the common areas and other common amenities on the development shall be undertaken by a management corporation and after the registration of all the transfers/leases for the apartments on the development the Purchaser will receive a membership certificate in the management corporation.';
  const splitManagement = doc.splitTextToSize(managementText, pageWidth - 30);
  if (yPos + splitManagement.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitManagement, 15, yPos);
  yPos += splitManagement.length * 7 + 8;
  
  const serviceChargeText = `The purchaser shall also be required to pay 3 months service charge @ KES ${data.serviceCharge?.toLocaleString() || '__________________'} per month and an equivalent of 3 months service charge deposit. Payable to the management company or as otherwise directed by the Vendor.`;
  const splitServiceCharge = doc.splitTextToSize(serviceChargeText, pageWidth - 30);
  doc.text(splitServiceCharge, 15, yPos);
  yPos += splitServiceCharge.length * 7 + 12;
  
  // 15. Cancellation Costs
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('15. Cancellation Costs:', 15, yPos);
  yPos += 6;
  const cancellationText = 'The Purchaser accepts that should he/she cancel the transaction after signing this Letter of Offer by both parties, or fails to sign the engrossed sale agreement within Seven (7) days of presentation, then Ten percent (10%) of the Purchase Price being the reimbursement of the cost for the Vendor for such failed transaction plus the vendor\'s advocates cost shall be forfeited by the purchaser to the vendor from the deposit paid and the balance shall be returned to the Purchaser within 30 days.';
  const splitCancellation = doc.splitTextToSize(cancellationText, pageWidth - 30);
  if (yPos + splitCancellation.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitCancellation, 15, yPos);
  yPos += splitCancellation.length * 7 + 12;
  
  // 16. Completion Date
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('16. Completion Date', 15, yPos);
  yPos += 6;
  const completionText = 'The Completion Date shall be the date on which the full Purchase Price (or such balance thereof as remains outstanding after application of the deposit and any mortgage, SACCO, or other financing proceeds) has been received by the Vendor and the Unit is ready for transfer and registration in the Purchaser\'s name.';
  const splitCompletion = doc.splitTextToSize(completionText, pageWidth - 30);
  if (yPos + splitCompletion.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitCompletion, 15, yPos);
  yPos += splitCompletion.length * 7 + 8;
  
  const optionText = 'Where the Purchaser has elected Option 2, 3, or 4 above, the Completion Date shall be the date on which the Vendor receives confirmation from the Purchaser\'s financier that the mortgage, SACCO, or other loan facility has been approved and the loan proceeds are available for disbursement, or the date on which the Purchaser pays the balance in cash, whichever is earlier.';
  const splitOption = doc.splitTextToSize(optionText, pageWidth - 30);
  if (yPos + splitOption.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitOption, 15, yPos);
  yPos += splitOption.length * 7 + 8;
  
  const proposedDate = data.completionDate || '____________________';
  doc.text(`The proposed completion date of the project is ${proposedDate}`, 15, yPos);
  yPos += 12;
  
  // 17. Governing Law
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('17. Governing Law', 15, yPos);
  yPos += 6;
  doc.text('This Offer Letter shall be governed by and construed in accordance with the laws of the Republic of Kenya.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 15;

  // PAYMENT PLANS TABLE
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    if (yPos > maxY) {
      doc.addPage();
    yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text('PAYMENT PLANS', 15, yPos);
    yPos += 10;

    const planHeaders = ['Start Date', 'End Date', 'Installment', 'Frequency', 'Installments', 'Status'];
    const planRows = data.paymentPlans.map((plan: any) => [
      plan.startDate ? dayjs(plan.startDate).format('DD MMM YYYY') : '-',
      plan.endDate ? dayjs(plan.endDate).format('DD MMM YYYY') : '-',
      `KES ${(plan.installmentAmount || 0).toLocaleString()}`,
      plan.installmentFrequency || '-',
      plan.numberOfInstallments || 0,
      plan.status?.toUpperCase() || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [planHeaders],
      body: planRows,
      theme: 'grid',
      margin: { bottom: 40 },
      headStyles: {
        fillColor: [rgb.r, rgb.g, rgb.b],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 },
      },
      didDrawPage: (data) => {
        if (data.cursor) {
          (doc as any).lastY = data.cursor.y;
        }
      },
    });

    yPos = (doc as any).lastY || yPos + 50;
    yPos += 15;
  }

  // ACCEPTANCE section
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('ACCEPTANCE', 15, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const acceptanceFullText = 'The Purchaser hereby acknowledges that acceptance of this Offer Letter shall constitute a binding agreement between the parties and that the terms herein will be incorporated in, and together with other terms contained in the Agreement for Sale.';
  const splitAcceptanceFull = doc.splitTextToSize(acceptanceFullText, pageWidth - 30);
  if (yPos + splitAcceptanceFull.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitAcceptanceFull, 15, yPos);
  yPos += splitAcceptanceFull.length * 7 + 8;
  
  const confirmText = `Kindly confirm your acceptance of this Letter of Offer by signing the duplicate copies of this offer and returning the same to us within seven (7) days of this Letter of Offer together with proof of payment of the Commitment Fee of KES ${(data.initialPayment || 0).toLocaleString()}.`;
  const splitConfirm = doc.splitTextToSize(confirmText, pageWidth - 30);
  if (yPos + splitConfirm.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitConfirm, 15, yPos);
  yPos += splitConfirm.length * 7 + 8;
  
  const docsText = 'When returning the signed Offer Letter, kindly let us have copies of your Passport/Identity Card and PIN certificate (personal identification number). It is a requirement under the Laws of Kenya that such PIN number is obtained prior to completing the sale of any transaction relating to property. Upon receipt thereof, the Vendor shall proceed with preparation of the Agreement for Sale.';
  const splitDocs = doc.splitTextToSize(docsText, pageWidth - 30);
  if (yPos + splitDocs.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitDocs, 15, yPos);
  yPos += splitDocs.length * 7 + 8;
  
  const queryText = 'In the event that you have queries on the terms set out herein or any documentation referred to in this Offer Letter, kindly contact us, PRIOR to the execution of this Offer Letter.';
  const splitQuery = doc.splitTextToSize(queryText, pageWidth - 30);
  if (yPos + splitQuery.length * 7 > maxY) { doc.addPage(); yPos = 20; }
  doc.text(splitQuery, 15, yPos);
  yPos += splitQuery.length * 7 + 12;
  
  // Yours faithfully
  doc.text('Yours faithfully,', 15, yPos);
  yPos += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('For and on behalf of', 15, yPos);
  yPos += 6;
  doc.text('CHESTNUT CITY LIMITED', 15, yPos);
  yPos += 20;
  
  // SCHEDULE 1
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('SCHEDULE 1', 15, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('(Vendor\'s Bank Account Details)', 15, yPos);
  yPos += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.text('BENEFICIARY; CHESTNUT CITY LIMITED', 15, yPos);
  yPos += 10;
  
  if (data.bankDetails) {
    doc.text(`ACCOUNT NAME: ${data.bankDetails.accountName || 'CHESTNUT CITY LIMITED'}`, 15, yPos);
    yPos += 8;
    doc.text(`BANK NAME: ${data.bankDetails.bankName || 'Diamond Trust Bank'}`, 15, yPos);
    yPos += 8;
    doc.text(`ACCOUNT NUMBER (KES): ${data.bankDetails.accountNumber || '0636875003'}`, 15, yPos);
    yPos += 8;
    doc.text(`BRANCH CODE: ${data.bankDetails.branchCode || '096'}`, 15, yPos);
    yPos += 8;
    doc.text(`SWIFT CODE: ${data.bankDetails.swiftCode || 'DTKEKENA'}`, 15, yPos);
  } else {
    // Default bank details
    doc.text('ACCOUNT NAME: CHESTNUT CITY LIMITED', 15, yPos);
    yPos += 8;
    doc.text('BANK NAME: Diamond Trust Bank', 15, yPos);
    yPos += 8;
    doc.text('ACCOUNT NUMBER (KES): 0636875003', 15, yPos);
    yPos += 8;
    doc.text('BRANCH CODE: 096', 15, yPos);
    yPos += 8;
    doc.text('SWIFT CODE: DTKEKENA', 15, yPos);
  }
  yPos += 12;
  
  // SCHEDULE 2
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('SCHEDULE 2', 15, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Pay to the property management company/corporation once incorporated', 15, yPos);
  yPos += 20;
  
  // ACCEPTANCE SIGNATURE SECTION
  if (yPos > maxY) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('ACCEPTANCE', 15, yPos);
  yPos += 12;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`I/We ${data.clientName || '__________________________________________________________'} being the intended Purchaser(s) confirm my acceptance of the above terms and conditions.`, 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 25;
  
  doc.text('Signature: ________________', 15, yPos);
  yPos += 8;
  doc.text('Date: _______________________', pageWidth - 60, yPos);
  yPos += 25;
  
  if (yPos + 25 > maxY) { doc.addPage(); yPos = 20; }
  doc.text('I CERTIFY that the above-named ____________________________________________ appeared before me and duly signed this Letter of Offer in my presence.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 25;
  
  doc.text('Advocate Signature: ________________', 15, yPos);
  yPos += 8;
  doc.text('Date: _______________________', pageWidth - 60, yPos);
  yPos += 30;

  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add signature row on every page
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    // Separator line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 45, pageWidth - 15, pageHeight - 45);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Vendor\'s Signature: ________________', 15, pageHeight - 36);
    doc.text('Purchaser\'s Signature: ________________', pageWidth - 80, pageHeight - 36);
    
    // Add page number
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated: ${dayjs().format('DD MMM YYYY HH:mm')} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 25,
      { align: 'center' }
    );
  }
  
  // Save the PDF with client name or return as data URL
  const clientName = data.clientName || 'client';
  const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  
  if (returnAsDataUrl) {
    return doc.output('dataurlstring');
  } else {
    doc.save(`chestnut-offer-letter-${sanitizedClientName}-${data.saleCode || 'sale'}.pdf`);
  }
};
