import { useState } from "react";
import { ProForm } from "@ant-design/pro-components";

import { notification } from "antd";
import { useAppDispatch, useAppSelector } from "../../../store";
import { createLocation } from "../../../features/Table/TableActions";


interface Location {
  _id?: string;
  locatonName:  {name: string};
  name: string;
  Location?: string;
}



interface UseAddLocationProps {
  onAddLocation: (Location: string) => void;
}

export const useAddLocationModal = ({ onAddLocation }: UseAddLocationProps) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = ProForm.useForm();


  const {isLocationError} = useAppSelector(state=>state.Tables)

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };

  const handleInputChange = () => {
    // handle change
  };

  const handleConfirmAddLocation = async (newLocation: {name: string}) => {
    console.log(newLocation);
    
    try {
      dispatch(createLocation(newLocation.name));
      onAddLocation(newLocation.name);
      handleClose();

      if (!isLocationError) {
        notification.success({
          message: `Success`,
          description: "Successfully added new supplier",
          placement: "bottomLeft",
        });
      } else {
        notification.error({
          message: `Error`,
          description: "Failed to add a new supplier",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
    }
  };

  return {
    isSubmitting,
    form,
    handleConfirmAddLocation,
    handleClose,
    setIsSubmitting,
  };
};
