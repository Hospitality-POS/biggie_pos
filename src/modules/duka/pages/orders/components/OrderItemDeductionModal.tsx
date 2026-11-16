import React, { useEffect, useState } from "react";
import { Button, Form, InputNumber, Modal, Select, Space, Typography, message } from "antd";
import { InboxOutlined, MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { fetchAllInventoryItems } from "@services/products";
import { deductOrderItemInventory, OrderItemDeduction } from "@services/orders";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

// Deducts stock for an item on an order that's already placed. Same rows as
// the cart drawer's "Deduct Inventory" (inventory item, variant when it has
// them, quantity), but applied straight away — so it also lists what was
// already deducted, to avoid deducting twice.

interface Props {
  open: boolean;
  onClose: () => void;
  orderNo: string;
  item: { _id: string; name: string; quantity: number; inventory_deductions?: OrderItemDeduction[] } | null;
  onDone?: () => void;
}

interface InventoryOption {
  _id: string;
  name: string;
  quantity?: number;
  variants?: { _id: string; name: string; quantity?: number; status?: string }[];
}

const OrderItemDeductionModal: React.FC<Props> = ({ open, onClose, orderNo, item, onDone }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const rows = Form.useWatch("deductions", form);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ deductions: [{}] });
    setLoadingInventory(true);
    fetchAllInventoryItems({})
      .then((items: unknown) => setInventoryItems(Array.isArray(items) ? (items as InventoryOption[]) : []))
      .catch(() => message.error("Failed to load inventory items"))
      .finally(() => setLoadingInventory(false));
  }, [open, form]);

  const variantsOf = (inventoryId?: string) =>
    (inventoryItems.find((i) => i._id === inventoryId)?.variants || []).filter((v) => v.status !== "discontinued");

  const handleDeduct = async () => {
    if (!item) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const deductions = (values.deductions || [])
      .filter((d: { inventory_id?: string }) => d?.inventory_id)
      .map((d: { inventory_id: string; variant_id?: string; quantity: number }) => ({
        inventory_id: d.inventory_id,
        variant_id: d.variant_id || null,
        quantity: d.quantity,
      }));
    if (!deductions.length) return;
    setSaving(true);
    try {
      await deductOrderItemInventory(item._id, deductions);
      form.resetFields();
      onClose();
      onDone?.();
    } catch {
      /* toast shown by the service */
    } finally {
      setSaving(false);
    }
  };

  const history = item?.inventory_deductions || [];

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      title={
        <Space>
          <InboxOutlined style={{ color: C.primary }} />
          <span>Deduct Inventory</span>
        </Space>
      }
      onOk={handleDeduct}
      okText="Deduct Now"
      confirmLoading={saving}
      width={640}
      destroyOnClose
    >
      <div style={{ padding: "10px 12px", background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, margin: "12px 0 16px" }}>
        <Text strong style={{ fontSize: 13, display: "block" }}>
          {item?.name} × {item?.quantity} — order {orderNo}
        </Text>
        <Text style={{ fontSize: 12, color: C.subText }}>
          The order is already placed, so the stock below is deducted as soon as you confirm.
        </Text>
      </div>

      {history.length > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Already deducted for this item</Text>
          {history.map((d, i) => (
            <Text key={i} style={{ fontSize: 12, display: "block" }}>
              {d.inventory_name}{d.variant_name ? ` — ${d.variant_name}` : ""}: {d.quantity}
              <Text type="secondary" style={{ fontSize: 11 }}>
                {" "}· {d.deducted_by_name || "staff"}{d.deducted_at ? ` · ${dayjs(d.deducted_at).format("DD MMM YYYY HH:mm")}` : ""}
              </Text>
            </Text>
          ))}
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.List name="deductions">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const variants = variantsOf(rows?.[name]?.inventory_id);
                return (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 4 }} wrap>
                    <Form.Item
                      {...restField}
                      name={[name, "inventory_id"]}
                      label="Inventory Item"
                      rules={[{ required: true, message: "Select an item" }]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={loadingInventory ? "Loading inventory..." : "Select inventory item"}
                        loading={loadingInventory}
                        disabled={loadingInventory}
                        style={{ width: 220 }}
                        options={inventoryItems.map((i) => ({ label: `${i.name} (${i.quantity ?? 0} left)`, value: i._id }))}
                        onChange={() => {
                          const current = form.getFieldValue("deductions") || [];
                          current[name] = { ...current[name], variant_id: undefined };
                          form.setFieldsValue({ deductions: current });
                        }}
                      />
                    </Form.Item>
                    {variants.length > 0 && (
                      <Form.Item
                        {...restField}
                        name={[name, "variant_id"]}
                        label="Variant"
                        rules={[{ required: true, message: "Select a variant" }]}
                      >
                        <Select
                          placeholder="Select variant"
                          style={{ width: 200 }}
                          options={variants.map((v) => ({ label: `${v.name} (${v.quantity ?? 0} left)`, value: v._id }))}
                        />
                      </Form.Item>
                    )}
                    <Form.Item
                      {...restField}
                      name={[name, "quantity"]}
                      label="Qty"
                      rules={[{ required: true, message: "Qty required" }]}
                    >
                      <InputNumber min={0.01} precision={2} style={{ width: 110 }} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      disabled={fields.length <= 1}
                      onClick={() => remove(name)}
                    />
                  </Space>
                );
              })}
              <Button type="dashed" block icon={<PlusCircleOutlined />} onClick={() => add({})}>
                Add Inventory Item
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default OrderItemDeductionModal;
