import React, { useEffect, useRef, useState } from "react";
import { Avatar, Button, Form, Space, Upload, message, Checkbox, Tabs, Empty, Alert } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import {
  EditOutlined,
  UsergroupAddOutlined,
  InboxOutlined,
  UserOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import useAddEditUserModal from "../Hooks/useAddEditUserModal";
import { ProFormDigit } from "@ant-design/pro-components";
import { fetchUserRoles, updateUsers } from "@services/users";
import { fetchAllCategories } from "@services/categories"; // ✅ Use service
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

import { usePrimaryColor } from "@context/PrimaryColorContext";

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
  const [open, setOpen] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const isEditingOwnProfile = edit && data?._id === userId;
  const queryClient = useQueryClient();

  // Image upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Categories state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const primaryColor = usePrimaryColor();

  useEffect(() => {
    if (open && data) {
      // Get shop ID - handle both object and string formats
      const shopId = typeof data?.shop_id === 'object'
        ? data?.shop_id?._id
        : data?.shop_id;

      console.log("🔍 Initial Shop ID:", shopId);

      setCurrentShopId(shopId);

      form.setFieldsValue({
        ...data,
        phoneNumber: reversePhoneNumber(data?.phone),
        roleId: data?.role?._id,
        shop_id: shopId ? {
          value: shopId,
          label: typeof data?.shop_id === 'object' ? data?.shop_id?.name : data?.shop_id
        } : undefined,
      });

      // Set initial categories
      if (data?.categories && Array.isArray(data.categories)) {
        const categoryIds = data.categories.map((cat: any) =>
          typeof cat === 'string' ? cat : cat._id
        );
        setSelectedCategories(categoryIds);
      }

      // Set initial image
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

  // ✅ FIXED: Fetch categories when shop changes using service
  useEffect(() => {
    if (currentShopId) {
      fetchCategoriesForShop(currentShopId);
    }
  }, [currentShopId]);

  const fetchCategoriesForShop = async (shopId: string) => {
    try {
      setCategoriesLoading(true);
      console.log("📡 Fetching categories for shop_id:", shopId);

      // ✅ Use the service function
      const result = await fetchAllCategories({
        name: "",
        state: 'all',
        shop_id: String(shopId).trim(),
      });

      console.log("✅ Categories fetched:", {
        shop_id: shopId,
        count: result?.length || 0,
        data: result
      });

      setCategoriesData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("❌ Error fetching categories:", error);
      message.error("Failed to load categories");
      setCategoriesData([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      setFileList([]);
      setPreviewImage(null);
      setUploadedFile(null);
      setSelectedCategories([]);
      setCurrentShopId(null);
      setCategoriesData([]);
    }
  };

  const { handleConfirmAddUser } = useAddEditUserModal({ onAddUser });

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

    setUploadedFile(file);
    return false;
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
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
    setTimeout(() => {
      onSuccess && onSuccess("ok");
    }, 0);
  };

  const onFinish = async (values) => {
    const phoneNumber = getPhoneNumber(values?.phoneNumber);
    const value = { ...values, phone: phoneNumber };

    if (uploadedFile) {
      value.imageFile = uploadedFile;
    }

    if (selectedCategories.length > 0) {
      value.categories = selectedCategories;
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

  // ✅ Handle shop change properly
  const handleShopChange = (value: any) => {
    const shopId = typeof value === 'object' ? value.value : value;
    console.log("🔄 Shop changed to:", shopId);
    setCurrentShopId(shopId);
    setSelectedCategories([]); // Reset categories
    setCategoriesData([]); // Clear old categories
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    }
  };

  const tabItems = [
    {
      key: "details",
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          User Details
        </span>
      ),
      children: (
        <>
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
                <Avatar
                  size={100}
                  icon={<UserOutlined />}
                  src={previewImage}
                  style={{ border: `2px solid ${primaryColor}` }}
                  alt={data?.fullname}
                  aria-label="User Avatar"
                />
              </div>
            )}
          </div>

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
                disabled={isProfile || isEditingOwnProfile}
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
            {user?.role !== "cashier" && (!isAdmin || !isEditingOwnProfile) ? (
              <ProFormSelect
                hasFeedback
                width="md"
                name="shop_id"
                label="Branch Name"
                rules={[{ required: true, message: "Branch is required" }]}
                showSearch
                placeholder="Select Branch name"
                request={shopRequest}
                fieldProps={{
                  onChange: handleShopChange,
                }}
              />
            ) : null}

            <PhoneInput label="Phone" owner="phoneNumber" />
          </ProForm.Group>
        </>
      ),
    },
    {
      key: "categories",
      label: (
        <span>
          <ShoppingOutlined style={{ marginRight: 8 }} />
          Categories
          {selectedCategories.length > 0 && (
            <span style={{
              marginLeft: '8px',
              backgroundColor: primaryColor,
              color: '#fff',
              borderRadius: '10px',
              padding: '0 6px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {selectedCategories.length}
            </span>
          )}
        </span>
      ),
      children: (
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingOutlined style={{ fontSize: '18px', color: primaryColor }} />
              Assign Product Categories
            </h3>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Select the product categories this user has access to. Categories are specific to the selected branch.
            </p>
          </div>

          {!currentShopId && (
            <Alert
              message="Please select a branch first to view available categories."
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {currentShopId && categoriesLoading && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f2f5',
              borderRadius: '6px',
              marginBottom: '16px',
              textAlign: 'center',
              color: '#666'
            }}>
              Loading categories for this branch...
            </div>
          )}

          {currentShopId && !categoriesLoading && categoriesData && categoriesData.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
            }}>
              {categoriesData.map((category: any) => (
                <label
                  key={category._id}
                  style={{
                    padding: '12px',
                    border: `2px solid ${selectedCategories.includes(category._id) ? primaryColor : '#d9d9d9'}`,
                    borderRadius: '6px',
                    backgroundColor: selectedCategories.includes(category._id)
                      ? `${primaryColor}15`
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedCategories.includes(category._id)) {
                      e.currentTarget.style.borderColor = primaryColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedCategories.includes(category._id)) {
                      e.currentTarget.style.borderColor = '#d9d9d9';
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedCategories.includes(category._id)}
                    onChange={(e) => handleCategoryChange(category._id, e.target.checked)}
                  />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: selectedCategories.includes(category._id) ? '600' : '500',
                    color: selectedCategories.includes(category._id) ? primaryColor : '#000'
                  }}>
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
          ) : currentShopId && !categoriesLoading ? (
            <Empty
              description="No categories available for this branch"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: '20px' }}
            />
          ) : null}

          {selectedCategories.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: `${primaryColor}10`,
              borderRadius: '6px',
              borderLeft: `3px solid ${primaryColor}`,
              fontSize: '13px',
              color: '#666'
            }}>
              <strong style={{ color: primaryColor }}>
                {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
              </strong>
            </div>
          )}
        </div>
      ),
    },
  ];

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
              value: typeof data?.shop_id === 'object' ? data?.shop_id?._id : data?.shop_id,
              label: typeof data?.shop_id === 'object' ? data?.shop_id?.name : data?.shop_id,
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
        width: 800,
      }}
      onFinish={onFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Save Profile" : "Add New User",
        },
      }}
    >
      <Tabs items={tabItems} defaultActiveKey="details" />
    </ModalForm>
  );
};

export default AddEditProUserModal;