import { useState } from "react";
import { message, notification } from "antd/lib";
import { ProForm } from "@ant-design/pro-components";
import { useAppDispatch, useAppSelector } from "../../../store";
import { resetSupplierMessage } from "../../../features/Supplier/SupplierSlice";
import { createSupplier } from "../../../features/Supplier/SupplierActions";

interface Supplier {
  _id?: string;
  name: string;
  email: string;
  phone: string;
}

interface UseAddSupplierDialogProps {
  onAddSupplier: (supplier: Supplier) => void;
}

const useAddSupplierDialog = ({
  onAddSupplier,
}: UseAddSupplierDialogProps) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = ProForm.useForm();

  const { isSuccess } = useAppSelector((state) => state.supplier);

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };

  const handleInputChange = () => {
    // handle change
  };

  const handleConfirmAddSupplier = async (data: Supplier) => {
    try {
      dispatch(resetSupplierMessage());
      dispatch(createSupplier(data));
      onAddSupplier(data);
      handleClose();

      if (isSuccess) {
        notification.success({
          message: `Success`,
          description: "Successfully added new supplier",
          placement: "bottomLeft",
        });
      } else {
         notification.error({
          message: `Error`,
          description: "Failed to add a new supplier",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
    }
  };

  return {
    isSubmitting,
    form,
    handleInputChange,
    handleConfirmAddSupplier,
    handleClose,
    setIsSubmitting,
  };
};

export default useAddSupplierDialog;