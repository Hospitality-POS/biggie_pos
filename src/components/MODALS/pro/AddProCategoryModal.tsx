// AddProCategoryDialog.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProForm,
} from "@ant-design/pro-form";
import {
  addNewCategory,
  fetchSubCategories,
  updateCategory,
} from "../../../services/categories";
import { ApartmentOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { useQuery } from "@tanstack/react-query";

interface AddCategoryDialogProps {
  actionRef: any;
  edit?: boolean;
  data?: {
    _id: string;
    name: string;
    subcategory_id: string;
    sub_category: { name: string; _id: string };
  };
}

const AddProCategoryModal: React.FC<AddCategoryDialogProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        name: data.name,
        subcategory_id: data.sub_category?._id,
      });
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  const {data: subCategories} = useQuery({
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

  return (
    <ModalForm
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      formRef={formRef}
      title={
        <Space>
          <ApartmentOutlined />
          {edit ? "Edit Category" : "Add New Category"}
        </Space>
      }
      initialValues={
        edit
          ? {
              name: data?.name,
              subcategory_id: data?.sub_category?._id,
            }
          : {}
      }
      trigger={
        edit ? (
          <Button
            size="small"
            key="button"
            icon={<EditOutlined style={{ color: "#914F1E" }} />}
            onClick={() => form.setFieldsValue(data)}
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<ApartmentOutlined />}>
            New Category
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${
            edit ? "update this" : "add new"
          } Category?`,
          position: true,
        });
        if (confirmed) {
          data
            ? await updateCategory({ ...values, _id: data?._id })
            : await addNewCategory(values);
          actionRef.current?.reload();
          setOpen(false);
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit category" : "Add category",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          hasFeedback
          width="md"
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter category name"
        />

        <ProFormSelect
          hasFeedback
          width="md"
          name="subcategory_id"
          label="Subcategory"
          rules={[{ required: true, message: "Subcategory is required" }]}
          showSearch
          placeholder="Select subcategory"
          request={SubCategoriesRequest}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProCategoryModal;
