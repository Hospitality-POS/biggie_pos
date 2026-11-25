import React, { useEffect, useState } from "react";
import { Space, Spin, message } from "antd";
import { DashboardOutlined, EnvironmentOutlined, ExperimentOutlined, InboxOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QtyApprovalSettingCard } from "@components/inventory/InventoryQtyApproval";
import { fetchShop, updateShop } from "../../../services/shops";
import { SectionLabel, ToggleRow } from "./PrivacySettings";

// System Setup → Inventory Controls: the shop's stock switches.
type ShopFlag =
  | "cart_inventory_deduction_enabled"
  | "zone_inventory_enabled"
  | "category_zone_restriction_enabled"
  | "water_meter_enabled"
  | "refill_enabled"
  | "damages_enabled";

const MESSAGES: Record<ShopFlag, [string, string]> = {
  cart_inventory_deduction_enabled: ["Cart-level inventory deductions enabled", "Cart-level inventory deductions disabled"],
  zone_inventory_enabled: ["Zone-based inventory enabled", "Zone-based inventory disabled"],
  category_zone_restriction_enabled: [
    "Category zone restrictions enabled — set zones per main category in Category settings",
    "Category zone restrictions disabled — all items can be sold in every zone",
  ],
  water_meter_enabled: ["Water meter tracking enabled", "Water meter tracking disabled"],
  refill_enabled: ["Refills turned on", "Refills turned off"],
  damages_enabled: ["Damage tracking turned on", "Damage tracking turned off"],
};

const InventoryControlsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const [flags, setFlags] = useState<Record<ShopFlag, boolean>>({
    cart_inventory_deduction_enabled: false,
    zone_inventory_enabled: false,
    category_zone_restriction_enabled: false,
    water_meter_enabled: false,
    refill_enabled: false,
    damages_enabled: false,
  });
  const [saving, setSaving] = useState<ShopFlag | null>(null);

  useEffect(() => {
    if (!shop) return;
    setFlags({
      cart_inventory_deduction_enabled: !!shop.cart_inventory_deduction_enabled,
      zone_inventory_enabled: !!shop.zone_inventory_enabled,
      category_zone_restriction_enabled: !!shop.category_zone_restriction_enabled,
      water_meter_enabled: !!shop.water_meter_enabled,
      refill_enabled: !!shop.refill_enabled,
      damages_enabled: !!shop.damages_enabled,
    });
  }, [shop]);

  const toggle = (flag: ShopFlag) => async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }
    setSaving(flag);
    try {
      await updateShop({ _id: shopId, [flag]: checked });
      setFlags((f) => ({ ...f, [flag]: checked }));
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(MESSAGES[flag][checked ? 0 : 1]);
    } catch (error) {
      console.error(`Failed to update ${flag}:`, error);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isRetailShop = shop?.pos_mode === "retail";

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <SectionLabel text="Inventory" />
      <QtyApprovalSettingCard />

      <ToggleRow
        icon={<InboxOutlined />}
        color="#6366f1"
        bg="#eef2ff"
        title={flags.cart_inventory_deduction_enabled ? "Manual Stock Deduction Allowed" : "Manual Stock Deduction Off"}
        description="Turn this on to let cashiers attach stock items to a cart item (e.g. ingredients for a dish) so they're used up automatically when the order is placed."
        checked={flags.cart_inventory_deduction_enabled}
        onChange={toggle("cart_inventory_deduction_enabled")}
        loading={saving === "cart_inventory_deduction_enabled"}
      />

      <ToggleRow
        icon={<EnvironmentOutlined />}
        color="#f97316"
        bg="#fff7ed"
        title={flags.zone_inventory_enabled ? "Stock Divided by Zone" : "Stock Not Divided by Zone"}
        description="Turn this on to track stock separately for each area, like Bar, Patio or Store Room. Add a zone to a product's variants in Inventory, then sales and transfers will target that specific zone."
        checked={flags.zone_inventory_enabled}
        onChange={toggle("zone_inventory_enabled")}
        loading={saving === "zone_inventory_enabled"}
      />

      <ToggleRow
        icon={<EnvironmentOutlined />}
        color="#0ea5e9"
        bg="#f0f9ff"
        title={flags.category_zone_restriction_enabled ? "Category Zone Restrictions On" : "Category Zone Restrictions Off"}
        description={`Turn this on to link main categories to zones — from Category settings → Main Categories ("Sell only in zones") or from each location's form in Table settings. A linked category can only be sold in its zones, and a zone with linked categories only sells those categories. Applies to both products and services.`}
        checked={flags.category_zone_restriction_enabled}
        onChange={toggle("category_zone_restriction_enabled")}
        loading={saving === "category_zone_restriction_enabled"}
      />

      {isRetailShop && (
        <ToggleRow
          icon={<DashboardOutlined />}
          color="#0284c7"
          bg="#e0f2fe"
          title={flags.water_meter_enabled ? "Water Meter Tracking On" : "Water Meter Tracking Off"}
          description="For water refilling stations. Turn this on to link an inventory item to a water meter: set the meter unit (e.g. m³) and how many litres it equals in Add New Inventory, then record the meter reading each day from Inventory and the water quantity updates automatically."
          checked={flags.water_meter_enabled}
          onChange={toggle("water_meter_enabled")}
          loading={saving === "water_meter_enabled"}
        />
      )}

      {isRetailShop && (
        <ToggleRow
          icon={<ExperimentOutlined />}
          color="#4f46e5"
          bg="#eef2ff"
          title={flags.refill_enabled ? "Refills On" : "Refills Off"}
          description="For refill points. Turn this on to make filled items by refilling: on the filled item (e.g. Filled bottle 20L) set what one unit uses — empty bottle, water, cap — and how many bottles come in a bale. Each refill takes those off stock and adds the filled bottles, so filled bottles are counted until they're sold. Adds a Refill button in Inventory and a Refills report."
          checked={flags.refill_enabled}
          onChange={toggle("refill_enabled")}
          loading={saving === "refill_enabled"}
        />
      )}

      <ToggleRow
        icon={<WarningOutlined />}
        color="#dc2626"
        bg="#fef2f2"
        title={flags.damages_enabled ? "Damage Tracking On" : "Damage Tracking Off"}
        description="Turn this on to record services and inventory items that get damaged, spoilt or expire (e.g. a dropped cake, a cracked crate of eggs). Adds a Record damage button to each item in Services and in Inventory, and a Damages report in Reports. A damaged service takes its recipe ingredients off stock; a damaged inventory item comes off stock itself. Both are logged as waste, and with accounting on, the cost is written off as an expense."
        checked={flags.damages_enabled}
        onChange={toggle("damages_enabled")}
        loading={saving === "damages_enabled"}
      />
    </Space>
  );
};

export default InventoryControlsSettings;
