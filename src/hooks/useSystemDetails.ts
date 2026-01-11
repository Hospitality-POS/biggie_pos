import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { useQuery } from "@tanstack/react-query";

function useSystemDetails() {
  const { data } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: 3,
    refetchInterval: 3000,
    networkMode: "always",
  });

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
  };
}

export default useSystemDetails;
