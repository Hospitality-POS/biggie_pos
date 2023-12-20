// AddProCategoryDialog.tsx
import React from "react";
import { Button, Space } from "antd";
import { ModalForm, ProFormSelect, ProFormText, ProForm } from "@ant-design/pro-form";
import CategoryIcon from "@mui/icons-material/Category";
import useAddCategoryDialog from "./Hooks/useAddCategoryDialog";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
}

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (category: Category) => void;
}

const AddProCategoryDialog: React.FC<AddCategoryDialogProps> = ({ open, onClose, onAddCategory }) => {
  const {
    isSubmitting,
    form,
    subcategories,
    handleConfirmAddCategory,
    handleSubCategoryChange,
    handleClose,
    setIsSubmitting
  } = useAddCategoryDialog({ onAddCategory });

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        open={isSubmitting}
        title={
          <Space>
            <CategoryIcon />
            Add New Category
          </Space>
        }
        trigger={<Button onClick={() => setIsSubmitting(true)}>Add new subcategory</Button>}
        onFinish={handleConfirmAddCategory}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "OK",
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
            placeholder="Select subcategory"
            options={subcategories?.map((subcategory: { _id: string; name: string }) => ({
              value: subcategory._id,
              label: subcategory.name,
            }))}
            onChange={handleSubCategoryChange}
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddProCategoryDialog;