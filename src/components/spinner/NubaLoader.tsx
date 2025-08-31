
import { getPrimaryColor } from "@utils/getPrimaryColor";
import classes from "./spinner.module.css";

function Spinner() {
  return (
    <>
      <div className={classes.container}>
        <div className={classes.loader} style={{ borderTop: `8px solid ${getPrimaryColor()}`}}></div>
      </div>
    </>
  );
}

export default Spinner;
