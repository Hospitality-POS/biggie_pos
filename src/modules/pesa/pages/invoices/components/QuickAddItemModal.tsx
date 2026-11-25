import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Modal, Segmented, Select, Typography } from "antd";
import { AppstoreAddOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { addNewProduct, fetchAllUnits } from "@services/products";
import { addNewInventory } from "@services/inventory";
import { fetchAllCategories } from "@services/categories";

const { Text } = Typography;

export type QuickAddKind = "service" | "inventory";

// Shape the invoice line-item picker uses for its options
export interface QuickAddedItem {
    id: string;
    name: string;
    price: number;
    type: QuickAddKind;
    account_id: string;
}

interface Props {
    open: boolean;
    kind: QuickAddKind;
    initialName?: string;
    initialPrice?: number;
    onClose: () => void;
    onCreated: (item: QuickAddedItem) => void;
}

const VAT_OPTIONS = [
    { value: "STANDARD", label: "Standard (16%)" },
    { value: "ZERO", label: "Zero-rated (0%)" },
    { value: "EXEMPT", label: "Exempt" },
];

// Adds a service (a Product on the POS menu) or an inventory item (stock)
// from an invoice line, so it can be picked from the list next time.
const QuickAddItemModal: React.FC<Props> = ({ open, kind: initialKind, initialName, initialPrice, onClose, onCreated }) => {
    const [form] = Form.useForm();
    const [kind, setKind] = useState<QuickAddKind>(initialKind);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setKind(initialKind);
        form.resetFields();
        form.setFieldsValue({ name: initialName || "", price: initialPrice, vat_type: "STANDARD", quantity: 0 });
    }, [open, initialKind, initialName, initialPrice, form]);

    const { data: categories, isLoading: categoriesLoading } = useQuery({
        queryKey: ["categories"],
        queryFn: () => fetchAllCategories({}),
        enabled: open && kind === "service",
    });
    const { data: units, isLoading: unitsLoading } = useQuery({
        queryKey: ["units"],
        queryFn: fetchAllUnits,
        enabled: open && kind === "inventory",
    });

    const asList = (d: any) => (Array.isArray(d) ? d : d?.data || []);

    const handleSave = async () => {
        const v = await form.validateFields();
        setSaving(true);
        try {
            if (kind === "service") {
                const res = await addNewProduct({
                    name: v.name.trim(),
                    price: Number(v.price) || 0,
                    category: v.category,
                    quantity: 0,
                    // A service isn't counted as stock
                    activateInventory: false,
                    vat_type: v.vat_type,
                });
                const p = res?.product || res;
                onCreated({ id: p._id, name: p.name, price: p.price ?? Number(v.price) ?? 0, type: "service", account_id: "acc_4100" });
            } else {
                const res = await addNewInventory({
                    name: v.name.trim(),
                    price: Number(v.price) || 0,
                    supplier_price: v.supplier_price != null ? Number(v.supplier_price) : undefined,
                    quantity: Number(v.quantity) || 0,
                    unit_id: v.unit_id,
                    // Sellable, and usable in-house like other stock
                    usage_type: "both",
                    vat_type: v.vat_type,
                });
                const it = res?.inventoryItem || res;
                onCreated({ id: it._id, name: it.name, price: it.price ?? Number(v.price) ?? 0, type: "inventory", account_id: "acc_4100" });
            }
            onClose();
        } catch {
            // addNewProduct / addNewInventory already show the error
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleSave}
            okText={kind === "service" ? "Add service" : "Add inventory item"}
            confirmLoading={saving}
            destroyOnClose
            width={480}
            title={
                <span>
                    <AppstoreAddOutlined style={{ marginRight: 8 }} />
                    New {kind === "service" ? "service" : "inventory item"}
                </span>
            }
        >
            <Segmented
                block
                value={kind}
                onChange={(v) => setKind(v as QuickAddKind)}
                options={[
                    { label: "Service", value: "service" },
                    { label: "Inventory item", value: "inventory" },
                ]}
                style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 16 }}>
                {kind === "service"
                    ? "Work you charge for, like installation or a call-out. It isn't counted as stock."
                    : "Goods you keep in stock. Selling it on an invoice takes it out of stock."}
                {" "}It's saved, so next time just pick it from the list.
            </Text>

            <Form form={form} layout="vertical" requiredMark="optional">
                <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }]}>
                    <Input maxLength={120} placeholder={kind === "service" ? "e.g. Lift installation" : "e.g. Door sensor"} autoFocus />
                </Form.Item>

                <div style={{ display: "flex", gap: 12 }}>
                    <Form.Item
                        name="price"
                        label="Selling price (KES)"
                        rules={[{ required: true, message: "Enter a price" }]}
                        style={{ flex: 1 }}
                    >
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="vat_type" label="VAT" style={{ flex: 1 }}>
                        <Select options={VAT_OPTIONS} />
                    </Form.Item>
                </div>

                {kind === "service" ? (
                    <Form.Item
                        name="category"
                        label="Category"
                        tooltip="Where it shows on the POS menu"
                        rules={[{ required: true, message: "Pick a category" }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Select category"
                            loading={categoriesLoading}
                            options={asList(categories).map((c: any) => ({ label: c.name, value: c._id }))}
                        />
                    </Form.Item>
                ) : (
                    <>
                        <div style={{ display: "flex", gap: 12 }}>
                            <Form.Item
                                name="unit_id"
                                label="Unit"
                                rules={[{ required: true, message: "Pick a unit" }]}
                                style={{ flex: 1 }}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="e.g. pcs"
                                    loading={unitsLoading}
                                    options={asList(units).map((u: any) => ({ label: u.name, value: u._id }))}
                                />
                            </Form.Item>
                            <Form.Item name="quantity" label="Opening stock" style={{ flex: 1 }}>
                                <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                        </div>
                        <Form.Item name="supplier_price" label="Buying price (KES)">
                            <InputNumber min={0} style={{ width: "100%" }} placeholder="Optional" />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
};

export default QuickAddItemModal;
