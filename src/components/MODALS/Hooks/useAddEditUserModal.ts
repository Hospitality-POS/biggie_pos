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
}

interface useAddEditUserModalProps {
  onAddUser: (user: User) => void;
}

const useAddEditUserModal = ({ onAddUser }: useAddEditUserModalProps) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = ProForm.useForm();

  const { isSuccess } = useAppSelector((state) => state.auth);

  const handleClose = () => {
    form.resetFields();
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
        notification.success({
          message: `Success`,
          description: "Successfully added new User",
          placement: "bottomLeft",
        });
      } else {
        notification.error({
          message: `Error`,
          description: "Failed to add a new User",
          placement: "bottomLeft",
        });
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
    form,
    handleInputChange,
    handleConfirmAddUser,
    handleClose,
    setIsSubmitting,
    handleConfirmEditUser,
  };
};

export default useAddEditUserModal;
