import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Typography,
  Divider,
  Progress,
} from 'antd';
import {
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { enablePassword, changePassword } from '@services/authentication';

const { Title, Text } = Typography;

interface PasswordSetupModalProps {
  visible: boolean;
  onCancel: () => void;
  onEnable: () => void;
  userId: string;
  userEmail?: string;
  isChanging?: boolean;
  preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp';
}

const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({
  visible,
  onCancel,
  onEnable,
  userId,
  userEmail,
  isChanging = false,
  preferredAuthMethod,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };

    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, strength: (score / 5) * 100 };
  };

  const { checks, score, strength } = validatePassword(password);

  const getStrengthColor = () => {
    if (strength < 40) return '#ff4d4f';
    if (strength < 80) return '#faad14';
    return '#52c41a';
  };

  const getStrengthText = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isChanging) {
        await changePassword(userId, values.currentPassword, values.password);
      } else {
        await enablePassword({ userId, password: values.password, preferredAuthMethod });
      }
      form.resetFields();
      setPassword('');
      setConfirmPassword('');
      onEnable();
    } catch (error: any) {
      Modal.error({
        title: 'Error',
        content: error.message || 'Failed to set password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    form.setFieldsValue({ password: e.target.value });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    form.setFieldsValue({ confirmPassword: e.target.value });
  };

  return (
    <Modal
      title={
        <Space>
          <LockOutlined />
          {isChanging ? 'Change Password' : 'Enable Password Login'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ email: userEmail }}
      >
        {userEmail && (
          <Form.Item label="Email">
            <Input value={userEmail} disabled />
          </Form.Item>
        )}

        {isChanging && (
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[
              { required: true, message: 'Please enter your current password' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter current password"
              size="large"
            />
          </Form.Item>
        )}

        <Form.Item
          name="password"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const validation = validatePassword(value);
                if (!validation.checks.uppercase) {
                  return Promise.reject(new Error('Must include uppercase letter'));
                }
                if (!validation.checks.lowercase) {
                  return Promise.reject(new Error('Must include lowercase letter'));
                }
                if (!validation.checks.number) {
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
            onChange={handlePasswordChange}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {password && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text type="secondary">Password Strength</Text>
              <Text style={{ color: getStrengthColor() }}>{getStrengthText()}</Text>
            </div>
            <Progress
              percent={strength}
              showInfo={false}
              strokeColor={getStrengthColor()}
              size="small"
            />
            <div style={{ marginTop: '12px' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {checks.length ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#ff4d4f' }} />}
                  <Text style={{ fontSize: '12px' }}>At least 8 characters</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {checks.uppercase ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#ff4d4f' }} />}
                  <Text style={{ fontSize: '12px' }}>One uppercase letter</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {checks.lowercase ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#ff4d4f' }} />}
                  <Text style={{ fontSize: '12px' }}>One lowercase letter</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {checks.number ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#ff4d4f' }} />}
                  <Text style={{ fontSize: '12px' }}>One number</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {checks.special ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#ff4d4f' }} />}
                  <Text style={{ fontSize: '12px' }}>One special character (optional)</Text>
                </div>
              </Space>
            </div>
          </div>
        )}

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
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
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Alert
          message="Security Notice"
          description="Choose a strong password that you don't use for other accounts. Consider using a password manager to generate and store secure passwords."
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Divider />

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isChanging ? 'Change Password' : 'Enable Password'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PasswordSetupModal;
