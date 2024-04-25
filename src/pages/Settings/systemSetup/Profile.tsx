import {
  ProForm,
  ProFormDigit,
  ProFormInstance,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { updateUsers } from "@services/users";
import ShowConfirm from "@utils/ConfirmUtil";
import { Space, Typography } from "antd";
import { useRef, useState } from "react";

function SystemSetup() {
  const [ShowPaybilldetails, setShowPaybilldetails] = useState(false);
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

  const onPaymentDetailsChange = (value: string) => {
    console.log(value);

    value === "Paybill"
      ? setShowPaybilldetails(true)
      : setShowPaybilldetails(false);
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
      submitter={{
        searchConfig: {
          resetText: "Reset",
          submitText: "Submit",
        },
        render: (_, dom) => (
          <Space style={{ justifyContent: "flex-end", width: "100%" }}>
            {dom}
          </Space>
        ),
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
          <ProFormSelect
            name="paymentDetails"
            label="Mpesa Payment Details"
            options={[
              { value: "Till", label: "Till" },
              { value: "Paybill", label: "Paybill" },
            ]}
            getValueFromEvent={(_, tr) => {
              onPaymentDetailsChange(tr.value);
              return onPaymentDetailsChange(tr.value);
            }}
          />
          {ShowPaybilldetails && (
            <>
              <ProFormDigit
                name="account_no"
                label="Account No."
                rules={[
                  {
                    required: true,
                    message: "Please provide the account number.",
                  },
                ]}
              />
              <ProFormDigit
                name="business_no"
                label="Business No."
                rules={[
                  {
                    required: true,
                    message: "Please provide the business number.",
                  },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </ProForm>
  );
}

export default SystemSetup;
