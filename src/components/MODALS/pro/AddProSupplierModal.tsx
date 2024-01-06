import React from "react";
import { Button, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import BusinessIcon from "@mui/icons-material/Business";
import useAddSupplierDialog from "../Hooks/useAddSupplierDialog";
import { ActionType } from '@ant-design/pro-components';
import { PlusOutlined, SisternodeOutlined } from "@ant-design/icons";

interface Supplier {
  name: string;
  email: string;
  phone: string;
}

interface AddSupplierDialogProps {
  onAddSupplier: (supplier: Supplier) => void;
  actionRef;
}

const AddProSupplierModal: React.FC<AddSupplierDialogProps> = ({
  onAddSupplier,
  actionRef
}) => {
  const {
    isSubmitting,
    form,
    handleConfirmAddSupplier,
    handleClose,
    setIsSubmitting
  } = useAddSupplierDialog({ onAddSupplier });



  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        open={isSubmitting}
      
      // todo: reuse this for editmodal
        // initialValues={props.data ?props.data :{}}
        title={
          <Space>
            <SisternodeOutlined />
            Add New Supplier
          </Space>
        }
        trigger={<Button onClick={() => setIsSubmitting(true)} key="button" icon={<PlusOutlined/>}>New</Button>}
        onFinish={async(values)=>{
        await  handleConfirmAddSupplier(values)
          actionRef.current.reload()
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Supplier",
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
            rules={[{
              required: true,
              pattern: /^\S+@\S+\.\S+$/,
              message: "Invalid email format",
            }]}
            placeholder="Enter supplier email"
          />

          <ProFormText
            width="md"
            name="phone"
            label="Phone"
            rules={[{ required: true, message: "Invalid phone no. include 10 digits only.", pattern: /^\d{10}$/,  }]}
            placeholder="Enter supplier phone"
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddProSupplierModal;