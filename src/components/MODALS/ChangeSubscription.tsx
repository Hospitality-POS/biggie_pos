import React, { useEffect, useRef, useState } from "react";
import { Space, Radio, Card, Button, Typography, message, Form } from "antd";
import { updateSubscription } from "@services/users";
import { useDispatch } from "react-redux";
import { ModalForm } from "@ant-design/pro-form";
import { SwapOutlined, WalletOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";

interface ChangeSubscriptionModalProps {
  tenant: any;
  actionRef: any;
}

const { Text } = Typography;

const ChangeSubscriptionModal: React.FC<ChangeSubscriptionModalProps> = ({
  tenant,
  actionRef,
}) => {
  const [selectedPlan, setSelectedPlan] = useState(tenant.subscription_id._id);
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  useEffect(() => {
    if (open && tenant) {
      form.setFieldsValue({
        ...tenant,
      });
    }
  }, [open, tenant, form]);

  const isDisabled = tenant.invoices && tenant.invoices.length > 0;

  const dispatch = useDispatch();

  const handleSubmit = async () => {
    const storedCode = localStorage.getItem("companyCode");
    const payload = {
      tenantId: tenant._id,
      companyCode: storedCode,
      subscription_id: selectedPlan,
    };

    try {
      await dispatch(updateSubscription(payload)); // Wait for the updateSubscription to complete
      message.success("Account subscription package updated successfully");
      setOpen(false);
      actionRef.current.reset();
      return true;
    } catch (error) {
      console.log("Account subscription package update failed", error);
      return false;
    }
  };

  return (
    <ModalForm
      trigger={
        <Button type="primary" icon={<SwapOutlined />} disabled={isDisabled}>
          Change Plan
        </Button>
      }
      title={
        <Space>
          <SwapOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Change Subscription Plan
          </Title>
        </Space>
      }
      open={open}
      onOpenChange={handleOpenChange}
      form={form}
      formRef={formRef}
      style={{ padding: "24px", backgroundColor: "#f5f5f5" }}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: 700,
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Confirm Change",
        },
        render: (props, dom) => (
          <Space
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {dom}
          </Space>
        ),
      }}
      onFinish={handleSubmit}
    >
      <Space direction="vertical" style={{ width: "100%", padding: "20px 0" }}>
        <Radio.Group
          style={{ width: "100%" }}
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
        >
          <Space direction="horizontal" style={{ width: "100%" }}>
            {tenant.subscriptions.map((plan: any) => (
              <Radio
                key={plan._id}
                value={plan._id}
                checked={
                  plan._id.toString() === tenant.subscription_id._id.toString()
                }
                style={{ width: "100%" }}
              >
                <Card style={{ width: "100%", marginTop: "8px" }}>
                  <Space direction="vertical">
                    <Text strong>{plan.name}</Text>
                    {plan.price.map((pricing: any) =>
                      Object.entries(pricing).map(
                        ([billingCycle, amount]) =>
                          billingCycle === tenant.subscription_cycle && (
                            <Text type="secondary" key={billingCycle}>
                              {billingCycle === "yearly"
                                ? `Yearly: ${amount} Kes`
                                : `Monthly:  ${amount} Kes`}
                            </Text>
                          )
                      )
                    )}
                  </Space>
                </Card>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Space>
    </ModalForm>
  );
};

export default ChangeSubscriptionModal;
