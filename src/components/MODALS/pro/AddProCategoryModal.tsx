// AddProCategoryDialog.tsx
import React from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProForm,
} from "@ant-design/pro-form";
import useAddCategoryDialog from "../Hooks/useAddCategoryDialog";
import {
  fetchSubCategories,
} from "../../../services/categories";
import { ApartmentOutlined, EditOutlined } from "@ant-design/icons";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
}

interface AddCategoryDialogProps {
  onAddCategory: (category: Category) => void;
  actionRef: any;
  edit: boolean;
  data: { subcategory_id :string,sub_category:{name:string,_id:string}};
}

const AddProCategoryModal: React.FC<AddCategoryDialogProps> = ({
  onAddCategory,
  actionRef,
  edit,data
}) => {
  const {
    isSubmitting,
    form,
    handleConfirmAddCategory,
    handleSubCategoryChange,
    handleClose,
    setIsSubmitting,
  } = useAddCategoryDialog({ onAddCategory });

  return (
    <ModalForm
      width={750}
      title={
        <Space>
          <ApartmentOutlined />
          Add New Category
        </Space>
      }
      initialValues={
        edit ? { ...data, subcategory_id: { value: data?.sub_category?._id,label:data?.sub_category?.name } } : {}
      }
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          ></Button>
        ) : (
          <Button key="button" icon={<ApartmentOutlined />}>
            New Category
          </Button>
        )
      }
      onFinish={async (values) => {
        await handleConfirmAddCategory(values);
        actionRef.current.reload();
      }}
      onOpenChange={(visible) => !visible && handleClose()}
      form={form}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Add category",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter category name"
        />

        <ProFormSelect
          width="md"
          name="subcategory_id"
          label="Subcategory"
          rules={[{ required: true, message: "Subcategory is required" }]}
          showSearch
          placeholder="Select subcategory"
          request={async () => {
            const data = await fetchSubCategories();
            const values = data.map((e) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
          onChange={handleSubCategoryChange}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProCategoryModal;
