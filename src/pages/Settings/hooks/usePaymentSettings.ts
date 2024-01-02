import { useState } from "react";
import { useAppDispatch } from "../../../store";
import { deletePaymentMethod } from "../../../features/Payment/PaymentMethodActions";


const usePaymentSettings =()=> {
     const dispatch = useAppDispatch();
  
  const [addPaymentSettingDialogOpen, setAddPaymentSettingDialogOpen] =
    useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);


  const handleDeleteClick = (paymentMethod: React.SetStateAction<null>) => {
    setDeleteCandidate(paymentMethod);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deletePaymentMethod(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
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
    handleDeleteConfirm
  }
}

export default usePaymentSettings