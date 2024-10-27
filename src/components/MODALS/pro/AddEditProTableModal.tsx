import React, { useEffect, useState } from "react";
import { Button, Form, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import { AimOutlined, AppstoreAddOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { addNewTable, getTableLocation, updateTable } from "../../../services/tables";
import { useAddEditTableModal } from "../Hooks/useAddEditTableModal";
import ShowConfirm from "@utils/ConfirmUtil";

interface AddEditProTableModalProps {
  actionRef;
  edit?: boolean;
  data?: any;
}

const AddEditProTableModal: React.FC<AddEditProTableModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
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
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <AppstoreAddOutlined />
            Add New Table
          </Space>
        }
        trigger={
          edit ? (
            <Button
              size="small"
              key="button"
              icon={
                <EditOutlined
                  style={{ color: "#6c1c2c" }}
                  onClick={() => form.setFieldsValue(data)}
                />
              }
            >Edit</Button>
          ) : (
            <Button type="primary" key="button" icon={<AppstoreAddOutlined />}>
              New Table
            </Button>
          )
        }
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${
              edit ? "update this" : "add new"
            } table?`,
            position: true,
          });
          if (confirmed) {
            edit
              ? await updateTable({ values, _id: data._id })
              : await addNewTable(values);
            actionRef.current.reset();
            return true;
          }
        }}

        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Table",
          },
        }}
        modalProps={{
          destroyOnClose: true,
          centered: true,
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
          />
        </ProForm.Group>
      </ModalForm>
  );
};

export default AddEditProTableModal;
