import { KeyOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";

interface ClientPinProps {
  cart: CartDetailsInterface;
}

function ClientPin({ cart }: ClientPinProps) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

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