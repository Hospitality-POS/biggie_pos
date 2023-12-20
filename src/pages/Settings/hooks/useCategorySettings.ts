import { useState } from "react";
import { useDispatch } from "react-redux";
import { deleteCategory } from "../../../features/Category/CategoryActions";
import { useAppSelector } from "../../../store";


type TdeleteCandidate = {name: string, _id: string} | any;

interface CategorySettingsProps {
  onDeleteCandidate: (category: TdeleteCandidate) => void;
}

const useCategorySettings = ({ onDeleteCandidate }: CategorySettingsProps) => {
  const dispatch = useDispatch();
  const { loading } = useAppSelector((state) => state.Categories);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<TdeleteCandidate>("");
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);

  const handleDeleteClick = (category: TdeleteCandidate) => {
    setDeleteCandidate(category);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deleteCategory(deleteCandidate._id));
      onDeleteCandidate(deleteCandidate);
      setDeleteConfirmationOpen(false);
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
    loading,
    addCategoryDialogOpen,
    setAddCategoryDialogOpen
  };
};

export default useCategorySettings;
