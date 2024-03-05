import { useState } from "react";
import { deleteCategory } from "@features/Category/CategoryActions";
import { Modal, notification } from "antd/lib";
import { useAppDispatch } from "src/store";
import { deleteMainCategory, deleteSubCategory } from "@services/categories";

type TdeleteCandidate = { name: string; _id: string } | any;

interface CategorySettingsProps {
  type: string;
}

const useCategorySettings = ({ type }: CategorySettingsProps) => {
  const dispatch = useAppDispatch();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<TdeleteCandidate>("");
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);

  const handleDeleteClick = (category: TdeleteCandidate) => {
    setDeleteCandidate(category);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async (ref) => {
    try {
      if (type === "category" && deleteCandidate) {
        dispatch(deleteCategory(deleteCandidate._id));
        setDeleteConfirmationOpen(false);
        ref.current?.reload();

        notification.success({
          message: `Success`,
          description: "Deleted Category successfuly",
          placement: "bottomLeft",
        });
      } else if (type === "sub-category" && deleteCandidate) {
        deleteSubCategory(deleteCandidate._id);
        setDeleteConfirmationOpen(false);
        ref.current?.reload();
        notification.success({
          message: `Success`,
          description: "Deleted sub-Category successfuly",
          placement: "bottomLeft",
        });
      } else if (type === "main-category" && deleteCandidate) {
        deleteMainCategory(deleteCandidate._id);
        setDeleteConfirmationOpen(false);
        ref.current?.reload();
        notification.success({
          message: `Success`,
          description: "Deleted main-Category successfuly",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      Modal.warning({
        title: "Error",
        content: `Failed to delete the ${type}`,
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
    addCategoryDialogOpen,
    setAddCategoryDialogOpen,
  };
};

export default useCategorySettings;
