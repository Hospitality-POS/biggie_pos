import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Typography,
  Steps,
  message,
  Divider,
} from 'antd';
import {
  MailOutlined,
  KeyOutlined,
  CheckOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { requestPasswordReset, confirmPasswordReset } from '@services/authentication';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const PasswordReset: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestReset = async (values: { email: string }) => {
    setLoading(true);
    try {
      await requestPasswordReset({ email: values.email });
      setEmail(values.email);
      setCurrentStep(1);
      setMessage('Password reset email sent. Check your inbox for the reset token.');
    } catch (error: any) {
      message.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (values: { token: string; newPassword: string }) => {
    setLoading(true);
    try {
      await confirmPasswordReset({
        token: values.token,
        email,
        newPassword: values.newPassword,
      });
      setCurrentStep(2);
      setMessage('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      message.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <MailOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={3}>Reset Your Password</Title>
              <Paragraph type="secondary">
                Enter your email address and we'll send you a reset token.
              </Paragraph>
            </div>

            <Form onFinish={handleRequestReset} layout="vertical">
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter your email"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Send Reset Email
                </Button>
              </Form.Item>
            </Form>

            <Divider />
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          </Space>
        );

      case 1:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="Check Your Email"
              description={
                <div>
                  <Paragraph>
                    We've sent a reset token to <strong>{email}</strong>
                  </Paragraph>
                  <Paragraph>
                    Enter the token from the email and choose a new password.
                  </Paragraph>
                </div>
              }
              type="info"
              showIcon
            />

            <Form onFinish={handleConfirmReset} layout="vertical">
              <Form.Item
                name="token"
                label="Reset Token"
                rules={[
                  { required: true, message: 'Please enter the reset token' },
                ]}
              >
                <Input
                  placeholder="Enter reset token from email"
                  size="large"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (!/[A-Z]/.test(value)) {
                        return Promise.reject(new Error('Must include uppercase letter'));
                      }
                      if (!/[a-z]/.test(value)) {
                        return Promise.reject(new Error('Must include lowercase letter'));
                      }
                      if (!/\d/.test(value)) {
                        return Promise.reject(new Error('Must include a number'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter new password"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm new password"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button onClick={() => setCurrentStep(0)}>
                    Back
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                  >
                    Reset Password
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        );

      case 2:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <CheckOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={3}>Password Reset Successful!</Title>
              <Paragraph type="secondary">
                Your password has been reset successfully. You will be redirected to the login page.
              </Paragraph>
            </div>

            <Alert
              message="Redirecting..."
              description="You will be automatically redirected to the login page in a few seconds."
              type="success"
              showIcon
            />
          </Space>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
      <Card>
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step title="Request" icon={<MailOutlined />} />
          <Step title="Reset" icon={<KeyOutlined />} />
          <Step title="Complete" icon={<CheckOutlined />} />
        </Steps>

        {renderStepContent()}
      </Card>
    </div>
  );
};

export default PasswordReset;
