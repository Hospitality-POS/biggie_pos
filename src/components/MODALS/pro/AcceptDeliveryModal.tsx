import React, { useEffect, useState } from "react";
import {
  ModalForm,
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormSwitch,
  StepsForm,
  ProFormSelect,
} from "@ant-design/pro-components";
import { Button, Form, message, Space, Row, Col } from "antd";
import {
  EditOutlined,
  SwitcherOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllUsersList } from "@services/users";
import { fetchAllInventory } from "@services/inventory";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewDelivery, editDelivery } from "@services/deliveries";

interface AcceptDeliveryModalProps {
  data?: any;
  edit?: boolean;
  actionRef?: any;
}

interface unitType {
  name: string;
  _id: string;
}

const AcceptDeliveryModal: React.FC<AcceptDeliveryModalProps> = ({
  data,
  edit,
  actionRef,
}) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  // Fetch Suppliers using React Query
  const { data: supplier } = useQuery({
    queryKey: ["supplier"],
    queryFn: fetchAllSuppliers,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const SupplierRequest = async () => {
    const data = supplier?.map((e: { name: string; _id: string }) => {
      return { label: e.name, value: e._id };
    });
    return data;
  };

  //  Fetch users using React Query
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsersList,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  // Convert users data to the required format for ProFormSelect
  const UserRequest = async () => {
    if (!users || users.length === 0) {
      return [];
    }

    const data = users.map((user: any) => {
      return {
        label: user.fullname || user.username || user.email || user._id,
        value: user._id
      };
    });
    return data;
  };

  // fetch inventory using React Query
  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchAllInventory,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const InventoryRequest = async () => {
    const data = inventory?.map((e: { name: string; _id: string }) => {
      return { label: e.name, value: e._id };
    });
    return data;
  };

  // fetch units using React Query
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const UnitsRequest = async () => {
    const data = units?.map((unit: unitType) => ({
      label: unit?.name,
      value: unit?._id,
    }));
    return data;
  };

  const handleFinish = async (values) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"
        } Delivery?`,
      position: true,
    });
    if (confirmed) {
      edit
        ? await editDelivery({ values, _id: data?._id })
        : await addNewDelivery(values);
      actionRef.current.reload();
      setOpen(false);
      return true;
    }
  };

  return (
    <ModalForm
      title={
        <Space>
          <SnippetsOutlined />
          {edit ? "Edit Delivery" : "Accept Delivery"}{" "}
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
          <Button type="primary" key="button" icon={<SwitcherOutlined />}>
            New Delivery
          </Button>
        )
      }
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "90%", // Full-width on small screens
        style: {
          maxWidth: "850px", // Cap the width for larger screens
        },
        bodyStyle: {
          overflowY: "auto", // Allow scrolling on smaller screens
          overflowX: "hidden", // Hide horizontal scrollbar on smaller screens
          maxHeight: "80vh", // Avoid the modal becoming too tall
        },
      }}
      submitter={{
        render: (props, dom) => {
          return (
            <Space>
              {props.step > 0 && (
                <Button onClick={() => props.onPre()}>Previous</Button>
              )}
              {props.step < 2 && (
                <Button type="primary" onClick={() => props.onNext()}>
                  Next
                </Button>
              )}
              {props.step === 2 && (
                <Button type="primary" onClick={() => props.submit()}>
                  Submit
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
      >
        <StepsForm.StepForm
          name="basic"
          title="Basic Info"
          initialValues={
            edit
              ? {
                ...data,
                supplier_id: {
                  value: data?.supplier_id?._id,
                  label: data?.supplier_id?.name,
                },
                received_by: {
                  value: data?.received_by?._id,
                  label: data?.received_by?.fullname || data?.received_by?.username,
                },
              }
              : {}
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <ProFormSelect
                name={"supplier_id"}
                width="md"
                showSearch
                label="Select Supplier"
                placeholder="Select supplier"
                rules={[{ required: true }]}
                request={SupplierRequest}
              />
            </Col>
            <Col xs={24} md={12}>
              <ProFormSelect
                name={"received_by"}
                width="md"
                showSearch
                label="Received By"
                placeholder="Select user"
                rules={[{ required: true }]}
                request={UserRequest}
                fieldProps={{
                  notFoundContent: users?.length ? "No matching users" : "Loading users..."
                }}
              />
            </Col>
            <Col xs={24} md={12}>
              <ProFormText
                width="md"
                name="delivered_by"
                label="Delivered By"
                placeholder="Enter Deliverer Name"
                rules={[{ required: true }]}
              />
            </Col>
            <Col xs={24} md={12}>
              <ProFormSwitch
                name="delivery_status"
                label="Delivery Status"
                initialValue={false}
              />
            </Col>
          </Row>
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="delivery_items"
          title="Delivery Items"
          onFinish={async (values) => {
            if (!values.delivery_items || values.delivery_items.length === 0) {
              return false;
            }
            return true;
          }}
          initialValues={
            edit
              ? {
                delivery_items: data?.delivery_items?.map((item: any) => ({
                  inventory_id: {
                    value: item?.inventory_id?._id,
                    label: item?.inventory_id?.name,
                  },
                  unit_id: {
                    value: item?.unit_id?._id,
                    label: item?.unit_id?.name,
                  },
                  quantity: item?.quantity,
                })),
              }
              : {}
          }
        >
          <Form.List name="delivery_items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Row
                    key={field.key}
                    gutter={[16, 16]}
                    style={{ alignItems: "center" }}
                  >
                    <Col xs={24} md={8}>
                      <ProFormSelect
                        name={[field.name, "inventory_id"]}
                        width="sm"
                        showSearch
                        label="Inventory"
                        placeholder="Select inventory"
                        rules={[{ required: true }]}
                        request={InventoryRequest}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <ProFormSelect
                        name={[field.name, "unit_id"]}
                        width="md"
                        showSearch
                        label="Unit"
                        placeholder="Select unit"
                        rules={[{ required: true }]}
                        request={UnitsRequest}
                      />
                    </Col>
                    <Col xs={24} md={4}>
                      <ProFormDigit
                        width="sm"
                        name={[field.name, "quantity"]}
                        label="Quantity"
                        placeholder="Enter quantity"
                        min={1}
                        rules={[{ required: true }]}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      {fields.length > 1 && (
                        <Button
                          type="primary"
                          onClick={() => remove(field.name)}
                          icon={<MinusCircleOutlined />}
                        >
                          remove
                        </Button>
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                  >
                    Add Delivery Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </StepsForm.StepForm>

        <StepsForm.StepForm name="confirm" title="Confirmation">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <ProFormText
                name="confirmation_notes"
                label="Confirmation Notes"
              />
            </Col>
          </Row>
        </StepsForm.StepForm>
      </StepsForm>
    </ModalForm>
  );
};

export default AcceptDeliveryModal;