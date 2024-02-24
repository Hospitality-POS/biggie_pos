  import React from "react";
  import { Button, Space } from "antd";
  import {
    ModalForm,
    ProFormText,
    ProForm,
    ProFormSelect,
  } from "@ant-design/pro-form";
  import { EditOutlined, UsergroupAddOutlined } from "@ant-design/icons";
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
    actionRef: any;
    edit: boolean;
    data: any;
  }

  const AddEditProUserModal: React.FC<AddEditProUserModalProps> = ({
    onAddUser,
    actionRef,
    edit,
    data,
  }) => {
    const [form] = ProForm.useForm()
    const {
      isSubmitting,
      // form,
      handleInputChange,
      handleConfirmAddUser,
      handleClose,
      setIsSubmitting,
      handleConfirmEditUser,
    } = useAddEditUserModal({ onAddUser });

    return (
      <ModalForm
        open={isSubmitting}
     key={data?._id}
  
        title={
          <Space>
            <UsergroupAddOutlined />
            Add New User
          </Space>
        }
        initialValues={edit ? data : {}}
        trigger={
          edit ? (
            <Button
              type="link"
              key="button"
              icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
            ></Button>
          ) : (
            <Button key="button" icon={<UsergroupAddOutlined />}>
              New
            </Button>
          )
        }
        autoFocusFirstInput
        modalProps={{
          destroyOnClose: true,
          // destroyOnClose: true,
        }}
        onFinish={async (values) => {
          edit
            ? await handleConfirmEditUser({ values, data })
            : await handleConfirmAddUser(values);
          actionRef.current.reload();
          return true;
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        loading={isSubmitting}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: edit ? "Edit User" : "Add New User",
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
              { required: true, message: "National ID Number is required" },
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
    );
  };

  export default AddEditProUserModal;
