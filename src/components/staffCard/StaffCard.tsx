import classes from "./staff.module.css";
import { Badge, Button } from "@mui/material";
import Avvvatars from "avvvatars-react";
import React, { useState } from "react";
import ContactsIcon from "@mui/icons-material/Contacts";
import MailIcon from "@mui/icons-material/Mail";
import StaffModal from "./StaffModal";
import LaunchIcon from '@mui/icons-material/Launch';

interface itemProps {
  item: any;
}
const StaffCard: React.FC<itemProps> = ({ item }) => {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  const handleOpen = () => {
    setOpen(true);
  };

  return (
    <div className={classes.card}>
      <div className={classes.avatarContainer}>
        <Avvvatars
          value={item.email}
          shadow={true}
          style="character"
          borderSize={0.5}
          border={true}
          size={60}
        />
        <Badge
          color={item.status === "Active"? "primary": "error"}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          badgeContent={item.status === "suspended" ? "Suspended" : item.status}
        >
        </Badge>
      </div>
      <h4 className={classes.headcontent}>{item.fullname}</h4>

      <Button variant="outlined" color="success" onClick={handleOpen}>
        Connect <LaunchIcon fontSize="small" sx={{ml: 1}}/>
      </Button>

      {/* Modal */}

      <StaffModal setOpen={setOpen} setPin={setPin} pin={pin} open={open} />
    </div>
  );
};

export default StaffCard;
