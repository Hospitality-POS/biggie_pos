import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { fetchShop } from "@services/shops";
import { useQuery } from "@tanstack/react-query";

// Kenyan mobile numbers saved without the leading 0 (e.g. 791273923 from
// an old numeric field) render with it restored. Only 9-digit 7x/1x numbers
// are touched — till/paybill numbers keep their exact stored value.
const withLeadingZero = (v?: string | number | null) => {
  const s = String(v ?? "").trim();
  return /^[17]\d{8}$/.test(s) ? `0${s}` : s;
};

function useSystemDetails() {
  const shopId = typeof window !== "undefined" ? localStorage.getItem("shopId") : null;

  // Tenant logo lives on the tenant record (localStorage), not system settings
  const tenant = (() => {
    try {
      const stored = localStorage.getItem("tenant");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const { data } = useQuery({
    queryKey: ["systemsettings", shopId],
    queryFn: () => fetchSystemSetupDetailsById(),
    enabled: !!shopId,
    retry: 3,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    networkMode: "always",
  });

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
    retry: 3,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    networkMode: "always",
  });

  return {
    BRAND_NAME1: `${data?.name || ""} ${data?.location || ""}`.trim(),
    PHONE_NO: data?.phone,
    QR_Code: data?.social_link,
    PIN: data?.kra_pin,
    location: data?.location,
    EMAIL_URL: data?.email,
    TILL_NO: withLeadingZero(data?.till_no),
    Paybill_ac: data?.account_no,
    Paybill_bs: data?.business_no,
    PO_BOX: data?.po_box,
    bank_details: data?.bank_details,
    // Name of the payment detail selected in System Profile (e.g. "Pochi",
    // "Paybill", "Till") — used as the label for the till/number line on bills.
    payment_detail_name: data?.paymentDetails?.name as string | undefined,
    tenant_logo: tenant?.tenant_logo as { url?: string } | undefined,
    enable_privacy: (data?.enable_privacy ?? false) as boolean,
    systemSettings: data,
    receipt_font_size: (data?.receipt_font_size || 13) as number,
    receipt_text_bold: (data?.receipt_text_bold ?? true) as boolean,
    staff_earning_enabled: (shopData?.staff_earning_enabled ?? false) as boolean,
    warranty_settings: shopData?.warranty_settings as
      | { enabled?: boolean; duration?: string; line_1?: string; line_2?: string }
      | undefined,
  };
}

export default useSystemDetails;