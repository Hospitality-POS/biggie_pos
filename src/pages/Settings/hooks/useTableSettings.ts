import { SetStateAction, SetStateAction, useState } from "react";
import { useAppDispatch } from "../../../store";
import {
  deleteLocation,
  deleteTable,
} from "../../../features/Table/TableActions";
import { Modal, notification } from "antd/lib";

export const useTableLocationSettings = () => {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const dispatch = useAppDispatch();

  const handleEditLocation = (_locationId: any) => {
    // Handle edit action for the location with the given ID
    // console.log("Edit location:", locationId);
    // handleCloseLocation();
  };

  const handleAddLocation = () => {
    // pending
  };

  const handleDeleteClickLocation = (locationId: SetStateAction<null>) => {
    setDeleteCandidate(locationId);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirmLocation = (ref: { current: { reload: () => void; }; }) => {
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



export const useTableSettings = () => {
  const [deleteConfirmationOpenTable, setDeleteConfirmationOpenTable] = useState(false);
  const [deleteCandidateTable, setDeleteCandidateTable] = useState({_id:"", name: ""});

  const dispatch = useAppDispatch();

  const handleEdit = (tableId: any) => {
    // Handle edit action for the location with the given ID
    // console.log("Edit location:", locationId);
    // handleCloseLocation();
  };

  const handleAddTable = () => {
    // pending
  };

  const handleDeleteClick = (table: SetStateAction<{ _id: string; name: string; }>) => {
    setDeleteCandidateTable(table);
    setDeleteConfirmationOpenTable(true);
  };

  const handleDeleteConfirmTable = (ref) => {
    try {
      if (deleteCandidateTable) {
        dispatch(deleteTable(deleteCandidateTable._id));
        handleClose();
        setDeleteConfirmationOpenTable(false);
        ref.current.reload();
        notification.success({
          message: `Success`,
          description: "Deleted Table successfuly",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      Modal.warning({
        title: "Error",
        content: "Failed to delete the selected Table",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpenTable(false);
  };

  const handleClose = () => {
    setDeleteConfirmationOpenTable(false);
  };

  return {
    handleAddTable,
    deleteCandidateTable,
    handleDeleteClick,
    handleEdit,
    handleDeleteConfirmTable,
    deleteConfirmationOpenTable,
    handleDeleteCancel,
  };
};
