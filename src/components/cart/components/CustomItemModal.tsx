import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Select, message } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useAppDispatch } from "../../../store";
import { addItemToCart } from "../../../features/Cart/CartActions";
import { fetchMainCategories } from "../../../services/categories";

interface CustomItemModalProps {
  open: boolean;
  onClose: () => void;
  cartId?: string;
  userId?: string;
  primaryColor: string;
  onSuccess?: () => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  open,
  onClose,
  cartId,
  userId,
  primaryColor,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [mainCategories, setMainCategories] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    const loadCategories = async () => {
      try {
        const categories = await fetchMainCategories();
        setMainCategories(categories.map((cat: any) => ({ value: cat._id, label: cat.name })));
      } catch (error) {
        console.error("Failed to load main categories:", error);
      }
    };
    loadCategories();
  }, [open]);

  const handleAddCustomItem = async () => {
    try {
      const values = await form.validateFields();
      if (!cartId) {
        message.error("Cart not found");
        return;
      }

      setLoading(true);
      await dispatch(
        addItemToCart({
          cart_id: cartId,
          product_id: null,
          product_type: "Miscellaneous",
          miscellaneous_name: values.name,
          main_category: values.main_category,
          price: values.price,
          quantity: values.quantity,
          created_by: userId || "",
          vat_type: "STANDARD",
          notes: values.notes || "",
          addons: [],
        })
      );

      message.success("Custom item added successfully");
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add custom item", error);
      message.error("Failed to add custom item");
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
          <PlusCircleOutlined style={{ color: primaryColor }} />
          <span>Add Custom Item</span>
        </div>
      }
      onOk={handleAddCustomItem}
      confirmLoading={loading}
      okText="Add Item"
      cancelText="Cancel"
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Item Name"
          rules={[{ required: true, message: "Please enter item name" }]}
        >
          <Input placeholder="e.g., Custom Service Fee" />
        </Form.Item>
        <Form.Item
          name="main_category"
          label="Main Category"
          rules={[{ required: true, message: "Please select main category" }]}
        >
          <Select
            placeholder="Select main category"
            options={mainCategories}
            loading={!mainCategories.length}
          />
        </Form.Item>
        <Form.Item
          name="price"
          label="Price"
          rules={[{ required: true, message: "Please enter price" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="0.00"
            prefix="KES"
          />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[{ required: true, message: "Please enter quantity" }]}
          initialValue={1}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} precision={2} />
        </Form.Item>
        <Form.Item name="notes" label="Notes (Optional)">
          <Input.TextArea rows={2} placeholder="Add any additional notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CustomItemModal;
