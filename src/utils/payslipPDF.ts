import { exportPayslipToPDF, type PayslipHeaderMode, type PayslipLineKey } from './payslipExport';

/** Single payslip PDF, saved as "Payslip_<Employee Name>_<period>.pdf". */
export const generatePayslipPDF = (
  payslip: any,
  headerMode?: PayslipHeaderMode,
  rounded = false,
  hidden: PayslipLineKey[] = []
) => exportPayslipToPDF(payslip, headerMode, rounded, hidden);
