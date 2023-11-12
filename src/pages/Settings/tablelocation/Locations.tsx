import * as React from "react";
import Box from "@mui/material/Box";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch } from "../../../store";
import { deleteLocation } from "../../../features/Table/TableActions";

export default function ScrollableTabsLocations() {
  const [value, setValue] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedLocation, setSelectedLocation] = React.useState(null);
const dispatch = useAppDispatch()
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleEdit = (locationId: any) => {
    // Handle edit action for the location with the given ID
    console.log("Edit location:", locationId);
    handleClose();
  };

  const handleDelete = (locationId: string) => {
    dispatch(deleteLocation(locationId))
    handleClose();
  };

  const handleEllipsisClick = (event: React.MouseEvent<SVGSVGElement, MouseEvent>, location: React.SetStateAction<null>) => {
    setAnchorEl(event.currentTarget);
    setSelectedLocation(location);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedLocation(null);
  };

  const fetchLocations = async () => {
    const response = await axios.get(
      "http://localhost:3000/tables/location/locations"
    );
    return response.data;
  };

  const { data: locations} = useQuery(
    ["locations"],
    fetchLocations
  );

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: "100%",
        bgcolor: "background.paper",
      }}
    >
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons
        aria-label="visible arrows tabs example"
        sx={{
          [`& .${tabsClasses.scrollButtons}`]: {
            "&.Mui-disabled": { opacity: 0.3 },
          },
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
        {locations?.map((location: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: React.Key | null | undefined) => (
          <Tab
            key={index}
            label={
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {location.name}

                <div>
                  <MoreVertIcon
                    onClick={(event) => handleEllipsisClick(event, location)}
                    style={{ marginLeft: 5, cursor: "pointer" }}
                  />
                </div>
              </div>
            }
          />
        ))}
      </Tabs>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => handleEdit(selectedLocation?._id)}>
          <EditIcon fontSize="inherit" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedLocation?._id)}>
          <DeleteIcon fontSize="inherit" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
