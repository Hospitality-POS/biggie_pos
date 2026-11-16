import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProForm,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
} from "@ant-design/pro-components";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { Form, Typography, Card, Row, Col, Space, Skeleton, Divider, Select, message } from "antd";
import {
  ContactsOutlined,
  RedoOutlined,
  BankOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  NumberOutlined,
  HomeOutlined,
  WhatsAppOutlined,
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

// Restores a dropped leading 0 on Kenyan mobile numbers saved when the
// field was numeric (791273923 → 0791273923). Till/paybill numbers are
// unaffected — only 9-digit 7x/1x values get prefixed.
const withLeadingZero = (v?: string | number | null) => {
  const s = String(v ?? "").trim();
  return /^[17]\d{8}$/.test(s) ? `0${s}` : s;
};

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
  // Legacy payment fields — strings so leading zeros (e.g. 0791…) survive
  account_no?: string;
  business_no?: string;
  till_no?: string;
  whatsapp_notify_secondary?: boolean;
  secondary_phones?: string[];
}

function SystemSetup() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [showPaybillDetails, setShowPaybillDetails] = useState(false);
  const [paymentDetailName, setPaymentDetailName] = useState<string>("");
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
    // Also reset when no payment method is saved (paymentDetails is null).
    setShowPaybillDetails(data?.paymentDetails?.name === "Paybill");
    setPaymentDetailName(data?.paymentDetails?.name || "");
  }, [data]);

  const onPaymentDetailsChange = (value: string, option: any) => {
    setShowPaybillDetails(option?.label === "Paybill");
    setPaymentDetailName(option?.label || "");
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

    const formData: any = {
      ...values,
      phone: phoneNumber,
      paymentDetailId: paymentDetailIdValue,
      shop_id: shopId,
    };

    // Remove legacy fields that shouldn't be sent to the API
    delete formData.phoneNumber;
    delete formData.paymentDetails; // Remove nested paymentDetails if present

    // Payment numbers are optional: a blank one is saved as null so clearing
    // a till/paybill really removes it instead of keeping the old number.
    const paymentNumberKeys = ["till_no", "account_no", "business_no"];
    paymentNumberKeys.forEach((key) => {
      if (formData[key] === "" || (typeof formData[key] === "string" && !formData[key].trim())) {
        formData[key] = null;
      }
    });

    // Remove undefined or empty values to avoid overwriting with empty data
    Object.keys(formData).forEach(key => {
      if (formData[key] === undefined || formData[key] === "") {
        delete formData[key];
      }
    });

    // Only one payment method is kept — clear the other method's numbers so
    // a till and a paybill never end up saved (and printed) together.
    if (!paymentDetailIdValue) {
      paymentNumberKeys.forEach((key) => { formData[key] = null; });
    } else if (showPaybillDetails) {
      formData.till_no = null;
    } else {
      formData.account_no = null;
      formData.business_no = null;
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
          // The service shows its own error and returns undefined on failure.
          if (!newData) return false;
          message.success("System settings updated successfully");
        } else {
          newData = await createSystemSetup(formData);
          if (!newData) return false;
          message.success("System settings created successfully");
        }

        // Re-read from the server instead of merging into the cached copy: the
        // save response has no populated `paymentDetails`, so a merge kept the
        // old payment method on screen after it had been cleared in the DB.
        let fresh = newData;
        try {
          fresh = (await fetchSystemSetupDetailsById(true)) ?? newData;
        } catch {
          /* fall back to the save response */
        }
        if (!fresh?.paymentDetailId) fresh = { ...fresh, paymentDetails: null };
        queryClient.setQueryData(["systemsettings"], fresh);

        setShowPaybillDetails(fresh?.paymentDetails?.name === "Paybill");
        setPaymentDetailName(fresh?.paymentDetails?.name || "");
        form.resetFields();
        form.setFieldsValue(getInitialValues(fresh));
        return true;
      } catch (error: any) {
        console.error("Error saving system settings:", error);
        message.error(error.response?.data?.details || "Failed to save system settings");
        return false;
      }
    }

    return false;
  };

  // Prepare initial values for the form
  function getInitialValues(src: any = data) {
    if (!src) return {};

    return {
      ...src,
      till_no: withLeadingZero(src?.till_no),
      phoneNumber: reversePhoneNumber(src?.phone),
      paymentDetailId: src?.paymentDetails?._id
        ? { value: src.paymentDetails._id, label: src.paymentDetails.name }
        : undefined,
      whatsapp_notify_secondary: src?.whatsapp_notify_secondary ?? false,
      secondary_phones: src?.secondary_phones ?? [],
    };
  }

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
              tooltip="Optional — leave empty if the business has no till or paybill"
              options={paymentDetailsList}
              fieldProps={{
                onSelect: (value: string, option) => onPaymentDetailsChange(value, option),
                onClear: () => {
                  setShowPaybillDetails(false);
                  setPaymentDetailName("");
                },
                size: "large",
                allowClear: true,
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            {showPaybillDetails ? (
              <Row gutter={24}>
                <Col span={12}>
                  <ProFormText
                    name="account_no"
                    label="Account No."
                    placeholder="Enter account number (optional)"
                    fieldProps={{
                      size: "large",
                    }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormText
                    name="business_no"
                    label="Business No."
                    placeholder="Enter business number (optional)"
                    fieldProps={{
                      size: "large",
                    }}
                  />
                </Col>
              </Row>
            ) : (
              <ProFormText
                name="till_no"
                label={
                  paymentDetailName && !/paybill|till/i.test(paymentDetailName)
                    ? `${paymentDetailName} No.`
                    : "Till No."
                }
                placeholder={`Enter ${paymentDetailName && !/paybill|till/i.test(paymentDetailName) ? paymentDetailName : "till"} number (optional)`}
                fieldProps={{
                  size: "large",
                }}
              />
            )}
          </Col>
        </Row>

        {/* ── WhatsApp Secondary Alerts ── */}
        <Divider orientation="left">WhatsApp Secondary Alerts</Divider>

        <Row gutter={24}>
          <Col xs={24} sm={24} md={12}>
            <ProFormSwitch
              name="whatsapp_notify_secondary"
              label="Notify Secondary Phones"
              fieldProps={{ checkedChildren: "ON", unCheckedChildren: "OFF" }}
              tooltip="When enabled, WhatsApp booking alerts are also sent to the numbers below"
            />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24}>
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.whatsapp_notify_secondary !== currentValues.whatsapp_notify_secondary}>
              {({ getFieldValue }) =>
                getFieldValue("whatsapp_notify_secondary") ? (
                  <Form.Item
                    name="secondary_phones"
                    label={
                      <Space>
                        <WhatsAppOutlined style={{ color: "#25D366" }} />
                        Secondary Phone Numbers
                      </Space>
                    }
                    extra="Enter numbers in E.164 format (e.g. +254712345678). Press Enter after each number."
                  >
                    <Select
                      mode="tags"
                      placeholder="+254712345678"
                      tokenSeparators={[","]}
                      style={{ width: "100%" }}
                      size="large"
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Col>
        </Row>
      </ProForm>
    </Card>
  );
}

export default SystemSetup;