import React, { useState } from 'react';
import { Modal, Space, Radio, Card, Button, Typography, message } from 'antd';
import { updateSubscription } from "@services/users";
import { useDispatch } from 'react-redux';

const { Text } = Typography;

const ChangeSubscription = ({ tenant, isModalVisible, setIsModalVisible }) => {
  const [selectedPlan, setSelectedPlan] = useState(tenant.subscription_id._id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();


  const handleSubmit = async () => {
    setIsSubmitting(true);

    const storedCode = localStorage.getItem("companyCode");
    const payload = {
      tenantId: tenant._id,
      companyCode: storedCode,
      subscription_id: selectedPlan
    };

    try {
      await dispatch(updateSubscription(payload)); // Wait for the updateSubscription to complete
      message.success("Account subscription package updated successfully");
    } catch (error) {
      message.error("Account subscription package update failed");
    } finally {
      setIsModalVisible(false); // Close the modal after the request is complete
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Change Subscription Plan"
      visible={isModalVisible}
      onCancel={() => setIsModalVisible(false)}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%', padding: '20px 0' }}>
        <Radio.Group
          style={{ width: '100%' }}
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
        >
          <Space direction="horizontal" style={{ width: '100%' }}>
            {tenant.subscriptions.map((plan) => (
              <Radio
                key={plan._id}
                value={plan._id}
                checked={plan._id.toString() === tenant.subscription_id._id.toString()}
                style={{ width: '100%' }}
              >
                <Card style={{ width: '100%', marginTop: '8px' }}>
                  <Space direction="vertical">
                    <Text strong>{plan.name}</Text>
                    {plan.price.map((pricing) =>
                      Object.entries(pricing).map(([billingCycle, amount]) => (
                        billingCycle === tenant.subscription_cycle && (
                          <Text type="secondary" key={billingCycle}>
                            {billingCycle === 'yearly' ? `Yearly: ${amount} Kes` : `Monthly:  ${amount} Kes`}
                          </Text>
                        )
                      ))
                    )}
                  </Space>
                </Card>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
        <Button
          type="primary"
          block
          onClick={handleSubmit}
          loading={isSubmitting}
          style={{ marginTop: '20px' }}
        >
          Confirm Change
        </Button>
      </Space>
    </Modal>
  );
};

export default ChangeSubscription;
