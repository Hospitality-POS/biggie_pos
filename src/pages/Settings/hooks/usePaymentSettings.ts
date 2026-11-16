import { useState } from "react";
import { deletePaymentMethod } from "@services/paymentMethod";
import { Modal, notification } from "antd/lib";

const usePaymentSettings = () => {
  const [addPaymentSettingDialogOpen, setAddPaymentSettingDialogOpen] =
    useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);

  const handleDeleteClick = (paymentMethod: React.SetStateAction<null>) => {
    setDeleteCandidate(paymentMethod);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async (ref) => {
    try {
      if (deleteCandidate) {
        await deletePaymentMethod(deleteCandidate._id);
        setDeleteConfirmationOpen(false);
        ref.current?.reload();

        notification.success({
          message: `Success`,
          description: "Deleted Category successfuly",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      Modal.warning({
        title: "Error",
        content: "Failed to delete the category",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddPaymentSettingDialog = () => {
    setAddPaymentSettingDialogOpen(true);
  };

  const handleAddPaymentSetting = (newPaymentSetting: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newPaymentSetting to your existing paymentMethods
    // and update the table accordingly.
  };
  return {
    deleteCandidate,
    setDeleteCandidate,
    addPaymentSettingDialogOpen,
    setAddPaymentSettingDialogOpen,
    deleteConfirmationOpen,
    setDeleteConfirmationOpen,
    handleDeleteCancel,
    handleDeleteClick,
    handleOpenAddPaymentSettingDialog,
    handleAddPaymentSetting,
    handleDeleteConfirm,
  };
};

export default usePaymentSettings;
