import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { deleteCategory } from "../../../features/Category/CategoryActions";
import { message } from "antd";
import type { ActionType } from '@ant-design/pro-components';


type TdeleteCandidate = {name: string, _id: string} | any;

interface CategorySettingsProps {
  onDeleteCandidate: (category: TdeleteCandidate) => void;
}

const useCategorySettings = ({ onDeleteCandidate }: CategorySettingsProps) => {
  const dispatch = useDispatch();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<TdeleteCandidate>("");
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);

  const handleDeleteClick = (category: TdeleteCandidate) => {
    setDeleteCandidate(category);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async(ref) => {
    try {
        if (deleteCandidate) {
          dispatch(deleteCategory(deleteCandidate._id));
          onDeleteCandidate(deleteCandidate);
          setDeleteConfirmationOpen(false);
          ref.current?.reload()
          message.success("succesfuly deleted")
        }
    } catch (error) {
        message.error("Failed to delete")
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
    addCategoryDialogOpen,
    setAddCategoryDialogOpen
  };
};

export default useCategorySettings;
