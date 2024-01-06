import React from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import {
    UsergroupAddOutlined,
} from "@ant-design/icons";
import useAddEditUserModal from "../Hooks/useAddEditUserModal";

interface User {
  fullname: string;
  username: string;
  email: string;
  pin: string;
  phone: string;
  idNumber: string;
  isAdmin: string;
}

interface AddEditProUserModalProps {
  onAddUser: (user: User) => void;
  actionRef;
}

const AddEditProUserModal: React.FC<AddEditProUserModalProps> = ({
  onAddUser,
  actionRef,
}) => {
  const {
    isSubmitting,
    form,
    handleInputChange,
    handleConfirmAddUser,
    handleClose,
    setIsSubmitting,
  } = useAddEditUserModal({ onAddUser });


  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        open={isSubmitting}
        // todo: reuse this for editmodal
        // initialValues={props.data ?props.data :{}}
        title={
          <Space>
            <UsergroupAddOutlined />
            Add New User
          </Space>
        }
        trigger={
          <Button
            onClick={() => setIsSubmitting(true)}
            key="button"
            icon={<UsergroupAddOutlined />}
          >
            New
          </Button>
        }
        onFinish={async (values) => {
          await handleConfirmAddUser(values);
          actionRef.current.reload();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add New User",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="fullname"
            label="fullname"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter user fullname"
          />
          <ProFormText
            width="md"
            name="username"
            label="username"
            rules={[{ required: true, message: "username is required" }]}
            placeholder="Enter preferred username"
          />

          <ProFormSelect
            width="md"
            name="isAdmin"
            label="Admin Role"
            rules={[{ required: true, message: "Admin role is required" }]}
            showSearch
            placeholder="Select Admin Role"
            options={[
              { label: "True", value: true },
              { label: "False", value: false },
            ]}
            valueEnum={{
              true: "True",
              false: "False",
            }}
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
            placeholder="Enter user email"
          />

          <ProFormText.Password
            width="md"
            name="pin"
            label="Pin"
            tooltip="Users Login PIN 4 digits only"
            rules={[
              {
                required: true,
                pattern: /^[0-9]{4}$/,
                message: "Invalid Pin format",
              },
            ]}
            placeholder="Enter user Pin"
           
          />
          <ProFormText
            width="md"
            name="idNumber"
            label="ID Number"
            rules={[
              { required: true, message: "Natinal ID Number is required" },
            ]}
            placeholder="Enter user National ID"
          />

          <ProFormText
            width="md"
            name="phone"
            label="Phone"
            tooltip="Users Phone Number include 10 digits only"
            rules={[
              {
                required: true,
                message: "Invalid phone no. include 10 digits only.",
                pattern: /^\d{10}$/,
              },
            ]}
            placeholder="Enter supplier phone"
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddEditProUserModal;
