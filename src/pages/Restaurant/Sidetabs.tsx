import { AppBar, Tab, Tabs } from "@mui/material";
import React, { useCallback, useEffect } from "react";
import { fetchCategoriesByID } from "../../features/Category/CategoryActions";
import { useAppDispatch, useAppSelector } from "../../store";

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const VerticalTabs: React.FC = () => {
  const { subCategory: Subcategories } = useAppSelector(
    (state) => state.Categories
  );
  const dispatch = useAppDispatch()
  const [value, setValue] = React.useState(0);
  const [subCategoryId, setSubCategoryId] = React.useState("")

  const handleChanegSubCategoryId =(subcategoryID: React.Key | null | undefined)=>{
    dispatch(fetchCategoriesByID(subcategoryID))
  }

  const handleChange = (event: any, newValue: React.SetStateAction<number>) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: React.SetStateAction<number>) => {
    setValue(index);
  };

  const subId = "6525f8292d06da587b70d5db"

  const fetchproductsbysub = useCallback(async()=>{
    return dispatch(fetchCategoriesByID(subId))
  },[dispatch])

  useEffect(()=>{
    fetchproductsbysub()
  },[fetchproductsbysub])
  
  return (
    <>
      {Subcategories && Subcategories.length > 0 && (<AppBar
        position="static"
        sx={{ bgcolor: "#6c1c2c", width: 80, height: 450, mt: 5}}
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
