import { useState } from "react";
import { ParamsType, ProForm } from "@ant-design/pro-components";
import { notification } from "antd/lib";
import { useAppDispatch, useAppSelector } from "../../../store";
import { resetCategoryMessage } from "@features/Category/CategorySlice";
import { createCategory, updateCategory } from "@features/Category/CategoryActions";
import { editCategory } from "@services/categories";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
  subcategory_id: string;
}

interface UseAddCategoryDialogProps {
  onAddCategory: (category: Category) => void;edit:boolean
}

const useAddCategoryDialog = ({
  onAddCategory,
  edit,
}: UseAddCategoryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isSuccess } = useAppSelector((state) => state.Categories);
  const [form] = ProForm.useForm();
  const dispatch = useAppDispatch();

  const handleConfirmAddCategory = async (data) => {

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
      
      // if (isSuccess) {
      //   notification.success({
      //     message: `Success`,
      //     description: "Successfully added new category",
      //     placement: "bottomLeft",
      //   });
      // } else {
      //   notification.error({
      //     message: `Error`,
      //     description: "Failed to add a new category",
      //     placement: "bottomLeft",
      //   });
      // }
    } catch (error) {
      handleClose();
      setIsSubmitting(false);
      notification.error({
          message: `Error`,
          description: "Failed to add a new category",
          placement: "bottomLeft",
        });
    }
  };

  const handleConfirmEditCategory =async (data: ParamsType) => {
      try {     
        editCategory(data);
        handleClose();
      } catch (error) {
        setIsSubmitting(false);
        handleClose();
      }
  }
    
  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };

  return {
    isSubmitting,
    form,
    handleConfirmAddCategory,
    handleClose,
    setIsSubmitting,
    handleConfirmEditCategory,
  };
};

export default useAddCategoryDialog;
