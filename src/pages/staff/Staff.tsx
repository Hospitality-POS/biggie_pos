import { useQuery } from "@tanstack/react-query";
import StaffCard from "../../components/staffCard/StaffCard";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Divider, Typography } from "@mui/material";
import classes from "./staffs.module.css";
import { Key } from "react";
import SkeletonCard from "../../components/staffCard/SkeletonCard";

const Staff = () => {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      fetch("http://localhost:3000/users/all").then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });
  

  if (isLoading) {
    return (
      <>
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
      </>
    );
  }

  if (isError) {
    return <div>An error has occurred: {error.message}</div>;
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
        {data.map((item: { _id: Key | null | undefined }) => (
          <StaffCard key={item._id} item={item} />
        ))}
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </div>
    </section>
  );
};

export default Staff;
