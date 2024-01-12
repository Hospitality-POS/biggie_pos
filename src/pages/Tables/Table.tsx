import { Box, Divider, Tab, Tabs, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import classes from "../staff/staffs.module.css";
import TableCard from "../../components/TableCard/TableCard";
import React, { Key, useCallback, useEffect, useState } from "react";
import TableCardSkeleton from "../../components/TableCard/TableCardSkeleton";
import { useNavigate, useParams } from "react-router-dom";
import DeckIcon from "@mui/icons-material/Deck";
import SuccessModal from "../../components/MODALS/SuccessModal";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchTableByLocatedAt } from "../../features/Table/TableActions";
// import StaffModal from "../../components/staffCard/StaffModal";
import Lottie from "lottie-react";
import fssanimation from "../../components/Loaders/fss loader.json";
import StaffModal from "@components/staffCard/SampleLoginModal";

function Table() {
  const { openModal, error: orderError } = useAppSelector((state) => state.order);
  const {
    tables: data,
    loading: isLoading,
    error: isError,
  } = useAppSelector((state) => state.Tables);
  const {
    user,
    loading: userLoading,
    error: userError,
  } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  // const {tables: data, loading: isLoading, error, isError  } = useSelector((stat:any)=>state.Tables)
  const [value, setValue] = React.useState("in-doors");
  const [selectedId, setSelectedId] = React.useState("");

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  const { locatedAt } = useParams();
  const [uniqueLocatedAtValues, setUniqueLocatedAtValues] = useState([]);

 

  const fetchTable = useCallback(() => {
    return dispatch(fetchTableByLocatedAt(value));
  }, [dispatch, value]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);


  const {
    isLoading: isLoadingUniqueLocatedAt,
    data: uniqueLocatedAtData,
    isError: isErrorTabs,
  } = useQuery({
    queryKey: ["uniqueLocatedAtValues"],
    queryFn: () =>
      fetch("http://localhost:3000/tables/tables/unique-locatedAt").then(
        (res) => res.json()
      ),
    retry: 3,
    retryDelay: 1000,
  });

  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  useEffect(() => {
    setValue(locatedAt || "in-doors");
    if (!isLoadingUniqueLocatedAt && uniqueLocatedAtData) {
      setUniqueLocatedAtValues(uniqueLocatedAtData);
    }
  }, [locatedAt, isLoadingUniqueLocatedAt, uniqueLocatedAtData]);

  const navigate = useNavigate();
  const handleSelectTable = (tableId: string) => {
    // console.log("sels", tableId);

    if (user) {
      setSelectedId(tableId);
      navigate(`/dashboard/${tableId}`);
    }
  };

  if (userLoading || isLoading || isLoadingUniqueLocatedAt) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "90vh",
        }}
      >
        <Lottie
          animationData={fssanimation}
          loop={true}
          height={20}
          width={20}
        />
      </div>
    );
  }

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

  if (isError || isErrorTabs || orderError) {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "90vh",
          }}
        >
          <Lottie
            animationData={fssanimation}
            loop={true}
            height={20}
            width={20}
          />
        <div><Typography variant="h5" gutterBottom>An Error occurred, Please contact support!</Typography></div>
        </div>
      </>
    );
  }

  return (
    <div className="staff-section">
      {openModal && <SuccessModal />}
      <div className={classes.staffheader}>
        {/* <p>Tables List</p> */}
        <Typography variant="h6" gutterBottom mt={2} pl={2}>
          Tables List
        </Typography>
      </div>
      <Box sx={{ width: "100%", pl: 3 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          // textColor="inherit"
          // indicatorColor="secondary"
          aria-label="secondary tabs example"
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: "#6c1c2c",
            },
            "& .Mui-selected": {
              color: "#6c1c2c",
            },
            "& .MuiTab-textColorInherit.Mui-selected": {
              color: "#6c1c2c",
            },
            "& .MuiTab-textColorInherit": {
              "&:hover": {
                color: "#6c1c2c",
              },
            },
          }}
        >
          {uniqueLocatedAtValues.map((locatedAtValue) => (
            <Tab
              key={locatedAtValue}
              value={locatedAtValue}
              label={locatedAtValue}
              icon={<DeckIcon />}
            />
          ))}
        </Tabs>
      </Box>
      <Divider />
      <div
        className="cards"
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginTop: "5px",
          flexWrap: "wrap",
          width: "100%",
          bottom: 0,
        }}
      >
        {data.map((item) => (
          <TableCard key={item._id} item={item} openModal={handleOpen} />
        ))}
      </div>
      {selectedProductId && (
        <StaffModal
          setOpen={setOpen}
          setPin={setPin}
          pin={pin}
          open={open}
          tbl={selectedProductId}
        />
      )}
    </div>
  );
}

export default Table;
