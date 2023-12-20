import React, { useState } from "react";
import { Button,  Space, message} from "antd";
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProForm,
} from "@ant-design/pro-form";
import CategoryIcon from "@mui/icons-material/Category";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { resetCategoryMessage } from "../../../features/Category/CategorySlice";
import { createCategory } from "../../../features/Category/CategoryActions";
import { useAppSelector } from "../../../store";


interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
  subcategory_id: string;
}

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (category: Category) => void;
}

const AddProCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onClose,
  onAddCategory,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
    const {isSuccess}= useAppSelector(state=>state.Categories)
  const [form] = ProForm.useForm();
  const dispatch = useDispatch();

  const handleConfirmAddCategory = async (data: Category) => {
    dispatch(resetCategoryMessage());
    const newCategory: Category = {
      name: data.name,
      sub_category: data.subcategory_id,
    };
    // dispatch(createCategory(newCategory));
    // onAddCategory(data);
    // handleClose();
     try {
      // Assuming createCategory is an asynchronous function
      dispatch(createCategory(newCategory));
      onAddCategory(data);
      setIsSubmitting(true);
      handleClose();
      message.success("Successfully added new category");
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
      !isSuccess && message.error("Failed to add a new category");
    }
  };

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);

    onClose();
  };

  const fetchSubCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/categories/sub-categories"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subcategories", error);
      return [];
    }
  };

  const { data: subcategories } = useQuery(
    ["subcategories"],
    fetchSubCategories
  );

  const handleSubCategoryChange = (subCategoryId: string) => {
    // Do something with the sub-category change if needed
  };

 

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
            options={subcategories?.map(
              (subcategory: { _id: string; name: string }) => ({
                value: subcategory._id,
                label: subcategory.name,
              })
            )}
            onChange={handleSubCategoryChange}
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddProCategoryDialog;