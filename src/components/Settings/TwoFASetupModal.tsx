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
  Steps,
  Card,
  Row,
  Col,
  message,
  Spin,
} from 'antd';

const { OTP } = Input;

import {
  SafetyCertificateOutlined,
  QrcodeOutlined,
  MobileOutlined,
  KeyOutlined,
  CopyOutlined,
  DownloadOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { setup2FA, verify2FASetup, disable2FA, regenerate2FACodes } from '@services/authentication';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface TwoFASetupModalProps {
  visible: boolean;
  onCancel: () => void;
  onEnable: () => void;
  userId: string;
  userEmail?: string;
  isManaging?: boolean;
  preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp';
}

const TwoFASetupModal: React.FC<TwoFASetupModalProps> = ({
  visible,
  onCancel,
  onEnable,
  userId,
  userEmail,
  isManaging = false,
  preferredAuthMethod,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codesCopied, setCodesCopied] = useState(false);

  const resetModal = () => {
    setCurrentStep(0);
    setQrCode('');
    setBackupCodes([]);
    setSecret('');
    setVerificationCode('');
    setCodesCopied(false);
    form.resetFields();
  };

  const handleCancel = () => {
    resetModal();
    onCancel();
  };

  const setup2FAFlow = async () => {
    setLoading(true);
    try {
      const response = await setup2FA(userId, preferredAuthMethod);
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setCurrentStep(1);
    } catch (error: any) {
      message.error(error.message || 'Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    setLoading(true);
    try {
      await verify2FASetup({ userId, token: verificationCode }, preferredAuthMethod);
      resetModal();
      onEnable();
    } catch (error: any) {
      message.error(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    Modal.confirm({
      title: 'Disable Two-Factor Authentication',
      content: 'Are you sure you want to disable 2FA? This will make your account less secure.',
      okText: 'Disable',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        try {
          await disable2FA(userId);
          handleCancel();
          message.success('2FA has been disabled');
        } catch (error: any) {
          message.error(error.message || 'Failed to disable 2FA');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleRegenerateCodes = async () => {
    Modal.confirm({
      title: 'Regenerate Backup Codes',
      content: 'This will invalidate your existing backup codes. Are you sure?',
      okText: 'Regenerate',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        try {
          const newCodes = await regenerate2FACodes(userId);
          setBackupCodes(newCodes);
          message.success('Backup codes regenerated successfully');
        } catch (error: any) {
          message.error(error.message || 'Failed to regenerate codes');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCodesCopied(true);
    message.success('Backup codes copied to clipboard');
    setTimeout(() => setCodesCopied(false), 3000);
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([`2FA Backup Codes\n\n${codesText}\n\nKeep these codes safe!`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="About Two-Factor Authentication"
              description={
                <div>
                  <Paragraph>
                    2FA adds an extra layer of security by requiring a verification code from your authenticator app.
                  </Paragraph>
                  <Paragraph>
                    You'll need to install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator on your phone.
                  </Paragraph>
                </div>
              }
              type="info"
              showIcon
            />

            <div style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="middle">
                <MobileOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                <div>
                  <Title level={5}>Ready to setup 2FA?</Title>
                  <Text type="secondary">Click below to generate your QR code</Text>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<QrcodeOutlined />}
                  onClick={setup2FAFlow}
                  loading={loading}
                >
                  Generate QR Code
                </Button>
              </Space>
            </div>
          </Space>
        );

      case 1:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="Step 1: Scan QR Code"
              description="Scan the QR code below with your authenticator app"
              type="info"
              showIcon
            />

            <div style={{ textAlign: 'center' }}>
              {qrCode && (
                <div
                  style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    border: '1px solid #d9d9d9',
                  }}
                >
                  <img src={qrCode} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
                </div>
              )}
            </div>

            <Alert
              message="Can't scan?"
              description={
                <div>
                  <Paragraph>
                    If you can't scan the QR code, you can manually enter this secret key in your authenticator app:
                  </Paragraph>
                  <Input.Password
                    value={secret}
                    readOnly
                    style={{ fontFamily: 'monospace', textAlign: 'center' }}
                  />
                </div>
              }
              type="warning"
              showIcon
            />

            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                onClick={() => setCurrentStep(2)}
                size="large"
              >
                I've scanned the code
              </Button>
            </div>
          </Space>
        );

      case 2:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="Step 2: Enter Verification Code"
              description="Enter the 6-digit code from your authenticator app"
              type="info"
              showIcon
            />

            <Form onFinish={verifyAndEnable}>
              <Form.Item
                name="verificationCode"
                rules={[
                  { required: true, message: 'Please enter the verification code' },
                ]}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <OTP
                  size="large"
                  length={6}
                  onChange={(value) => setVerificationCode(value)}
                  style={{ fontSize: '32px' }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Verify and Enable
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        );

      case 3:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="2FA Enabled Successfully!"
              description={
                <div>
                  <Paragraph>
                    Two-factor authentication is now active on your account. Save your backup codes in a secure location.
                  </Paragraph>
                </div>
              }
              type="success"
              showIcon
            />

            <Card title="Backup Codes" size="small">
              <Alert
                message="Important"
                description="Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Row gutter={[8, 8]}>
                {backupCodes.map((code, index) => (
                  <Col key={index} span={12}>
                    <Input
                      value={code}
                      readOnly
                      style={{ fontFamily: 'monospace', textAlign: 'center' }}
                    />
                  </Col>
                ))}
              </Row>

              <Space style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                <Button
                  icon={<CopyOutlined />}
                  onClick={copyBackupCodes}
                  type={codesCopied ? 'default' : 'primary'}
                >
                  {codesCopied ? 'Copied!' : 'Copy Codes'}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadBackupCodes}
                >
                  Download
                </Button>
              </Space>
            </Card>

            <div style={{ textAlign: 'center' }}>
              <Button type="primary" onClick={handleCancel}>
                Complete Setup
              </Button>
            </div>
          </Space>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined />
          {isManaging ? 'Manage 2FA' : 'Setup Two-Factor Authentication'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      {isManaging ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="2FA is currently enabled"
            description="You can disable 2FA or regenerate your backup codes."
            type="info"
            showIcon
          />

          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              danger
              onClick={handleDisable2FA}
              loading={loading}
            >
              Disable 2FA
            </Button>
            <Button
              onClick={handleRegenerateCodes}
              loading={loading}
            >
              Regenerate Backup Codes
            </Button>
          </Space>
        </Space>
      ) : (
        <>
          <Steps current={currentStep} style={{ marginBottom: '24px' }}>
            <Step title="Setup" icon={<QrcodeOutlined />} />
            <Step title="Scan" icon={<MobileOutlined />} />
            <Step title="Verify" icon={<KeyOutlined />} />
            <Step title="Complete" icon={<CheckOutlined />} />
          </Steps>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : (
            renderStepContent()
          )}
        </>
      )}
    </Modal>
  );
};

export default TwoFASetupModal;
