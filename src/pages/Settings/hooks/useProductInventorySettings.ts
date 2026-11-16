import { deleteInventory } from "@services/inventory";
import { Modal, notification } from "antd/lib";
import { useState } from "react";

export const useProductInventorySettings = () => {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] =
    useState<boolean>(false);
  const [deleteCandidate, setDeleteCandidate] = useState<any>("");

  const handleDeleteClick = (_id: any) => {
    setDeleteCandidate(_id);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async (ref) => {
    try {
      if (deleteCandidate) {
        await deleteInventory(deleteCandidate._id || deleteCandidate);
        setDeleteConfirmationOpen(false);
        ref?.current?.reload() && ref.current.reload();
      }
      notification.success({
        message: `Success`,
        description: "Deleted the inventory successfuly",
        placement: "bottomLeft",
      });
    } catch (error) {
      if (!error) {
        notification.success({
          message: `Success`,
          description: "Deleted the inventory successfuly",
          placement: "bottomLeft",
        });
      }
      
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

   const handleAddInventory = (_newSupplier: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newSupplier to your existing suppliers
    // and update the table accordingly.
  };

  return {
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteConfirmationOpen,
    deleteCandidate,
    handleAddInventory
  };
};
