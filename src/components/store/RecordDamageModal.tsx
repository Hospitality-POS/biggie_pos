import React, { useEffect, useMemo, useState } from "react";
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Spin, Typography, message } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { DAMAGE_REASONS, fetchDamageEstimate, recordDamage, type DamageItemType, type DamageReason } from "@services/damages";

const { Text } = Typography;

const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qtyText = (n: number) => String(Math.round(n * 1000) / 1000);

export interface DamageItem {
  // "product" = a service / menu item (Services); "inventory" = an inventory item
  kind: DamageItemType;
  _id: string;
  name: string;
  price?: number;
}

interface Props {
  open: boolean;
  item: DamageItem | null;
  onClose: () => void;
  onSaved?: () => void;
}

// Record damage, for a service (its recipe ingredients come off stock, like
// a sale) or an inventory item (the item itself comes off stock)
const RecordDamageModal: React.FC<Props> = ({ open, item, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const isInventory = item?.kind === "inventory";

  const { data: est, isLoading } = useQuery({
    queryKey: ["damage-estimate", item?.kind, item?._id],
    queryFn: () => fetchDamageEstimate(item!.kind, item!._id),
    enabled: open && !!item?._id,
    staleTime: 0,
  });

  // Buying prices win; otherwise what was typed in last time
  const suggestedCost = est?.suggested_unit_cost ?? est?.last_entered_unit_cost ?? null;
  const variants = est?.variants || [];

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ quantity: 1, reason: undefined, damaged_at: dayjs(), unit_cost: undefined, note: "", variant_id: undefined });
  }, [open, item?._id, form]);

  useEffect(() => {
    if (open && est && form.getFieldValue("unit_cost") == null && suggestedCost != null) {
      form.setFieldsValue({ unit_cost: suggestedCost });
    }
  }, [open, est, suggestedCost, form]);

  const qty: number = Form.useWatch("quantity", form) || 0;
  const unitCost: number | null = Form.useWatch("unit_cost", form) ?? null;
  const variantId: string | undefined = Form.useWatch("variant_id", form);
  const variant = variants.find((v) => v._id === variantId);
  const price = variant?.price ?? est?.price ?? item?.price ?? 0;

  // What comes off stock for this quantity
  const lines = useMemo(() => {
    if (!est) return [];
    if (isInventory) {
      const inStock = variant ? variant.quantity : est.ingredients[0]?.in_stock || 0;
      return [{ key: "self", name: variant ? `${item?.name} (${variant.name})` : item?.name || "", amount: qty, unit: est.unit || "", inStock }];
    }
    return est.ingredients.map((i) => ({ key: i.inventory_id, name: i.name, amount: i.per_item * qty, unit: i.unit, inStock: i.in_stock || 0 }));
  }, [est, isInventory, variant, item?.name, qty]);
  const short = lines.filter((l) => l.amount > l.inStock);

  const handleSave = async () => {
    const v = await form.validateFields();
    if (!item) return;
    setSaving(true);
    try {
      // Send the cost only when it isn't just the buying-price figure, so the
      // API can tell a typed-in cost from its own
      const typed = v.unit_cost != null && v.unit_cost !== est?.suggested_unit_cost;
      const res = await recordDamage({
        item_type: item.kind,
        ...(isInventory ? { inventory_id: item._id, variant_id: v.variant_id } : { product_id: item._id }),
        quantity: v.quantity,
        reason: v.reason as DamageReason,
        note: v.note?.trim() || undefined,
        unit_cost: typed ? Number(v.unit_cost) : undefined,
        damaged_at: (v.damaged_at || dayjs()).toISOString(),
      });
      message.success(`Recorded ${v.quantity} × ${variant ? `${item.name} (${variant.name})` : item.name} as damaged`);
      if (res.warning) message.warning(res.warning, 6);
      queryClient.invalidateQueries({ queryKey: ["damages"] });
      queryClient.invalidateQueries({ queryKey: ["damage-estimate", item.kind, item._id] });
      onSaved?.();
      onClose();
    } catch (e: any) {
      message.error(e?.message || "Failed to record damage");
    } finally {
      setSaving(false);
    }
  };

  const costHelp =
    est?.cost_basis === "recipe" ? `From the recipe's buying prices: ${kes(est.suggested_unit_cost!)}`
      : est?.cost_basis === "buying_price" ? `From the item's buying price: ${kes(est.suggested_unit_cost!)}`
        : est?.last_entered_unit_cost != null ? "Filled in from last time."
          : isInventory ? "Optional. Add a buying price to the item to fill this in automatically."
            : "Optional. Add buying prices to the recipe ingredients to work it out automatically.";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Record damage"
      okButtonProps={{ danger: true }}
      confirmLoading={saving}
      destroyOnClose
      width={520}
      title={
        <span>
          <WarningOutlined style={{ color: "#dc2626", marginRight: 8 }} />
          Record damage — {item?.name}
        </span>
      }
    >
      <Spin spinning={isLoading}>
        <Form form={form} layout="vertical" requiredMark="optional">
          {isInventory && variants.length > 0 && (
            <Form.Item name="variant_id" label="Which one" rules={[{ required: true, message: "Pick which one was damaged" }]}>
              <Select
                placeholder="Select variant"
                options={variants.map((x) => ({ value: x._id, label: `${x.name} (${qtyText(x.quantity)} in stock)` }))}
              />
            </Form.Item>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item
              name="quantity"
              label={isInventory && est?.unit ? `How many (${est.unit})` : "How many"}
              rules={[{ required: true, message: "Enter how many" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0.001} step={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="damaged_at" label="When" style={{ flex: 1.4 }}>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="DD MMM YYYY HH:mm"
                style={{ width: "100%" }}
                allowClear={false}
                disabledDate={(d) => d && d.isAfter(dayjs().endOf("day"))}
              />
            </Form.Item>
          </div>

          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Pick a reason" }]}>
            <Radio.Group optionType="button" buttonStyle="solid" size="small"
              options={DAMAGE_REASONS.map((r) => ({ label: r.label, value: r.value }))} />
          </Form.Item>

          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} maxLength={500} placeholder={isInventory ? "e.g. Crate cracked when offloading" : "e.g. Fell off the display shelf"} />
          </Form.Item>

          <Form.Item
            name="unit_cost"
            label={isInventory && est?.unit ? `Cost per ${est.unit} (KES)` : "Cost per item (KES)"}
            tooltip="What one cost you. Used to value the loss and, with accounting on, to write it off as an expense."
            extra={costHelp}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="Unknown" />
          </Form.Item>
        </Form>

        {/* What comes off stock */}
        {est && (
          lines.length > 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              <Text strong style={{ fontSize: 12 }}>
                {isInventory ? "Comes off stock" : `Comes off stock (recipe × ${qtyText(qty)})`}
              </Text>
              {lines.map((l) => (
                <div key={l.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                  <span>{l.name}</span>
                  <span style={{ color: l.amount > l.inStock ? "#dc2626" : undefined }}>
                    {qtyText(l.amount)} {l.unit} <Text type="secondary" style={{ fontSize: 11 }}>({qtyText(l.inStock)} in stock)</Text>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12, fontSize: 12 }}
              message="This item has no recipe, so no stock is taken off. The damage is still recorded in the Damages report."
            />
          )
        )}
        {short.length > 0 && (
          isInventory ? (
            <Alert type="error" showIcon style={{ marginBottom: 12, fontSize: 12 }}
              message="That's more than is in stock. Check the stock count, or record fewer." />
          ) : (
            <Alert type="warning" showIcon style={{ marginBottom: 12, fontSize: 12 }}
              message={`Not enough ${short.map((s) => s.name).join(", ")} in stock. It will go down to 0, as with a sale.`} />
          )
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span>Sales value lost: <Text strong>{kes(price * qty)}</Text></span>
          <span>Cost lost: <Text strong>{unitCost != null ? kes(unitCost * qty) : "—"}</Text></span>
        </div>
      </Spin>
    </Modal>
  );
};

export default RecordDamageModal;
