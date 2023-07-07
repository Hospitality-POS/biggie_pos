import { useQuery } from "@tanstack/react-query";
import StaffCard from "../../components/staffCard/StaffCard";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Divider } from "@mui/material";
import classes from "./staffs.module.css";
import { Key } from "react";
import SkeletonCard from "../../components/staffCard/SkeletonCard";

const Staff = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      fetch("http://localhost:3000/users/all").then((res) => res.json()),
  });
  console.log(data);

  if (isLoading) {
    return <>
    <div className={classes.staffheader}>
        <p>Registered Staff</p>
      </div>
      <Divider />
      <div className="cards">

        {[...Array(8)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
        </div>
        </>;
  }

  if (error) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <section className="staff-section">
      <div className={classes.staffheader}>
        <p>Registered Staff</p>
      </div>
      <Divider />
      <div className="cards">
        {data.map((item: { _id: Key | null | undefined }) => (
          <StaffCard key={item._id} item={item} />
        ))}
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </section>
  );
};

export default Staff;
