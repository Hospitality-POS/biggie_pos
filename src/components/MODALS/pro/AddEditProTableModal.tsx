import React from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import { AimOutlined, AppstoreAddOutlined, PlusOutlined } from "@ant-design/icons";
import { getTableLocation } from "../../../services/tables";
import { useAddEditTableModal } from "../Hooks/useAddEditTableModal";

interface AddEditProTableModalProps {
  onAddTable: (table: string) => void;
  actionRef;
}

const AddEditProTableModal: React.FC<AddEditProTableModalProps> = ({
  onAddTable,
  actionRef,
}) => {
  const {
    isSubmitting,
    form,
    handleConfirmAddTable,
    handleClose,
    setIsSubmitting,
    handeLocationChange,
  } = useAddEditTableModal({ onAddTable });

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        open={isSubmitting}
        title={
          <Space>
            <AppstoreAddOutlined />
            Add New Table
          </Space>
        }
        trigger={
          <Button
            onClick={() => setIsSubmitting(true)}
            key="button"
            icon={<AppstoreAddOutlined />}
          >
            New
          </Button>
        }
        onFinish={async (values) => {
          await handleConfirmAddTable(values);
          actionRef.current.reload();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Table",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="Table Name"
            rules={[{ required: true, message: "Table name is required" }]}
            placeholder="Enter table name"
          />
          <ProFormSelect
            width="md"
            name="locatedAt"
            label="Location"
            rules={[{ required: true, message: "Table Location is required" }]}
            showSearch
            placeholder="Select available location"
            request={async (params) => {
              const data = await getTableLocation(params);
              const values = data.map((e) => {
                return { label: e.name, value: e._id };
              });
              return values;
            }}
            onChange={handeLocationChange}
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddEditProTableModal;
