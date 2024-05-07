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
import {
  ContactsFilled,
  ContactsOutlined,
  DesktopOutlined,
  DropboxCircleFilled,
  RedoOutlined,
} from "@ant-design/icons";

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
    height: "calc(100vh - 29  0px)",
    overflowY: "auto",
  };

  const fieldStyle = {
    marginBottom: 16,
    marginTop: 25,
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
          layout="horizontal"
          request={async () => {
            const data = await fetchSystemSetupDetailsById();
            // console.log("reuest", data);
            onPaymentDetailsChange(data.paymentDetails.name);
            return {
              ...data,
              phoneNumber: reversePhoneNumber(data?.phone),
              paymentDetailId: {
                value: data?.paymentDetails?._id,
                lable: data?.paymentDetails?.name,
              },
            };
          }}
          grid
          // loading={isLoading}
          formRef={formRef}
          // initialValues={
          //   data
          //     ? {
          //         ...data,
          //         phoneNumber: reversePhoneNumber(data?.phone),
          //         paymentDetailId: {
          //           value: data?.paymentDetails?._id,
          //           lable: data?.paymentDetails?.name,
          //         },
          //       }
          //     : {}
          // }
          onFinish={async (values) => {
            const phoneNumber = getPhoneNumber(values?.phoneNumber);
            const data2 = {
              ...values,
              phone: phoneNumber,
              paymentDetailId: values.paymentDetailId.value,
            };
            console.log("mmmmm", data2);

            const confirmed = await ShowConfirm({
              title: `Are you sure you want to ${
                data ? "Update" : "Add new"
              } system setup details?`,
              position: true,
            });
            if (confirmed) {
              data
                ? await updateSystemSetup({ data2, _id: data?._id })
                : await createSystemSetup(data2);
              // query.invalidateQueries();
              form.resetFields();
              // formRef.current?.resetFields()
              return true;
            }

            return true;
          }}
          submitter={{
            searchConfig: {
              resetText: "Refresh",
              submitText: data ? "Update" : "Submit",
            },
            resetButtonProps: {
              icon: <RedoOutlined />,
            },
            render: (_, dom) => (
              <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                {dom}
              </Space>
            ),
          }}
        >
          <div style={formStyle}>
            <Typography.Title level={4}>
              {" "}
              Business Profile <ContactsOutlined />
            </Typography.Title>
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
                name="paymentDetailId"
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
