import classes from "./staff.module.css";
import { Button } from "@mui/material";
import Avvvatars from "avvvatars-react";
import React, { useState } from "react";
import ContactsIcon from '@mui/icons-material/Contacts';
import MailIcon from '@mui/icons-material/Mail';
import StaffModal from "./StaffModal";

interface itemProps{
  item: any;
}
const StaffCard: React.FC<itemProps>=({item}) => {
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
      </div>
      <h4 className={classes.headcontent}>{item.fullname}</h4>
      <div className={classes.content}>
        <span>
          <ContactsIcon />
          <small> {"0" + item.phone}</small>
        </span>
        <span>
        <MailIcon />
        <small className={classes.lineClamp}> {item.email}</small>
        </span>
      </div>

      <Button variant="contained" onClick={handleOpen}>
        Login
      </Button>
      
      {/* Modal */}
      
      <StaffModal setOpen={setOpen} setPin={setPin} pin={pin} open={open} />
    </div>
  );
}

export default StaffCard;
