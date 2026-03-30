import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Tabs,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import {
  CheckCircleOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ShoppingOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import useAddEditUserModal from "../Hooks/useAddEditUserModal";
import { fetchUserRoles, updateUsers } from "@services/users";
import { fetchAllCategories } from "@services/categories";
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

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface AddEditProUserModalProps {
  onAddUser?: (user: User) => void;
  actionRef: any;
  edit?: boolean;
  data?: any;
  isProfile?: boolean;
  userId?: string;
}

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: C.subText,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      display: "block",
      marginBottom: 12,
    }}
  >
    {children}
  </Text>
);

// ── Form section card ─────────────────────────────────────────────────────────
const FormSection: React.FC<{
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ label, children, style }) => (
  <div
    style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "14px 14px 6px",
      marginBottom: 14,
      ...style,
    }}
  >
    <SectionLabel>{label}</SectionLabel>
    {children}
  </div>
);

// ── Category card ─────────────────────────────────────────────────────────────
const CategoryCard: React.FC<{
  category: any;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
}> = ({ category, checked, onChange }) => (
  <label
    style={{
      padding: "10px 12px",
      border: `2px solid ${checked ? C.primary : C.border}`,
      borderRadius: 9,
      background: checked ? `${C.primary}12` : "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 9,
      transition: "border-color 0.2s, background 0.2s",
    }}
  >
    <Checkbox
      checked={checked}
      onChange={(e) => onChange(category._id, e.target.checked)}
    />
    <Text
      style={{
        fontSize: 12,
        fontWeight: checked ? 600 : 400,
        color: checked ? C.primary : C.darkText,
        lineHeight: 1.3,
      }}
    >
      {category.name}
    </Text>
  </label>
);

// ── Categories tab content (shared) ──────────────────────────────────────────
const CategoriesTabContent: React.FC<{
  currentShopId: string | null;
  categoriesLoading: boolean;
  categoriesData: any[];
  selectedCategories: string[];
  onCategoryChange: (id: string, checked: boolean) => void;
}> = ({
  currentShopId,
  categoriesLoading,
  categoriesData,
  selectedCategories,
  onCategoryChange,
}) => (
    <div style={{ padding: "4px 0" }}>
      {/* Header */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            background: C.primaryLight,
            borderRadius: 7,
            padding: 6,
            color: C.primary,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          <ShoppingOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
            Product Categories
          </Text>
          <Text style={{ fontSize: 11, color: C.subText }}>
            Branch-specific — select a branch first.
          </Text>
        </div>
      </div>

      {!currentShopId && (
        <Alert
          message="Select a branch in the User Details tab to load categories."
          type="warning"
          showIcon
          style={{ borderRadius: 9, marginBottom: 14 }}
        />
      )}

      {currentShopId && categoriesLoading && (
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} active paragraph={{ rows: 1 }} style={{ marginBottom: 8 }} />
          ))}
        </div>
      )}

      {currentShopId && !categoriesLoading && categoriesData.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {categoriesData.map((cat: any) => (
              <CategoryCard
                key={cat._id}
                category={cat}
                checked={selectedCategories.includes(cat._id)}
                onChange={onCategoryChange}
              />
            ))}
          </div>

          {selectedCategories.length > 0 && (
            <div
              style={{
                background: C.primaryLight,
                borderLeft: `3px solid ${C.primary}`,
                borderRadius: "0 8px 8px 0",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircleOutlined style={{ color: C.primary, fontSize: 14 }} />
              <Text style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
                {selectedCategories.length}{" "}
                {selectedCategories.length === 1 ? "category" : "categories"} selected
              </Text>
            </div>
          )}
        </>
      )}

      {currentShopId && !categoriesLoading && categoriesData.length === 0 && (
        <Empty
          description="No categories found for this branch"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: "32px 0" }}
        />
      )}
    </div>
  );

// ── Mobile form fields (plain AntD Form.Item — full width) ────────────────────
const MobileDetailsFields: React.FC<{
  form: any;
  isAdmin: boolean;
  isProfile: boolean;
  isEditingOwnProfile: boolean;
  userRole: string;
  fileList: UploadFile[];
  previewImage: string | null;
  beforeUpload: (file: RcFile) => boolean;
  handleUploadChange: UploadProps["onChange"];
  shops: any[];
  userRoles: any[];
  handleShopChange: (id: string) => void;
}> = ({
  form,
  isAdmin,
  isProfile,
  isEditingOwnProfile,
  userRole,
  fileList,
  previewImage,
  beforeUpload,
  handleUploadChange,
  shops,
  userRoles,
  handleShopChange,
}) => {
    const fieldLabel = (label: string) => (
      <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
    );

    return (
      <>
        {/* Profile image */}
        <FormSection label="Profile Image">
          <Upload.Dragger
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleUploadChange}
            maxCount={1}
            showUploadList={{ showRemoveIcon: true }}
            accept="image/*"
            customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
            style={{ borderRadius: 8 }}
          >
            <p className="ant-upload-drag-icon" style={{ margin: "8px 0 4px" }}>
              <InboxOutlined style={{ fontSize: 30, color: C.primary }} />
            </p>
            <Text style={{ fontSize: 12, color: C.darkText }}>Tap to upload image</Text>
            <br />
            <Text style={{ fontSize: 11, color: C.subText }}>Single file · max 5 MB</Text>
          </Upload.Dragger>
          {previewImage && (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Avatar
                size={80}
                src={previewImage}
                icon={<UserOutlined />}
                style={{ border: `3px solid ${C.primary}` }}
              />
            </div>
          )}
        </FormSection>

        {/* Basic info */}
        <FormSection label="Basic Info">
          <Form.Item
            name="fullname"
            label={fieldLabel("Full Name")}
            rules={[{ required: true, message: "Name is required" }]}
            style={{ marginBottom: 10 }}
          >
            <Input placeholder="Enter full name" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="username"
            label={fieldLabel("Username")}
            rules={[{ required: true, message: "Username is required" }]}
            style={{ marginBottom: 10 }}
          >
            <Input placeholder="Preferred username" style={{ borderRadius: 8 }} />
          </Form.Item>
          {isAdmin && (
            <Form.Item
              name="roleId"
              label={fieldLabel("Role")}
              rules={[{ required: true, message: "Role is required" }]}
              style={{ marginBottom: 10 }}
            >
              <Select
                placeholder="Select role"
                disabled={isProfile || isEditingOwnProfile}
                showSearch
                optionFilterProp="label"
                style={{ borderRadius: 8 }}
                options={(userRoles || []).map((r: any) => ({
                  label: r.role_type,
                  value: r._id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label={fieldLabel("Email")}
            rules={[
              { required: true, pattern: /^\S+@\S+\.\S+$/, message: "Invalid email" },
            ]}
            style={{ marginBottom: 10 }}
          >
            <Input placeholder="user@example.com" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="pin"
            label={fieldLabel("PIN")}
            tooltip="4-digit login PIN"
            rules={[
              { required: true, pattern: /^[0-9]{4}$/, message: "Must be 4 digits" },
            ]}
            style={{ marginBottom: 10 }}
          >
            <Input.Password placeholder="••••" style={{ borderRadius: 8 }} maxLength={4} />
          </Form.Item>
          <Form.Item
            name="idNumber"
            label={fieldLabel("National ID")}
            rules={[{ required: true, message: "National ID is required" }]}
            style={{ marginBottom: 10 }}
          >
            <InputNumber
              placeholder="ID number"
              style={{ width: "100%", borderRadius: 8 }}
              controls={false}
            />
          </Form.Item>
          {userRole !== "cashier" && (!isAdmin || !isEditingOwnProfile) && (
            <Form.Item
              name="shop_id"
              label={fieldLabel("Branch")}
              rules={[{ required: true, message: "Branch is required" }]}
              style={{ marginBottom: 10 }}
            >
              <Select
                placeholder="Select branch"
                showSearch
                optionFilterProp="label"
                onChange={handleShopChange}
                style={{ borderRadius: 8 }}
                options={(shops || []).map((s: any) => ({
                  label: s.name,
                  value: s._id,
                }))}
              />
            </Form.Item>
          )}
          <PhoneInput label="Phone" owner="phoneNumber" />
        </FormSection>
      </>
    );
  };

// ── Main component ────────────────────────────────────────────────────────────
const AddEditProUserModal: React.FC<AddEditProUserModalProps> = ({
  onAddUser,
  actionRef,
  edit,
  data,
  isProfile,
  userId,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef<any>();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
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

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: userRoles } = useQuery({
    queryKey: ["userRoles"],
    queryFn: fetchUserRoles,
    retry: 3,
    networkMode: "always",
  });

  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchAllShops,
    retry: 3,
    networkMode: "always",
  });

  const roleRequest = async () =>
    (userRoles || []).map((r: any) => ({ label: r.role_type, value: r._id }));

  const shopRequest = async () =>
    (shops || []).map((s: any) => ({ label: s.name, value: s._id }));

  // ── Populate on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !data) return;

    const shopId =
      typeof data?.shop_id === "object" ? data?.shop_id?._id : data?.shop_id;
    setCurrentShopId(shopId);

    form.setFieldsValue({
      ...data,
      phoneNumber: reversePhoneNumber(data?.phone),
      roleId: data?.role?._id,
      shop_id: shopId
        ? {
          value: shopId,
          label:
            typeof data?.shop_id === "object"
              ? data?.shop_id?.name
              : data?.shop_id,
        }
        : undefined,
    });

    if (data?.categories?.length) {
      setSelectedCategories(
        data.categories.map((c: any) => (typeof c === "string" ? c : c._id))
      );
    }

    if (data?.thumbnail) {
      setPreviewImage(data.thumbnail);
      setFileList([{ uid: "-1", name: "profile.png", status: "done", url: data.thumbnail }]);
    }
  }, [open, data, form]);

  // ── Fetch categories when shop changes ────────────────────────────────────
  useEffect(() => {
    if (!currentShopId) return;
    const load = async () => {
      setCategoriesLoading(true);
      try {
        const result = await fetchAllCategories({
          name: "",
          state: "all",
          shop_id: String(currentShopId).trim(),
        });
        setCategoriesData(Array.isArray(result) ? result : []);
      } catch {
        message.error("Failed to load categories");
        setCategoriesData([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    load();
  }, [currentShopId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
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
    if (!file.type.startsWith("image/")) { message.error("Images only"); return false; }
    if (file.size / 1024 / 1024 > 5) { message.error("Max 5 MB"); return false; }
    setUploadedFile(file);
    return false;
  };

  const handleUploadChange: UploadProps["onChange"] = ({ fileList: next }) => {
    const first = next[0];
    if (first?.originFileObj) {
      setUploadedFile(first.originFileObj);
      setPreviewImage(URL.createObjectURL(first.originFileObj));
    } else if (first?.url) {
      setPreviewImage(first.url);
    } else {
      setPreviewImage(null);
      setUploadedFile(null);
    }
    setFileList(next);
  };

  const handleShopChange = (value: any) => {
    const shopId = typeof value === "object" ? value.value : value;
    setCurrentShopId(shopId);
    setSelectedCategories([]);
    setCategoriesData([]);
  };

  const handleCategoryChange = (id: string, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const buildPayload = (values: any) => {
    const phoneNumber = getPhoneNumber(values?.phoneNumber);
    const payload: any = { ...values, phone: phoneNumber };
    if (uploadedFile) payload.imageFile = uploadedFile;
    if (selectedCategories.length > 0) payload.categories = selectedCategories;
    return payload;
  };

  const submitPayload = async (payload: any) => {
    try {
      if (edit) {
        await updateUsers({ value: payload, _id: data._id });
        if (isProfile) await queryClient.invalidateQueries(["user", userId]);
      } else {
        await handleConfirmAddUser(payload);
      }
      actionRef.current?.reload();
      return true;
    } catch {
      message.error("Failed to save user");
      return false;
    }
  };

  // ── Desktop onFinish (used by ModalForm) ───────────────────────────────────
  const onFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `${edit ? "Update" : "Add"} ${isProfile ? "profile" : "user"}?`,
      position: true,
    });
    if (!confirmed) return false;
    return submitPayload(buildPayload(values));
  };

  // ── Mobile submit ──────────────────────────────────────────────────────────
  const handleMobileSubmit = async () => {
    try {
      const values = await form.validateFields();
      const confirmed = await ShowConfirm({
        title: `${edit ? "Update" : "Add"} ${isProfile ? "profile" : "user"}?`,
        position: true,
      });
      if (!confirmed) return;
      await submitPayload(buildPayload(values));
      handleOpenChange(false);
    } catch {
      // validation errors shown inline
    }
  };

  // ── Shared tab items ───────────────────────────────────────────────────────
  const categoriesTabLabel = (
    <Space size={6}>
      <ShoppingOutlined style={{ fontSize: 13 }} />
      <span>Categories</span>
      {selectedCategories.length > 0 && (
        <span
          style={{
            background: C.primary,
            color: "#fff",
            borderRadius: 10,
            padding: "0 6px",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "18px",
            display: "inline-block",
          }}
        >
          {selectedCategories.length}
        </span>
      )}
    </Space>
  );

  const categoriesContent = (
    <CategoriesTabContent
      currentShopId={currentShopId}
      categoriesLoading={categoriesLoading}
      categoriesData={categoriesData}
      selectedCategories={selectedCategories}
      onCategoryChange={handleCategoryChange}
    />
  );

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = (
    <Space size={8}>
      <div
        style={{
          background: C.primaryLight,
          borderRadius: 7,
          padding: "4px 6px",
          color: C.primary,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {edit ? <EditOutlined /> : <UsergroupAddOutlined />}
      </div>
      <Text strong style={{ fontSize: 13, color: C.darkText }}>
        {edit ? `Edit ${isProfile ? "Profile" : "User"}` : "New Staff"}
      </Text>
    </Space>
  );

  // ── Trigger button ─────────────────────────────────────────────────────────
  const triggerButton = edit ? (
    <Button
      size="small"
      icon={<EditOutlined style={{ color: C.primary }} />}
      style={{ borderRadius: 7 }}
      onClick={() => setOpen(true)}
    >
      Edit
    </Button>
  ) : (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      style={{
        background: C.primary,
        borderColor: C.primary,
        borderRadius: 7,
        fontWeight: 500,
      }}
      onClick={() => setOpen(true)}
    >
      {isMobile ? "Add" : "New Staff"}
    </Button>
  );

  // ── Desktop: ProForm inside ModalForm ──────────────────────────────────────
  const desktopDetailsTab = (
    <>
      {/* Avatar upload */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 14px 10px",
          marginBottom: 16,
        }}
      >
        <SectionLabel>Profile Image</SectionLabel>
        <Upload.Dragger
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleUploadChange}
          maxCount={1}
          showUploadList={{ showRemoveIcon: true }}
          accept="image/*"
          customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
          style={{ borderRadius: 8 }}
        >
          <p className="ant-upload-drag-icon" style={{ margin: "8px 0 4px" }}>
            <InboxOutlined style={{ fontSize: 36, color: C.primary }} />
          </p>
          <Text style={{ fontSize: 13, color: C.darkText }}>
            Click or drag image to upload
          </Text>
          <br />
          <Text style={{ fontSize: 11, color: C.subText }}>Single image · max 5 MB</Text>
        </Upload.Dragger>
        {previewImage && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <Avatar
              size={90}
              src={previewImage}
              icon={<UserOutlined />}
              style={{ border: `3px solid ${C.primary}` }}
            />
          </div>
        )}
      </div>

      {/* Fields */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 14px 4px",
          marginBottom: 16,
        }}
      >
        <SectionLabel>Basic Info</SectionLabel>
        <ProForm.Group>
          <ProFormText
            hasFeedback
            width="xl"
            name="fullname"
            label="Full Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter full name"
          />
          <ProFormText
            hasFeedback
            width="xl"
            name="username"
            label="Username"
            rules={[{ required: true, message: "Username is required" }]}
            placeholder="Preferred username"
          />
          {isAdmin && (
            <ProFormSelect
              hasFeedback
              width="xl"
              name="roleId"
              label="Role"
              disabled={isProfile || isEditingOwnProfile}
              rules={[{ required: true, message: "Role is required" }]}
              showSearch
              placeholder="Select role"
              request={roleRequest}
            />
          )}
          <ProFormText
            hasFeedback
            width="xl"
            name="email"
            label="Email"
            rules={[
              { required: true, pattern: /^\S+@\S+\.\S+$/, message: "Invalid email" },
            ]}
            placeholder="user@example.com"
          />
          <ProFormText.Password
            hasFeedback
            width="xl"
            name="pin"
            label="PIN"
            tooltip="4-digit login PIN"
            rules={[{ required: true, pattern: /^[0-9]{4}$/, message: "Must be 4 digits" }]}
            placeholder="••••"
          />
          <ProFormDigit
            hasFeedback
            width="xl"
            name="idNumber"
            label="National ID"
            rules={[{ required: true, message: "National ID is required" }]}
            placeholder="Enter national ID number"
          />
          {user?.role !== "cashier" && (!isAdmin || !isEditingOwnProfile) && (
            <ProFormSelect
              hasFeedback
              width="xl"
              name="shop_id"
              label="Branch"
              rules={[{ required: true, message: "Branch is required" }]}
              showSearch
              placeholder="Select branch"
              request={shopRequest}
              fieldProps={{ onChange: handleShopChange }}
            />
          )}
          <PhoneInput label="Phone" owner="phoneNumber" />
        </ProForm.Group>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  // Mobile → bottom Drawer with plain Form ────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer
          open={open}
          onClose={() => handleOpenChange(false)}
          placement="bottom"
          height="92vh"
          destroyOnClose
          title={modalTitle}
          styles={{
            body: { padding: "14px 14px 100px", overflowY: "auto" },
            footer: {
              padding: "12px 14px",
              borderTop: `1px solid ${C.border}`,
              background: "#fff",
            },
          }}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                block
                onClick={() => handleOpenChange(false)}
                style={{ borderRadius: 8, height: 44 }}
              >
                Cancel
              </Button>
              <Button
                block
                type="primary"
                onClick={handleMobileSubmit}
                style={{
                  background: C.primary,
                  borderColor: C.primary,
                  borderRadius: 8,
                  height: 44,
                  fontWeight: 600,
                }}
              >
                {edit ? "Save Changes" : "Create Staff"}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" requiredMark={false}>
            <Tabs
              defaultActiveKey="details"
              size="small"
              items={[
                {
                  key: "details",
                  label: (
                    <Space size={6}>
                      <UserOutlined style={{ fontSize: 13 }} />
                      <span>User Details</span>
                    </Space>
                  ),
                  children: (
                    <MobileDetailsFields
                      form={form}
                      isAdmin={isAdmin}
                      isProfile={!!isProfile}
                      isEditingOwnProfile={!!isEditingOwnProfile}
                      userRole={user?.role || ""}
                      fileList={fileList}
                      previewImage={previewImage}
                      beforeUpload={beforeUpload}
                      handleUploadChange={handleUploadChange}
                      shops={shops || []}
                      userRoles={userRoles || []}
                      handleShopChange={handleShopChange}
                    />
                  ),
                },
                {
                  key: "categories",
                  label: categoriesTabLabel,
                  children: categoriesContent,
                },
              ]}
            />
          </Form>
        </Drawer>
      </>
    );
  }

  // Desktop → ModalForm ────────────────────────────────────────────────────────
  return (
    <ModalForm
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      formRef={formRef}
      title={modalTitle}
      initialValues={
        edit
          ? {
            ...data,
            phoneNumber: reversePhoneNumber(data?.phone),
            roleId: { value: data?.role?._id, label: data?.role?.role_type },
            shop_id: {
              value:
                typeof data?.shop_id === "object"
                  ? data?.shop_id?._id
                  : data?.shop_id,
              label:
                typeof data?.shop_id === "object"
                  ? data?.shop_id?.name
                  : data?.shop_id,
            },
          }
          : {}
      }
      trigger={triggerButton}
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "min(820px, 96vw)",
        styles: {
          body: { maxHeight: "78vh", overflowY: "auto", padding: "20px 20px 8px" },
        },
      }}
      onFinish={onFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Save Changes" : "Create Staff",
        },
        submitButtonProps: {
          style: {
            background: C.primary,
            borderColor: C.primary,
            borderRadius: 7,
            fontWeight: 500,
          },
        },
        resetButtonProps: { style: { borderRadius: 7 } },
      }}
    >
      <Tabs
        defaultActiveKey="details"
        size="small"
        items={[
          {
            key: "details",
            label: (
              <Space size={6}>
                <UserOutlined style={{ fontSize: 13 }} />
                <span>User Details</span>
              </Space>
            ),
            children: desktopDetailsTab,
          },
          {
            key: "categories",
            label: categoriesTabLabel,
            children: categoriesContent,
          },
        ]}
      />
    </ModalForm>
  );
};

export default AddEditProUserModal;