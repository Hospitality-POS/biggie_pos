// AddProCategoryDialog.tsx
import React from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProForm,
} from "@ant-design/pro-form";
import CategoryIcon from "@mui/icons-material/Category";
import useAddCategoryDialog from "../Hooks/useAddCategoryDialog";
import { ActionType } from "@ant-design/pro-components";
import {
  fetchAllCategories,
  fetchSubCategories,
} from "../../../services/categories";
import { ApartmentOutlined, PlusOutlined } from "@ant-design/icons";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
}

interface AddCategoryDialogProps {
  onAddCategory: (category: Category) => void;
  actionRef: any;
}

const AddProCategoryModal: React.FC<AddCategoryDialogProps> = ({
  onAddCategory,
  actionRef,
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
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        width={750}
        open={isSubmitting}
        title={
          <Space>
            <ApartmentOutlined />
            Add New Category
          </Space>
        }
        trigger={
          <Button
            onClick={() => setIsSubmitting(true)}
            key="button"
            icon={<ApartmentOutlined />}
          >
            New
          </Button>
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
    </Space>
  );
};

export default AddProCategoryModal;
