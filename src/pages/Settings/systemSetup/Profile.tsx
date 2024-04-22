import {
  ProForm,
  ProFormDigit,
  ProFormInstance,
  ProFormText,
} from "@ant-design/pro-components";
import { getPhoneNumber } from "@components/PhoneNumber/formatPhoneNumberUtil";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { updateUsers } from "@services/users";
import ShowConfirm from "@utils/ConfirmUtil";
import { Typography } from "antd";
import { useRef } from "react";

function SystemSetup() {
  const formRef = useRef<ProFormInstance>();
  const formStyle = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    width: "100%",
    height: "calc(100vh - 320px)",
    overflowY: "auto",
  };

  const fieldStyle = {
    marginBottom: 16,
    width: "calc(38% - 10px)",
  };

  return (
    <ProForm
      layout="vertical"
      grid
      onFinish={async (values) => {
        const phoneNumber = getPhoneNumber(values?.phoneNumber);
        const data2 = { ...values, phone: phoneNumber };
        formRef?.current?.resetFields();
        return true;
      }}
    >
      <div style={formStyle}>
        <Typography.Text>Business Profile</Typography.Text>
        <div style={fieldStyle}>
          <ProFormText name="name" label="Business Name" />
          <ProFormText
            name="email"
            label="Email"
            rules={[{ required: true, message: "Please provide the email" }]}
          />
          <PhoneInput label="Phone" owner="phoneNumber" />
          <ProFormText name="location" label="Location" />
          <ProFormText name="social_link" label="Social Link" />
        </div>
        <div style={fieldStyle}>
          <ProFormText name="kra_pin" label="KRA Pin" />
          <ProFormDigit name="till_no" label="Till No." />
          <ProFormDigit name="account_no" label="Account No." />
          <ProFormDigit name="paybill_no" label="Paybill No." />
        </div>
      </div>
    </ProForm>
  );
}

export default SystemSetup;
