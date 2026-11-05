/**
 * Business / branch details printed on accounting PDFs (receipts, bills,
 * expenses) — from System Profile, with the tenant name and logo.
 */
import useSystemDetails from "@hooks/useSystemDetails";
import type { DocBusiness } from "@utils/financeDocs";

export const useDocumentBusiness = (): DocBusiness => {
  const sys = useSystemDetails();
  const s: any = sys.systemSettings || {};
  let tenantName = "";
  try {
    tenantName = JSON.parse(localStorage.getItem("tenant") || "null")?.name || "";
  } catch {
    /* ignore malformed storage */
  }
  const paymentInfo = sys.Paybill_bs
    ? `Paybill ${sys.Paybill_bs}${sys.Paybill_ac ? `  Acc ${sys.Paybill_ac}` : ""}`
    : sys.TILL_NO
      ? `${sys.payment_detail_name || "Till"} ${sys.TILL_NO}`
      : undefined;
  return {
    name: s.name || tenantName || sys.BRAND_NAME1,
    location: sys.location,
    poBox: sys.PO_BOX,
    phone: sys.PHONE_NO,
    email: sys.EMAIL_URL,
    kraPin: sys.PIN,
    logoUrl: sys.tenant_logo?.url,
    paymentInfo,
  };
};
