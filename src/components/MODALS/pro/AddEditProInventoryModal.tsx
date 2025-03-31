import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space, Upload, message } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
  ProFormMoney,
} from "@ant-design/pro-form";
import BusinessIcon from "@mui/icons-material/Business";
import useAddSupplierDialog from "../Hooks/useAddSupplierDialog";
import { ActionType } from "@ant-design/pro-components";
import {
  EditOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  SisternodeOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { fetchSubCategories } from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useAddEditProductInventory } from "../Hooks/useAddEditProductInventory";
import { useQuery } from "@tanstack/react-query";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewInventory, editInventory } from "@services/inventory";
import { RcFile } from "antd/lib/upload";
import { UploadFile, UploadProps } from "antd/lib";


interface inventory {
  name: string;
  quantity: number;
  cost: number;
  price: number;
  min_viable_quantity: number;
  category_id: string;
  supplier_id: string;
  desc: string;
}

interface AddInventoryDialogProps {
  data?: any;
  actionRef?: any;
  edit?: boolean;
}

interface unitType {
  name: string;
  _id: string;
}

const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({
  data,
  actionRef,
  edit,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        subcategory_id: {
          value: data?.subcategory_id?._id,
          lable: data?.subcategory_id?.name,
        },
        unit_id: {
          value: data?.unit_id?._id,
          lable: data?.unit_id?.name,
        },
      });


      // Set initial image if editing an inventory with an existing image
      if (data?.thumbnail) {
        setPreviewImage(data.thumbnail);
        setFileList([
          {
            uid: '-1',
            name: 'image.png',
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

  // Fetch units using React Query
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const UnitsRequest = async () => {
    const data = units?.map((unit: unitType) => ({
      label: unit?.name,
      value: unit?._id,
    }));
    return data;
  };

  //  Fetch sub categories using React Query
  const { data: subCategories } = useQuery({
    queryKey: ["subCategories"],
    queryFn: fetchSubCategories,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const SubCategoriesRequest = async () => {
    const data = subCategories?.map((e: { name: string; _id: string }) => {
      return { label: e.name, value: e._id };
    });
    return data;
  };

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

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        width={750}
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <ReconciliationOutlined />
            {edit ? "Edit Inventory" : "Add New Inventory "}
          </Space>
        }
        trigger={
          edit ? (
            <Button
              key="button"
              size="small"
              onClick={() => form.setFieldsValue(data)}
              icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
            >
              Edit
            </Button>
          ) : (
            <Button
              type="primary"
              key="button"
              icon={<ReconciliationOutlined />}
            >
              New Inventory
            </Button>
          )
        }
        initialValues={
          edit
            ? {
              ...data,
              subcategory_id: {
                value: data?.subcategory_id?._id,
                label: data?.subcategory_id?.name,
              },
              unit_id: {
                value: data?.unit_id?._id,
                label: data?.unit_id?.name,
              },
            }
            : {}
        }
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${edit ? "update this" : "add new"
              } Inventory?`,
            position: true,
          });
          if (confirmed) {
            try {
              // Add the file to the values if it exists
              if (uploadedFile) {
                values.imageFile = uploadedFile;
              }

              edit
                ? await editInventory({ values, _id: data?._id })
                : await addNewInventory(values);

              actionRef.current.reload();
              setOpen(false);
              return true;
            } catch (error) {
              console.error("Error submitting form:", error);
              message.error("Failed to save inventory");
              return false;
            }
          }
        }}
        form={form}
        formRef={formRef}
        autoFocusFirstInput
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: edit ? "Edit Inventory" : "Add Inventory",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter Product name"
          />

          <ProFormSelect
            width="md"
            name="subcategory_id"
            label="Subcategory"
            rules={[{ required: true, message: "Subcategory is required" }]}
            showSearch
            placeholder="Select subcategory"
            request={SubCategoriesRequest}
          />
          <ProFormDigit
            width="md"
            name="quantity"
            label="Quantity"
            rules={[
              {
                required: true,
                message: "Invalid Quantinty format",
              },
            ]}
            placeholder="Enter Product Quantinty"
          />
          <ProFormSelect
            name={"unit_id"}
            showSearch
            label="Unit"
            placeholder="Select unit"
            rules={[{ required: true, message: "Unit is required" }]}
            request={UnitsRequest}
            width="md"
          />
          <ProFormMoney
            width="md"
            name="price"
            label="Purchase cost"
            customSymbol="Ksh."
            rules={[
              {
                required: true,
                message: "Invalid money format",
              },
            ]}
            placeholder="Enter Product Quantinty"
          />
          <ProFormDigit
            width="md"
            name="min_viable_quantity"
            label="Minimum viable Quantity"
            placeholder="Enter minimum viable quantity"
          />
          <ProFormTextArea
            width="md"
            name="desc"
            label="Description"
            placeholder="Enter Product description if any."
          />
        </ProForm.Group>

        {/* Inventory Image Upload Section */}
        <div style={{ padding: '0 24px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>Inventory Image</div>
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
                alt="Inventory preview"
                style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </ModalForm>
    </Space>
  );
};

export default AddEditProInventoryModal;