import { Box, Divider, Tab, Tabs, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import classes from "../staff/staffs.module.css";
import TableCard from "../../components/TableCard/TableCard";
import React, { Key } from "react";
import TableCardSkeleton from "../../components/TableCard/TableCardSkeleton";
import { Link } from "react-router-dom";
import DeckIcon from '@mui/icons-material/Deck';

function Table() {
  const [value, setValue] = React.useState("one");

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["tables"],
    queryFn: () =>
      fetch("http://localhost:3000/tables").then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  if (isLoading) {
    return (
      <>
        <div className={classes.staffheader}>
          {/* <p>Tables List</p> */}
          <Typography variant="h6" gutterBottom mt={2} pl={2}>
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
        <Typography variant="h6" gutterBottom mt={2} pl={2}>
          Tables List
        </Typography>
      </div>
      <Box sx={{ width: "100%", pl: 3, }}>
            <Tabs
              value={value}
              onChange={handleChange}
              textColor="inherit"
              indicatorColor="secondary"
              aria-label="secondary tabs example"
               sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: "#6c1c2c",
            },
          }}
            >
              <Tab value="one" label="Inside" icon={<DeckIcon />} />
              <Tab value="two" label="Outside" icon={<DeckIcon />}/>
              <Tab value="three" label="Collidor" icon={<DeckIcon />}/>
            </Tabs>
          </Box>
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
          bottom: 0
        }}
      >
        {data.map((item: { _id: Key | null | undefined }) => (
          <Link
            key={item._id}
            to={`/restaurant/${item._id}`}
            style={{ textDecoration: "none" }}
          >
            <TableCard key={item._id} item={item} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Table;
