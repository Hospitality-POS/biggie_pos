import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, ShopOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import {
  ProFormSelect,
  ProFormMoney,
  ProFormTextArea,
} from "@ant-design/pro-components";

import { useQuery } from "@tanstack/react-query";
import { createShop, updateShop } from "@services/shops";

interface ShopModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddEditShopModal: React.FC<ShopModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        manager: {
          value: data?.manager?._id,
          label: data?.manager?.name,
        },
      });
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <Space>
          <ShopOutlined />
          {edit ? "Edit Shop" : "Add New Shop"}
        </Space>
      }
      initialValues={
        edit
          ? {
            ...data,
            manager: {
              value: data?.manager?._id,
              label: data?.manager?.name,
            },
          }
          : {}
      }
      trigger={
        edit ? (
          <Button
            key="button"
            size="small"
            icon={
              <EditOutlined
                style={{ color: primaryColor }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<ShopOutlined />}>
            New Shop
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "500px",
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${edit ? "update this" : "add new"
            } shop?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await updateShop({ ...values, _id: data?._id })
            : await createShop({ ...values });
          actionRef.current.reset();
          return true;
        }
      }}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Shop" : "Add Shop",
        },
      }}
    >
      <ProFormText
        width="lg"
        name="name"
        label="Shop Name"
        rules={[{ required: true, message: "Shop name is required" }]}
        placeholder="Enter shop name"
      />
      <ProFormTextArea
        width="lg"
        name="location"
        label="Location"
        rules={[{ required: true, message: "Location is required" }]}
        placeholder="Enter complete shop location"
      />
    </ModalForm>
  );
};

export default AddEditShopModal;
