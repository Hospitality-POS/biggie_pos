import { Button, Result } from "antd/lib";

const ErrorDialog = ({ error, onClose }) => {
  return (
    <Result
      status="500"
      subTitle={
        <>
          <p>Check your internet connection!</p> <i>{error}</i>
        </>
      }
      extra={
        <Button type="primary" onClick={onClose}>
          Reload page
        </Button>
      }
      style={{ margin: "0 auto" }}
    />
  );
};

export default ErrorDialog;
