import React, { useEffect, useMemo, useState } from "react";
import { Result, Segmented, Skeleton, Typography, message } from "antd";
import { TagOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTenantDetails, getCurrentTenantId, updateTenant } from "@services/tenants";
import { fetchAllShops, fetchShop, updateShopTaxSettings } from "@services/shops";
import { formatRate, VatPricingMode } from "@utils/taxConfig";
import { THEME_C } from "@utils/getPrimaryColor";
import {
  BranchCoverage, CardLabel, ExampleCard, InfoNote, PanelStack, RateCard, SaveBar, ToggleCard, kes,
} from "./TaxPanelParts";

const { Text } = Typography;
const C = THEME_C;
const SAMPLE_PRICE = 1000;

export type TaxScope = "business" | "branch";

const toPct = (rate?: number, fallback = 16) =>
  rate ? parseFloat((rate * 100).toFixed(2)) : fallback;

// VAT settings at one of two levels:
//  - "business" (Admin → Settings): stored on the tenant, applies to every branch
//  - "branch"   (System Setup):     stored on the current shop, applies to it only
const VatPanel: React.FC<{ scope: TaxScope }> = ({ scope }) => {
  const isBranch = scope === "branch";
  const tenantId = getCurrentTenantId();
  const shopId = localStorage.getItem("shopId");
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<VatPricingMode>("EXCLUSIVE");
  const [pct, setPct] = useState(16);

  const { data: tenantRes, isLoading: loadingTenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantDetails(tenantId!),
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
  });
  const tenant = tenantRes?.data;

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

  // What is saved at this panel's level. The tenant model zeroes the rate
  // while VAT is off — fall back to 16% so switching it on starts there.
  const saved = isBranch
    ? {
        enabled: !!shop?.tax_settings?.vat_enabled,
        mode: (shop?.tax_settings?.vat_pricing_mode || "EXCLUSIVE") as VatPricingMode,
        pct: toPct(shop?.tax_settings?.vat_standard_rate),
      }
    : {
        enabled: !!tenant?.is_vat_enabled,
        mode: (tenant?.vat_pricing_mode || "EXCLUSIVE") as VatPricingMode,
        pct: toPct(tenant?.is_vat_enabled ? tenant?.vat_standard_rate : 0),
      };

  useEffect(() => {
    setEnabled(saved.enabled);
    setMode(saved.mode);
    setPct(saved.pct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, shop, isBranch]);

  const mutation = useMutation({
    mutationFn: () =>
      isBranch
        ? updateShopTaxSettings(shopId!, { vat_enabled: enabled, vat_pricing_mode: mode, vat_standard_rate: pct / 100 })
        : updateTenant(tenantId!, { is_vat_enabled: enabled, vat_pricing_mode: mode, vat_standard_rate: pct / 100 }),
    onSuccess: () => {
      message.success(isBranch ? "Branch VAT saved" : "VAT settings saved");
      queryClient.invalidateQueries({ queryKey: isBranch ? ["shop", shopId] : ["tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["shops", "tax-coverage"] });
    },
    onError: () => message.error("Failed to save VAT settings"),
  });

  const coverage = useMemo(
    () =>
      (Array.isArray(shops) ? shops : []).map((s: any) => {
        const ts = s?.tax_settings;
        if (ts?.vat_enabled)
          return { id: s._id, name: s.name, label: `Branch rate · ${formatRate(ts.vat_standard_rate)}`, tone: "branch" as const };
        if (tenant?.is_vat_enabled)
          return { id: s._id, name: s.name, label: `All branches · ${formatRate(tenant.vat_standard_rate)}`, tone: "business" as const };
        return { id: s._id, name: s.name, label: "Off", tone: "off" as const };
      }),
    [shops, tenant]
  );

  if (!tenantId) return <Result status="404" title="Tenant not found" subTitle="Please sign in again." />;
  if (isBranch && !shopId) return <Result status="info" title="Select a branch first" />;
  if (loadingTenant || (isBranch && loadingShop)) return <Skeleton active paragraph={{ rows: 6 }} />;

  const dirty = enabled !== saved.enabled || (enabled && (mode !== saved.mode || pct !== saved.pct));

  const rate = enabled ? pct / 100 : 0;
  const net = mode === "INCLUSIVE" ? SAMPLE_PRICE / (1 + rate) : SAMPLE_PRICE;
  const vat = mode === "INCLUSIVE" ? SAMPLE_PRICE - net : SAMPLE_PRICE * rate;
  const branchName = shop?.name || "this branch";

  return (
    <PanelStack>
      {isBranch && tenant?.is_vat_enabled && (
        <InfoNote>
          VAT is already charged at all branches at {formatRate(tenant.vat_standard_rate)} (Admin → Settings).
          Turning it on here gives {branchName} its own rate and pricing mode.
        </InfoNote>
      )}

      <ToggleCard
        icon={<TagOutlined />}
        title={isBranch ? `Charge VAT at ${branchName}` : "Charge VAT on all branches"}
        description={isBranch
          ? "Applies VAT to standard-rated items at this branch only."
          : "Applies VAT to standard-rated items at every branch."}
        checked={enabled}
        onChange={setEnabled}
        accent="#2563eb"
        accentBg="#eff6ff"
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, opacity: enabled ? 1 : 0.55, transition: "opacity 0.2s" }}>
        <RateCard label="Standard rate" value={pct} onChange={setPct} presets={[8, 16]} disabled={!enabled}>
          <div style={{ marginTop: 16 }}>
            <CardLabel>Item selling prices are</CardLabel>
            <Segmented
              block
              disabled={!enabled}
              value={mode}
              onChange={(v) => setMode(v as VatPricingMode)}
              style={{ marginTop: 8 }}
              options={[
                { label: "Tax exclusive", value: "EXCLUSIVE" },
                { label: "Tax inclusive", value: "INCLUSIVE" },
              ]}
            />
            <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 8 }}>
              {mode === "INCLUSIVE"
                ? "VAT is already inside the price — it is extracted for receipts and reports."
                : "VAT is added on top of the price at checkout."}
            </Text>
          </div>
        </RateCard>
        <ExampleCard
          rows={[
            { label: "Item price", value: kes(SAMPLE_PRICE) },
            { label: "Net amount", value: kes(net) },
            { label: `VAT (${enabled ? pct : 0}%)`, value: kes(vat), accent: enabled ? "#2563eb" : undefined },
            { label: "Customer pays", value: kes(net + vat), strong: true },
          ]}
        />
      </div>

      {!isBranch && (
        <BranchCoverage
          rows={coverage}
          note="To charge VAT at only some branches, leave this off and switch it on in each branch's System Setup. A branch with its own VAT uses its own rate and pricing mode."
        />
      )}

      <SaveBar label={isBranch ? "Save Branch VAT" : "Save VAT Settings"} dirty={dirty} loading={mutation.isLoading} onSave={() => mutation.mutate()} />
    </PanelStack>
  );
};

export default VatPanel;
