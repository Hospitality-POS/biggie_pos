import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { useLocation } from "react-router-dom";
import { ModalForm } from "@ant-design/pro-components";
import {
  CameraOutlined,
  EditOutlined,
  PlusOutlined,
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

import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

// ── Palette (Dynamic Getters) ─────────────────────────────────────────────────
const C = THEME_C;

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
  actionRef?: any;
  edit?: boolean;
  data?: any;
  isProfile?: boolean;
  userId?: string;
  onUserSaved?: () => void;
  onModalClose?: () => void;
  onSuccess?: () => void;
}

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

// ── Photo picker — a round avatar with Upload / Change / Remove ─────────────────
const PhotoPicker: React.FC<{
  fileList: UploadFile[];
  previewImage: string | null;
  beforeUpload: (file: RcFile) => boolean;
  handleUploadChange: UploadProps["onChange"];
  name?: string;
}> = ({ fileList, previewImage, beforeUpload, handleUploadChange, name }) => {
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <Avatar
        size={64}
        src={previewImage || undefined}
        icon={!previewImage && !initials ? <UserOutlined /> : undefined}
        style={{ background: previewImage ? undefined : `${C.primary}1a`, color: C.primary, fontWeight: 600, flexShrink: 0 }}
      >
        {!previewImage && initials}
      </Avatar>
      <div style={{ minWidth: 0 }}>
        <Space size={8} wrap>
          <Upload
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleUploadChange}
            maxCount={1}
            showUploadList={false}
            accept="image/*"
            customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
          >
            <Button size="small" icon={<CameraOutlined />} style={{ borderRadius: 7 }}>
              {previewImage ? "Change photo" : "Upload photo"}
            </Button>
          </Upload>
          {previewImage && (
            <Button
              size="small"
              type="text"
              danger
              onClick={() => handleUploadChange?.({ fileList: [], file: {} as any })}
            >
              Remove
            </Button>
          )}
        </Space>
        <Text style={{ fontSize: 11.5, color: C.subText, display: "block", marginTop: 4 }}>
          Optional · JPG or PNG, up to 5 MB
        </Text>
      </div>
    </div>
  );
};

// ── Section heading inside the form ────────────────────────────────────────────
const FieldGroup: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ marginBottom: 10, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
      <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", marginTop: 12 }}>
        {title}
      </Text>
      {hint && <Text style={{ fontSize: 12, color: C.subText }}>{hint}</Text>}
    </div>
    {children}
  </div>
);

// ── All staff fields — used by the desktop modal and the mobile sheet ──────────
const StaffFields: React.FC<{
  isMobile: boolean;
  isAdmin: boolean;
  isProfile: boolean;
  isEditingOwnProfile: boolean;
  showBranch: boolean;
  fileList: UploadFile[];
  previewImage: string | null;
  beforeUpload: (file: RcFile) => boolean;
  handleUploadChange: UploadProps["onChange"];
  shops: any[];
  userRoles: any[];
  handleShopChange: (id: string) => void;
  showCategories: boolean;
  categoriesLoading: boolean;
  categoriesData: any[];
  selectedCategories: string[];
  onCategoryChange: (id: string, checked: boolean) => void;
  onSelectAllCategories: (all: boolean) => void;
  watchedName?: string;
}> = (p) => {
  const span = p.isMobile ? 24 : 12;
  const label = (text: string) => <Text style={{ fontSize: 12.5, color: C.darkText }}>{text}</Text>;
  const item = { style: { marginBottom: 14 } };

  return (
    <>
      <PhotoPicker
        fileList={p.fileList}
        previewImage={p.previewImage}
        beforeUpload={p.beforeUpload}
        handleUploadChange={p.handleUploadChange}
        name={p.watchedName}
      />

      <FieldGroup title="Personal details">
        <Row gutter={16}>
          <Col span={span}>
            <Form.Item name="fullname" label={label("Full name")} rules={[{ required: true, message: "Enter their full name" }]} {...item}>
              <Input placeholder="e.g. Mercy Atieno" />
            </Form.Item>
          </Col>
          <Col span={span}>
            <Form.Item name="idNumber" label={label("National ID")} {...item}>
              <InputNumber placeholder="Optional" style={{ width: "100%" }} controls={false} />
            </Form.Item>
          </Col>
          <Col span={span}>
            <PhoneInput label={label("Phone")} owner="phoneNumber" required={false} />
          </Col>
        </Row>
      </FieldGroup>

      <FieldGroup title="Login details" hint="Used to sign in to the POS and the dashboard">
        <Row gutter={16}>
          <Col span={span}>
            <Form.Item name="username" label={label("Username")} rules={[{ required: true, message: "Choose a username" }]} {...item}>
              <Input placeholder="e.g. mercy" autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={span}>
            <Form.Item
              name="email"
              label={label("Email")}
              rules={[{ required: true, pattern: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }]}
              {...item}
            >
              <Input placeholder="name@example.com" autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={span}>
            <Form.Item
              name="pin"
              label={label("4-digit PIN")}
              tooltip="Used for quick sign-in on the POS"
              rules={[{ required: true, pattern: /^[0-9]{4}$/, message: "The PIN must be 4 digits" }]}
              {...item}
            >
              <Input.Password placeholder="••••" maxLength={4} inputMode="numeric" autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
      </FieldGroup>

      {(p.isAdmin || p.showBranch) && (
        <FieldGroup title="Role and branch">
          <Row gutter={16}>
            {p.isAdmin && (
              <Col span={span}>
                <Form.Item name="roleId" label={label("Role")} rules={[{ required: true, message: "Choose a role" }]} {...item}>
                  <Select
                    placeholder="Choose a role"
                    disabled={p.isProfile || p.isEditingOwnProfile}
                    showSearch
                    optionFilterProp="label"
                    options={(p.userRoles || []).map((r: any) => ({ label: r.role_type, value: r._id }))}
                  />
                </Form.Item>
              </Col>
            )}
            {p.showBranch && (
              <Col span={span}>
                <Form.Item name="shop_id" label={label("Branch")} rules={[{ required: true, message: "Choose a branch" }]} {...item}>
                  <Select
                    placeholder="Choose a branch"
                    showSearch
                    optionFilterProp="label"
                    onChange={p.handleShopChange}
                    options={(p.shops || []).map((s: any) => ({ label: s.name, value: s._id }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </FieldGroup>
      )}

      {p.showCategories && (
        <FieldGroup title="What they can sell" hint="Leave empty to allow every category in this branch">
          {p.categoriesLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          ) : p.categoriesData.length === 0 ? (
            <Empty description="No categories in this branch yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: "8px 0 16px" }} />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: p.selectedCategories.length ? C.primary : C.subText, fontWeight: 600 }}>
                  {p.selectedCategories.length
                    ? `${p.selectedCategories.length} of ${p.categoriesData.length} selected`
                    : "All categories allowed"}
                </Text>
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => p.onSelectAllCategories(true)} style={{ padding: "0 4px" }}>
                    Select all
                  </Button>
                  {p.selectedCategories.length > 0 && (
                    <Button size="small" type="link" onClick={() => p.onSelectAllCategories(false)} style={{ padding: "0 4px" }}>
                      Clear
                    </Button>
                  )}
                </Space>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${p.isMobile ? 130 : 150}px, 1fr))`,
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {p.categoriesData.map((cat: any) => (
                  <CategoryCard
                    key={cat._id}
                    category={cat}
                    checked={p.selectedCategories.includes(cat._id)}
                    onChange={p.onCategoryChange}
                  />
                ))}
              </div>
            </>
          )}
        </FieldGroup>
      )}
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
  onUserSaved,
  onModalClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef<any>();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const isEditingOwnProfile = edit && data?._id === userId;
  const queryClient = useQueryClient();
  const location = useLocation();

  // Check if we're on shop-level staff-management route
  const isShopLevelStaffManagement = location.pathname === "/staff-management";
  const currentShopId = localStorage.getItem("shopId");

  // Image upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Categories state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
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

  // ── Populate on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Always reset shop/categories state when opening
    setSelectedShopId(null);
    setCategoriesData([]);
    setSelectedCategories([]);

    // For create mode on shop-level route, auto-set shop_id
    if (!edit && isShopLevelStaffManagement && currentShopId) {
      form.setFieldsValue({ shop_id: currentShopId });
      setSelectedShopId(currentShopId);
    }

    if (!data) return;

    // Guard: typeof null === "object" in JS, so check for null explicitly
    const rawShopId = data?.shop_id;
    const shopId: string | null =
      rawShopId == null
        ? null
        : typeof rawShopId === "object"
          ? (rawShopId._id || null)
          : (rawShopId as string) || null;
    setSelectedShopId(shopId);

    form.setFieldsValue({
      ...data,
      phoneNumber: reversePhoneNumber(data?.phone),
      roleId: data?.role?._id,
      shop_id: shopId || undefined,
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
  }, [open, data, form, edit, isShopLevelStaffManagement, currentShopId]);

  // ── Fetch categories when shop changes ────────────────────────────────────
  useEffect(() => {
    const shopIdToUse = isShopLevelStaffManagement ? currentShopId : selectedShopId;
    if (!shopIdToUse) {
      setCategoriesData([]);
      return;
    }
    const load = async () => {
      setCategoriesLoading(true);
      try {
        const result = await fetchAllCategories({
          name: "",
          state: "all",
          shop_id: String(shopIdToUse).trim(),
        });
        const all = Array.isArray(result) ? result : [];
        // Client-side filter: only show categories belonging to this shop
        const forShop = all.filter((cat: any) =>
          !cat.shop_id || String(cat.shop_id).trim() === String(shopIdToUse).trim()
        );
        setCategoriesData(forShop);
      } catch {
        message.error("Failed to load categories");
        setCategoriesData([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    load();
  }, [selectedShopId, isShopLevelStaffManagement, currentShopId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.resetFields();
      setFileList([]);
      setPreviewImage(null);
      setUploadedFile(null);
      setSelectedCategories([]);
      setSelectedShopId(null);
      setCategoriesData([]);
      onModalClose?.();
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
    setSelectedShopId(shopId);
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
    // Add company code to prevent logout
    const companyCode = localStorage.getItem("companyCode");
    if (companyCode) {
      payload.companyCode = companyCode;
      payload.tenant_code = companyCode;
    }
    // For shop-level route, ensure shop_id is included from localStorage
    if (isShopLevelStaffManagement && currentShopId) {
      payload.shop_id = currentShopId;
    }
    return payload;
  };

  // Map a backend field error onto the matching form control
  const setFieldError = (field?: string, msg?: string) => {
    if (!field) return;
    try {
      form.setFields([{ name: field, errors: [msg || "Invalid value"] }]);
    } catch {
      // form instance may not be mounted (e.g. modal closed)
    }
  };

  const submitPayload = async (payload: any) => {
    try {
      if (edit) {
        await updateUsers({ value: payload, _id: data._id });
        if (isProfile) await queryClient.invalidateQueries(["user", userId]);
      } else {
        const result = await handleConfirmAddUser(payload);
        if (!result?.success) {
          setFieldError(result?.field, result?.message);
          message.error(result?.message || "Failed to add a new user");
          return false;
        }
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.message || "Failed to save user";
      setFieldError(error?.response?.data?.field || error?.field, msg);
      message.error(msg);
      return false;
    }

    message.success(edit ? "User updated successfully" : "User added successfully");

    // Post-update operations (non-critical)
    try {
      actionRef.current?.reload();
      onUserSaved?.();
      onSuccess?.();
    } catch (error) {
      console.error("Post-update operations failed:", error);
    }

    return true;
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
      const ok = await submitPayload(buildPayload(values));
      if (ok) handleOpenChange(false);
    } catch {
      // validation errors shown inline
    }
  };

  // ── Computed shop ID used for categories ──────────────────────────────────
  // Only truthy when modal is open AND a shop has actually been selected.
  // The `open` guard prevents stale selectedShopId from a previous session.
  const effectiveShopId = open
    ? (isShopLevelStaffManagement ? currentShopId : selectedShopId) || null
    : null;

  const handleSelectAllCategories = (all: boolean) =>
    setSelectedCategories(all ? categoriesData.map((c: any) => c._id) : []);

  const showBranch =
    user?.role !== "cashier" && (!isAdmin || !isEditingOwnProfile) && !isShopLevelStaffManagement;

  const watchedName = Form.useWatch("fullname", form);

  const fields = (
    <StaffFields
      isMobile={isMobile}
      isAdmin={isAdmin}
      isProfile={!!isProfile}
      isEditingOwnProfile={!!isEditingOwnProfile}
      showBranch={showBranch}
      fileList={fileList}
      previewImage={previewImage}
      beforeUpload={beforeUpload}
      handleUploadChange={handleUploadChange}
      shops={shops || []}
      userRoles={userRoles || []}
      handleShopChange={handleShopChange}
      showCategories={!!effectiveShopId}
      categoriesLoading={categoriesLoading}
      categoriesData={categoriesData}
      selectedCategories={selectedCategories}
      onCategoryChange={handleCategoryChange}
      onSelectAllCategories={handleSelectAllCategories}
      watchedName={watchedName}
    />
  );

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: C.primaryLight,
          color: C.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {edit ? <EditOutlined /> : <UsergroupAddOutlined />}
      </div>
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.25 }}>
          {edit ? (isProfile ? "Edit your profile" : `Edit ${data?.fullname || "staff member"}`) : "Add a staff member"}
        </Text>
        <Text style={{ fontSize: 12, color: C.subText, fontWeight: 400 }}>
          {edit ? "Update their details, login and access" : "They can sign in with their username or PIN"}
        </Text>
      </div>
    </div>
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
    <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 7, fontWeight: 500 }} onClick={() => setOpen(true)}>
      {isMobile ? "Add" : "New Staff"}
    </Button>
  );

  const submitText = edit ? "Save changes" : "Add staff member";

  // ── Render ─────────────────────────────────────────────────────────────────

  // Mobile → bottom sheet with the same fields in one column
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
            header: { padding: "12px 14px" },
            body: { padding: "14px 16px 24px", overflowY: "auto", overflowX: "hidden" },
            footer: { padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: "#fff" },
          }}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <Button block onClick={() => handleOpenChange(false)} style={{ borderRadius: 8, height: 44 }}>
                Cancel
              </Button>
              <Button block type="primary" onClick={handleMobileSubmit} style={{ borderRadius: 8, height: 44, fontWeight: 600 }}>
                {submitText}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" requiredMark={false}>
            {fields}
          </Form>
        </Drawer>
      </>
    );
  }

  // Desktop → ModalForm, two columns
  return (
    <ModalForm
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      formRef={formRef}
      title={modalTitle}
      requiredMark={false}
      initialValues={
        edit
          ? {
              ...data,
              phoneNumber: reversePhoneNumber(data?.phone),
              roleId: data?.role?._id,
              shop_id: typeof data?.shop_id === "object" ? data?.shop_id?._id : data?.shop_id,
            }
          : {}
      }
      trigger={triggerButton}
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "min(760px, 96vw)",
        styles: {
          header: { paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 0 },
          body: { maxHeight: "72vh", overflowY: "auto", overflowX: "hidden", padding: "18px 8px 4px" },
          footer: { borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 },
        },
      }}
      onFinish={onFinish}
      submitter={{
        searchConfig: { resetText: "Cancel", submitText },
        submitButtonProps: { style: { borderRadius: 7, fontWeight: 500 } },
        resetButtonProps: { style: { borderRadius: 7 } },
      }}
    >
      {fields}
    </ModalForm>
  );
};

export default AddEditProUserModal;
