import { KeyOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Space, Typography } from "antd";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";

import { usePrimaryColor } from "@context/PrimaryColorContext";

interface ClientPinProps {
  cart: CartDetailsInterface;
}

function ClientPin({ cart }: ClientPinProps) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const primaryColor = usePrimaryColor();

  return (
    <ModalForm
      initialValues={{ ...cart, client_pin: cart?.clientPin }}
      title={
        <Space>
          <KeyOutlined />
          <Typography>Enter Client Pin</Typography>
        </Space>
      }
      form={form}
      width={400}
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      trigger={
        <Button
          style={{
            color: primaryColor,
            borderColor: primaryColor,
          }}
          icon={<KeyOutlined />}
        >
          Client Details
        </Button>
      }
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: "Confirm if the client pin is correct?",
          position: true,
        });
        if (confirmed) {
          dispatch(updateCart({ cart, data: values }));
          return true;
        }
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="client_pin"
          label="Client Pin"
          placeholder="A**********"
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText
          width="md"
          name="client_name"
          label="Client Name"
          placeholder="Rachel"
        />
      </ProForm.Group>
    </ModalForm>
  );
}

export default ClientPin;