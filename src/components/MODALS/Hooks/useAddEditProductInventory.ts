import { ProForm } from "@ant-design/pro-components";
import { createProductInventory } from "@features/Inventory/product/productInventoryActions";
import { notification } from "antd/lib";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "src/store";

interface NewProductInventory {
  name: string;
  quantity: number;
  cost: number;
  price: number;
  min_viable_quantity: number;
  category_id: string;
  supplier_id: string;
  desc: string;
}

interface InventoryModalProps {
  onAddInventory: (newProduct: NewProductInventory) => void;
}
export const useAddEditProductInventory = ({
  onAddInventory,
}: InventoryModalProps) => {
  const dispatch = useAppDispatch();
  const { isSuccess } = useAppSelector((state) => state.productInventory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = ProForm.useForm();
  const handleConfirmAddProductInventory = async (data: NewProductInventory) => {
    console.log("adfgsdfsdfg", data);
    
    try {
      dispatch(createProductInventory(data));
      onAddInventory(data)
      handleClose();

      if (isSuccess) {
        notification.success({
          message: `Success`,
          description: "Successfully added a new Product Inventory",
          placement: "bottomLeft",
        });
      } else {
        notification.error({
          message: `Sorry!`,
          description: "Failed to add a new Product Inventory",
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

  return {
    isSubmitting,
    form,
    handleConfirmAddProductInventory,
    handleClose,
    setIsSubmitting,
  };
};
