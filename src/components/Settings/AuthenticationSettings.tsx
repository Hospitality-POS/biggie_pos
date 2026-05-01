import React, { useState, useEffect } from 'react';
import {
  Card,
  Radio,
  Space,
  Typography,
  Modal,
  message,
} from 'antd';
import {
  KeyOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { disablePassword, disable2FA, enableOtp, disableOtp } from '@services/authentication';
import { updateUsers } from '@services/users';
import PasswordSetupModal from './PasswordSetupModal';
import TwoFASetupModal from './TwoFASetupModal';
import { ProCard } from '@ant-design/pro-components';
import { usePrimaryColor } from '@context/PrimaryColorContext';

const { Title, Text, Paragraph } = Typography;

interface AuthenticationSettingsProps {
  userId: string;
  userEmail?: string;
  userData?: any;
  onAuthMethodChange?: () => void;
}

type AuthMethod = 'pin' | 'password' | '2fa' | 'otp';

const AuthenticationSettings: React.FC<AuthenticationSettingsProps> = ({ userId, userEmail, userData, onAuthMethodChange }) => {
  const primaryColor = usePrimaryColor();
  const [currentMethod, setCurrentMethod] = useState<AuthMethod>(userData?.preferredAuthMethod || 'pin');
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [twoFAModalVisible, setTwoFAModalVisible] = useState(false);

  const methods = [
    {
      id: 'pin' as AuthMethod,
      name: 'PIN Login',
      description: 'Quick 4-digit PIN access',
      icon: <KeyOutlined />,
      color: '#1890ff',
    },
    {
      id: 'password' as AuthMethod,
      name: 'Password Login',
      description: 'Email and password authentication',
      icon: <MailOutlined />,
      color: '#52c41a',
    },
    {
      id: '2fa' as AuthMethod,
      name: 'Two-Factor Authentication',
      description: 'Authenticator app required',
      icon: <SafetyCertificateOutlined />,
      color: '#722ed1',
    },
    {
      id: 'otp' as AuthMethod,
      name: 'OTP Authentication',
      description: 'Email one-time password',
      icon: <SafetyCertificateOutlined />,
      color: '#ff7a45',
    },
  ];

  // Update currentMethod when userData changes
  useEffect(() => {
    if (userData?.preferredAuthMethod) {
      setCurrentMethod(userData.preferredAuthMethod);
    }
  }, [userData]);

  const handleMethodChange = async (newMethod: AuthMethod) => {
    if (currentMethod === newMethod) {
      // Show manage options for current method
      if (newMethod === 'password') {
        setPasswordModalVisible(true);
      } else if (newMethod === '2fa') {
        setTwoFAModalVisible(true);
      }
      return;
    }

    // Must disable current method before enabling new one
    if (currentMethod !== 'pin') {
      Modal.confirm({
        title: 'Switch Authentication Method',
        icon: <ExclamationCircleOutlined />,
        content: `You must disable your current ${methods.find(m => m.id === currentMethod)?.name} before switching to ${methods.find(m => m.id === newMethod)?.name}. This action cannot be undone.`,
        okText: 'Switch Method',
        cancelText: 'Cancel',
        okType: 'danger',
        onOk: async () => {
          await switchMethod(newMethod);
        },
      });
    } else {
      await switchMethod(newMethod);
    }
  };

  const switchMethod = async (newMethod: AuthMethod) => {
    setLoading(true);
    try {
      // Disable current method if not PIN
      if (currentMethod !== 'pin') {
        if (currentMethod === 'password') {
          await disablePassword(userId, newMethod);
        } else if (currentMethod === '2fa') {
          await disable2FA(userId, newMethod);
        } else if (currentMethod === 'otp') {
          await disableOtp({ userId }, newMethod);
        }
      }

      // Enable new method
      if (newMethod === 'password') {
        setPasswordModalVisible(true);
      } else if (newMethod === '2fa') {
        setTwoFAModalVisible(true);
      } else if (newMethod === 'otp') {
        await enableOtp({ userId }, newMethod);
        setCurrentMethod('otp');
        onAuthMethodChange?.();
        message.success('OTP authentication enabled successfully');
      } else if (newMethod === 'pin') {
        // PIN is always enabled by default
        setCurrentMethod('pin');
        onAuthMethodChange?.();
        message.success('Switched to PIN login');
      }
    } catch (error) {
      message.error('Failed to switch authentication method');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordEnabled = async () => {
    setCurrentMethod('password');
    onAuthMethodChange?.();
    setPasswordModalVisible(false);
    message.success('Password login enabled successfully');
  };

  const handle2FAEnabled = async () => {
    setLoading(true);
    try {
      // Update user with 2FA enabled and set preferred auth method
      await updateUsers({
        _id: userId,
        value: {
          twoFactorEnabled: true,
          preferredAuthMethod: '2fa'
        }
      });
      setCurrentMethod('2fa');
      onAuthMethodChange?.();
      setTwoFAModalVisible(false);
      message.success('Two-factor authentication enabled successfully');
    } catch (error) {
      message.error('Failed to enable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div>
      <ProCard ghost>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Paragraph type="secondary">
              Choose how you want to log in to your account. Only one method can be active at a time.
            </Paragraph>
          </div>

          <div>
            <Title level={5}>Available Methods</Title>
            <Radio.Group
              value={currentMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-start' }}>
                {methods.map((method) => (
                  <Card
                    key={method.id}
                    hoverable
                    className={`auth-method-card ${currentMethod === method.id ? 'active' : ''}`}
                    style={{
                      borderColor: currentMethod === method.id ? primaryColor : '#d9d9d9',
                      borderWidth: currentMethod === method.id ? 2 : 1,
                      width: 280,
                      height: 120,
                    }}
                  >
                    <Radio value={method.id} style={{ width: '100%' }}>
                      <div style={{ marginLeft: '24px' }}>
                        <Space direction="vertical" size="small">
                          <Space>
                            <span style={{ color: currentMethod === method.id ? primaryColor : method.color, fontSize: '18px' }}>
                              {method.icon}
                            </span>
                            <Text strong>{method.name}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {method.description}
                          </Text>
                        </Space>
                      </div>
                    </Radio>
                  </Card>
                ))}
              </Space>
            </Radio.Group>
          </div>

                  </Space>
      </ProCard>

      <PasswordSetupModal
        visible={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onEnable={handlePasswordEnabled}
        userId={userId}
        userEmail={userEmail}
        preferredAuthMethod="password"
      />

      <TwoFASetupModal
        visible={twoFAModalVisible}
        onCancel={() => setTwoFAModalVisible(false)}
        onEnable={handle2FAEnabled}
        userId={userId}
        userEmail={userEmail}
        preferredAuthMethod="2fa"
      />
    </div>
  );
};

export default AuthenticationSettings;
