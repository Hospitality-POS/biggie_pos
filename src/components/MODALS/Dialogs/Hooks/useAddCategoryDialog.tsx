import { useRef, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../../../store";
import { resetCategoryMessage } from "../../../../features/Category/CategorySlice";
import { createCategory } from "../../../../features/Category/CategoryActions";
import { message } from "antd";
import { ProForm } from "@ant-design/pro-components";

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

  const dispatch = useDispatch();
  const waitTime = (time: number = 100) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    });
  };
  const handleConfirmAddCategory = async (data: Category)  => {
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
        message.success("Successfully added new category");
      }else {
        message.error("Failed to add a new category");
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

  return {
    isSubmitting,
    form,
    subcategories,
    handleConfirmAddCategory,
    handleSubCategoryChange,
    handleClose,
    setIsSubmitting
  };
};

export default useAddCategoryDialog;
