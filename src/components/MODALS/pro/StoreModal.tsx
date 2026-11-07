import React, { useRef, useState, useEffect } from "react";
import { Button, Form, Grid, Steps, Upload, message, Typography } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
  ProFormTreeSelect,
  ProFormSwitch,
} from "@ant-design/pro-form";
import {
  CarryOutOutlined,
  EditOutlined,
  FolderAddOutlined,
  PlusOutlined,
  TagsOutlined,
  InboxOutlined,
  DollarOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { ProFormMoney, ProFormTextArea } from "@ant-design/pro-components";
import ShowConfirm from "@utils/ConfirmUtil";
import { fetchAllCategories } from "@services/categories";
import { addNewProduct, editProduct } from "@services/products";
import { getAllModifierAddons } from "@services/modifierAddons";
import { useQuery } from "@tanstack/react-query";
import { FormInstance, UploadFile, UploadProps } from "antd/lib";
import { useAppSelector } from "src/store";
import { RcFile } from "antd/lib/upload";

import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

// ── Palette (Dynamic Getters) ────────────────────────────────────────────────
const C = THEME_C;

interface StoreModalProps {
  edit?: boolean;
  data?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}
interface categoryValueType { name: string; _id: string; }
interface modifiersAddonsType { name: string; _id: string; addons: any[]; }

const StoreModal: React.FC<StoreModalProps> = ({ edit, data, onSuccess, trigger: customTrigger }) => {
  const [form] = Form.useForm();
  const formRef = useRef<FormInstance>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (edit && data?.thumbnail) {
      setPreviewImage(data.thumbnail);
      setFileList([{ uid: "-1", name: "thumbnail.png", status: "done", url: data.thumbnail }]);
    } else {
      setFileList([]);
      setPreviewImage(null);
      setUploadedFile(null);
    }
  }, [edit, data]);

  const { data: allAddons } = useQuery({
    queryKey: ["addons"],
    queryFn: getAllModifierAddons,
    retry: 3,
    networkMode: "always",
  });

  const { data: categoryData } = useQuery({
    queryKey: ["store-category"],
    queryFn: () => fetchAllCategories({}),
    networkMode: "always",
  });

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const isCashier = user?.role === "cashier";
  const canEditProduct = isAdmin || isCashier;

  const AddonsRequest = async () =>
    allAddons?.map((modifierAddon: modifiersAddonsType) => ({
      label: modifierAddon?.name,
      title: modifierAddon?.name,
      value: modifierAddon?._id,
      key: modifierAddon?._id,
      children: modifierAddon?.addons?.map((child) => ({
        label: child?.name,
        title: child?.name,
        value: child?._id,
        icon: <CarryOutOutlined />,
        key: child?._id,
      })),
    }));

  const CategoryRequest = async () =>
    categoryData?.map((e: categoryValueType) => ({
      label: e.name, value: e._id, key: e._id,
    }));

  const editPayload = {
    ...data,
    category: { value: data?.category?._id, lable: data?.category?.name },
    addons: data?.addons?.map((addon: any) => {
      // Handle both string IDs and object formats
      if (typeof addon === 'string') {
        // Find the addon/modifier in allAddons to get the label
        let foundAddon: any = null;
        let foundInModifier = false;

        for (const modifier of allAddons || []) {
          // Check if it's a modifier (parent)
          if (modifier._id === addon) {
            foundAddon = modifier;
            foundInModifier = true;
            break;
          }
          // Check if it's an addon (child)
          const childAddon = modifier.addons?.find((a: any) => a._id === addon);
          if (childAddon) {
            foundAddon = childAddon;
            foundInModifier = false;
            break;
          }
        }

        if (foundAddon) {
          return {
            value: foundAddon._id,
            label: foundAddon.name,
            ...(foundInModifier && { isModifier: true }),
          };
        }
        // Fallback if not found
        return { value: addon, label: addon };
      }

      // Handle object format (existing logic)
      const isModifier = addon.modifier || (addon.addons && Array.isArray(addon.addons));
      return {
        value: addon._id,
        label: addon.name || addon.title,
        ...(isModifier && { isModifier: true }),
      };
    }),
  };

  const beforeUpload = (file: RcFile) => {
    if (!file.type.startsWith("image/")) {
      message.error("You can only upload image files!");
      return false;
    }
    if (file.size / 1024 / 1024 >= 5) {
      message.error("Image must be smaller than 5MB!");
      return false;
    }
    setUploadedFile(file);
    return false;
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      setUploadedFile(newFileList[0].originFileObj);
      setPreviewImage(URL.createObjectURL(newFileList[0].originFileObj));
    } else if (newFileList.length > 0 && newFileList[0].url) {
      setPreviewImage(newFileList[0].url);
    } else {
      setPreviewImage(null);
      setUploadedFile(null);
    }
    setFileList(newFileList);
  };

  const customRequest = ({ onSuccess }: any) => {
    setTimeout(() => onSuccess && onSuccess("ok"), 0);
  };

  const HandleOnFinish = async (values) => {
    try {
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"} Product?`,
        position: true,
      });
      if (!confirmed) return false;

      const thumbnailFile =
        fileList.length > 0 && fileList[0].originFileObj
          ? fileList[0].originFileObj
          : null;

      const productData = {
        ...values,
        addons: values.addons?.map((addon) => addon.value) || [],
        ...(thumbnailFile && { thumbnailFile }),
        name: values.name,
        price: Number(values.price) || 0,
        quantity: Number(values.quantity) || 1,
        min_viable_quantity: Number(values.min_viable_quantity) || 0,
        activateInventory: Boolean(values.activateInventory),
      };

      if (edit) {
        await editProduct({ ...productData, _id: data?._id });
      } else {
        await addNewProduct(productData);
      }
      onSuccess?.();
      return true;
    } catch {
      message.error("Failed to save product");
      return false;
    }
  };

  // ── Steps (left side) ───────────────────────────────────────────────────────
  const STEPS = [
    { title: "Details", description: "Name & category", icon: <TagsOutlined /> },
    { title: "Pricing & Stock", description: "Price, VAT & inventory", icon: <DollarOutlined /> },
    { title: "Add-ons & Image", description: "Optional extras", icon: <PictureOutlined /> },
  ];
  // Fields checked before leaving each step
  const STEP_FIELDS: string[][] = [
    ["name", "category"],
    ["price", "vat_type", "activateInventory"],
    [],
  ];
  const [step, setStep] = useState(0);
  const screens = Grid.useBreakpoint();
  const vertical = screens.md !== false;
  const isLast = step === STEPS.length - 1;
  const show = (i: number) => ({ display: step === i ? "block" : "none" });

  const nextStep = async () => {
    try {
      const names = STEP_FIELDS[step];
      if (names.length) await form.validateFields(names);
      setStep((s) => s + 1);
    } catch { /* field errors are shown inline */ }
  };

  // Every step stays mounted — check each in turn and jump to the first with an error
  const submitAll = async (submit: () => void) => {
    for (let i = 0; i < STEP_FIELDS.length; i++) {
      if (!STEP_FIELDS[i].length) continue;
      try {
        await form.validateFields(STEP_FIELDS[i]);
      } catch {
        setStep(i);
        return;
      }
    }
    submit();
  };

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: C.primaryLight, borderRadius: 7,
            padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
          }}>
            <FolderAddOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>
            {edit ? "Edit Product" : "Add New Product"}
          </Text>
        </div>
      }
      initialValues={edit ? editPayload : {}}
      trigger={
        customTrigger ? (
          <span onClick={() => form.setFieldsValue(edit ? editPayload : {})}>{customTrigger}</span>
        ) : edit ? (
          <Button
            type="link"
            disabled={!canEditProduct}
            key="button"
            icon={
              <EditOutlined
                style={{ fontSize: "20px", color: "white" }}
                onClick={() => form.setFieldsValue(editPayload)}
              />
            }
          />
        ) : (
          <Button type="primary" block
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}>
            <PlusOutlined /> New Item
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: 900,
        maskClosable: false,
      }}
      onFinish={HandleOnFinish}
      // Always start from the first step
      onOpenChange={(visible) => { if (visible) setStep(0); }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Product" : "Add New Product",
        },
        render: (props, doms) => [
          // doms[0] is the Cancel button (it closes the modal)
          doms[0],
          step > 0 && (
            <Button key="back" onClick={() => setStep((s) => s - 1)} style={{ borderRadius: 8 }}>Back</Button>
          ),
          isLast ? (
            <Button
              key="submit" type="primary"
              onClick={() => submitAll(() => props.submit())}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
            >
              {edit ? "Update Product" : "Add New Product"}
            </Button>
          ) : (
            <Button key="next" type="primary" onClick={nextStep}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
              Next
            </Button>
          ),
        ],
      }}
    >
      <div style={{
        display: "flex", flexDirection: vertical ? "row" : "column",
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        margin: "4px -24px 0",
      }}>
        <aside style={{
          flex: vertical ? "0 0 210px" : "none",
          background: C.bg,
          borderRight: vertical ? `1px solid ${C.border}` : undefined,
          borderBottom: vertical ? undefined : `1px solid ${C.border}`,
          padding: vertical ? "20px 16px" : "12px 16px",
          overflowX: vertical ? undefined : "auto",
        }}>
          <Steps
            direction={vertical ? "vertical" : "horizontal"}
            size="small"
            current={step}
            responsive={false}
            onChange={(i) => { if (i < step) setStep(i); }}
            items={STEPS.map((s, i) => ({
              title: s.title,
              description: vertical ? s.description : undefined,
              icon: s.icon,
              disabled: i >= step,
            }))}
          />
        </aside>
        <section style={{
          flex: 1, minWidth: 0, padding: "20px 24px",
          maxHeight: "calc(100vh - 240px)", overflowY: "auto",
        }}>
          {/* ── Step 1: Details ─────────────────────────────────────── */}
          <div style={show(0)}>
            <ProForm.Group>
              <ProFormText
                hasFeedback width="md" id="productName" name="name" label="Name"
                rules={[{ required: true, message: "Product name is required" }]}
                placeholder="Enter product name"
              />
              <ProFormSelect
                hasFeedback width="md" name="category" label="Category"
                rules={[{ required: true, message: "Product category is required" }]}
                showSearch placeholder="Select product category"
                request={CategoryRequest}
              />
              {edit && (
                <ProFormText
                  hasFeedback disabled width="md" id="productcode" name="code" label="Code"
                  convertValue={(value, _) => value?.toUpperCase()}
                />
              )}
            </ProForm.Group>
            <ProFormTextArea
              key="desc" hasFeedback name="desc" label="Description"
              placeholder="Enter Product Description if any."
            />
          </div>

          {/* ── Step 2: Pricing & Stock ─────────────────────────────── */}
          <div style={show(1)}>
            <ProForm.Group>
              <ProFormMoney
                key="price" hasFeedback width="md" name="price"
                customSymbol="Ksh." label="Price"
                rules={[{ required: true, message: "Product Price is required" }]}
                placeholder="Enter Product Price"
              />
              <ProFormSelect
                name="vat_type" showSearch width="md"
                tooltip="VAT Type can be Standard(16%), Zero Rated(0%) or Exempt(0%)"
                label="VAT Type"
                rules={[{ required: true, message: "VAT type is required" }]}
                placeholder="Select VAT type"
                options={[
                  { label: "Standard", value: "STANDARD" },
                  { label: "Zero Rated", value: "ZERO" },
                  { label: "Exempt", value: "EXEMPT" },
                ]}
              />
              <ProFormSwitch
                width="md" id="activateInventory" name="activateInventory"
                label="Activate Inventory"
                tooltip="When on, selling this product deducts its linked inventory"
                rules={[{
                  validator: (_, value) =>
                    value === undefined
                      ? Promise.reject("Please select if the product should auto deduct Inventory")
                      : Promise.resolve(),
                }]}
                placeholder="Select if the product should auto deduct Inventory"
                initialValue={false}
              />
            </ProForm.Group>
          </div>

          {/* ── Step 3: Add-ons & Image ─────────────────────────────── */}
          <div style={show(2)}>
            <ProFormTreeSelect
              name="addons" key="addons"
              label="Addons (optional)" request={AddonsRequest}
              placeholder="Select addons" allowClear
              fieldProps={{
                id: "addons", treeLine: true,
                suffixIcon: <TagsOutlined />, treeIcon: true,
                filterTreeNode: true, showSearch: true,
                popupMatchSelectWidth: false, labelInValue: true,
                treeTitleRender: (value) => (
                  <span style={{ color: "black", fontWeight: "normal", fontSize: "14px" }}>
                    {value.title}
                  </span>
                ),
                autoClearSearchValue: true, multiple: true,
                treeNodeFilterProp: "title",
                fieldNames: { label: "title" },
                getPopupContainer: () => document.body,
              }}
              style={{ width: "100%" }}
            />

            {/* Thumbnail upload */}
            <div style={{
              padding: "16px 20px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <Text style={{
                display: "block", fontSize: 10, fontWeight: 700, color: C.subText,
                textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12,
              }}>
                Product Thumbnail
              </Text>
              <Upload.Dragger
                fileList={fileList}
                beforeUpload={beforeUpload}
                onChange={handleChange}
                maxCount={1}
                showUploadList={{ showRemoveIcon: true }}
                accept="image/*"
                style={{ width: "100%", borderRadius: 8 }}
                customRequest={customRequest}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: 40, color: C.primary }} />
                </p>
                <p className="ant-upload-text" style={{ color: C.darkText, fontWeight: 600 }}>
                  Click or drag file to upload
                </p>
                <p className="ant-upload-hint" style={{ color: C.subText }}>
                  Single image file · Maximum 5MB
                </p>
              </Upload.Dragger>

              {previewImage && (
                <div style={{
                  marginTop: 16, textAlign: "center",
                  padding: 12, background: "#fff",
                  border: `1px solid ${C.border}`, borderRadius: 8,
                }}>
                  <img
                    src={previewImage} alt="Product preview"
                    style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ModalForm>
  );
};

export default StoreModal;
