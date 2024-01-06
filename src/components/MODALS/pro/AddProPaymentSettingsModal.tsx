import React from "react";
import { Button, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import PaymentIcon from "@mui/icons-material/Payment";
import useAddPaymentMethodSettingsModal from "../Hooks/useAddPaymentMethodSettingsModal";
import { ActionType } from "@ant-design/pro-components";
import { DollarOutlined, PlusOutlined } from "@ant-design/icons";

interface PaymentMethod {
  name: string;
}

interface AddProPaymentMethodSettingsModalProps {
  onAddPaymentMethod: (paymentMethod: PaymentMethod) => void;
  actionRef: any;
}

const AddProPaymentMethodSettingsModal: React.FC<
  AddProPaymentMethodSettingsModalProps
> = ({ onAddPaymentMethod, actionRef }) => {
  const {
    form,
    isSubmitting,
    setIsSubmitting,
    handleClose,
    handleConfirmAddPaymentMethod,
    handlePaymentMethodChange,
  } = useAddPaymentMethodSettingsModal({ onAddPaymentMethod });

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        width={550}
        open={isSubmitting}
        layout="horizontal"
        title={
          <Space>
            <DollarOutlined />
            Add New Method
          </Space>
        }
        trigger={
          <Button
            onClick={() => setIsSubmitting(true)}
            key="button"
            icon={<DollarOutlined />}
          >
            New
          </Button>
        }
        form={form}
        onFinish={async (values) => {
          await handleConfirmAddPaymentMethod(values);
          actionRef.current.reload();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Payment Method",
          },
        }}
        onChange={handlePaymentMethodChange}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="Payment Method Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter payment method name"
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddProPaymentMethodSettingsModal;
