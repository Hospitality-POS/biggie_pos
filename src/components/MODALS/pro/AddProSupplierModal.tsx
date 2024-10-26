import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space, Tag } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import {
  EditOutlined,
  SisternodeOutlined,
} from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewSupplier, editSupplier } from "@services/supplier";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";

interface AddSupplierDialogProps {
  data?: any;
  edit?: boolean;
  actionRef?: any;
}

const AddProSupplierModal: React.FC<AddSupplierDialogProps> = ({
  data,
  actionRef,
  edit,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        phoneNumber: reversePhoneNumber(data?.phone),
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
      width={750}
      open={open}
      formRef={formRef}
      onOpenChange={handleOpenChange}
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      title={
        <Space>
          <SisternodeOutlined />
          {edit ? "Edit Supplier" : "Add New Supplier"}
        </Space>
      }
      trigger={
        edit ? (
          <Space key="button" size="small" style={{ cursor: "pointer" }}>
            <Tag color="success" key={data._id}>
              <EditOutlined onClick={() => form.setFieldsValue(data)} /> Edit
            </Tag>
          </Space>
        ) : (
          <Button type="primary" key="button" icon={<SisternodeOutlined />}>
            New Supplier
          </Button>
        )
      }
      initialValues={edit ? {
        ...data,
        phoneNumber: reversePhoneNumber(data?.phone),
      } : {}}
      onFinish={async (values) => {
        const phoneNumber = getPhoneNumber(values?.phoneNumber);
        const value = { ...values, phone: phoneNumber };
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${
            edit ? "update this" : "add new"
          } Supplier?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await editSupplier({ value, _id: data?._id })
            : await addNewSupplier(value);
          actionRef.current.reload();
          setOpen(false);
          return true;
        }
      }}
      form={form}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Supplier" : "Add Supplier",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter supplier name"
        />

        <ProFormText
          width="md"
          name="email"
          label="Email"
          rules={[
            {
              required: true,
              pattern: /^\S+@\S+\.\S+$/,
              message: "Invalid email format",
            },
          ]}
          placeholder="Enter supplier email"
        />

        <PhoneInput label="Phone" owner="phoneNumber" />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProSupplierModal;
