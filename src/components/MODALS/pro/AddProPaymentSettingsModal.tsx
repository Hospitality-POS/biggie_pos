import React, { useEffect, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { DollarOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewPaymentMethod, updateMethod } from "@services/paymentMethod";

interface AddProPaymentMethodSettingsModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddProPaymentMethodSettingsModal: React.FC<
  AddProPaymentMethodSettingsModalProps
> = ({ actionRef, edit, data }) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

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

  return (
      <ModalForm
        width={500}
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <DollarOutlined />
            Add New Method
          </Space>
        }
        initialValues={edit ? { ...data } : {}}
        trigger={
          edit ? (
            <Button
              key="button"
              size="small"
              icon={
                <EditOutlined
                  style={{ color: "#6c1c2c" }}
                  onClick={() => form.setFieldsValue(data)}
                />
              }
            >Edit</Button>
          ) : (
            <Button type="primary" key="button" icon={<DollarOutlined />}>
              New Method
            </Button>
          )
        }
        form={form}
        autoFocusFirstInput
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${
              edit ? "update this" : "add new"
            } payment method?`,
            position: true,
          });
          if (confirmed) {
            edit
              ? await updateMethod({ values, _id: data._id })
              : await addNewPaymentMethod(values);
            actionRef.current.reset();
            return true;
          }
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: edit ? "Edit method" : "Add Payment Method",
          },
          submitButtonProps: {
            icon: edit ? <EditOutlined /> : <DollarOutlined />,
          },
          resetButtonProps: {
            style: { display: "none" },
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            hasFeedback
            width="lg"
            name="name"
            label="Payment Method Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter payment method name"
          />
        </ProForm.Group>
      </ModalForm>
  );
};

export default AddProPaymentMethodSettingsModal;
