import { KeyOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { addClientPin } from "@features/Cart/CartSlice";
import { Button, Form, Space, Typography } from "antd";
import { useAppDispatch } from "src/store";


function ClientPin() {
    const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  return (
    <ModalForm
    title={<Space><KeyOutlined/><Typography>Enter Client Pin</Typography></Space>}
      form={form}
      width={400}
      modalProps={{
        destroyOnClose: true,
      }}
      trigger={
        <Button
          style={{
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          icon={<KeyOutlined />}
        >
          Client Pin
        </Button>
      }
      onFinish={async (values) => {
        console.log(values);
        dispatch(addClientPin(values.clientPin));
        return true;
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="clientPin"
          placeholder="A**********"
        />
      </ProForm.Group>
    </ModalForm>
  );
}

export default ClientPin;
