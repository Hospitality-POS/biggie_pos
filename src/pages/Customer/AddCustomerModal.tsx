import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Typography, message } from "antd";
import {
    EditOutlined, EnvironmentOutlined, IdcardOutlined,
    MailOutlined, SaveOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { addNewCustomer, updateCustomer } from "@services/customers";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    blue: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Types ──────────────────────────────────────────────────────────────────
interface AddCustomerModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    customer?: any;
    mode?: "add" | "edit";
}

// ── Component ──────────────────────────────────────────────────────────────
const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
    visible, onClose, onSuccess, customer, mode = "add",
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const isEdit = mode === "edit";

    useEffect(() => {
        if (!visible) return;
        if (isEdit && customer) {
            let phoneValue: any;
            if (customer.phone) {
                const s = String(customer.phone);
                const local = s.startsWith("+254") ? s.slice(4)
                    : s.startsWith("254") ? s.slice(3)
                        : s;
                phoneValue = { code: 254, phone: local, short: "KE" };
            }
            form.setFieldsValue({
                customer_name: customer.customer_name,
                email: customer.email || "",
                phoneNumber: phoneValue,
                location: customer.location || "",
                kra_pin: customer.kra_pin || "",
            });
        } else {
            form.resetFields();
        }
    }, [visible, mode, customer, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const { customer_name, email, phoneNumber, location, kra_pin } = values;
            const payload = {
                customer_name,
                phone: getPhoneNumber(phoneNumber),
                ...(email && { email }),
                ...(location && { location }),
                ...(kra_pin && { kra_pin }),
            };

            const response = isEdit && customer?._id
                ? await updateCustomer(customer._id, payload)
                : await addNewCustomer(payload);

            if (response?.status === 200 || response?.status === 201) {
                message.success(isEdit ? "Customer updated successfully!" : "Customer added successfully!");
                form.resetFields();
                onClose();
                onSuccess?.();
            }
        } catch (error: any) {
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                `Failed to ${isEdit ? "update" : "add"} customer`,
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (loading) return;
        form.resetFields();
        onClose();
    };

    const iconColor = isEdit ? C.blue : C.primary;

    return (
        <Modal
            open={visible}
            onCancel={handleCancel}
            destroyOnClose
            style={{ top: 20 }}
            width="min(560px, 96vw)"
            footer={null}
            styles={{ body: { padding: "20px 24px 24px" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        background: isEdit ? "#eff6ff" : C.primaryLight,
                        borderRadius: 7, padding: "4px 6px",
                        color: iconColor, fontSize: 14, lineHeight: 1,
                    }}>
                        {isEdit ? <EditOutlined /> : <UserAddOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>
                        {isEdit ? "Edit Customer" : "Add New Customer"}
                    </Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>

                {/* Name */}
                <Form.Item
                    name="customer_name" label="Customer Name"
                    rules={[
                        { required: true, message: "Please enter customer name" },
                        { min: 2, message: "Name must be at least 2 characters" },
                    ]}
                >
                    <Input
                        prefix={<UserOutlined style={{ color: C.subText }} />}
                        placeholder="Enter customer full name"
                        style={{ borderRadius: 8 }}
                        autoFocus
                    />
                </Form.Item>

                {/* Phone */}
                <PhoneInput
                    label="Phone Number"
                    owner="phoneNumber"
                    rules={[{ required: true, message: "Please enter phone number" }]}
                />

                {/* Two-column: Email + Location */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item
                        name="email" label="Email Address"
                        rules={[{ type: "email", message: "Please enter a valid email" }]}
                        style={{ flex: "1 1 200px", marginBottom: 16 }}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: C.subText }} />}
                            placeholder="customer@example.com"
                            type="email"
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="location" label="Location"
                        style={{ flex: "1 1 200px", marginBottom: 16 }}
                    >
                        <Input
                            prefix={<EnvironmentOutlined style={{ color: C.subText }} />}
                            placeholder="e.g. Nairobi, Westlands"
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </div>

                {/* KRA PIN */}
                <Form.Item
                    name="kra_pin" label="KRA PIN"
                    rules={[{
                        pattern: /^[A-Z]\d{9}[A-Z]$/,
                        message: "Invalid KRA PIN format. Expected: A123456789Z",
                    }]}
                >
                    <Input
                        prefix={<IdcardOutlined style={{ color: C.subText }} />}
                        placeholder="e.g. A123456789Z (optional)"
                        style={{ borderRadius: 8, textTransform: "uppercase" }}
                        onChange={(e) => form.setFieldsValue({ kra_pin: e.target.value.toUpperCase() })}
                    />
                </Form.Item>

                {/* Optional fields note */}
                <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 20, marginTop: -8 }}>
                    Email, location and KRA PIN are optional.
                </Text>

                {/* Footer buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={handleCancel} disabled={loading}
                        style={{ borderRadius: 8, height: 38 }}>
                        Cancel
                    </Button>
                    <Button
                        block type="primary" htmlType="submit" icon={<SaveOutlined />}
                        loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}
                    >
                        {isEdit ? "Update Customer" : "Add Customer"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default AddCustomerModal;