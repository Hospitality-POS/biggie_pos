import { useState } from "react";
import { message, notification } from "antd/lib";
import { ProForm } from "@ant-design/pro-components";
import { useAppDispatch, useAppSelector } from "../../../store";
import { resetSupplierMessage } from "../../../features/Supplier/SupplierSlice";
import { createSupplier } from "../../../features/Supplier/SupplierActions";
import { createUser, updateUser } from "@features/Auth/AuthActions";
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

  const { isSuccess } = useAppSelector((state) => state.auth);

  const handleClose = () => {
    setIsSubmitting(false);
  };

  const handleInputChange = () => {
    // handle change
  };

  const handleConfirmAddUser = async (data: User) => {
    try {
      dispatch(resetMessage());
      dispatch(createUser(data));
      onAddUser(data);
      handleClose();

      if (isSuccess) {
        message.success("User added successfully");
        return true
      } else {
        message.error("Failed to add a new User");
      }
      
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const handleConfirmEditUser = async (data) => {
    // console.log("user edit", data);

    try {
      updateUsers(data)
      handleClose();
      
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
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
