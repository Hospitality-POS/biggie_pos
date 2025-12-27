import React, { useRef, useState, useEffect } from "react";
import { Button, Form, Space, Upload, message } from "antd";
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
  FolderAddTwoTone,
  PlusCircleFilled,
  TagsOutlined,
  InboxOutlined,
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

interface StoreModalProps {
  edit?: boolean;
  data?: any;
}
interface categoryValueType {
  name: string;
  _id: string;
}
interface modifiersAddonsType {
  name: string;
  _id: string;
  addons: any[];
}

const StoreModal: React.FC<StoreModalProps> = ({ edit, data }) => {
  const [form] = Form.useForm();
  const formRef = useRef<FormInstance>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Set initial image if editing a product with an existing thumbnail
  useEffect(() => {
    if (edit && data?.thumbnail) {
      setPreviewImage(data.thumbnail);
      setFileList([
        {
          uid: "-1",
          name: "thumbnail.png",
          status: "done",
          url: data.thumbnail,
        },
      ]);
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
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: categoryData } = useQuery({
    queryKey: ["store-category"],
    queryFn: () => fetchAllCategories({}),
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const AddonsRequest = async () => {
    const values = allAddons?.map((modifierAddon: modifiersAddonsType) => ({
      label: modifierAddon?.name,
      title: modifierAddon?.name,
      value: modifierAddon?._id,
      key: modifierAddon?._id,
      disabled: true,
      children: modifierAddon?.addons?.map((childTable) => ({
        label: childTable?.name,
        title: childTable?.name,
        value: childTable?._id,
        icon: <CarryOutOutlined />,
        key: childTable?._id,
      })),
    }));
    return values;
  };

  const CategoryRequest = async () => {
    const values = categoryData?.map((e: categoryValueType) => {
      return { label: e.name, value: e._id, key: e._id };
    });
    return values;
  };

  const editPayload = {
    ...data,
    category: {
      value: data?.category?._id,
      lable: data?.category?.name,
    },
    addons: data?.addons?.map((addon: any) => ({
      value: addon._id,
      label: addon.name,
    })),
  };

  // File upload properties
  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("You can only upload image files!");
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Image must be smaller than 5MB!");
      return false;
    }

    // Store the file directly
    setUploadedFile(file);
    return false; // Prevent auto upload
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
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

  const HandleOnFinish = async (values) => {
    try {
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${
          edit ? "update this" : "add new"
        } Product?`,
        position: true,
      });

      if (confirmed) {
        console.log("Form values:", values);
        console.log("File list:", fileList);

        let thumbnailFile = null;

        // If a new file is selected, assign it
        if (fileList.length > 0 && fileList[0].originFileObj) {
          thumbnailFile = fileList[0].originFileObj;
        }

        console.log(
          "Thumbnail file to send:",
          thumbnailFile ? thumbnailFile.name : "No new file"
        );

        // Prepare product data
        const productData = {
          ...values,
          addons: values.addons?.map((addon) => addon.value) || [],
          ...(thumbnailFile && { thumbnailFile }), // Only add if changed
          name: values.name,
          price: Number(values.price) || 0,
          quantity: Number(values.quantity) || 1,
          min_viable_quantity: Number(values.min_viable_quantity) || 0,
          activateInventory: Boolean(values.activateInventory),
        };

        console.log("Final product data before sending:", productData);

        if (edit) {
          await editProduct({
            ...productData,
            _id: data?._id,
          });
        } else {
          await addNewProduct(productData);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error submitting form:", error);
      message.error("Failed to save product");
      return false;
    }
  };

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      title={
        <Space>
          <FolderAddTwoTone />
          {edit ? "Edit Product" : "Add New Product"}
        </Space>
      }
      initialValues={edit ? editPayload : {}}
      trigger={
        edit ? (
          <Button
            type="link"
            disabled={!isAdmin}
            key="button"
            icon={
              <EditOutlined
                style={{ fontSize: "20px", color: "white" }}
                onClick={() => form.setFieldsValue(editPayload)}
              />
            }
          ></Button>
        ) : (
          <Button type="primary" block>
            <PlusCircleFilled />
            New Item
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: 800,
      }}
      onFinish={HandleOnFinish}
      onOpenChange={(visible) => !visible}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Product" : "Add New Product",
        },
      }}
    >
      <ProForm.Group title="Product Details">
        <ProFormText
          hasFeedback
          width="md"
          id="productName"
          name="name"
          label="Name"
          rules={[{ required: true, message: "Product name is required" }]}
          placeholder="Enter product name"
        />

        <ProFormSelect
          hasFeedback
          width="md"
          name="category"
          label="Category"
          rules={[{ required: true, message: "Product category is required" }]}
          showSearch
          placeholder="Select product category"
          request={CategoryRequest}
        />

        {edit && (
          <>
            <ProFormText
              key={"sub_category"}
              disabled
              width="md"
              id="product-sub-category"
              name={["sub_category", "name"]}
              label="Sub-Category"
            />
            <ProFormText
              hasFeedback
              disabled
              width="md"
              id="productcode"
              name="code"
              label="Code"
              convertValue={(value, _) => value?.toUpperCase()}
            />
          </>
        )}
        <ProFormMoney
          key={"price"}
          hasFeedback
          width="md"
          name="price"
          customSymbol="Ksh."
          label="Price"
          rules={[{ required: true, message: "Product Price is required" }]}
          placeholder="Enter Product Price"
        />

        {/* vat type */}
        <ProFormSelect
          name="vat_type"
          showSearch
          width="md"
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
          width="md"
          id="activateInventory"
          name="activateInventory"
          label="Activate Inventory"
          rules={[
            {
              validator: (_, value) => {
                if (value === undefined) {
                  return Promise.reject(
                    "Please select if the product should auto deduct Inventory"
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          placeholder="Select if the product should auto deduct Inventory"
          initialValue={false}
        />
      </ProForm.Group>

      <ProForm.Group size={"large"} title="More Info*">
        <ProFormTreeSelect
          name="addons"
          width={"md"}
          key={"addons"}
          label="Addons (optional)"
          request={AddonsRequest}
          placeholder="Select addons"
          allowClear
          fieldProps={{
            id: "addons",
            treeLine: true,
            suffixIcon: <TagsOutlined />,
            treeIcon: true,
            filterTreeNode: true,
            showSearch: true,
            popupMatchSelectWidth: false,
            labelInValue: true,
            treeTitleRender: (value) => (
              <span
                style={{
                  color: "black",
                  fontWeight: "normal",
                  fontSize: "14px",
                }}
              >
                {value.title}
              </span>
            ),
            autoClearSearchValue: true,
            multiple: true,
            treeNodeFilterProp: "title",
            fieldNames: {
              label: "title",
            },
            getPopupContainer: () => document.body,
          }}
          style={{ width: "100%" }}
        />
        <ProFormTextArea
          key={"desc"}
          hasFeedback
          width="md"
          name="desc"
          label="Description"
          placeholder="Enter Product Description if any."
        />
      </ProForm.Group>

      {/* Product Thumbnail Upload Section - Full Width */}
      <div style={{ padding: "0 24px", marginBottom: "24px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "16px" }}>
          Product Thumbnail
        </div>
        <Upload.Dragger
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleChange}
          maxCount={1}
          showUploadList={{ showRemoveIcon: true }}
          accept="image/*"
          style={{ width: "100%" }}
          customRequest={customRequest}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: "#40a9ff" }} />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
          <p className="ant-upload-hint">
            Support for a single image file. Maximum size: 5MB.
          </p>
        </Upload.Dragger>

        {previewImage && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <img
              src={previewImage}
              alt="Product preview"
              style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
        )}
      </div>
    </ModalForm>
  );
};

export default StoreModal;
