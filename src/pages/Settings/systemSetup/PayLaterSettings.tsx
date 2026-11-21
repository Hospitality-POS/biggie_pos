import React, { useEffect, useState } from "react";
import { Alert, Space, Spin, message } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchShop, updateShop } from "../../../services/shops";
import { SectionLabel, ToggleRow } from "./PrivacySettings";

// System Setup → Pay Later: lets Duka close a table with nothing or only part
// paid. The balance becomes a debt on the named customer and is collected
// later from Orders → "Receive payment".
const PayLaterSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) setEnabled(!!shop.credit_sales_enabled);
  }, [shop]);

  const toggle = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }
    setSaving(true);
    try {
      await updateShop({ _id: shopId, credit_sales_enabled: checked });
      setEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(checked ? "Pay later turned on" : "Pay later turned off");
    } catch (error) {
      console.error("Failed to update credit_sales_enabled:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <SectionLabel text="Debt management" />
      <ToggleRow
        icon={<CreditCardOutlined />}
        color="#7c3aed"
        bg="#f5f3ff"
        title={enabled ? "Pay Later On" : "Pay Later Off"}
        description="Turn this on to let cashiers close a table when the customer pays nothing now or only part of the bill. The order is saved, stock is deducted and the table is freed, and the balance is recorded as a debt on the customer. Collect it later from Orders → Unpaid → Receive payment."
        checked={enabled}
        onChange={toggle}
        loading={saving}
      />
      <Alert
        type="info"
        showIcon
        message="How pay later works"
        description={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>A customer must be attached to the order.</li>
            <li>
              If the customer has a credit limit, the sale is blocked when their total debt would go over it.
              A credit limit of 0 means no limit.
            </li>
            <li>
              Cashiers need the "Sell on Credit (Pay Later)" permission, and collecting needs
              "Receive Order Payment". Admins always have both.
            </li>
            <li>Only an admin can turn this switch on or off.</li>
          </ul>
        }
      />
    </Space>
  );
};

export default PayLaterSettings;
