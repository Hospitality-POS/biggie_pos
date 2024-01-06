import { useState } from "react";
import { ProForm } from "@ant-design/pro-components";

import { notification } from "antd";
import { useAppDispatch } from "../../../store";
import { createTable } from "../../../features/Table/TableActions";
import { resetTableMessage } from "../../../features/Table/TableSlice";

interface UseAddTableProps {
  onAddTable: (table: any) => void;
}

export const useAddEditTableModal = ({ onAddTable }: UseAddTableProps) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = ProForm.useForm();

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };

  const handleInputChange = () => {
    // handle change
  };

  const handleConfirmAddTable = async (data) => {
    try {
      dispatch(resetTableMessage());
      dispatch(createTable(data));
      onAddTable(data);
      handleClose();

      notification.success({
        message: `Success`,
        description: "Successfully added new Table",
        placement: "bottomLeft",
      });
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
      notification.error({
        message: `Error`,
        description: "Failed to add a new Table",
        placement: "bottomLeft",
      });
    }
  };

  const handeLocationChange = (LocationId: string) => {
    // Do something with the sub-category change if needed
  };
  return {
    isSubmitting,
    form,
    handleConfirmAddTable,
    handleClose,
    setIsSubmitting,
    handeLocationChange,
  };
};
