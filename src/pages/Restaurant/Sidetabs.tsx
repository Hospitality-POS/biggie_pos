import { AppBar, Tab, Tabs } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategoriesByID } from "../../features/Category/CategoryActions";

function a11yProps(index: any) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const VerticalTabs = () => {
  const { subCategory: Subcategories } = useSelector(
    (state: any) => state.Categories
  );
  const dispatch = useDispatch()
  const [value, setValue] = React.useState(0);
  const [subCategoryId, setSubCategoryId] = React.useState("")

  const handleChanegSubCategoryId =(subcategoryID)=>{
    dispatch(fetchCategoriesByID(subcategoryID))
  }

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  return (
    <>
      {Subcategories && Subcategories.length > 0 && (<AppBar
        position="static"
        sx={{ bgcolor: "#6c1c2c", width: 80, height: 450 }}
      >
        <Tabs
          orientation="vertical"
          value={value}
          onChange={handleChange}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
          sx={{ width: 80, height: "inherit" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-evenly",
              flexGrow: 1,
              height: 450,
            }}
          >
            {Subcategories?.map(
              (
                subcateg: {
                  _id: React.Key | null | undefined;
                  name:
                    | string
                    | number
                    | boolean
                    | React.ReactElement<
                        any,
                        string | React.JSXElementConstructor<any>
                      >
                    | Iterable<React.ReactNode>
                    | React.ReactPortal
                    | null
                    | undefined;
                },
                index: any
              ) => (
                <Tab
                  key={subcateg._id}
                  onClick={()=> handleChanegSubCategoryId(subcateg._id)}
                  iconPosition="start"
                  label={subcateg.name}
                  {...a11yProps(index)}
                  sx={{ transform: "rotate(-90deg)" }}
                />
              )
            )}
          </div>
        </Tabs>
      </AppBar>)}
    </>
  );
};

export default VerticalTabs;
