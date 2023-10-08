import { AppBar, Tab, Tabs } from "@mui/material";
import React from "react";

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const VerticalTabs = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  return (
    <>
      <AppBar
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
            <Tab
              // icon={<TapasIcon />}
              iconPosition="start"
              label="BEAVARAGES"
              {...a11yProps(0)}
              sx={{ transform: "rotate(-90deg)" }}
            />
            <Tab
              // icon={<LocalBarIcon />}
              iconPosition="start"
              label="FOOD"
              {...a11yProps(1)}
              sx={{ transform: "rotate(-90deg)" }}
            />
            <Tab
              // icon={<SoupKitchenIcon />}
              iconPosition="start"
              label="NON F/B"
              {...a11yProps(2)}
              sx={{ transform: "rotate(-90deg)" }}
            />
          </div>
        </Tabs>
      </AppBar>
    </>
  );
};

export default VerticalTabs;
