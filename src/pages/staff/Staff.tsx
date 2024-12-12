import { useQuery } from "@tanstack/react-query";
import StaffCard from "../../components/staffCard/StaffCard";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Divider, Typography } from "@mui/material";
import classes from "./staffs.module.css";
import { Key, useEffect } from "react";
import SkeletonCard from "../../components/staffCard/SkeletonCard";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUsers } from "../../features/Auth/AuthActions";
import React from "react"

const Staff = () => {
  //   const {users:data, loading: isLoading, error:isError}=useSelector((state:any)=>state.auth)
  //   const dispatch = useDispatch()

  //   useEffect(() => {
  //     dispatch(fetchAllUsers());
  // }, [dispatch]);
  // const { isLoading, isError, data } = useQuery({
  //     queryKey: ["staff"],
  //     queryFn: async () => {
  //       try {
  //         const response = await fetch("http://localhost:3000/users/all");
  //         const responseData = await response.json();

  //         // Store data in localStorage
  //         localStorage.setItem("staffData", JSON.stringify(responseData));

  //         return responseData;
  //       } catch (error) {
  //         throw error;
  //       }
  //     },
  //     initialData: JSON.parse(localStorage.getItem("staffData")),
  //     retry: false,
  //   });

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      fetch(process.env.VITE_BASE_URL + "/users/all").then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });


  if (isLoading) {
    return (
      <div>
        <div className={classes.staffheader}>
          <Typography mt={2} variant="h6" ml={2} gutterBottom>
            Registered Staff
          </Typography>
        </div>
        <Divider />
        <div className="cards">
          {[...Array(12)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>An error has occurred: {error?.message}</div>;
  }

  return (
    <section className="staff-section">
      <div className={classes.staffheader}>
        <Typography mt={2} variant="h6" ml={2} gutterBottom>
          Registered Staff
        </Typography>
      </div>
      <Divider />
      <div className="cards">
        {data?.map((item: { _id: Key | null | undefined }) => (
          <StaffCard key={item._id} item={item} />
        ))}
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </div>
    </section>
  );
};

export default Staff;
