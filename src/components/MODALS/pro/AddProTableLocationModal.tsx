import React from "react";
import { Button, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import BusinessIcon from "@mui/icons-material/Business";
import useAddSupplierDialog from "../Hooks/useAddSupplierDialog";
import { ActionType } from "@ant-design/pro-components";
import { useAddLocationModal } from "../Hooks/useAddLocationModal";
import { AimOutlined, PlusOutlined } from "@ant-design/icons";

interface AddProTableLocationModalProps {
  onAddLocation: (location: string) => void;
  actionRef;
}

const AddProTableLocationModal: React.FC<AddProTableLocationModalProps> = ({
  onAddLocation,
  actionRef,
}) => {
  const {
    isSubmitting,
    form,
    handleConfirmAddLocation,
    handleClose,
    setIsSubmitting,
  } = useAddLocationModal({ onAddLocation });

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        layout="horizontal"
        open={isSubmitting}
        title={
          <Space>
            <AimOutlined />
            Add New Location
          </Space>
        }
        trigger={
          <Button onClick={() => setIsSubmitting(true)} key="button" icon={<PlusOutlined/>}>
           New
          </Button>
        }
        onFinish={async (values) => {
          await handleConfirmAddLocation(values);
          actionRef.current.reload();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Location",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="Create New Location"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter Location name"
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddProTableLocationModal;
