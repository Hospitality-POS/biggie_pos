import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { resetCategoryMessage } from "../../../../features/Category/CategorySlice";
import { createCategory } from "../../../../features/Category/CategoryActions";
import { message } from "antd";
import { ProForm } from "@ant-design/pro-components";
import { notification } from "antd/lib";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
  subcategory_id: string;
}

interface UseAddCategoryDialogProps {
  onAddCategory: (category: Category) => void;
}

const useAddCategoryDialog = ({ onAddCategory }: UseAddCategoryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isSuccess } = useAppSelector((state) => state.Categories);
  const [form] = ProForm.useForm();
  const dispatch = useAppDispatch();

  const handleConfirmAddCategory = async (data: Category) => {
    dispatch(resetCategoryMessage());
    const newCategory: Category = {
      name: data.name,
      sub_category: data.subcategory_id,
      subcategory_id: "",
    };

    try {
      dispatch(createCategory(newCategory));
      onAddCategory(data);
      setIsSubmitting(true);
      handleClose();

      if (isSuccess) {
        notification.success({
          message: `Success`,
          description: "Successfully added new category",
          placement: "bottomLeft",
        });
      } else {
        notification.error({
          message: `Error`,
          description: "Failed to add a new category",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };

  const handleSubCategoryChange = (subCategoryId: string) => {
    // Do something with the sub-category change if needed
  };

  return {
    isSubmitting,
    form,
    handleConfirmAddCategory,
    handleSubCategoryChange,
    handleClose,
    setIsSubmitting,
  };
};

export default useAddCategoryDialog;
