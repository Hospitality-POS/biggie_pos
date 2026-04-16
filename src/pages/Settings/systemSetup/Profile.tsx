import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { Form, Typography, Card, Row, Col, Space, Skeleton, Divider, message } from "antd";
import {
  ContactsOutlined,
  RedoOutlined,
  BankOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  NumberOutlined,
  HomeOutlined,
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

interface BankDetails {
  bank_name?: string | null;
  branch?: string | null;
  account_no?: string | null;
  account_name?: string | null;
  swift_code?: string | null;
  paybill_no?: string | null;
}

interface SystemSetupData {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  social_link?: string;
  kra_pin?: string;
  po_box?: string;
  paymentDetailId?: string | { value: string; label: string } | null;
  paymentDetails?: {
    _id: string;
    name: string;
  };
  bank_details?: BankDetails;
  // Legacy payment fields
  account_no?: number;
  business_no?: number;
  till_no?: number;
}

function SystemSetup() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [showPaybillDetails, setShowPaybillDetails] = useState(false);
  const [paymentDetailsList, setPaymentDetailsList] = useState<Array<{ label: string; value: string }>>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    networkMode: "always",
  });

  // Fetch payment details for the select dropdown
  useEffect(() => {
    const loadPaymentDetails = async () => {
      try {
        const details = await fetchSystemPaymentDetails();
        setPaymentDetailsList(details.map((e: any) => ({ label: e.name, value: e._id })));
      } catch (error) {
        console.error("Failed to load payment details:", error);
      }
    };
    loadPaymentDetails();
  }, []);

  useEffect(() => {
    if (data?.paymentDetails) {
      setShowPaybillDetails(data.paymentDetails.name === "Paybill");
    }
  }, [data]);

  const onPaymentDetailsChange = (value: string, option: any) => {
    setShowPaybillDetails(option?.label === "Paybill");
  };

  const onFinish = async (values: any) => {
    const shopId = localStorage.getItem("shopId") || undefined;
    const phoneNumber = getPhoneNumber(values?.phoneNumber);

    // Handle paymentDetailId - convert to proper format
    let paymentDetailIdValue = null;
    if (values.paymentDetailId) {
      if (typeof values.paymentDetailId === "object" && values.paymentDetailId.value) {
        paymentDetailIdValue = values.paymentDetailId.value;
      } else if (typeof values.paymentDetailId === "string") {
        paymentDetailIdValue = values.paymentDetailId;
      }
    }

    // Build bank_details object - only include non-undefined values
    const bank_details: BankDetails = {};
    if (values.bank_name !== undefined && values.bank_name !== "") bank_details.bank_name = values.bank_name;
    if (values.branch !== undefined && values.branch !== "") bank_details.branch = values.branch;
    if (values.bank_account_no !== undefined && values.bank_account_no !== "") bank_details.account_no = String(values.bank_account_no);
    if (values.account_name !== undefined && values.account_name !== "") bank_details.account_name = values.account_name;
    if (values.swift_code !== undefined && values.swift_code !== "") bank_details.swift_code = values.swift_code;
    if (values.paybill_no !== undefined && values.paybill_no !== "") bank_details.paybill_no = String(values.paybill_no);

    const formData: any = {
      ...values,
      phone: phoneNumber,
      paymentDetailId: paymentDetailIdValue,
      shop_id: shopId,
      bank_details: Object.keys(bank_details).length > 0 ? bank_details : null,
    };

    // Remove legacy fields that shouldn't be sent to the API
    delete formData.phoneNumber;
    delete formData.bank_name;
    delete formData.branch;
    delete formData.bank_account_no;
    delete formData.account_name;
    delete formData.swift_code;
    delete formData.paybill_no;
    delete formData.paymentDetails; // Remove nested paymentDetails if present

    // Remove undefined or null values to avoid overwriting with empty data
    Object.keys(formData).forEach(key => {
      if (formData[key] === undefined || formData[key] === "") {
        delete formData[key];
      }
    });

    // If bank_details is empty object, remove it
    if (formData.bank_details && Object.keys(formData.bank_details).length === 0) {
      delete formData.bank_details;
    }

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${data ? "Update" : "Add new"} system setup details?`,
      position: true,
    });

    if (confirmed) {
      try {
        let newData;
        if (data?._id) {
          newData = await updateSystemSetup({ data: formData, _id: data._id });
          message.success("System settings updated successfully");
        } else {
          newData = await createSystemSetup(formData);
          message.success("System settings created successfully");
        }

        queryClient.setQueryData(["systemsettings"], (oldData: any) => ({
          ...oldData,
          ...newData,
        }));

        form.resetFields();
        return true;
      } catch (error: any) {
        console.error("Error saving system settings:", error);
        message.error(error.response?.data?.details || "Failed to save system settings");
        return false;
      }
    }

    return false;
  };

  if (isLoading) {
    return <Skeleton active />;
  }

  const bankDetails = data?.bank_details ?? {};

  // Prepare initial values for the form
  const getInitialValues = () => {
    if (!data) return {};

    return {
      ...data,
      phoneNumber: reversePhoneNumber(data?.phone),
      paymentDetailId: data?.paymentDetails?._id
        ? { value: data.paymentDetails._id, label: data.paymentDetails.name }
        : null,
      bank_name: bankDetails.bank_name,
      branch: bankDetails.branch,
      bank_account_no: bankDetails.account_no,
      account_name: bankDetails.account_name,
      swift_code: bankDetails.swift_code,
      paybill_no: bankDetails.paybill_no,
    };
  };

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
        initialValues={getInitialValues()}
        submitter={{
          render: (_, dom) => (
            <Row justify="end">
              <Col>
                <Space>{dom}</Space>
              </Col>
            </Row>
          ),
          resetButtonProps: { icon: <RedoOutlined /> },
          submitButtonProps: {
            children: data ? "Update" : "Submit",
            style: { backgroundColor: "#1890ff", color: "#fff" },
          },
        }}
      >
        {/* ── Business Info ── */}
        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="name"
              label="Business Name"
              placeholder="Enter business name"
              rules={[{ required: true, message: "Please enter the business name" }]}
              fieldProps={{
                prefix: <BankOutlined className="site-form-item-icon" />,
                size: "large",
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="email"
              label="Email"
              placeholder="Enter email address"
              rules={[
                { required: true, message: "Please enter the email address" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
              fieldProps={{
                prefix: <MailOutlined className="site-form-item-icon" />,
                size: "large",
              }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <PhoneInput
              label="Phone"
              owner="phoneNumber"
              rules={[{ required: true, message: "Please enter the phone number" }]}
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
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="po_box"
              label="P.O. Box"
              placeholder="e.g. P.O. Box 12345-00100"
              fieldProps={{
                prefix: <HomeOutlined className="site-form-item-icon" />,
                size: "large",
              }}
            />
          </Col>
        </Row>

        {/* ── M-Pesa Payment ── */}
        <Divider orientation="left">M-Pesa Payment Details</Divider>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormSelect
              name="paymentDetailId"
              label="Payment Method"
              placeholder="Select Payment Details"
              rules={[{ required: true, message: "Payment detail is required" }]}
              options={paymentDetailsList}
              fieldProps={{
                onSelect: (value, option) => onPaymentDetailsChange(value, option),
                size: "large",
                allowClear: true,
              }}
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
                    fieldProps={{
                      size: "large",
                      controls: false,
                    }}
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
                    fieldProps={{
                      size: "large",
                      controls: false,
                    }}
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
                    required: !showPaybillDetails && showPaybillDetails !== undefined,
                    message: "Please enter the till number",
                  },
                ]}
                fieldProps={{
                  size: "large",
                  controls: false,
                }}
              />
            )}
          </Col>
        </Row>

        {/* ── Bank Details ── */}
        <Divider orientation="left">Bank Details (Optional)</Divider>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="bank_name"
              label="Bank Name"
              placeholder="e.g. Equity Bank"
              fieldProps={{
                prefix: <BankOutlined className="site-form-item-icon" />,
                size: "large",
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="branch"
              label="Branch"
              placeholder="e.g. Westlands Branch"
              fieldProps={{ size: "large" }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="bank_account_no"
              label="Account Number"
              placeholder="Enter bank account number"
              fieldProps={{
                prefix: <NumberOutlined className="site-form-item-icon" />,
                size: "large",
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="account_name"
              label="Account Name"
              placeholder="Registered name on account"
              fieldProps={{ size: "large" }}
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="swift_code"
              label="SWIFT Code"
              placeholder="e.g. EQBLKENA"
              fieldProps={{ size: "large" }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ProFormText
              name="paybill_no"
              label="Bank Paybill No."
              placeholder="M-Pesa Paybill for this bank"
              fieldProps={{ size: "large" }}
            />
          </Col>
        </Row>

        {/* Info note */}
        <Row>
          <Col span={24}>
            <Divider />
            <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
              Note: Bank details will appear on customer receipts and invoices.
              Fill in only the fields you want to display.
            </Typography.Text>
          </Col>
        </Row>
      </ProForm>
    </Card>
  );
}

export default SystemSetup;