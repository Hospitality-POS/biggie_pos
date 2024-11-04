import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Modal } from "antd/lib";

const { confirm } = Modal;

const ShowConfirm = (props: { title: string, position?: boolean, cancelText?: string }) => {
  return new Promise((resolve, reject) => {
    confirm({
      icon: <ExclamationCircleOutlined />,
      content: props.title,
      centered: props.position,
      cancelText: props?.cancelText,
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
    });
  });
};

export default ShowConfirm;
