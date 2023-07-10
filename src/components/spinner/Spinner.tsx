import classes from "./spinner.module.css";

function Spinner() {
  return (
    <>
      <div className={classes.container}>
        <div className={classes.loader}></div>
      </div>
    </>
  );
}

export default Spinner;
