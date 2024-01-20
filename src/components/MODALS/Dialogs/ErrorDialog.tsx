import { CloseCircleOutlined } from "@ant-design/icons";
// import Paragraph from "antd/es/skeleton/Paragraph";
import { Button, Result, Typography } from "antd/lib";

const { Paragraph, Text } = Typography;

const ErrorDialog = ({ error, onClose }) => {
  return (
    <Result
      title="Oops!"
      status="500"
      subTitle={
        <>
          <p>Check your internet connection!</p> <i>{error?error: "network error"}</i>
        </>
      }
      extra={
        <Button type="primary" onClick={onClose}>
          Refresh page
        </Button>
      }
      style={{ marginTop: 0}}
    >
      <div className="desc">
        <Paragraph>
          <Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            The content you submitted has the following error:
          </Text>
          <Paragraph>
            <CloseCircleOutlined style={{ color: "red" }} /> {error}{" "}
            <a>Reflesh page &gt;</a>
          </Paragraph>
        </Paragraph>
        <Paragraph>
          <CloseCircleOutlined style={{ color: "red" }} /> Your account has been
          suspended. <a>Thaw immediately &gt;</a>
        </Paragraph>
        <Paragraph>
          <CloseCircleOutlined style={{ color: "red" }} /> Your account is not
          yet eligible to view this pagee. <a>Register Unlock &gt;</a>
        </Paragraph>
      </div>
    </Result>
  );
};

export default ErrorDialog;
