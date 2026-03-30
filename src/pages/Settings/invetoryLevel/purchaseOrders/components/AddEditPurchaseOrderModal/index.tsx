import React, { useRef, useState } from "react";
import {
  ModalForm,
  ProCard,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
  StepsForm,
} from "@ant-design/pro-components";
import {
  Alert,
  Button,
  Col,
  Form,
  message,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllInventory } from "@services/inventory";
import { fetchAllUnits } from "@services/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import ShowConfirm from "@utils/ConfirmUtil";
import type { ActionType } from "@ant-design/pro-components";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";

const { Text, Title } = Typography;

// ── Palette (matches system) ──────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  blue: "#3b82f6",
  green: "#10b981",
  orange: "#f59e0b",
  indigo: "#6366f1",
  tableBorder: "#e2e8f0",
  darkText: "#0f172a",
  subText: "#64748b",
};

const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

// ── Step header pill ──────────────────────────────────────────────────────────
const StepTitle: React.FC<{ icon: React.ReactNode; text: string; color: string; bg: string }> = ({
  icon, text, color, bg,
}) => (
  <Space size={8}>
    <div style={{ background: bg, borderRadius: 7, padding: "4px 5px", color, fontSize: 14, lineHeight: 1 }}>
      {icon}
    </div>
    <Text strong style={{ fontSize: 13, color: C.darkText }}>{text}</Text>
  </Space>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface AddEditPurchaseOrderModalProps {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  data?: any;
  edit?: boolean;
}

const AddEditPurchaseOrderModal: React.FC<AddEditPurchaseOrderModalProps> = ({
  actionRef,
  data,
  edit = false,
}) => {
  const [form] = Form.useForm();
  const [totalAmount, setTotalAmount] = useState(0);
  const formRef = useRef<any>();
  const [stepFormValues, setStepFormValues] = useState<any>({});
  const [open, setOpen] = useState(false);

  const { createPurchaseOrder, updatePurchaseOrder } = usePurchaseOrders();

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchAllSuppliers,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchAllInventory,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const SupplierRequest = async () =>
    suppliers?.map((s: any) => ({ label: s.name, value: s._id })) || [];

  const InventoryRequest = async () =>
    inventory?.map((item: any) => ({
      label: `${item.name}${item.supplier_price ? ` (Last: Ksh.${item.supplier_price})` : ""}`,
      value: item._id,
    })) || [];

  const UnitsRequest = async () =>
    units?.map((u: any) => ({ label: u.name, value: u._id })) || [];

  // ── Modal control ─────────────────────────────────────────────────────────────
  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.resetFields();
      setTotalAmount(0);
      setStepFormValues({});
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const addPOMutation = useMutation(createPurchaseOrder, {
    onSuccess: () => {
      form.resetFields();
      setTotalAmount(0);
      setOpen(false);
      actionRef.current?.reload();
    },
  });

  const editPOMutation = useMutation(updatePurchaseOrder, {
    onSuccess: () => {
      form.resetFields();
      setTotalAmount(0);
      setOpen(false);
      actionRef.current?.reload();
    },
  });

  // ── Total calculation ─────────────────────────────────────────────────────────
  const calculateTotal = () => {
    const items = form.getFieldValue("po_items") || [];
    const total = items.reduce((sum: number, item: any) => {
      return sum + (item?.quantity_ordered || 0) * (item?.unit_price || 0);
    }, 0);
    setTotalAmount(total);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "create new"} Purchase Order?`,
      position: true,
    });
    if (!confirmed) return true;

    try {
      const processedItems =
        values.po_items?.map((item: any) => ({
          inventory_id: item.inventory_id?.value || item.inventory_id,
          unit_id: item.unit_id?.value || item.unit_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          total_price: (item.quantity_ordered || 0) * (item.unit_price || 0),
          notes: item.notes,
        })) || [];

      const submitData = {
        supplier_id: values.supplier_id?.value || values.supplier_id,
        expected_delivery_date: values.expected_delivery_date,
        notes: values.notes,
        po_items: processedItems,
        total_amount: totalAmount,
        created_by: JSON.parse(localStorage.getItem("user") || "{}")._id,
        shop_id: JSON.parse(localStorage.getItem("tenant") || "{}").shop_id,
      };

      if (edit) {
        await editPOMutation.mutateAsync({ _id: data._id, values: submitData });
      } else {
        await addPOMutation.mutateAsync(submitData);
      }

      actionRef.current?.reload();
      return true;
    } catch {
      return false;
    }
  };

  // ── Resolve label helpers ─────────────────────────────────────────────────────
  const resolveSupplierLabel = (val: any) => {
    if (typeof val === "object" && val?.label) return val.label;
    if (typeof val === "string" && suppliers) {
      return suppliers.find((s: any) => s._id === val)?.name || "Unknown";
    }
    return "Not selected";
  };

  const resolveInventoryLabel = (val: any) => {
    if (typeof val === "object" && val?.label) return val.label.split(" (Last:")[0];
    if (typeof val === "string" && inventory) {
      return inventory.find((i: any) => i._id === val)?.name || "Unknown item";
    }
    return "Unknown item";
  };

  const resolveUnitLabel = (val: any) => {
    if (typeof val === "object" && val?.label) return val.label;
    if (typeof val === "string" && units) {
      return units.find((u: any) => u._id === val)?.name || "units";
    }
    return "units";
  };

  const resolveDate = (val: any) => {
    if (!val) return "Not set";
    try {
      if (val?._isAMomentObject) return val.format("YYYY-MM-DD");
      if (val?.$d) return new Date(val.$d).toLocaleDateString();
      if (val?.format) return val.format("YYYY-MM-DD");
      return new Date(val).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ModalForm
      title={
        <Space size={10}>
          <div
            style={{
              background: C.primaryLight,
              borderRadius: 8,
              padding: "6px 7px",
              color: C.primary,
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            <FileTextOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>
            {edit ? "Edit Purchase Order" : "Create Purchase Order"}
          </Text>
        </Space>
      }
      form={form}
      formRef={formRef}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        edit ? (
          // ── Edit trigger — plain icon + text, no extra wrapper ────────────────
          <Space
            size={6}
            style={{ cursor: "pointer" }}
            aria-label={`Edit purchase order ${data?.po_number}`}
            onClick={() => form.setFieldsValue(data)}
          >
            <EditOutlined style={{ color: C.subText, fontSize: 13 }} />
            <Text style={{ fontSize: 13, color: C.subText }}>Edit</Text>
          </Space>
        ) : (
          // ── Add trigger — primary button, consistent height/radius ────────────
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            style={{
              background: C.primary,
              borderColor: C.primary,
              borderRadius: 8,
              fontWeight: 500,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            New PO
          </Button>
        )
      }
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "min(860px, 96vw)",
        styles: { body: { padding: "16px 20px" } },
      }}
      submitter={false}
    >
      <StepsForm
        formProps={{
          validateMessages: { required: "${label} is required" },
          preserve: true,
        }}
        onFinish={handleFinish}
        submitter={{
          submitButtonProps: {
            loading: addPOMutation.isLoading || editPOMutation.isLoading,
            style: { background: C.primary, borderColor: C.primary, borderRadius: 7 },
          },
          resetButtonProps: { style: { borderRadius: 7 } },
        }}
        stepsFormRender={(dom, submitter) => (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "62vh", overflowX: "hidden" }}>
              {dom}
            </div>
            <div
              style={{
                padding: "14px 0 0",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                borderTop: `1px solid ${C.tableBorder}`,
                marginTop: 12,
              }}
            >
              {submitter}
            </div>
          </div>
        )}
        formRef={formRef}
      >
        {/* ── Step 1: Basic Info ──────────────────────────────────────────────── */}
        <StepsForm.StepForm
          name="basic"
          title="Basic Info"
          onFinish={async (values) => {
            setStepFormValues((prev: any) => ({ ...prev, ...values }));
            return true;
          }}
          initialValues={
            edit
              ? {
                supplier_id: { value: data?.supplier_id?._id, label: data?.supplier_id?.name },
                expected_delivery_date: data?.expected_delivery_date,
                notes: data?.notes,
              }
              : {}
          }
        >
          <Alert
            message="Purchase Order Information"
            description="Select the supplier and expected delivery date for this order."
            type="info"
            showIcon
            closable
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <ProFormSelect
                name="supplier_id"
                label="Supplier"
                placeholder="Select supplier"
                showSearch
                rules={[{ required: true }]}
                request={SupplierRequest}
                fieldProps={{
                  notFoundContent: suppliers?.length ? "No suppliers found" : "Loading...",
                }}
              />
            </Col>
            <Col xs={24} md={12}>
              <ProFormDatePicker
                name="expected_delivery_date"
                label="Expected Delivery Date"
                placeholder="Select date"
                fieldProps={{
                  disabledDate: (current: any) =>
                    current && current.valueOf() < Date.now() - 86400000,
                  style: { width: "100%" },
                }}
              />
            </Col>
            <Col xs={24}>
              <ProFormTextArea
                name="notes"
                label="Notes"
                placeholder="Add any notes or special instructions (optional)"
                fieldProps={{ rows: 3 }}
              />
            </Col>
          </Row>
        </StepsForm.StepForm>

        {/* ── Step 2: Order Items ─────────────────────────────────────────────── */}
        <StepsForm.StepForm
          name="po_items"
          title="Order Items"
          onFinish={async (values) => {
            if (!values.po_items?.length) {
              message.error("Please add at least one item to the purchase order");
              return false;
            }
            const invalid = values.po_items.filter(
              (item: any) => !item?.inventory_id || !item?.unit_id || !item?.quantity_ordered || !item?.unit_price
            );
            if (invalid.length > 0) {
              message.error("Please fill in all required fields for each item");
              return false;
            }
            setStepFormValues((prev: any) => ({ ...prev, ...values }));
            return true;
          }}
          initialValues={
            edit
              ? {
                po_items: data?.po_items?.map((item: any) => ({
                  inventory_id: { value: item.inventory_id?._id, label: item.inventory_id?.name },
                  unit_id: { value: item.unit_id?._id, label: item.unit_id?.name },
                  quantity_ordered: item.quantity_ordered,
                  unit_price: item.unit_price,
                  notes: item.notes,
                })),
              }
              : {}
          }
        >
          <Alert
            message="Add Items to Purchase Order"
            description="Specify quantities, unit prices, and any item-specific notes."
            type="info"
            showIcon
            closable
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Form.List name="po_items" initialValue={[{}]}>
            {(fields: any[], { add, remove }: any) => (
              <>
                {fields.map((field: any, index: number) => (
                  <ProCard
                    key={field.key}
                    size="small"
                    title={
                      <Space size={6}>
                        <div
                          style={{
                            background: C.primaryLight,
                            borderRadius: 6,
                            width: 22,
                            height: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.primary,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </div>
                        <Text style={{ fontSize: 13, color: C.darkText }}>Item {index + 1}</Text>
                      </Space>
                    }
                    extra={
                      fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => { remove(field.name); calculateTotal(); }}
                          icon={<MinusCircleOutlined />}
                          style={{ fontSize: 12 }}
                        >
                          Remove
                        </Button>
                      )
                    }
                    style={{
                      marginBottom: 12,
                      borderRadius: 10,
                      border: `1px solid ${C.tableBorder}`,
                    }}
                    bodyStyle={{ paddingBottom: 4 }}
                  >
                    <Row gutter={[12, 0]}>
                      <Col xs={24} sm={24} md={8}>
                        <ProFormSelect
                          name={[field.name, "inventory_id"]}
                          label="Inventory Item"
                          placeholder="Select item"
                          showSearch
                          rules={[{ required: true }]}
                          request={InventoryRequest}
                          fieldProps={{
                            notFoundContent: inventory?.length ? "No items found" : "Loading...",
                          }}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <ProFormSelect
                          name={[field.name, "unit_id"]}
                          label="Unit"
                          placeholder="Select unit"
                          showSearch
                          rules={[{ required: true }]}
                          request={UnitsRequest}
                          fieldProps={{
                            notFoundContent: units?.length ? "No units found" : "Loading...",
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={6} md={5}>
                        <ProFormDigit
                          name={[field.name, "quantity_ordered"]}
                          label="Qty"
                          placeholder="0"
                          min={1}
                          precision={0}
                          rules={[{ required: true }]}
                          fieldProps={{ onChange: calculateTotal }}
                        />
                      </Col>
                      <Col xs={12} sm={6} md={5}>
                        <ProFormDigit
                          name={[field.name, "unit_price"]}
                          label="Unit Price"
                          placeholder="0.00"
                          min={0}
                          precision={2}
                          rules={[{ required: true }]}
                          fieldProps={{
                            addonBefore: "Ksh",
                            onChange: calculateTotal,
                          }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={[12, 0]}>
                      <Col xs={24}>
                        <ProFormTextArea
                          name={[field.name, "notes"]}
                          label="Item Notes"
                          placeholder="Optional notes for this item"
                          fieldProps={{ rows: 2 }}
                        />
                      </Col>
                    </Row>
                  </ProCard>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                  style={{
                    marginTop: 8,
                    marginBottom: 16,
                    height: 40,
                    borderRadius: 8,
                    borderColor: C.primary,
                    color: C.primary,
                  }}
                >
                  Add Another Item
                </Button>
              </>
            )}
          </Form.List>

          {/* Running total */}
          {totalAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                marginTop: 4,
              }}
            >
              <Space size={8}>
                <ShoppingCartOutlined style={{ color: C.green, fontSize: 15 }} />
                <Text strong style={{ color: C.darkText }}>Running Total</Text>
              </Space>
              <Text strong style={{ fontSize: 16, color: C.green }}>
                Ksh {fmtK(totalAmount)}
              </Text>
            </div>
          )}
        </StepsForm.StepForm>

        {/* ── Step 3: Confirmation ────────────────────────────────────────────── */}
        <StepsForm.StepForm
          name="confirm"
          title="Confirm"
          stepProps={{ description: "Review & submit" }}
          onFinish={async () => true}
        >
          <Alert
            message="Review Purchase Order"
            description="Please review all details before submitting. Go back to make changes if needed."
            type="success"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <ProForm.Item
            noStyle
            shouldUpdate={(prev: any, curr: any) =>
              JSON.stringify(prev) !== JSON.stringify(curr)
            }
          >
            {() => {
              const allValues = { ...stepFormValues, ...form.getFieldsValue(true) };
              const items = (allValues.po_items || []).filter(
                (item: any) => item && (item.inventory_id || item.unit_id || item.quantity_ordered || item.unit_price)
              );

              return (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  {/* Order meta */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: `1px solid ${C.tableBorder}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                      Order Details
                    </Text>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={12}>
                        <Space size={4} direction="vertical">
                          <Text style={{ fontSize: 11, color: C.subText }}>Supplier</Text>
                          <Text strong style={{ fontSize: 13 }}>
                            {resolveSupplierLabel(allValues.supplier_id)}
                          </Text>
                        </Space>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Space size={4} direction="vertical">
                          <Text style={{ fontSize: 11, color: C.subText }}>Expected Delivery</Text>
                          <Text strong style={{ fontSize: 13 }}>
                            {resolveDate(allValues.expected_delivery_date)}
                          </Text>
                        </Space>
                      </Col>
                      {allValues.notes && (
                        <Col xs={24}>
                          <Space size={4} direction="vertical">
                            <Text style={{ fontSize: 11, color: C.subText }}>Notes</Text>
                            <Text style={{ fontSize: 13, color: "#374151" }}>{allValues.notes}</Text>
                          </Space>
                        </Col>
                      )}
                    </Row>
                  </div>

                  {/* Items list */}
                  <div
                    style={{
                      border: `1px solid ${C.tableBorder}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderBottom: `1px solid ${C.tableBorder}`,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Order Items ({items.length})
                      </Text>
                    </div>

                    {items.length === 0 ? (
                      <div style={{ padding: "20px 16px" }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>No items added</Text>
                      </div>
                    ) : (
                      items.map((item: any, index: number) => {
                        const qty = Number(item.quantity_ordered) || 0;
                        const price = Number(item.unit_price) || 0;
                        const subtotal = qty * price;

                        return (
                          <div
                            key={index}
                            style={{
                              padding: "12px 14px",
                              background: index % 2 === 0 ? "#fff" : "#fafafa",
                              borderBottom: index < items.length - 1 ? `1px solid ${C.tableBorder}` : "none",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                                  {resolveInventoryLabel(item.inventory_id)}
                                </Text>
                                <Space size={6} style={{ marginTop: 4 }}>
                                  <Tag
                                    style={{
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      border: "none",
                                      borderRadius: 5,
                                      fontSize: 11,
                                    }}
                                  >
                                    {qty} {resolveUnitLabel(item.unit_id)}
                                  </Tag>
                                  <Text style={{ fontSize: 12, color: C.subText }}>
                                    @ Ksh {fmtK(price)}
                                  </Text>
                                </Space>
                                {item.notes && (
                                  <Text italic style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 3 }}>
                                    {item.notes}
                                  </Text>
                                )}
                              </div>
                              <div
                                style={{
                                  background: "#f0fdf4",
                                  borderRadius: 7,
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  flexShrink: 0,
                                }}
                              >
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Subtotal</Text>
                                <Text strong style={{ fontSize: 13, color: C.green }}>
                                  Ksh {fmtK(subtotal)}
                                </Text>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Grand total */}
                  {totalAmount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        background: C.primaryLight,
                        border: `1px solid #f3c6cd`,
                        borderRadius: 10,
                      }}
                    >
                      <Space size={8}>
                        <CheckCircleOutlined style={{ color: C.primary, fontSize: 16 }} />
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Grand Total</Text>
                      </Space>
                      <Text strong style={{ fontSize: 18, color: C.primary }}>
                        Ksh {fmtK(totalAmount)}
                      </Text>
                    </div>
                  )}
                </Space>
              );
            }}
          </ProForm.Item>
        </StepsForm.StepForm>
      </StepsForm>
    </ModalForm>
  );
};

export default AddEditPurchaseOrderModal;