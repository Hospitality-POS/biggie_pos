import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space, Upload, message } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import { EditOutlined, UsergroupAddOutlined, InboxOutlined } from "@ant-design/icons";
import useAddEditUserModal from "../Hooks/useAddEditUserModal";
import { ProFormDigit } from "@ant-design/pro-components";
import { fetchUserRoles, updateUsers } from "@services/users";
import ShowConfirm from "@utils/ConfirmUtil";
import { User } from "src/interfaces/User";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";
import { useAppSelector } from "src/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllShops } from "@services/shops";
import { RcFile } from "antd/lib/upload";
import { UploadFile, UploadProps } from "antd/lib";

interface AddEditProUserModalProps {
  onAddUser?: (user: User) => void;
  actionRef: any;
  edit?: boolean;
  data?: any;
  isProfile?: boolean;
  userId?: string;
}

const AddEditProUserModal: React.FC<AddEditProUserModalProps> = ({
  onAddUser,
  actionRef,
  edit,
  data,
  isProfile,
  userId,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [open, setOpen] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const isEditingOwnProfile = edit && data?._id === userId;
  const queryClient = useQueryClient();

  // Image upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        phoneNumber: reversePhoneNumber(data?.phone),
        roleId: data?.role?._id,
      });

      // Set initial image if editing a user with an existing thumbnail
      if (data?.thumbnail) {
        setPreviewImage(data.thumbnail);
        setFileList([
          {
            uid: '-1',
            name: 'profile-image.png',
            status: 'done',
            url: data.thumbnail,
          },
        ]);
      }
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      setFileList([]);
      setPreviewImage(null);
      setUploadedFile(null);
    }
  };

  const { handleConfirmAddUser } = useAddEditUserModal({ onAddUser });

  // File upload handlers
  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    // Store the file directly
    setUploadedFile(file);
    return false; // Prevent auto upload
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      // Store the file and update preview
      const file = newFileList[0].originFileObj;
      setUploadedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    } else if (newFileList.length > 0 && newFileList[0].url) {
      setPreviewImage(newFileList[0].url);
    } else {
      setPreviewImage(null);
      setUploadedFile(null);
    }

    setFileList(newFileList);
  };

  const customRequest = ({ onSuccess }: any) => {
    // This function prevents automatic upload and stores the file locally
    setTimeout(() => {
      onSuccess && onSuccess("ok");
    }, 0);
  };

  const onFinish = async (values) => {
    const phoneNumber = getPhoneNumber(values?.phoneNumber);
    const value = { ...values, phone: phoneNumber };

    // Add the file to the values if it exists
    if (uploadedFile) {
      value.imageFile = uploadedFile;
    }

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"} ${isProfile ? "profile" : "user"
        }?`,
      position: true,
    });

    if (confirmed) {
      try {
        if (edit) {
          await updateUsers({
            value,
            _id: data._id,
          });
          // Invalidate the query to update the user details
          isProfile && (await queryClient.invalidateQueries(["user", userId]));
        } else {
          await handleConfirmAddUser(value);
        }
        actionRef.current?.reload();
        return true;
      } catch (error) {
        console.error("Error submitting form:", error);
        message.error("Failed to save user");
        return false;
      }
    }
  };

  const { data: userRoles } = useQuery({
    queryKey: ["userRoles"],
    queryFn: fetchUserRoles,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const roleRequest = async () => {
    const values = userRoles.map((e: { role_type: any; _id: any }) => {
      return { label: e.role_type, value: e._id };
    });
    return values;
  };

  // handle shops
  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchAllShops,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const shopRequest = async () => {
    const values = shops.map((e: { name: any; _id: any }) => {
      return { label: e.name, value: e._id };
    });
    return values;
  };

  return (
    <ModalForm
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      formRef={formRef}
      title={
        <Space>
          {isProfile ? <EditOutlined /> : <UsergroupAddOutlined />}
          {edit ? `Edit ${isProfile ? "Profile" : "User"}` : "Add New User "}
        </Space>
      }
      initialValues={
        edit
          ? {
            ...data,
            phoneNumber: reversePhoneNumber(data?.phone),
            roleId: {
              value: data?.role?._id,
              label: data?.role?.role_type,
            },
            shop_id: {
              value: data?.shop_id?._id,
              label: data?.shop_id?.name,
            },
          }
          : {}
      }
      trigger={
        edit ? (
          <Button
            key="button"
            icon={
              <EditOutlined
                style={{ color: primaryColor }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
            size="small"
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<UsergroupAddOutlined />}>
            New Staff
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={onFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Save Profile" : "Add New User",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          hasFeedback
          width="md"
          id="fullName"
          name="fullname"
          label="fullname"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter user fullname"
        />
        <ProFormText
          hasFeedback
          width="md"
          name="username"
          label="username"
          rules={[{ required: true, message: "username is required" }]}
          placeholder="Enter preferred username"
        />

        {isAdmin && (
          <ProFormSelect
            hasFeedback
            width="md"
            name="roleId"
            label="Roles"
            disabled={isProfile || isEditingOwnProfile} // Prevent admin from changing their own role
            rules={[{ required: true, message: "Roles is required" }]}
            showSearch
            placeholder="Select role"
            request={roleRequest}
          />
        )}

        <ProFormText
          hasFeedback
          width="md"
          id="user_email"
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
          hasFeedback
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
        <ProFormDigit
          hasFeedback
          width="md"
          name="idNumber"
          label="ID Number"
          rules={[
            { required: true, message: "National ID Number is required" },
          ]}
          placeholder="Enter user National ID"
        />
        {/* Conditionally render the shop field */}
        {user?.role !== "cashier" && (!isAdmin || !isEditingOwnProfile) ? (
          <ProFormSelect
            hasFeedback
            width="md"
            name="shop_id"
            label="Shop Name"
            rules={[{ required: true, message: "Shop is required" }]}
            showSearch
            placeholder="Select shop name"
            request={shopRequest}
          />
        ) : null}

        <PhoneInput label="Phone" owner="phoneNumber" />
      </ProForm.Group>

      {/* User Profile Image Upload Section */}
      <div style={{ padding: '0 24px', marginBottom: '24px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>Profile Image</div>
        <Upload.Dragger
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleChange}
          maxCount={1}
          showUploadList={{ showRemoveIcon: true }}
          accept="image/*"
          style={{ width: '100%' }}
          customRequest={customRequest}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#40a9ff' }} />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
          <p className="ant-upload-hint">
            Support for a single image file. Maximum size: 5MB.
          </p>
        </Upload.Dragger>

        {previewImage && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <img
              src={previewImage}
              alt="Profile preview"
              style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain', borderRadius: '50%' }}
            />
          </div>
        )}
      </div>
    </ModalForm>
  );
};

export default AddEditProUserModal;