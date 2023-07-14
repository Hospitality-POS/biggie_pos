import { Divider, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import classes from "../staff/staffs.module.css";
import TableCard from "../../components/TableCard/TableCard";
import { Key } from "react";
import TableCardSkeleton from "../../components/TableCard/TableCardSkeleton";

function Table() {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["tables"],
    queryFn: () =>
      fetch("http://localhost:3000/tables").then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });

  if (isLoading) {
    return (
      <>
        <div className={classes.staffheader}>
          {/* <p>Tables List</p> */}
          <Typography variant="h6" gutterBottom mt={1} pl={2}>
            Tables List
          </Typography>
        </div>
        <Divider />
        <div
          className="cards"
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          {[...Array(20)].map((_, index) => (
            <TableCardSkeleton key={index} />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <div className="staff-section">
      <div className={classes.staffheader}>
        {/* <p>Tables List</p> */}
        <Typography variant="h6" gutterBottom mt={1} pl={2}>
          Tables List
        </Typography>
      </div>
      <Divider />
      <div
        className="cards"
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginTop: "10px",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        {data.map((item: { _id: Key | null | undefined }) => (
          <TableCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default Table;
