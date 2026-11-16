import React, { useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Button, message, Space, Typography, Divider, Row, Col } from "antd";
import { UserOutlined, DollarOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { fetchAllCustomers } from "@services/customers";
import { useQuery } from "@tanstack/react-query";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { createOrder } from "@features/Order/OrderActions";
import { useAppDispatch, useAppSelector } from "src/store";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";

const { Text } = Typography;

interface AddOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddOrderModal: React.FC<AddOrderModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const primaryColor = usePrimaryColor();
  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllCustomers(),
    retry: 1,
    staleTime: 30000,
  });

  const filteredCustomers = customers.filter((c: any) =>
    c?.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    String(c?.phone || "").toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // First, create a temporary cart for this order
      const cartResponse = await axiosInstance.post(`${BASE_URL}/cart/create`, {
        items: [],
        shop_id: localStorage.getItem("shopId"),
      });

      const cartId = cartResponse.data?._id;
      if (!cartId) {
        message.error("Failed to create cart for order");
        return;
      }

      // Create order using Redux action
      const result = await dispatch(createOrder({
        cart_id: cartId,
        order_amount: values.order_amount,
        table_id: values.table_id || undefined,
        updated_by: user?.id,
        order_no: values.order_no,
        cart_items: [],
        method_id: null,
        customer_id: values.customer_id || undefined,
        customer_name: values.customer_name || undefined,
        customer_phone: values.customer_phone || undefined,
        customer_email: values.customer_email || undefined,
      }));

      if (result.type.endsWith("/fulfilled")) {
        message.success("Order created successfully");
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (error) {
      message.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c: any) => c._id === customerId);
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.customer_name || "",
        customer_phone: customer.phone?.toString() || "",
        customer_email: customer.email || "",
      });
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: primaryColor }} />
          <Text strong>Add Order</Text>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          style={{ background: primaryColor, borderColor: primaryColor }}
        >
          Create Order
        </Button>,
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={[12, 8]}>
          <Col span={12}>
            <Form.Item
              name="order_no"
              label="Order Number"
              rules={[{ required: true, message: "Order number is required" }]}
            >
              <Input placeholder="e.g. ORD-001" prefix={<ShoppingCartOutlined style={{ color: primaryColor }} />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="order_amount"
              label="Order Amount"
              rules={[{ required: true, message: "Order amount is required" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0.00"
                prefix={<DollarOutlined style={{ color: primaryColor }} />}
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Customer Information
          </Text>
        </Divider>

        <Form.Item name="customer_id" label="Select Customer">
          <Select
            showSearch
            placeholder="Search or select customer"
            loading={loadingCustomers}
            filterOption={false}
            onSearch={setCustomerSearch}
            onSelect={handleCustomerSelect}
            options={filteredCustomers.map((c: any) => ({
              value: c._id,
              label: `${c.customer_name} (${c.phone})`,
            }))}
          />
        </Form.Item>

        <Row gutter={[12, 8]}>
          <Col span={12}>
            <Form.Item name="customer_name" label="Customer Name">
              <Input placeholder="Auto-filled or enter manually" prefix={<UserOutlined style={{ color: primaryColor }} />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="customer_phone" label="Phone Number">
              <Input placeholder="Auto-filled or enter manually" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="customer_email" label="Email">
              <Input placeholder="Auto-filled or enter manually" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="table_id" label="Table ID (Optional)">
          <Input placeholder="e.g. Table 1" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddOrderModal;
