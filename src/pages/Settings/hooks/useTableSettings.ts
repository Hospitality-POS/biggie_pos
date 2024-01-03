import { useState } from "react";
import { useAppDispatch } from "../../../store";
import { deleteLocation } from "../../../features/Table/TableActions";
import { Modal, notification } from "antd/lib";

export const useTableSettings = () => {
  // location

  //   const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const dispatch = useAppDispatch();

  const handleEditLocation = (locationId: any) => {
    // Handle edit action for the location with the given ID
    // console.log("Edit location:", locationId);
    // handleCloseLocation();
  };


  const handleAddLocation = ()=>{
    // pending
  }

  const handleDeleteClickLocation = (locationId) => {
    setDeleteCandidate(locationId);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirmLocation = (ref) => {
    try {
      if (deleteCandidate) {
        dispatch(deleteLocation(deleteCandidate._id));
        handleCloseLocation();
        setDeleteConfirmationOpen(false);

        ref.current.reload();
        notification.success({
          message: `Success`,
          description: "Deleted Location successfuly",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      Modal.warning({
        title: "Error",
        content: "Failed to delete the selected location",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleCloseLocation = () => {
    setDeleteConfirmationOpen(true);
  };

  return {
    handleAddLocation,
    deleteCandidate,
    handleDeleteClickLocation,
    handleEditLocation,
    handleDeleteConfirmLocation,
    deleteConfirmationOpen,
    handleDeleteCancel,
  };
};
