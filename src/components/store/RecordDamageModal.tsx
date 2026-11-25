import React, { useEffect, useMemo, useState } from "react";
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Spin, Typography, message } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { DAMAGE_REASONS, fetchDamageEstimate, recordDamage, type DamageReason } from "@services/damages";

const { Text } = Typography;

const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qtyText = (n: number) => String(Math.round(n * 1000) / 1000);

interface Props {
  open: boolean;
  product: { _id: string; name: string; price?: number } | null;
  onClose: () => void;
  onSaved?: () => void;
}

// Services → Record damage: a damaged / spoilt / expired item. Its recipe
// ingredients come off stock as waste, like a sale.
const RecordDamageModal: React.FC<Props> = ({ open, product, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: est, isLoading } = useQuery({
    queryKey: ["damage-estimate", product?._id],
    queryFn: () => fetchDamageEstimate(product!._id),
    enabled: open && !!product?._id,
    staleTime: 0,
  });

  // The recipe's cost wins; otherwise what was typed in last time
  const suggestedCost = est?.recipe_unit_cost ?? est?.last_entered_unit_cost ?? null;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ quantity: 1, reason: undefined, damaged_at: dayjs(), unit_cost: undefined, note: "" });
  }, [open, product?._id, form]);

  useEffect(() => {
    if (open && est && form.getFieldValue("unit_cost") == null && suggestedCost != null) {
      form.setFieldsValue({ unit_cost: suggestedCost });
    }
  }, [open, est, suggestedCost, form]);

  const qty: number = Form.useWatch("quantity", form) || 0;
  const unitCost: number | null = Form.useWatch("unit_cost", form) ?? null;
  const price = est?.price ?? product?.price ?? 0;

  const short = useMemo(
    () => (est?.ingredients || []).filter((i) => i.per_item * qty > (i.in_stock || 0)),
    [est, qty]
  );

  const handleSave = async () => {
    const v = await form.validateFields();
    if (!product) return;
    setSaving(true);
    try {
      // Send the cost only when it isn't just the recipe's own figure, so the
      // API can tell a typed-in cost from the recipe cost
      const typed = v.unit_cost != null && v.unit_cost !== est?.recipe_unit_cost;
      const res = await recordDamage({
        product_id: product._id,
        quantity: v.quantity,
        reason: v.reason as DamageReason,
        note: v.note?.trim() || undefined,
        unit_cost: typed ? Number(v.unit_cost) : undefined,
        damaged_at: (v.damaged_at || dayjs()).toISOString(),
      });
      message.success(`Recorded ${v.quantity} × ${product.name} as damaged`);
      if (res.warning) message.warning(res.warning, 6);
      queryClient.invalidateQueries({ queryKey: ["damages"] });
      queryClient.invalidateQueries({ queryKey: ["damage-estimate", product._id] });
      onSaved?.();
      onClose();
    } catch (e: any) {
      message.error(e?.message || "Failed to record damage");
    } finally {
      setSaving(false);
    }
  };

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
          Record damage — {product?.name}
        </span>
      }
    >
      <Spin spinning={isLoading}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item
              name="quantity"
              label="How many"
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
            <Input.TextArea rows={2} maxLength={500} placeholder="e.g. Fell off the display shelf" />
          </Form.Item>

          <Form.Item
            name="unit_cost"
            label="Cost per item (KES)"
            tooltip="What one item cost to make. Used to value the loss and, with accounting on, to write it off as an expense."
            extra={
              est?.recipe_unit_cost != null
                ? `From the recipe's buying prices: ${kes(est.recipe_unit_cost)}`
                : est?.last_entered_unit_cost != null
                  ? "Filled in from last time. Add buying prices to the recipe ingredients to work it out automatically."
                  : "Optional. Leave blank if you don't know it."
            }
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="Unknown" />
          </Form.Item>
        </Form>

        {/* What comes off stock */}
        {est && (
          est.ingredients.length > 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              <Text strong style={{ fontSize: 12 }}>Comes off stock (recipe × {qtyText(qty)})</Text>
              {est.ingredients.map((i) => (
                <div key={i.inventory_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                  <span>{i.name}</span>
                  <span style={{ color: i.per_item * qty > (i.in_stock || 0) ? "#dc2626" : undefined }}>
                    {qtyText(i.per_item * qty)} {i.unit} <Text type="secondary" style={{ fontSize: 11 }}>({qtyText(i.in_stock || 0)} in stock)</Text>
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
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12, fontSize: 12 }}
            message={`Not enough ${short.map((s) => s.name).join(", ")} in stock. It will go down to 0, as with a sale.`}
          />
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
