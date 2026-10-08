import jsPDF from 'jspdf';
import { getUser } from '@services/tenants';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { getPrimaryColor, hexToRgb } from './getPrimaryColor';
import { renderPayslipPage, type PayslipHeaderMode } from './payslipExport';

export const generatePayslipPDF = async (payslip: any, headerMode?: PayslipHeaderMode) => {
  const user = getUser();
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

  let company = 'Company';
  let kraPin: string | undefined;
  let address: string | undefined;
  let mode: PayslipHeaderMode = 'company';
  try {
    const s = await fetchSystemSetupDetailsById();
    company = s?.name || s?.business_name || tenant.tenant_name || 'Company';
    kraPin = s?.kra_pin || tenant.kra_pin;
    address = s?.location || s?.address || tenant.address;
    if (s?.payroll_settings?.payslip_export_header === 'department') mode = 'department';
  } catch {
    company = tenant.tenant_name || 'Company';
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const ctx = {
    company,
    kraPin,
    address,
    user,
    primary: hexToRgb(getPrimaryColor()),
    headerMode: headerMode || mode,
  };
  renderPayslipPage(doc, payslip, ctx, true);

  const periodLabel = (payslip.period_label || 'unknown_period').replace(/\s+/g, '_');
  const empNo = payslip.employee_id?.employee_number || 'employee';
  doc.save(`Payslip_${empNo}_${periodLabel}.pdf`);
};
