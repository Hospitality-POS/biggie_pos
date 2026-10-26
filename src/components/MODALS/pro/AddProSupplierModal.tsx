import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Grid, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, SisternodeOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewSupplier, editSupplier } from "@services/supplier";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";

interface AddSupplierDialogProps {
  data?: any;
  edit?: boolean;
  actionRef?: any;
  externalOpen?: boolean;
  onExternalClose?: () => void;
  /** Full-width, touch-sized edit trigger (used by the supplier cards). */
  block?: boolean;
}

const AddProSupplierModal: React.FC<AddSupplierDialogProps> = ({
  data,
  actionRef,
  edit,
  externalOpen,
  onExternalClose,
  block,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const formRef = useRef();
  const [open, setOpen] = useState(false);

  // Sync external open state into internal state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

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
      onExternalClose?.();
    }
  };

  return (
    <ModalForm
      width={isMobile ? "calc(100vw - 24px)" : 750}
      open={open}
      formRef={formRef}
      onOpenChange={handleOpenChange}
      modalProps={{ destroyOnClose: true, centered: true }}
      title={
        <Space>
          <SisternodeOutlined />
          {edit ? "Edit Supplier" : "Add New Supplier"}
        </Space>
      }
      trigger={
        externalOpen !== undefined ? undefined : (
          edit ? (
            <Button
              size={block ? "middle" : "small"}
              block={block}
              key="button"
              icon={<EditOutlined style={{ color: "var(--primary-color)" }} />}
              style={block ? { borderRadius: 8 } : undefined}
              onClick={() => form.setFieldsValue(data)}
            >
              Edit
            </Button>
          ) : (
            <Button type="primary" key="button" icon={<SisternodeOutlined />}>
              New Supplier
            </Button>
          )
        )
      }
      initialValues={edit ? { ...data, phoneNumber: reversePhoneNumber(data?.phone) } : {}}
      onFinish={async (values) => {
        let phoneNumber = null;
        if (values?.phoneNumber && (values.phoneNumber.phone || values.phoneNumber.code)) {
          try {
            phoneNumber = getPhoneNumber(values?.phoneNumber);
          } catch (error) {
            console.error('Phone number parsing error:', error);
            phoneNumber = null;
          }
        }
        const value = { ...values, phone: phoneNumber };
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${edit ? "update this" : "add new"} Supplier?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await editSupplier({ value, _id: data?._id })
            : await addNewSupplier(value);
          actionRef?.current?.reload?.();
          setOpen(false);
          onExternalClose?.();
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
      <ProForm.Group style={isMobile ? { width: "100%" } : undefined}>
        <ProFormText
          width={isMobile ? undefined : "md"}
          formItemProps={isMobile ? { style: { width: "100%" } } : undefined}
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter supplier name"
        />
        <ProFormText
          width={isMobile ? undefined : "md"}
          formItemProps={isMobile ? { style: { width: "100%" } } : undefined}
          name="email"
          label="Email"
          rules={[{ pattern: /^\S+@\S+\.\S+$/, message: "Invalid email format" }]}
          placeholder="Enter supplier email (optional)"
        />
        <PhoneInput
          label="Phone"
          owner="phoneNumber"
          required={false}
          width={isMobile ? "100%" : undefined}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProSupplierModal;