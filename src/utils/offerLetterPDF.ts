import jsPDF from 'jspdf';
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
    doc.addImage(tenantLogo, 'PNG', 15, 30, 25, 25);
  } catch (error) {
    // If logo fails to load, draw a placeholder with brand color
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(27.5, 42.5, 12.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('CHESTNUT', 27.5, 40, { align: 'center', baseline: 'middle' });
    doc.text('CITY', 27.5, 45, { align: 'center', baseline: 'middle' });
  }
  
  let yPos = 62;
  
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
  
  // Format address from address object
  let formattedAddress = '__________________________________';
  if (data.clientAddressObject && typeof data.clientAddressObject === 'object') {
    const addr = data.clientAddressObject;
    const parts = [];
    if (addr.county) parts.push(addr.county);
    if (addr.postal_code) parts.push(addr.postal_code);
    if (addr.country) parts.push(addr.country);
    formattedAddress = parts.join(', ') || '__________________________________';
  } else if (data.clientAddress && typeof data.clientAddress === 'string') {
    formattedAddress = data.clientAddress;
  }
  doc.text(`Address: ${formattedAddress}`, 15, yPos);
  yPos += 8;
  doc.text(`Telephone: ${data.clientPhone || '________________________________'}`, 15, yPos);
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
  yPos += splitIntro.length * 6 + 10;
  
  const offerText = `We are pleased to offer to you Unit No. ${data.unitNumber || '________'}, being part of the residential apartments to be developed within the said project (hereinafter referred to as "the Unit"), subject to the terms and conditions set out herein and those to be contained in the formal Agreement for Sale.`;
  const splitOffer = doc.splitTextToSize(offerText, pageWidth - 30);
  doc.text(splitOffer, 15, yPos);
  yPos += splitOffer.length * 6 + 10;
  
  const developmentText = 'The development shall be constructed in accordance with the approved architectural and structural drawings and specifications previously made available to prospective purchasers.';
  const splitDevelopment = doc.splitTextToSize(developmentText, pageWidth - 30);
  doc.text(splitDevelopment, 15, yPos);
  yPos += splitDevelopment.length * 6 + 10;
  
  const leaseText = `The Unit shall be sold on a long leasehold interest for a term of ${data.leaseTerm || 'Ninety-Nine (99) years less the last seven (7) days thereof'}. There shall be a Management Company that shall be established for purposes of managing the common areas and facilities within the development.`;
  const splitLease = doc.splitTextToSize(leaseText, pageWidth - 30);
  doc.text(splitLease, 15, yPos);
  yPos += splitLease.length * 6 + 15;
  
  // TERMS AND CONDITIONS
  if (yPos > pageHeight - 40) {
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
  doc.text('2. Purchaser', 15, yPos);
  yPos += 6;
  doc.text(data.clientName || '_______________________________', 15, yPos);
  yPos += 10;
  
  // 3. Unit/Property
  doc.text('3. Unit/Property;', 15, yPos);
  yPos += 6;
  const unitNumberDisplay = data.apartmentName || data.unitNumber || '_____________________';
  doc.text(`Unit Number: ${unitNumberDisplay}`, 15, yPos);
  yPos += 6;
  doc.text(`Unit Type: ${data.unitType || '_______________________'}`, 15, yPos);
  yPos += 6;
  const floorInfo = data.floor || '________';
  const blockInfo = data.block || '________';
  const apartmentDisplay = data.apartmentName || data.unitNumber || '________';
  doc.text(`Apartment No. ${apartmentDisplay} situated on the ${floorInfo} Floor, Block ${blockInfo}`, 15, yPos);
  yPos += 10;
  
  // 4. Purchase Price
  doc.text('4. Purchase Price;', 15, yPos);
  yPos += 6;
  doc.text(`The purchase price is Kenya Shillings: ____________________________ (KES ${(data.salePrice || 0).toLocaleString()}) being the agreed purchase price for the Unit.`, 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  doc.text('The Purchase Prices for the various unit types are as follows:', 15, yPos);
  yPos += 15;
  
  // 5. Deposit/Commitment Fee
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('5. Deposit/Commitment Fee', 15, yPos);
  yPos += 6;
  const commitmentText = `Upon acceptance of this Offer Letter, the Purchaser shall pay a Commitment Fee of Kenya Shillings ${(data.initialPayment || 0).toLocaleString()} to the Vendor. The amount of the Commitment Fee shall be determined by the Purchase Price of the specific Unit selected by the Purchaser. The said commitment fee shall be refundable; however, any refund shall be subject to a deduction in respect of all processing charges and legal fees incurred in connection with the purchase of the property.`;
  const splitCommitment = doc.splitTextToSize(commitmentText, pageWidth - 30);
  doc.text(splitCommitment, 15, yPos);
  yPos += splitCommitment.length * 6 + 10;
  
  const acceptanceText = 'The Purchaser shall signify acceptance of this Offer Letter by:';
  const splitAcceptance = doc.splitTextToSize(acceptanceText, pageWidth - 30);
  doc.text(splitAcceptance, 15, yPos);
  yPos += splitAcceptance.length * 6 + 8;
  doc.text('a) Signing and returning a copy of this Offer Letter to the Vendor; and', 20, yPos);
  yPos += 7;
  doc.text('b) Providing proof of payment of the said Commitment Fee by way of a bank deposit slip or bank transfer confirmation or electronic funds transfer.', 20, yPos);
  yPos += 10;
  
  const instructionText = 'Upon receipt of the duly executed Offer Letter together with proof of payment of the Commitment Fee, the Vendor shall instruct its advocates to prepare and forward to the Purchaser or the Purchaser\'s advocates the Agreement for Sale.';
  const splitInstruction = doc.splitTextToSize(instructionText, pageWidth - 30);
  doc.text(splitInstruction, 15, yPos);
  yPos += splitInstruction.length * 6 + 12;
  
  // 6. Mode of Payment
  if (yPos > pageHeight - 80) {
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
    doc.text(`[   ] ${option}`, 20, yPos);
    yPos += 10;
  });
  yPos += 10;
  
  // 7. Deposit under Agreement for Sale
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('7. Deposit under the Agreement for Sale', 15, yPos);
  yPos += 6;
  const depositText = 'The Agreement for Sale shall require the Purchaser to pay a deposit equivalent to Ten Percent (10%) of the Purchase Price of the Unit.';
  const splitDeposit = doc.splitTextToSize(depositText, pageWidth - 30);
  doc.text(splitDeposit, 15, yPos);
  yPos += splitDeposit.length * 6 + 8;
  
  const commitmentComparison = `Where the Commitment Fee of KES ${(data.initialPayment || 0).toLocaleString()} paid pursuant to this Offer Letter is less than the required Ten Percent (10%) deposit, the Purchaser shall, upon execution of the Agreement for Sale within the fourteen (14) days as indicated herein, pay the balance necessary to constitute the full Ten Percent (10%) deposit based on the agreed Purchase Price of the Unit.`;
  const splitComparison = doc.splitTextToSize(commitmentComparison, pageWidth - 30);
  doc.text(splitComparison, 15, yPos);
  yPos += splitComparison.length * 6 + 8;
  
  const excessText = 'Where the Commitment Fee equals or exceeds the required Ten Percent (10%) deposit, the said amount shall be applied toward satisfaction of the deposit payable under the Agreement for Sale.';
  const splitExcess = doc.splitTextToSize(excessText, pageWidth - 30);
  doc.text(splitExcess, 15, yPos);
  yPos += splitExcess.length * 6 + 12;
  
  // 8. Agreement for Sale
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('8. Agreement for Sale', 15, yPos);
  yPos += 6;
  const agreementText = 'The Vendor\'s Advocates shall prepare a standard Agreement for Sale applicable to all purchasers within the development. The Purchaser shall execute the Agreement for Sale within fourteen (14) days of its presentation.';
  const splitAgreement = doc.splitTextToSize(agreementText, pageWidth - 30);
  doc.text(splitAgreement, 15, yPos);
  yPos += splitAgreement.length * 6 + 8;
  
  const failureText = 'Failure by the Purchaser to execute the Agreement for Sale within the stipulated period may result in withdrawal of this offer at the Vendor\'s discretion.';
  const splitFailure = doc.splitTextToSize(failureText, pageWidth - 30);
  doc.text(splitFailure, 15, yPos);
  yPos += splitFailure.length * 6 + 12;
  
  // 9. Title
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('9. Title', 15, yPos);
  yPos += 6;
  const titleText = 'The sale shall be concluded by way of Sectional Title in accordance with the provisions of the Sectional Properties Act, 2020, upon completion of the development and registration of the sectional plan.';
  const splitTitle = doc.splitTextToSize(titleText, pageWidth - 30);
  doc.text(splitTitle, 15, yPos);
  yPos += splitTitle.length * 6 + 12;
  
  // 10. Transfer
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('10. Transfer', 15, yPos);
  yPos += 6;
  const transferText = 'The transfer of the property shall be by way of a sectional title in accordance with the Land Act 2012, the Land Registration Act 2012, or the Sectional Properties Act 2020 in a standard form applicable to all the purchasers of other apartments on the property and no material amendments will be accepted.';
  const splitTransfer = doc.splitTextToSize(transferText, pageWidth - 30);
  doc.text(splitTransfer, 15, yPos);
  yPos += splitTransfer.length * 6 + 12;
  
  // 11. Legal and Statutory Costs
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('11. Legal and Statutory Costs', 15, yPos);
  yPos += 6;
  const legalCostsText = 'The Purchaser shall be responsible for payment of Stamp Duty, registration fees, and other incidental costs associated with the transfer and registration of the Unit in the Purchaser\'s name.';
  const splitLegalCosts = doc.splitTextToSize(legalCostsText, pageWidth - 30);
  doc.text(splitLegalCosts, 15, yPos);
  yPos += splitLegalCosts.length * 6 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Fees:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const legalFeesText = 'The Purchaser shall pay the Vendor\'s Advocates fees in the amount of 1.5% of the purchase price inclusive of VAT. This rate includes all applicable Value Added Tax (VAT) at the prevailing rate and represents the total legal fees payable by the Purchaser for the conveyancing services rendered in connection with the purchase of the Unit.';
  const splitLegalFees = doc.splitTextToSize(legalFeesText, pageWidth - 30);
  doc.text(splitLegalFees, 15, yPos);
  yPos += splitLegalFees.length * 6 + 8;
  doc.text('>>50% of the legal fees shall be payable upon execution of the Agreement for Sale.', 20, yPos);
  yPos += 7;
  doc.text('>>50% of the legal fees shall be payable before commencement of the transfer process.', 20, yPos);
  yPos += 12;
  
  // 12. Administrative & Handling Charges
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('12. Administrative & Handling Charges;', 15, yPos);
  yPos += 6;
  doc.text('The Purchaser shall pay the Vendor\'s Advocates fees plus the attendant disbursements more specifically described under Schedule 2 below.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 12;
  
  // 13. Vendor's Advocates
  if (yPos > pageHeight - 40) {
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
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('14. Management;', 15, yPos);
  yPos += 6;
  const managementText = 'The management of the common areas and other common amenities on the development shall be undertaken by a management corporation and after the registration of all the transfers/leases for the apartments on the development the Purchaser will receive a membership certificate in the management corporation.';
  const splitManagement = doc.splitTextToSize(managementText, pageWidth - 30);
  doc.text(splitManagement, 15, yPos);
  yPos += splitManagement.length * 6 + 8;
  
  const serviceChargeText = `The purchaser shall also be required to pay 3 months service charge @ KES ${data.serviceCharge?.toLocaleString() || '__________________'} per month and an equivalent of 3 months service charge deposit. Payable to the management company or as otherwise directed by the Vendor.`;
  const splitServiceCharge = doc.splitTextToSize(serviceChargeText, pageWidth - 30);
  doc.text(splitServiceCharge, 15, yPos);
  yPos += splitServiceCharge.length * 6 + 12;
  
  // 15. Cancellation Costs
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('15. Cancellation Costs:', 15, yPos);
  yPos += 6;
  const cancellationText = 'The Purchaser accepts that should he/she cancel the transaction after signing this Letter of Offer by both parties, or fails to sign the engrossed sale agreement within Seven (7) days of presentation, then Ten percent (10%) of the Purchase Price being the reimbursement of the cost for the Vendor for such failed transaction plus the vendor\'s advocates cost shall be forfeited by the purchaser to the vendor from the deposit paid and the balance shall be returned to the Purchaser within 30 days.';
  const splitCancellation = doc.splitTextToSize(cancellationText, pageWidth - 30);
  doc.text(splitCancellation, 15, yPos);
  yPos += splitCancellation.length * 6 + 12;
  
  // 16. Completion Date
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('16. Completion Date', 15, yPos);
  yPos += 6;
  const completionText = 'The Completion Date shall be the date on which the full Purchase Price (or such balance thereof as remains outstanding after application of the deposit and any mortgage, SACCO, or other financing proceeds) has been received by the Vendor and the Unit is ready for transfer and registration in the Purchaser\'s name.';
  const splitCompletion = doc.splitTextToSize(completionText, pageWidth - 30);
  doc.text(splitCompletion, 15, yPos);
  yPos += splitCompletion.length * 6 + 8;
  
  const optionText = 'Where the Purchaser has elected Option 2, 3, or 4 above, the Completion Date shall be the date on which the Vendor receives confirmation from the Purchaser\'s financier that the mortgage, SACCO, or other loan facility has been approved and the loan proceeds are available for disbursement, or the date on which the Purchaser pays the balance in cash, whichever is earlier.';
  const splitOption = doc.splitTextToSize(optionText, pageWidth - 30);
  doc.text(splitOption, 15, yPos);
  yPos += splitOption.length * 6 + 8;
  
  const proposedDate = data.completionDate || '____________________';
  doc.text(`The proposed completion date of the project is ${proposedDate}`, 15, yPos);
  yPos += 12;
  
  // 17. Governing Law
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text('17. Governing Law', 15, yPos);
  yPos += 6;
  doc.text('This Offer Letter shall be governed by and construed in accordance with the laws of the Republic of Kenya.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 15;
  
  // ACCEPTANCE section
  if (yPos > pageHeight - 100) {
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
  doc.text(splitAcceptanceFull, 15, yPos);
  yPos += splitAcceptanceFull.length * 6 + 8;
  
  const confirmText = `Kindly confirm your acceptance of this Letter of Offer by signing the duplicate copies of this offer and returning the same to us within seven (7) days of this Letter of Offer together with proof of payment of the Commitment Fee of KES ${(data.initialPayment || 0).toLocaleString()}.`;
  const splitConfirm = doc.splitTextToSize(confirmText, pageWidth - 30);
  doc.text(splitConfirm, 15, yPos);
  yPos += splitConfirm.length * 6 + 8;
  
  const docsText = 'When returning the signed Offer Letter, kindly let us have copies of your Passport/Identity Card and PIN certificate (personal identification number). It is a requirement under the Laws of Kenya that such PIN number is obtained prior to completing the sale of any transaction relating to property. Upon receipt thereof, the Vendor shall proceed with preparation of the Agreement for Sale.';
  const splitDocs = doc.splitTextToSize(docsText, pageWidth - 30);
  doc.text(splitDocs, 15, yPos);
  yPos += splitDocs.length * 6 + 8;
  
  const queryText = 'In the event that you have queries on the terms set out herein or any documentation referred to in this Offer Letter, kindly contact us, PRIOR to the execution of this Offer Letter.';
  const splitQuery = doc.splitTextToSize(queryText, pageWidth - 30);
  doc.text(splitQuery, 15, yPos);
  yPos += splitQuery.length * 6 + 12;
  
  // Yours faithfully
  doc.text('Yours faithfully,', 15, yPos);
  yPos += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('For and on behalf of', 15, yPos);
  yPos += 6;
  doc.text('CHESTNUT CITY LIMITED', 15, yPos);
  yPos += 20;
  
  // SCHEDULE 1
  if (yPos > pageHeight - 70) {
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
    doc.text(`BANK NAME: ${data.bankDetails.bankName || '________________________'}`, 15, yPos);
    yPos += 8;
    doc.text(`ACCOUNT NUMBER: ${data.bankDetails.accountNumber || '________________________'}`, 15, yPos);
    yPos += 8;
    doc.text(`BRANCH NAME: ${data.bankDetails.branchName || '________________________'}`, 15, yPos);
  } else {
    // Default bank details
    doc.text('ACCOUNT NAME: CHESTNUT CITY LIMITED', 15, yPos);
    yPos += 8;
    doc.text('BANK NAME: ________________________', 15, yPos);
    yPos += 8;
    doc.text('ACCOUNT NUMBER: ________________________', 15, yPos);
    yPos += 8;
    doc.text('BRANCH NAME: ________________________', 15, yPos);
  }
  yPos += 12;
  
  // SCHEDULE 2
  if (yPos > pageHeight - 80) {
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
  doc.text('(Disbursements payable to our Lawyers directly)', 15, yPos);
  yPos += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Lawyer bank details as follow:', 15, yPos);
  yPos += 10;
  
  if (data.lawyerDetails) {
    doc.text(`ACCOUNT NAME: ${data.lawyerDetails.accountName || 'JASON & COMPANY ADVOCATES'}`, 15, yPos);
    yPos += 10;
    doc.text(`BANK NAME: ${data.lawyerDetails.bankName || 'EQUITY BANK (KENYA) LIMITED'}`, 15, yPos);
    yPos += 10;
    doc.text(`ACCOUNT NUMBER: ${data.lawyerDetails.accountNumber || '1470287315683'}`, 15, yPos);
    yPos += 10;
    doc.text(`BRANCH NAME: ${data.lawyerDetails.branchName || 'KILIMANI SUPREME CENTRE'}`, 15, yPos);
  } else {
    // Default lawyer details
    doc.text('ACCOUNT NAME: JASON & COMPANY ADVOCATES', 15, yPos);
    yPos += 10;
    doc.text('BANK NAME: EQUITY BANK (KENYA) LIMITED', 15, yPos);
    yPos += 10;
    doc.text('ACCOUNT NUMBER: 1470287315683', 15, yPos);
    yPos += 10;
    doc.text('BRANCH NAME: KILIMANI SUPREME CENTRE', 15, yPos);
  }
  yPos += 12;
  doc.text('*This is an estimated figure.', 15, yPos);
  yPos += 15;
  
  // SCHEDULE 3
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text('SCHEDULE 3', 15, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Pay to the property management company/corporation once incorporated', 15, yPos);
  yPos += 20;
  
  // ACCEPTANCE SIGNATURE SECTION
  if (yPos > pageHeight - 90) {
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
  
  doc.text('Signature: _______________________', 15, yPos);
  yPos += 8;
  doc.text('Date: _______________________', pageWidth - 60, yPos);
  yPos += 25;
  
  doc.text('I CERTIFY that the above-named ____________________________________________ appeared before me and duly signed this Letter of Offer in my presence.', 15, yPos, { maxWidth: pageWidth - 30 });
  yPos += 25;
  
  doc.text('Advocate Signature: _______________________', 15, yPos);
  yPos += 8;
  doc.text('Date: _______________________', pageWidth - 60, yPos);
  
  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
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
  
  // Save the PDF with client name or return as data URL
  const clientName = data.clientName || 'client';
  const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  
  if (returnAsDataUrl) {
    return doc.output('dataurlstring');
  } else {
    doc.save(`chestnut-offer-letter-${sanitizedClientName}-${data.saleCode || 'sale'}.pdf`);
  }
};
