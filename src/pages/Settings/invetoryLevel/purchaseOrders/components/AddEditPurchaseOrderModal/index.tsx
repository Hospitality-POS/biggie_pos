import React, { useState, useEffect, useRef } from "react";
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormDatePicker,
  ProFormTextArea,
  StepsForm,
  ProCard,
} from "@ant-design/pro-components";
import {
  Button,
  Form,
  message,
  Space,
  Row,
  Col,
  Typography,
  Alert,
  Tag,
  Flex,
} from "antd";
import {
  EditOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllInventory } from "@services/inventory";
import { fetchAllUnits } from "@services/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import ShowConfirm from "@utils/ConfirmUtil";
import type { ActionType } from "@ant-design/pro-components";

import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";

const { Title, Text } = Typography;

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

  const primaryColor = usePrimaryColor();
  const { createPurchaseOrder, updatePurchaseOrder } = usePurchaseOrders();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchAllSuppliers,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const SupplierRequest = async () => {
    const data = suppliers?.map((supplier: { name: string; _id: string }) => ({
      label: supplier.name,
      value: supplier._id,
    }));
    return data || [];
  };

  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchAllInventory,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const InventoryRequest = async () => {
    const data = inventory?.map(
      (item: { name: string; _id: string; supplier_price?: number }) => ({
        label: `${item.name}${
          item.supplier_price ? ` (Last: Ksh.${item.supplier_price})` : ""
        }`,
        value: item._id,
      })
    );
    return data || [];
  };

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const UnitsRequest = async () => {
    const data = units?.map((unit: { name: string; _id: string }) => ({
      label: unit.name,
      value: unit._id,
    }));
    return data || [];
  };

  const onOpenChange = (open: boolean) => {
    setOpen(open);
    form.resetFields();
    setTotalAmount(0);
    setStepFormValues({});
  };

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

  const calculateTotal = (values: any) => {
    if (values.po_items && Array.isArray(values.po_items)) {
      const total = values.po_items.reduce((sum: number, item: any) => {
        const quantity = item?.quantity_ordered || 0;
        const price = item?.unit_price || 0;
        return sum + quantity * price;
      }, 0);
      setTotalAmount(total);
    }
  };

  const handleFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${
        edit ? "update this" : "create new"
      } Purchase Order?`,
      position: true,
    });

    if (confirmed) {
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
          await editPOMutation.mutateAsync({
            _id: data._id,
            values: submitData,
          });
        } else {
          await addPOMutation.mutateAsync(submitData);
        }

        actionRef.current?.reload();
        return true;
      } catch (error) {
        return false;
      }
    }
    return true;
  };

  return (
    <ModalForm
      title={
        <Space>
          <FileTextOutlined />
          {edit ? "Edit Purchase Order" : "Create Purchase Order"}
        </Space>
      }
      form={form}
      formRef={formRef}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        edit ? (
          <Flex gap={10} aria-label={`Edit purchase order ${data.po_number}`}>
            <EditOutlined />

            <Text icon onClick={() => form.setFieldsValue(data)}>
              Edit
            </Text>
          </Flex>
        ) : (
          <Button type="primary" key="button" icon={<ShoppingCartOutlined />}>
            New Purchase Order
          </Button>
        )
      }
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "800px",
        bodyStyle: { padding: "24px" },
      }}
      submitter={false}
    >
      <StepsForm
        formProps={{
          validateMessages: {
            required: "${label} is required",
          },
          preserve: true, // This preserves form values across steps
        }}
        onFinish={handleFinish}
        submitter={{
            submitButtonProps:{
                loading: addPOMutation.isLoading || editPOMutation.isLoading
            }
        }}
        stepsFormRender={(dom, submitter) => {
          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  maxHeight: "600px",
                  overflowX: "hidden",
                }}
              >
                {dom}
              </div>
              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  columnGap: 10,
                  justifyContent: "flex-end",
                }}
              >
                {submitter}
              </div>
            </div>
          );
        }}
        formRef={formRef}
      >
        <StepsForm.StepForm
          name="basic"
          title="Basic Info"
          onFinish={async (values) => {
            // Store step 1 values
            setStepFormValues((prev: any) => ({ ...prev, ...values }));
            return true;
          }}
          initialValues={
            edit
              ? {
                  supplier_id: {
                    value: data?.supplier_id?._id,
                    label: data?.supplier_id?.name,
                  },
                  expected_delivery_date: data?.expected_delivery_date,
                  notes: data?.notes,
                }
              : {}
          }
        >
          <Alert
            message="Purchase Order Information"
            description="Enter the basic details for your purchase order. Select the supplier and expected delivery date."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
            closable
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <ProFormSelect
                name="supplier_id"
                width="md"
                aria-label="Select supplier"
                showSearch
                label="Supplier"
                placeholder="Select supplier"
                rules={[{ required: true }]}
                request={SupplierRequest}
                fieldProps={{
                  notFoundContent: suppliers?.length
                    ? "No suppliers found"
                    : "Loading suppliers...",
                }}
              />
            </Col>

            <Col xs={24} md={12}>
              <ProFormDatePicker
                name="expected_delivery_date"
                width="md"
                aria-label="Select expected delivery date"
                label="Expected Delivery Date"
                placeholder="Select expected delivery date"
                fieldProps={{
                  disabledDate: (current: number) =>
                    current && current.valueOf() < Date.now() - 86400000,
                }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <ProFormTextArea
                name="notes"
                label="Notes"
                aria-label="Add any notes or special instructions for this purchase order"
                placeholder="Add any notes or special instructions for this purchase order"
                fieldProps={{ rows: 3 }}
              />
            </Col>
          </Row>
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="po_items"
          title="Order Items"
          onFinish={async (values) => {
            if (!values.po_items || values.po_items.length === 0) {
              message.error(
                "Please add at least one item to the purchase order"
              );
              return false;
            }

            const invalidItems = values.po_items.filter(
              (item: any) =>
                !item.inventory_id ||
                !item.unit_id ||
                !item.quantity_ordered ||
                !item.unit_price
            );

            if (invalidItems.length > 0) {
              message.error("Please fill in all required fields for each item");
              return false;
            }

            // Store step 2 values
            setStepFormValues((prev: any) => ({ ...prev, ...values }));
            return true;
          }}
          initialValues={
            edit
              ? {
                  po_items: data?.po_items?.map((item: any) => ({
                    inventory_id: {
                      value: item.inventory_id?._id,
                      label: item.inventory_id?.name,
                    },
                    unit_id: {
                      value: item.unit_id?._id,
                      label: item.unit_id?.name,
                    },
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
            description="Add the items you want to order. Specify quantities, unit prices, and any item-specific notes."
            type="info"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />

          <Form.List name="po_items" initialValue={[{}]}>
            {(fields: any[], { add, remove }: any) => (
              <>
                {fields.map(
                  (
                    field: { key: string | null | undefined; name: any },
                    index: number
                  ) => (
                    <ProCard
                      key={field.key}
                      size="small"
                      title={`Item ${index + 1}`}
                      extra={
                        fields.length > 1 && (
                          <Button
                            type="link"
                            danger
                            onClick={() => remove(field.name)}
                            icon={<MinusCircleOutlined />}
                          >
                            Remove
                          </Button>
                        )
                      }
                      style={{ marginBottom: 16 }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <ProFormSelect
                            name={[field.name, "inventory_id"]}
                            showSearch
                            aria-label="Select inventory item"
                            label="Inventory Item"
                            placeholder="Select inventory item"
                            rules={[{ required: true }]}
                            request={InventoryRequest}
                            fieldProps={{
                              notFoundContent: inventory?.length
                                ? "No items found"
                                : "Loading inventory...",
                            }}
                          />
                        </Col>

                        <Col xs={24} md={6}>
                          <ProFormSelect
                            name={[field.name, "unit_id"]}
                            showSearch
                            aria-label="Select unit"
                            label="Unit"
                            placeholder="Select unit"
                            rules={[{ required: true }]}
                            request={UnitsRequest}
                            fieldProps={{
                              notFoundContent: units?.length
                                ? "No units found"
                                : "Loading units...",
                            }}
                          />
                        </Col>

                        <Col xs={24} md={5}>
                          <ProFormDigit
                            name={[field.name, "quantity_ordered"]}
                            aria-label="Enter quantity"
                            label="Quantity"
                            placeholder="Enter quantity"
                            min={1}
                            precision={0}
                            rules={[{ required: true }]}
                          />
                        </Col>

                        <Col xs={24} md={5}>
                          <ProFormDigit
                            name={[field.name, "unit_price"]}
                            aria-label="Enter unit price"
                            label="Unit Price (Ksh)"
                            placeholder="Enter unit price"
                            min={0}
                            precision={2}
                            rules={[{ required: true }]}
                            fieldProps={{
                              addonBefore: "Ksh",
                            }}
                          />
                        </Col>
                      </Row>

                      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                        <Col xs={24}>
                          <ProFormTextArea
                            name={[field.name, "notes"]}
                            aria-label="Add any specific notes for this item (optional)"
                            label="Item Notes"
                            placeholder="Add any specific notes for this item (optional)"
                            fieldProps={{ rows: 2 }}
                          />
                        </Col>
                      </Row>
                    </ProCard>
                  )
                )}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                  style={{
                    marginTop: 24,
                    marginBottom: 24,
                    padding: "8px 15px",
                    height: "auto",
                  }}
                >
                  Add Another Item
                </Button>
              </>
            )}
          </Form.List>

          {totalAmount > 0 && (
            <ProCard
              style={{
                marginTop: 24,
                backgroundColor: "#f6ffed",
                border: "1px solid #b7eb8f",
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <ShoppingCartOutlined style={{ color: "#52c41a" }} />
                    <Text strong>Order Summary</Text>
                  </Space>
                </Col>
                <Col>
                  <Title level={4} style={{ margin: 0, color: "#52c41a" }}>
                    Total: Ksh. {totalAmount.toLocaleString()}
                  </Title>
                </Col>
              </Row>
            </ProCard>
          )}
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="confirm"
          title="Confirmation"
          stepProps={{
            description: "Review and confirm",
          }}
          onFinish={async () => true}
        >
          <Alert
            message="Review Purchase Order"
            description="Please review all the details before creating the purchase order. You can go back to make changes if needed."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <ProForm.Item
            noStyle
            shouldUpdate={(prevValues: any, currentValues: any) => {
              // Force update when any value changes
              return (
                JSON.stringify(prevValues) !== JSON.stringify(currentValues)
              );
            }}
          >
            {() => {
              // Get all form values including from previous steps
              const currentFormValues = form.getFieldsValue(true);

              // Merge with stored step values to ensure we have everything
              const values = {
                ...stepFormValues,
                ...currentFormValues,
              };

              const supplierValue = values?.supplier_id;
              const dateValue = values?.expected_delivery_date;
              const notesValue = values?.notes;
              const itemsValue = values?.po_items;

              return (
                <>
                  <ProCard
                    title="Purchase Order Summary"
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Text strong>Supplier: </Text>
                        <Text>
                          {(() => {
                            if (
                              typeof supplierValue === "object" &&
                              supplierValue?.label
                            ) {
                              return supplierValue.label;
                            }
                            if (
                              typeof supplierValue === "string" &&
                              suppliers
                            ) {
                              const supplier = suppliers.find(
                                (s: any) => s._id === supplierValue
                              );
                              return supplier?.name || "Unknown Supplier";
                            }
                            return "Not selected";
                          })()}
                        </Text>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong>Expected Delivery: </Text>
                        <Text>
                          {(() => {
                            if (dateValue) {
                              try {
                                if (dateValue && dateValue._isAMomentObject) {
                                  return dateValue.format("YYYY-MM-DD");
                                }
                                if (dateValue && dateValue.$d) {
                                  return new Date(
                                    dateValue.$d
                                  ).toLocaleDateString();
                                }
                                if (typeof dateValue === "string") {
                                  return new Date(
                                    dateValue
                                  ).toLocaleDateString();
                                }
                                if (dateValue.format) {
                                  return dateValue.format("YYYY-MM-DD");
                                }
                                return new Date(dateValue).toLocaleDateString();
                              } catch {
                                return "Invalid date";
                              }
                            }
                            return "Not set";
                          })()}
                        </Text>
                      </Col>
                      <Col xs={24}>
                        <Text strong>Notes: </Text>
                        <Text>{notesValue || "No notes"}</Text>
                      </Col>
                    </Row>
                  </ProCard>

                  <ProCard
                    title="Order Items"
                    style={{ marginBottom: 16 }}
                    bodyStyle={{ padding: 0 }}
                  >
                    {!itemsValue?.length ? (
                      <div style={{ padding: 16 }}>
                        <Text type="secondary">No items added</Text>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {itemsValue
                          .filter(
                            (item: any) =>
                              item &&
                              (item.inventory_id ||
                                item.unit_id ||
                                item.quantity_ordered ||
                                item.unit_price)
                          )
                          .map((item: any, index: number) => {
                            const quantity = Number(item.quantity_ordered) || 0;
                            const unitPrice = Number(item.unit_price) || 0;
                            const totalPrice = quantity * unitPrice;

                            return (
                              <ProCard key={index} size="small" bordered>
                                <Row gutter={[16, 8]} align="middle">
                                  {/* Item Name */}
                                  <Col xs={24} md={8}>
                                    <Text strong>
                                      {(() => {
                                        const inventoryValue =
                                          item.inventory_id;
                                        if (
                                          typeof inventoryValue === "object" &&
                                          inventoryValue?.label
                                        ) {
                                          return inventoryValue.label.split(
                                            " (Last:"
                                          )[0];
                                        }
                                        if (
                                          typeof inventoryValue === "string" &&
                                          inventory
                                        ) {
                                          const inventoryItem = inventory.find(
                                            (i: any) => i._id === inventoryValue
                                          );
                                          return (
                                            inventoryItem?.name ||
                                            `Item ${index + 1}`
                                          );
                                        }
                                        return `Item ${index + 1}`;
                                      })()}
                                    </Text>
                                  </Col>

                                  {/* Quantity and Unit */}
                                  <Col xs={12} md={4}>
                                    <Space>
                                      <Tag color="blue">
                                        {quantity}{" "}
                                        {(() => {
                                          const unitValue = item.unit_id;
                                          if (
                                            typeof unitValue === "object" &&
                                            unitValue?.label
                                          ) {
                                            return unitValue.label;
                                          }
                                          if (
                                            typeof unitValue === "string" &&
                                            units
                                          ) {
                                            const unit = units.find(
                                              (u: any) => u._id === unitValue
                                            );
                                            return unit?.name || "units";
                                          }
                                          return "units";
                                        })()}
                                      </Tag>
                                    </Space>
                                  </Col>

                                  {/* Unit Price */}
                                  <Col xs={12} md={4}>
                                    <Text>
                                      @ Ksh. {unitPrice.toLocaleString()}
                                    </Text>
                                  </Col>

                                  {/* Subtotal */}
                                  <Col
                                    xs={24}
                                    md={8}
                                    style={{ textAlign: "right" }}
                                  >
                                    <Space size="middle">
                                      <Text type="secondary">Subtotal:</Text>
                                      <Tag color="green" style={{ margin: 0 }}>
                                        Ksh. {totalPrice.toLocaleString()}
                                      </Tag>
                                    </Space>
                                  </Col>
                                </Row>

                                {/* Notes */}
                                {item.notes && (
                                  <Row style={{ marginTop: 8 }}>
                                    <Col>
                                      <Text type="secondary" italic>
                                        Note: {item.notes}
                                      </Text>
                                    </Col>
                                  </Row>
                                )}
                              </ProCard>
                            );
                          })}
                      </div>
                    )}
                  </ProCard>

                  {totalAmount > 0 && (
                    <ProCard
                      style={{
                        textAlign: "center",
                        backgroundColor: "#e6f7ff",
                        border: "1px solid #91d5ff",
                      }}
                    >
                      <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
                        Grand Total: Ksh. {totalAmount.toLocaleString()}
                      </Title>
                    </ProCard>
                  )}
                </>
              );
            }}
          </ProForm.Item>
        </StepsForm.StepForm>
      </StepsForm>
    </ModalForm>
  );
};

export default AddEditPurchaseOrderModal;
