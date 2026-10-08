import React, { useEffect, useState } from "react";
import { Modal, Form, InputNumber, Select, Switch, Button, Space, Typography, message } from "antd";
import { InboxOutlined, MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { fetchAllInventoryItems } from "../../../services/products";
import { updateCartItem } from "../../../services/cart";

const { Text } = Typography;

interface CartItemDeductionModalProps {
  open: boolean;
  onClose: () => void;
  cartItem: any;
  primaryColor: string;
  onSuccess?: () => void;
}

export const CartItemDeductionModal: React.FC<CartItemDeductionModalProps> = ({
  open,
  onClose,
  cartItem,
  primaryColor,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [soldVariantId, setSoldVariantId] = useState<string | null>(null);
  const deductions = Form.useWatch("deductions", form);

  // When the cart line itself is a variant-tracked inventory item, offer a
  // picker for which variant is being sold
  const cartInventoryItem = cartItem?.product_type === "Product_Inventory"
    ? inventoryItems.find((i) => i._id === (cartItem?.product_id?._id || cartItem?.product_id))
    : null;
  const soldVariants =
    cartInventoryItem?.has_variants || (cartInventoryItem?.variants?.length ?? 0) > 0
      ? (cartInventoryItem?.variants || []).filter((v: any) => v.status !== "discontinued")
      : [];

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingInventory(true);
      try {
        const items = await fetchAllInventoryItems({});
        setInventoryItems(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Failed to load inventory items:", error);
        message.error("Failed to load inventory items");
      } finally {
        setLoadingInventory(false);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!open || !cartItem) return;
    setEnabled(!!cartItem.inventory_deduction_enabled);
    setSoldVariantId(cartItem.variant_id || null);
    form.setFieldsValue({
      deductions: (cartItem.inventory_deductions || []).map((d: any) => ({
        inventory_id: d.inventory_id?._id || d.inventory_id,
        variant_id: d.variant_id || null,
        quantity: d.quantity,
      })),
    });
  }, [open, cartItem, form]);

  const getVariants = (inventoryId?: string) => {
    const inv = inventoryItems.find((i) => i._id === inventoryId);
    if (!Array.isArray(inv?.variants) || !inv.variants.length) return [];
    return inv.variants.filter((v: any) => v.status !== "discontinued");
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!cartItem?._id) {
        message.error("Cart item not found");
        return;
      }

      setLoading(true);
      const soldVariant = soldVariants.find((v: any) => v._id === soldVariantId);
      await updateCartItem(cartItem._id, {
        ...(cartItem?.product_type === "Product_Inventory" && soldVariants.length
          ? { variant_id: soldVariantId, variant_name: soldVariant?.name || null }
          : {}),
        inventory_deduction_enabled: enabled,
        inventory_deductions: (values.deductions || [])
          .filter((d: any) => d?.inventory_id)
          .map((d: any) => ({
            inventory_id: d.inventory_id,
            variant_id: d.variant_id || null,
            quantity: d.quantity,
          })),
      });

      message.success("Inventory deductions saved");
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      if (error?.errorFields) return; // form validation errors
      console.error("Failed to save deductions:", error);
      message.error(error?.message || "Failed to save inventory deductions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <InboxOutlined style={{ color: primaryColor }} />
          <span>Inventory Deductions</span>
        </div>
      }
      onOk={handleSave}
      confirmLoading={loading}
      okText="Save Deductions"
      cancelText="Cancel"
      width={640}
      destroyOnClose
    >
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 12px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <div>
            <Text strong style={{ fontSize: 13, display: "block" }}>
              Deduct inventory for "{cartItem?.product_id?.name || "this item"}"
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              The selected stock is deducted when the order is placed. When deductions are set, they
              replace this item's automatic formula deduction — no double counting.
            </Text>
          </div>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>

        {soldVariants.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
            }}
          >
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              Sold Variant
            </Text>
            <Select
              placeholder={loadingInventory ? "Loading variants..." : "Select which variant is being sold"}
              loading={loadingInventory}
              disabled={loadingInventory}
              style={{ width: "100%" }}
              value={soldVariantId}
              onChange={setSoldVariantId}
              allowClear
              options={soldVariants.map((v: any) => ({
                label: `${v.name} (${v.quantity ?? 0} left)`,
                value: v._id,
              }))}
            />
          </div>
        )}

        {enabled && (
          <Form form={form} layout="vertical">
            <Form.List name="deductions" initialValue={[]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => {
                    const selectedInventoryId = deductions?.[name]?.inventory_id;
                    const variants = getVariants(selectedInventoryId);
                    const hasVariants = variants.length > 0 || (loadingInventory && !!selectedInventoryId);

                    return (
                      <Space
                        key={key}
                        align="baseline"
                        style={{ display: "flex", marginBottom: 4 }}
                        wrap
                      >
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
                            options={inventoryItems.map((i) => ({
                              label: i.name,
                              value: i._id,
                            }))}
                            onChange={() => {
                              const current = form.getFieldValue("deductions") || [];
                              current[name] = { ...current[name], variant_id: null };
                              form.setFieldsValue({ deductions: current });
                            }}
                          />
                        </Form.Item>

                        {hasVariants && (
                          <Form.Item
                            {...restField}
                            name={[name, "variant_id"]}
                            label="Variant"
                            rules={[{ required: true, message: "Select a variant" }]}
                          >
                            <Select
                              placeholder={loadingInventory ? "Loading variants..." : "Select variant"}
                              loading={loadingInventory}
                              disabled={loadingInventory}
                              style={{ width: 240 }}
                              options={variants.map((v: any) => ({
                                label: `${v.name} (${v.quantity ?? 0} left)`,
                                value: v._id,
                              }))}
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
                          onClick={() => remove(name)}
                        />
                      </Space>
                    );
                  })}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusCircleOutlined />}
                    onClick={() => add()}
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    Add Inventory Item
                  </Button>
                </>
              )}
            </Form.List>
          </Form>
        )}
      </div>
    </Modal>
  );
};

export default CartItemDeductionModal;
