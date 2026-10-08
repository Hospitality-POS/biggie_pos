import { useState } from "react";
import { message } from "antd/lib";
import { useAppDispatch } from "../../../store";
import { createUser } from "@features/Auth/AuthActions";
import { resetMessage } from "@features/Auth/AuthSlice";
import { updateUsers } from "@services/users";

interface User {
  fullname: string;
  username: string;
  email: string;
  pin: string;
  phone: string;
  idNumber: string;
  isAdmin: string;
  roleId: string;
  role: any;
}

interface useAddEditUserModalProps {
  onAddUser?: (user: User) => void;
}

const useAddEditUserModal = ({ onAddUser }: useAddEditUserModalProps) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setIsSubmitting(false);
  };

  const handleInputChange = () => {
    // handle change
  };

  const handleConfirmAddUser = async (
    data: User
  ): Promise<{ success: boolean; message?: string; field?: string }> => {
    try {
      dispatch(resetMessage());
      const result = await dispatch(createUser(data) as any);

      if (createUser.fulfilled.match(result)) {
        onAddUser?.(data);
        handleClose();
        return { success: true };
      }

      const payload = result.payload;
      const errorMessage =
        typeof payload === "string"
          ? payload
          : payload?.message || "Failed to add a new User";
      const field = typeof payload === "object" ? payload?.field : undefined;
      return { success: false, message: errorMessage, field };
    } catch (error: any) {
      setIsSubmitting(false);
      handleClose();
      const errorMessage =
        error?.response?.data?.message || error?.message || "Failed to add a new User";
      return { success: false, message: errorMessage, field: error?.response?.data?.field };
    }
  };

  const handleConfirmEditUser = async (data: any) => {
    try {
      await updateUsers(data);
      handleClose();
      message.success("User updated successfully");
      return true;
    } catch (error: any) {
      setIsSubmitting(false);
      handleClose();
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update user";
      message.error(errorMessage);
      return false;
    }
  };
  return {
    isSubmitting,
    handleInputChange,
    handleConfirmAddUser,
    handleClose,
    setIsSubmitting,
    handleConfirmEditUser,
  };
};

export default useAddEditUserModal;
