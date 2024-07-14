// AddProCategoryDialog.tsx
import React, { useRef } from "react";
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

  return (
    <ModalForm
      form={form}
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
              ...data,
              subcategory_id: {
                value: data?.sub_category?._id,
                lable: data?.sub_category?.name,
              },
            }
          : {}
      }
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
            onClick={() => form.setFieldsValue(data)}
          ></Button>
        ) : (
          <Button key="button" icon={<ApartmentOutlined />}>
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
          } Cateory?`,
        });
        if (confirmed) {
          edit
            ? await updateCategory({ values, _id: data?._id })
            : await addNewCategory(values);
          actionRef.current.reset();
          return true;
        }
      }}
      onOpenChange={(visible) => !visible}
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
          request={async (params) => {
            const data = await fetchSubCategories(params);
            const values = data.map((e: { name: any; _id: any }) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProCategoryModal;
