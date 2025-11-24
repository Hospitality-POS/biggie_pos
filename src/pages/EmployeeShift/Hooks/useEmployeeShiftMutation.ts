import { deleteShift } from "@services/shifts";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useEmployeeShiftQuery } from "./useEmployeeShiftQuery";

export const useEmployeeShiftMutation = () => {
  const { refetchShifts } = useEmployeeShiftQuery();
  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      refetchShifts();
    },
    onError: (error) => {
      message.error(`Failed to deleted shift: ${error}`);
    },
  });

  return { deleteShiftMutation };
};
