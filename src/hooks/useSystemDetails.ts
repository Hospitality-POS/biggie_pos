import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { fetchShop } from "@services/shops";
import { useQuery } from "@tanstack/react-query";

function useSystemDetails() {
  const { data } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: 3,
    refetchInterval: 3000,
    networkMode: "always",
  });

  const shopId = typeof window !== "undefined" ? localStorage.getItem("shopId") : null;
  
  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
    retry: 3,
    refetchInterval: 3000,
    networkMode: "always",
  });

  console.log('nice work', data);
  return {
    BRAND_NAME1: `${data?.name} ${data?.location}`,
    PHONE_NO: data?.phone,
    QR_Code: data?.social_link,
    PIN: data?.kra_pin,
    location: data?.location,
    EMAIL_URL: data?.email,
    TILL_NO: data?.till_no,
    Paybill_ac: data?.account_no,
    Paybill_bs: data?.business_no,
    PO_BOX: data?.po_box,
    bank_details: data?.bank_details,
    receipt_font_size: (data?.receipt_font_size || 13) as number,
    receipt_text_bold: (data?.receipt_text_bold ?? true) as boolean,
    staff_earning_enabled: (shopData?.staff_earning_enabled ?? false) as boolean,
  };
}

export default useSystemDetails;