import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { Form, Typography, Card, Row, Col, Space, Skeleton } from "antd";
import {
  ContactsOutlined,
  RedoOutlined,
  BankOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  NumberOutlined,
} from "@ant-design/icons";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import ShowConfirm from "@utils/ConfirmUtil";
import {
  createSystemSetup,
  fetchSystemPaymentDetails,
  fetchSystemSetupDetailsById,
  updateSystemSetup,
} from "@services/systemsetup";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";

const { Title } = Typography;

function SystemSetup() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [showPaybillDetails, setShowPaybillDetails] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    networkMode: "always",
  });

  // Initialize the form's conditional display based on existing data
  useEffect(() => {
    if (data && data.paymentDetails) {
      setShowPaybillDetails(data.paymentDetails.name === "Paybill");
    }
  }, [data]);

  const onPaymentDetailsChange = (value) => {
    setShowPaybillDetails(value === "Paybill");
  };

  const onFinish = async (values) => {
    const phoneNumber = getPhoneNumber(values?.phoneNumber);
    const formData = {
      ...values,
      phone: phoneNumber,
      paymentDetailId: values.paymentDetailId,
    };

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${data ? "Update" : "Add new"} system setup details?`,
      position: true,
    });

    if (confirmed) {
      const newData = data
        ? await updateSystemSetup({ data: formData, _id: data?._id })
        : await createSystemSetup(formData);

      queryClient.setQueryData(["systemsettings"], (oldData) => ({
        ...oldData,
        ...newData,
      }));
      return true;
    }

    return false;
  };

  if (isLoading) {
    return <Skeleton active />;
  }

  return (
    <Card
      title={
        <Title level={4}>
          <ContactsOutlined /> Business Profile
        </Title>
      }
      style={{ maxWidth: "1500px", margin: "0 auto", borderRadius: "8px" }}
      bodyStyle={{ padding: "24px" }}
    >
      <ProForm
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={
          data
            ? {
              ...data,
              phoneNumber: reversePhoneNumber(data?.phone),
              paymentDetailId: {
                value: data?.paymentDetails?._id,
                label: data?.paymentDetails?.name,
              },
            }
            : {}
        }
        submitter={{
          render: (_, dom) => (
            <Row justify="end">
              <Col>
                <Space>{dom}</Space>
              </Col>
            </Row>
          ),
          resetButtonProps: {
            icon: <RedoOutlined />,
          },
          submitButtonProps: {
            children: data ? "Update" : "Submit",
            style: { backgroundColor: "#1890ff", color: "#fff" },
          },
        }}
      >
        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="name"
              label="Business Name"
              placeholder="Enter business name"
              rules={[
                { required: true, message: "Please enter the business name" },
              ]}
              fieldProps={{
                prefix: <BankOutlined className="site-form-item-icon" />,
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="email"
              label="Email"
              placeholder="Enter email address"
              rules={[
                { required: true, message: "Please enter the email address" },
                {
                  type: "email",
                  message: "Please enter a valid email address",
                },
              ]}
              fieldProps={{
                prefix: <MailOutlined className="site-form-item-icon" />,
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <PhoneInput
              label="Phone"
              owner="phoneNumber"
              rules={[
                { required: true, message: "Please enter the phone number" },
              ]}
              fieldProps={{ size: "large" }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="location"
              label="Location"
              placeholder="Enter business location"
              fieldProps={{
                prefix: <EnvironmentOutlined className="site-form-item-icon" />,
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="social_link"
              label="Social Link"
              placeholder="Enter social media link"
              fieldProps={{
                prefix: <GlobalOutlined className="site-form-item-icon" />,
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="kra_pin"
              label="KRA Pin"
              placeholder="Enter KRA Pin"
              fieldProps={{
                prefix: <NumberOutlined className="site-form-item-icon" />,
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormSelect
              name="paymentDetailId"
              label="Payment Details"
              placeholder="Select Payment Details"
              rules={[
                { required: true, message: "Payment detail is required" },
              ]}
              request={async () => {
                const data = await fetchSystemPaymentDetails();
                return data.map((e) => ({ label: e.name, value: e._id }));
              }}
              fieldProps={{
                onSelect: (value, option) =>
                  onPaymentDetailsChange(option.label),
                size: "large",
              }}
              style={{ borderRadius: "4px" }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            {showPaybillDetails ? (
              <Row gutter={24}>
                <Col span={12}>
                  <ProFormDigit
                    name="account_no"
                    label="Account No."
                    placeholder="Enter account number"
                    rules={[
                      {
                        required: showPaybillDetails,
                        message: "Please enter the account number",
                      },
                    ]}
                    fieldProps={{ size: "large" }}
                    style={{ borderRadius: "4px" }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormDigit
                    name="business_no"
                    label="Business No."
                    placeholder="Enter business number"
                    rules={[
                      {
                        required: showPaybillDetails,
                        message: "Please enter the business number",
                      },
                    ]}
                    fieldProps={{ size: "large" }}
                    style={{ borderRadius: "4px" }}
                  />
                </Col>
              </Row>
            ) : (
              <ProFormDigit
                name="till_no"
                label="Till No."
                placeholder="Enter till number"
                rules={[
                  {
                    required: !showPaybillDetails,
                    message: "Please enter the till number"
                  },
                ]}
                fieldProps={{ size: "large" }}
                style={{ borderRadius: "4px" }}
              />
            )}
          </Col>
        </Row>
      </ProForm>
    </Card>
  );
}

export default SystemSetup;