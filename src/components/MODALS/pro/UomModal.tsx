import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ModalForm, ProFormText } from "@ant-design/pro-form";
import { createUom, updateUom } from "@services/uom";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form } from "antd";
import React, { useEffect } from "react";

interface UomModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
  // External open control
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const UomModal: React.FC<UomModalProps> = ({
  actionRef,
  edit,
  data,
  externalOpen,
  onExternalClose,
}) => {
  const [form] = Form.useForm();
  const [open, setOpen] = React.useState(false);

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
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

  const HandleOnFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"} UOM?`,
      position: true,
    });
    if (confirmed) {
      try {
        edit ? await updateUom(values) : await createUom(values);
        setOpen(false);
        actionRef?.current?.reset?.();
        onExternalClose?.();
        return true;
      } catch (error) {
        console.error("Failed to save UOM:", error);
        return false;
      }
    }
  };

  return (
    <ModalForm
      title={<span>{edit ? "Edit UOM" : "Add New UOM"}</span>}
      initialValues={edit ? data : {}}
      modalProps={{ destroyOnClose: true, centered: true }}
      trigger={
        // No trigger when controlled externally
        externalOpen !== undefined ? undefined : edit ? (
          <Button key="button" icon={<EditOutlined style={{ color: "#6c1c2c" }} />} size="small"
            onClick={() => form.setFieldsValue(data)}>
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<PlusOutlined />}>New UOM</Button>
        )
      }
      open={open}
      onOpenChange={handleOpenChange}
      onFinish={HandleOnFinish}
      width={550}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Update UOM" : "Add UOM",
        },
        resetButtonProps: { style: { display: "none" } },
        submitButtonProps: { icon: edit ? <EditOutlined /> : <PlusOutlined /> },
      }}
    >
      <ProFormText
        name="name"
        label="Name"
        rules={[{ required: true, message: "UOM Name is required" }]}
        placeholder="Enter UOM Name"
      />
    </ModalForm>
  );
};

export default UomModal;