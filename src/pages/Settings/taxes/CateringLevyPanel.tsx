import React, { useEffect, useMemo, useState } from "react";
import { Result, Skeleton, message } from "antd";
import { PercentageOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCateringLevy, updateCateringLevy } from "@services/systemsetup";
import { fetchAllShops, fetchShop, updateShopTaxSettings } from "@services/shops";
import { formatRate } from "@utils/taxConfig";
import {
  BranchCoverage, ExampleCard, InfoNote, PanelStack, RateCard, SaveBar, ToggleCard, kes,
} from "./TaxPanelParts";
import type { TaxScope } from "./VatPanel";

const SAMPLE_SALE = 1000;

// Tourism Catering Levy at one of two levels:
//  - "business" (Admin → Settings): stored in system settings, every branch
//  - "branch"   (System Setup):     stored on the current shop, that branch only
const CateringLevyPanel: React.FC<{ scope: TaxScope }> = ({ scope }) => {
  const isBranch = scope === "branch";
  const shopId = localStorage.getItem("shopId");
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState(2);

  const { data: business, isLoading: loadingBusiness, isError } = useQuery({
    queryKey: ["catering-levy"],
    queryFn: fetchCateringLevy,
    refetchOnWindowFocus: false,
  });

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: isBranch && !!shopId,
    refetchOnWindowFocus: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["shops", "tax-coverage"],
    queryFn: () => fetchAllShops(),
    enabled: !isBranch,
    refetchOnWindowFocus: false,
  });

  // What is saved at this panel's level
  const saved = isBranch
    ? {
        enabled: !!shop?.tax_settings?.catering_levy_enabled,
        pct: parseFloat((((shop?.tax_settings?.catering_levy_rate ?? 0.02) || 0.02) * 100).toFixed(2)),
      }
    : { enabled: !!business?.enabled, pct: business?.percentage ?? 2 };

  useEffect(() => {
    setEnabled(saved.enabled);
    setPct(saved.pct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, shop, isBranch]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isBranch) {
        return updateShopTaxSettings(shopId!, { catering_levy_enabled: enabled, catering_levy_rate: pct / 100 });
      }
      const data = await updateCateringLevy({ enabled, percentage: pct });
      queryClient.setQueryData(["catering-levy"], data);
      return data;
    },
    onSuccess: () => {
      message.success(isBranch ? "Branch catering levy saved" : "Catering levy saved");
      if (isBranch) queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shops", "tax-coverage"] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || "Failed to save catering levy"),
  });

  const coverage = useMemo(
    () =>
      (Array.isArray(shops) ? shops : []).map((s: any) => {
        const ts = s?.tax_settings;
        if (ts?.catering_levy_enabled)
          return { id: s._id, name: s.name, label: `Branch rate · ${formatRate(ts.catering_levy_rate)}`, tone: "branch" as const };
        if (business?.enabled)
          return { id: s._id, name: s.name, label: `All branches · ${business.percentage}%`, tone: "business" as const };
        return { id: s._id, name: s.name, label: "Off", tone: "off" as const };
      }),
    [shops, business]
  );

  if (isBranch && !shopId) return <Result status="info" title="Select a branch first" />;
  if (loadingBusiness || (isBranch && loadingShop)) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError && !isBranch) return <Result status="warning" title="Couldn't load the catering levy setting" />;

  const dirty = enabled !== saved.enabled || (enabled && pct !== saved.pct);
  const levy = enabled ? (SAMPLE_SALE * pct) / 100 : 0;
  const branchName = shop?.name || "this branch";

  return (
    <PanelStack>
      {isBranch && business?.enabled && (
        <InfoNote>
          The catering levy is already charged at all branches at {business.percentage}% (Admin → Settings).
          Turning it on here gives {branchName} its own rate.
        </InfoNote>
      )}

      <ToggleCard
        icon={<PercentageOutlined />}
        title={isBranch ? `Charge catering levy at ${branchName}` : "Charge catering levy on all branches"}
        description={isBranch
          ? "Charges the Tourism Fund levy on this branch's food and drink sales only."
          : "For tourism and hospitality businesses that collect the levy on food and drink sales."}
        checked={enabled}
        onChange={setEnabled}
        accent="#0d9488"
        accentBg="#f0fdfa"
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, opacity: enabled ? 1 : 0.55, transition: "opacity 0.2s" }}>
        <RateCard
          label="Levy rate"
          value={pct}
          onChange={setPct}
          presets={[1, 2, 3]}
          disabled={!enabled}
          hint="The Tourism Fund catering levy is 2% of the sale value."
        />
        <ExampleCard
          rows={[
            { label: "Sale", value: kes(SAMPLE_SALE) },
            { label: `Catering levy (${enabled ? pct : 0}%)`, value: kes(levy), accent: enabled ? "#0d9488" : undefined },
            { label: "Customer pays", value: kes(SAMPLE_SALE + levy), strong: true },
          ]}
        />
      </div>

      {!isBranch && (
        <BranchCoverage
          rows={coverage}
          note="To charge the levy at only some branches, leave this off and switch it on in each branch's System Setup. A branch with its own levy uses its own rate."
        />
      )}

      <SaveBar
        label={isBranch ? "Save Branch Levy" : "Save Catering Levy"}
        dirty={dirty}
        loading={mutation.isLoading}
        onSave={() => mutation.mutate()}
      />
    </PanelStack>
  );
};

export default CateringLevyPanel;
