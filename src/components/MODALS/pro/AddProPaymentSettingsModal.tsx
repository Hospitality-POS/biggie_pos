import React, { useEffect, useState } from "react";
import { Button, Space, Form } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { DollarOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewPaymentMethod, updateMethod } from "@services/paymentMethod";

interface AddProPaymentMethodSettingsModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const AddProPaymentMethodSettingsModal: React.FC<AddProPaymentMethodSettingsModalProps> = ({
  actionRef,
  edit,
  data,
  externalOpen,
  onExternalClose,
}) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  // Sync external open state into internal state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({ ...data });
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
      width={600}
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <Space>
          <DollarOutlined />
          {edit ? "Edit Payment Method" : "Add New Payment Method"}
        </Space>
      }
      initialValues={edit ? { ...data } : {}}
      trigger={
        externalOpen !== undefined ? undefined : (
          edit ? (
            <Button
              key="button"
              size="small"
              icon={<EditOutlined style={{ color: "#6c1c2c" }} onClick={() => form.setFieldsValue(data)} />}
            >
              Edit
            </Button>
          ) : (
            <Button type="primary" key="button" icon={<DollarOutlined />}>
              New Method
            </Button>
          )
        )
      }
      form={form}
      autoFocusFirstInput
      modalProps={{ destroyOnClose: true, centered: true }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${edit ? "update this" : "add new"} payment method?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await updateMethod({ values, _id: data._id })
            : await addNewPaymentMethod(values);
          actionRef?.current?.reset?.();
          setOpen(false);
          onExternalClose?.();
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Update Method" : "Add Payment Method",
        },
        submitButtonProps: { icon: edit ? <EditOutlined /> : <DollarOutlined /> },
        resetButtonProps: { style: { display: "none" } },
      }}
    >
      <ProForm.Group>
        <ProFormText
          hasFeedback
          width="lg"
          name="name"
          label="Payment Method Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="e.g., M-Pesa, Cash, Bank Transfer"
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText
          width="lg"
          name="description"
          label="Description (Optional)"
          placeholder="Additional notes about this payment method"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProPaymentMethodSettingsModal;