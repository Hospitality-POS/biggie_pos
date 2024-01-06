import { useState } from "react";
import { useDispatch } from "react-redux";
import { deleteCategory } from "../../../features/Category/CategoryActions";
import { message } from "antd";
import { Modal, notification } from "antd/lib";
import { deleteUser } from "../../../features/Auth/AuthActions";
import { useAppDispatch } from "../../../store";

type TdeleteCandidate = { name: string; _id: string } | any;

interface UserSettingsProps {
  onDeleteCandidate: (UserId: TdeleteCandidate) => void;
}

const useUserSettings = ({ onDeleteCandidate }: UserSettingsProps) => {
  const dispatch = useAppDispatch();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<TdeleteCandidate>("");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  const handleDeleteClick = (userId) => {
    setDeleteCandidate(userId);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async (ref) => {
    try {
      if (deleteCandidate) {
         dispatch(deleteUser(deleteCandidate._id));
        onDeleteCandidate(deleteCandidate);
        setDeleteConfirmationOpen(false);
        ref.current?.reload();

        notification.success({
          message: `Success`,
          description: "Deleted User successfuly",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      Modal.warning({
        title: "Error",
        content: "Failed to delete the User",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  return {
    deleteConfirmationOpen,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteCandidate,
    addUserDialogOpen,
    setAddUserDialogOpen,
  };
};

export default useUserSettings;
