import { fetchAllShifts } from "@services/shifts";
import { fetchAllUsersList } from "@services/users";
import { useQuery } from "@tanstack/react-query";
import { User } from "../Utils/Types";

export const useEmployeeShiftQuery = () => {
  const {
    data: shifts,
    isLoading: isLoadingShifts,
    refetch: refetchShifts,
  } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchAllShifts,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsersList,
    retry: 1,
    select: (data) =>
      data?.filter((user: User) => user?.role?.role_type !== "admin"),
    refetchInterval: 5000,
    networkMode: "always",
    staleTime: 0,
  });

  return {
    shifts,
    users,
    isLoadingShifts,
    refetchShifts,
  };
};
