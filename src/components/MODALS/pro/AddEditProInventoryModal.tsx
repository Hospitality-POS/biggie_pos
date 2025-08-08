import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ModalForm,
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormDatePicker,
  ProFormTextArea,
  StepsForm,
} from '@ant-design/pro-components';
import { Button, Form, message, Space, Row, Col, Card, Typography, Alert, Tag } from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { addNewPurchaseOrder, editPurchaseOrder } from '@services/purchaseOrder';
import { fetchAllSuppliers } from '@services/supplier';
import { fetchAllUsersList } from '@services/users';
import { fetchAllInventory } from '@services/inventory';
import { fetchAllUnits } from '@services/products';
import { useMutation, useQuery } from '@tanstack/react-query';
import ShowConfirm from '@utils/ConfirmUtil';
import type { ActionType } from '@ant-design/pro-components';

const { Title, Text } = Typography;

interface AddEditPurchaseOrderModalProps {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  data?: any;
  edit?: boolean;
}

const AddEditPurchaseOrderModal: React.FC<AddEditPurchaseOrderModalProps> = ({
  actionRef,
  data,
  edit = false
}) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [totalAmount, setTotalAmount] = useState(0);

  const [stepData, setStepData] = useState<{ [key: number]: any }>({
    0: {},
    1: {},
    2: {}
  });

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

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
    const data = inventory?.map((item: { name: string; _id: string; supplier_price?: number }) => ({
      label: `${item.name}${item.supplier_price ? ` (Last: Ksh.${item.supplier_price})` : ''}`,
      value: item._id,
    }));
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

  const addPOMutation = useMutation(addNewPurchaseOrder, {
    onSuccess: () => {
      message.success('Purchase order created successfully');
      setOpen(false);
      form.resetFields();
      setTotalAmount(0);
      setStepData({ 0: {}, 1: {}, 2: {} });
      actionRef.current?.reload();
    },
    onError: () => {
      message.error('Failed to create purchase order');
    },
  });

  const editPOMutation = useMutation(editPurchaseOrder, {
    onSuccess: () => {
      message.success('Purchase order updated successfully');
      setOpen(false);
      form.resetFields();
      setTotalAmount(0);
      setStepData({ 0: {}, 1: {}, 2: {} });
      actionRef.current?.reload();
    },
    onError: () => {
      message.error('Failed to update purchase order');
    },
  });

  const saveCurrentStepData = useCallback((step: number) => {
    const currentValues = form.getFieldsValue();
    setStepData(prev => {
      const updatedStepData = { ...prev };

      switch (step) {
        case 0:
          updatedStepData[0] = {
            supplier_id: currentValues.supplier_id,
            expected_delivery_date: currentValues.expected_delivery_date,
            notes: currentValues.notes,
          };
          break;
        case 1:
          updatedStepData[1] = {
            po_items: currentValues.po_items,
          };
          break;
      }

      return updatedStepData;
    });
  }, [form]);

  const getAllFormData = useCallback(() => {
    const allData = {
      ...stepData[0],
      ...stepData[1],
      ...stepData[2],
    };

    Object.keys(allData).forEach(key => {
      if (allData[key] === undefined) {
        delete allData[key];
      }
    });

    return allData;
  }, [stepData]);

  const calculateTotal = (values: any) => {
    if (values.po_items && Array.isArray(values.po_items)) {
      const total = values.po_items.reduce((sum: number, item: any) => {
        const quantity = item.quantity_ordered || 0;
        const price = item.unit_price || 0;
        return sum + (quantity * price);
      }, 0);
      setTotalAmount(total);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      setTotalAmount(0);
      setStepData({ 0: {}, 1: {}, 2: {} });
    }
  };

  useEffect(() => {
    if (open && data && edit) {
      const initialData = {
        ...data,
        supplier_id: {
          value: data.supplier_id?._id,
          label: data.supplier_id?.name,
        },
        expected_delivery_date: data.expected_delivery_date,
        notes: data.notes,
        po_items: data.po_items?.map((item: any) => ({
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
      };

      form.setFieldsValue(initialData);

      setStepData({
        0: {
          supplier_id: initialData.supplier_id,
          expected_delivery_date: initialData.expected_delivery_date,
          notes: initialData.notes,
        },
        1: {
          po_items: initialData.po_items,
        },
        2: {}
      });

      calculateTotal(initialData);
    }
  }, [open, data, edit, form]);

  const handleFinish = async (values: any) => {
    const allStepData = getAllFormData();
    const finalValues = { ...allStepData, ...values };

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "create new"} Purchase Order?`,
      position: true,
    });

    if (confirmed) {
      try {
        const processedItems = finalValues.po_items?.map((item: any) => ({
          inventory_id: item.inventory_id?.value || item.inventory_id,
          unit_id: item.unit_id?.value || item.unit_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          total_price: (item.quantity_ordered || 0) * (item.unit_price || 0),
          notes: item.notes,
        })) || [];

        const submitData = {
          supplier_id: finalValues.supplier_id?.value || finalValues.supplier_id,
          expected_delivery_date: finalValues.expected_delivery_date,
          notes: finalValues.notes,
          po_items: processedItems,
          total_amount: totalAmount,
          created_by: JSON.parse(localStorage.getItem('user') || '{}')._id,
          shop_id: JSON.parse(localStorage.getItem('tenant') || '{}').shop_id,
        };

        if (edit) {
          await editPOMutation.mutateAsync({ _id: data._id, values: submitData });
        } else {
          await addPOMutation.mutateAsync(submitData);
        }

        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
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
      trigger={
        edit ? (
          <Button
            key="button"
            icon={<EditOutlined style={{ color: primaryColor }} />}
            onClick={() => form.setFieldsValue(data)}
            size="small"
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<ShoppingCartOutlined />}>
            New Purchase Order
          </Button>
        )
      }
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "90%",
        style: {
          maxWidth: "950px",
        },
        bodyStyle: {
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "80vh",
        },
      }}
      submitter={{
        render: (props, dom) => {
          return (
            <Space style={{ padding: '8px 0' }}>
              {props.step > 0 && (
                <Button
                  onClick={() => {
                    saveCurrentStepData(props.step);
                    props.onPre();
                  }}
                  style={{ padding: '4px 15px' }}
                >
                  Previous
                </Button>
              )}
              {props.step < 2 && (
                <Button
                  type="primary"
                  onClick={() => {
                    saveCurrentStepData(props.step);
                    props.onNext();
                  }}
                  style={{ padding: '4px 15px' }}
                >
                  Next
                </Button>
              )}
              {props.step === 2 && (
                <Button
                  type="primary"
                  onClick={() => props.submit()}
                  loading={addPOMutation.isLoading || editPOMutation.isLoading}
                  style={{ padding: '4px 15px' }}
                >
                  {edit ? "Update" : "Create"} Purchase Order
                </Button>
              )}
            </Space>
          );
        },
      }}
    >
      <StepsForm
        formProps={{
          validateMessages: {
            required: "${label} is required",
          },
        }}
        onFinish={handleFinish}
        onValuesChange={(_, allValues) => {
          calculateTotal(allValues);
          const currentStep = document.querySelector('.ant-steps-item-active')?.getAttribute('data-index');
          if (currentStep !== null && currentStep !== undefined) {
            saveCurrentStepData(parseInt(currentStep));
          }
        }}
      >
        <StepsForm.StepForm
          name="basic"
          title="Basic Info"
          onFinish={async () => {
            saveCurrentStepData(0);
            return true;
          }}
        >
          <Alert
            message="Purchase Order Information"
            description="Enter the basic details for your purchase order. Select the supplier and expected delivery date."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <ProFormSelect
                name="supplier_id"
                width="md"
                showSearch
                label="Supplier"
                placeholder="Select supplier"
                rules={[{ required: true }]}
                request={SupplierRequest}
                fieldProps={{
                  notFoundContent: suppliers?.length ? "No suppliers found" : "Loading suppliers..."
                }}
              />
            </Col>

            <Col xs={24} md={12}>
              <ProFormDatePicker
                name="expected_delivery_date"
                width="md"
                label="Expected Delivery Date"
                placeholder="Select expected delivery date"
                fieldProps={{
                  style: { width: '100%' },
                  disabledDate: (current) => current && current.valueOf() < Date.now() - 86400000,
                }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <ProFormTextArea
                name="notes"
                label="Notes"
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
            saveCurrentStepData(1);

            if (!values.po_items || values.po_items.length === 0) {
              message.error('Please add at least one item to the purchase order');
              return false;
            }

            const invalidItems = values.po_items.filter((item: any) =>
              !item.inventory_id || !item.unit_id || !item.quantity_ordered || !item.unit_price
            );

            if (invalidItems.length > 0) {
              message.error('Please fill in all required fields for each item');
              return false;
            }

            return true;
          }}
        >
          <Alert
            message="Add Items to Purchase Order"
            description="Add the items you want to order. Specify quantities, unit prices, and any item-specific notes."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.List name="po_items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Card
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
                          label="Inventory Item"
                          placeholder="Select inventory item"
                          rules={[{ required: true }]}
                          request={InventoryRequest}
                          fieldProps={{
                            notFoundContent: inventory?.length ? "No items found" : "Loading inventory..."
                          }}
                        />
                      </Col>

                      <Col xs={24} md={6}>
                        <ProFormSelect
                          name={[field.name, "unit_id"]}
                          showSearch
                          label="Unit"
                          placeholder="Select unit"
                          rules={[{ required: true }]}
                          request={UnitsRequest}
                          fieldProps={{
                            notFoundContent: units?.length ? "No units found" : "Loading units..."
                          }}
                        />
                      </Col>

                      <Col xs={24} md={5}>
                        <ProFormDigit
                          name={[field.name, "quantity_ordered"]}
                          label="Quantity"
                          placeholder="Enter quantity"
                          min={1}
                          precision={0}
                          rules={[{ required: true }]}
                          fieldProps={{
                            style: { width: '100%' }
                          }}
                        />
                      </Col>

                      <Col xs={24} md={5}>
                        <ProFormDigit
                          name={[field.name, "unit_price"]}
                          label="Unit Price (Ksh)"
                          placeholder="Enter unit price"
                          min={0}
                          precision={2}
                          rules={[{ required: true }]}
                          fieldProps={{
                            style: { width: '100%' },
                            addonBefore: "Ksh",
                          }}
                        />
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                      <Col xs={24}>
                        <ProFormTextArea
                          name={[field.name, "notes"]}
                          label="Item Notes"
                          placeholder="Add any specific notes for this item (optional)"
                          fieldProps={{ rows: 2 }}
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                  style={{
                    marginTop: 24,
                    marginBottom: 24,
                    padding: '8px 15px',
                    height: 'auto'
                  }}
                >
                  Add Another Item
                </Button>
              </>
            )}
          </Form.List>

          {totalAmount > 0 && (
            <Card
              style={{
                marginTop: 24,
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f'
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <ShoppingCartOutlined style={{ color: '#52c41a' }} />
                    <Text strong>Order Summary</Text>
                  </Space>
                </Col>
                <Col>
                  <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                    Total: Ksh. {totalAmount.toLocaleString()}
                  </Title>
                </Col>
              </Row>
            </Card>
          )}
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="confirm"
          title="Confirmation"
        >
          <Alert
            message="Review Purchase Order"
            description="Please review all the details before creating the purchase order. You can go back to make changes if needed."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Card title="Purchase Order Summary" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Supplier: </Text>
                <Text>
                  {(() => {
                    const allData = getAllFormData();
                    const supplierValue = allData.supplier_id;

                    if (typeof supplierValue === 'object' && supplierValue?.label) {
                      return supplierValue.label;
                    }
                    if (typeof supplierValue === 'string' && suppliers) {
                      const supplier = suppliers.find((s: any) => s._id === supplierValue);
                      return supplier?.name || 'Unknown Supplier';
                    }
                    return 'Not selected';
                  })()}
                </Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Expected Delivery: </Text>
                <Text>
                  {(() => {
                    const allData = getAllFormData();
                    const dateValue = allData.expected_delivery_date;

                    if (dateValue) {
                      try {
                        if (dateValue && dateValue._isAMomentObject) {
                          return dateValue.format('YYYY-MM-DD');
                        }
                        if (dateValue && dateValue.$d) {
                          return new Date(dateValue.$d).toLocaleDateString();
                        }
                        if (typeof dateValue === 'string') {
                          return new Date(dateValue).toLocaleDateString();
                        }
                        if (dateValue.format) {
                          return dateValue.format('YYYY-MM-DD');
                        }
                        return new Date(dateValue).toLocaleDateString();
                      } catch {
                        return 'Invalid date';
                      }
                    }
                    return 'Not set';
                  })()}
                </Text>
              </Col>
              <Col xs={24}>
                <Text strong>Notes: </Text>
                <Text>{getAllFormData().notes || 'No notes'}</Text>
              </Col>
            </Row>
          </Card>

          <Card title="Order Items" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(() => {
                const allData = getAllFormData();
                const items = allData.po_items;

                if (!items || !Array.isArray(items) || items.length === 0) {
                  return <Text type="secondary">No items added</Text>;
                }

                const validItems = items.filter((item: any) =>
                  item && (item.inventory_id || item.unit_id || item.quantity_ordered || item.unit_price)
                );

                if (validItems.length === 0) {
                  return <Text type="secondary">No valid items added</Text>;
                }

                return validItems.map((item: any, index: number) => {
                  const quantity = item.quantity_ordered || 0;
                  const unitPrice = item.unit_price || 0;
                  const totalPrice = quantity * unitPrice;

                  return (
                    <Card key={index} size="small" style={{ backgroundColor: '#fafafa' }}>
                      <Row gutter={[16, 8]} align="middle">
                        <Col xs={24} md={8}>
                          <Text strong>
                            {(() => {
                              const inventoryValue = item.inventory_id;
                              if (typeof inventoryValue === 'object' && inventoryValue?.label) {
                                return inventoryValue.label;
                              }
                              if (typeof inventoryValue === 'string' && inventory) {
                                const inventoryItem = inventory.find((i: any) => i._id === inventoryValue);
                                return inventoryItem?.name || `Item ${index + 1}`;
                              }
                              return `Item ${index + 1}`;
                            })()}
                          </Text>
                        </Col>
                        <Col xs={12} md={4}>
                          <Tag color="blue">
                            {quantity} {(() => {
                              const unitValue = item.unit_id;
                              if (typeof unitValue === 'object' && unitValue?.label) {
                                return unitValue.label;
                              }
                              if (typeof unitValue === 'string' && units) {
                                const unit = units.find((u: any) => u._id === unitValue);
                                return unit?.name || 'units';
                              }
                              return 'units';
                            })()}
                          </Tag>
                        </Col>
                        <Col xs={12} md={4}>
                          <Text>Ksh. {unitPrice.toLocaleString()}</Text>
                        </Col>
                        <Col xs={24} md={4}>
                          <Text strong>
                            Ksh. {totalPrice.toLocaleString()}
                          </Text>
                        </Col>
                        <Col xs={24} md={4}>
                          <Tag color="green">
                            Total: Ksh. {totalPrice.toLocaleString()}
                          </Tag>
                        </Col>
                      </Row>
                      {item.notes && (
                        <Row style={{ marginTop: 8 }}>
                          <Col xs={24}>
                            <Text type="secondary" italic>
                              Note: {item.notes}
                            </Text>
                          </Col>
                        </Row>
                      )}
                    </Card>
                  );
                });
              })()}
            </Space>
          </Card>

          {totalAmount > 0 && (
            <Card style={{ textAlign: 'center', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                Grand Total: Ksh. {totalAmount.toLocaleString()}
              </Title>
            </Card>
          )}
        </StepsForm.StepForm>
      </StepsForm>
    </ModalForm>
  );
};

export default AddEditPurchaseOrderModal;