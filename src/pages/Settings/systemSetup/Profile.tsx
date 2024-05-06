import {
  ProForm,
  ProFormDigit,
  ProFormInstance,
  ProFormSelect,
  ProFormText,
  ProSkeleton,
} from "@ant-design/pro-components";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { updateUsers } from "@services/users";
import ShowConfirm from "@utils/ConfirmUtil";
import { Form, Skeleton, Space, Spin, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSystemSetup,
  fetchSystemPaymentDetails,
  fetchSystemSetupDetails,
  fetchSystemSetupDetailsById,
  updateSystemSetup,
} from "@services/systemsetup";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";

function SystemSetup() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    // retry: 3,
    // refetchInterval: 3000,
    networkMode: "always",
  });
  const query = useQueryClient();

  const [ShowPaybilldetails, setShowPaybilldetails] = useState(false);
  const formRef = useRef<ProFormInstance>();
  const formStyle = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    width: "100%",
    height: "calc(100vh - 300px)",
    overflowY: "auto",
  };

  const fieldStyle = {
    marginBottom: 16,
    width: "calc(38% - 10px)",
  };

  const onPaymentDetailsChange = (value: string) => {
    value === "Paybill"
      ? setShowPaybilldetails(true)
      : setShowPaybilldetails(false);
  };
  const [form] = Form.useForm();

  return (
    <>
      {isLoading ? (
        <ProSkeleton type="descriptions" />
      ) : (
        <ProForm
          form={form}
          layout="vertical"
          grid
          loading={isLoading}
          formRef={formRef}
          initialValues={
            data
              ? {
                  ...data,
                  phoneNumber: reversePhoneNumber(data.phone),
                  paymentDetailsId: {
                    value: data?.paymentDetails?._id,
                    lable: data?.paymentDetails?.name,
                  },
                }
              : {}
          }
          onFinish={async (values) => {
            const phoneNumber = getPhoneNumber(values?.phoneNumber);
            const data2 = { ...values, phone: phoneNumber };
            console.log("mmmmm", values);

            const confirmed = await ShowConfirm({
              title: `Are you sure you want to ${
                data ? "Update" : "Add new"
              } system setup details?`,
            });
            if (confirmed) {
              data
                ? await updateSystemSetup({ data2, _id: data?._id })
                : await createSystemSetup(data2);
              query.invalidateQueries();
              form.resetFields();
              return true;
            }

            return true;
          }}
          submitter={{
            searchConfig: {
              resetText: "Reload",
              submitText: data ? "Update" : "Submit",
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
                rules={[
                  { required: true, message: "Please provide the email" },
                ]}
              />
              <PhoneInput label="Phone" owner="phoneNumber" />
              <ProFormText name="location" label="Location" />
            </div>
            <div style={fieldStyle}>
              <ProFormText name="social_link" label="Social Link" />
              <ProFormText name="kra_pin" label="KRA Pin" />
              <ProFormSelect
                name="paymentDetailsId"
                label="Payment Details"
                rules={[
                  { required: true, message: "Payment detail is required" },
                ]}
                showSearch
                placeholder="Select Payment Details"
                request={async (params) => {
                  const data = await fetchSystemPaymentDetails(params);
                  const values = data.map((e: { name: any; _id: any }) => {
                    return { label: e.name, value: e._id };
                  });
                  return values;
                }}
                fieldProps={{
                  onSelect: async (tr) => {
                    const data = await fetchSystemPaymentDetails();
                    data?.map((v) => {
                      if (v._id === tr) {
                        onPaymentDetailsChange(v.name);
                      }
                    });
                  },
                }}
              />

              {ShowPaybilldetails ? (
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
              ) : (
                <ProFormDigit
                  name="till_no"
                  label="Till No."
                  rules={[
                    {
                      required: true,
                      message: "Please provide the till number.",
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </ProForm>
      )}
    </>
  );
}

export default SystemSetup;
