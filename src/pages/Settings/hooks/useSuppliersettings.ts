// useSupplierActions.js
import { useState } from "react";
import { deleteSupplier } from "../../../features/Supplier/SupplierActions";
import { useAppDispatch } from "../../../store";
import { Modal, message, notification } from "antd/lib";

type Supplier =
  | {
      _id?: string;
      name: string;
      email: string;
      phone: string;
    }
  | any;

export const useSupplierSettings = () => {
  const dispatch = useAppDispatch();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState("");

  const handleDeleteClick = (supplier: Supplier) => {
    setDeleteCandidate(supplier);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async (ref) => {
    try {
      if (deleteCandidate) {
        dispatch(deleteSupplier(deleteCandidate._id));
        setDeleteConfirmationOpen(false);
        ref?.current?.reload && ref.current.reload();
        notification.success({
          message: `Success`,
          description: "Deleted supplier successfuly",
          placement: "bottomLeft",
        });
        
      }
    } catch (error) {
     Modal.warning({
      title: 'Error',
      content: 'Failed to delete the supplier',
    });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleAddSupplier = (_newSupplier: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newSupplier to your existing suppliers
    // and update the table accordingly.
  };

  return {
    deleteConfirmationOpen,
    deleteCandidate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleAddSupplier,
  };
};
