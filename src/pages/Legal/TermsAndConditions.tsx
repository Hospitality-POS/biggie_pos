import React from "react";
import { Typography, Card } from "antd";

const { Title, Paragraph, Text } = Typography;

const TermsAndConditions: React.FC = () => {
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f5f5f5", 
      padding: "40px 20px",
      display: "flex",
      justifyContent: "center"
    }}>
      <Card 
        style={{ 
          maxWidth: 900, 
          width: "100%",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
        }}
        bodyStyle={{ padding: "40px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img 
            src="https://basepoint.co.ke/logo.png" 
            alt="Basepoint Logo" 
            style={{ 
              height: 60, 
              marginBottom: 16,
              objectFit: "contain"
            }}
          />
          <Title level={2} style={{ marginBottom: 8 }}>Terms and Conditions</Title>
          <Text type="secondary">Last Updated: {new Date().toLocaleDateString()}</Text>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          <Title level={4}>1. Acceptance of Terms</Title>
          <Paragraph>
            By accessing and using Basepoint Cloud's Business Management Suite (including Duka, Pesa, Mteja, 
            and Bandu), you accept and agree to be bound by the terms and provisions of this agreement. 
            If you do not agree to abide by these terms, please do not use our service.
          </Paragraph>

          <Title level={4}>2. Description of Service</Title>
          <Paragraph>
            Basepoint Cloud provides a comprehensive business management platform that includes:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li><Text strong>Duka (Store Front):</Text> Point of sale and inventory management</li>
            <li><Text strong>Pesa (Accounting):</Text> Financial management and accounting tools</li>
            <li><Text strong>Mteja (CRM):</Text> Customer relationship management</li>
            <li><Text strong>Bandu (HR):</Text> Human resources and staff management</li>
          </ul>

          <Title level={4}>3. User Accounts</Title>
          <Paragraph>
            To access certain features of our service, you must register for an account. You agree to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your account information to keep it accurate, current, and complete</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>

          <Title level={4}>4. User Responsibilities</Title>
          <Paragraph>
            As a user of our service, you agree to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Use the service only for lawful purposes</li>
            <li>Not use the service to transmit any harmful, offensive, or illegal content</li>
            <li>Not attempt to gain unauthorized access to our systems or networks</li>
            <li>Not interfere with or disrupt the service or servers</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <Title level={4}>5. Subscription and Payment</Title>
          <Paragraph>
            Our service is offered on a subscription basis. You agree to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Pay all fees associated with your subscription plan</li>
            <li>Provide accurate billing information</li>
            <li>Authorize automatic billing for recurring payments</li>
            <li>Understand that fees are non-refundable except as required by law</li>
          </ul>

          <Title level={4}>6. Data and Content</Title>
          <Paragraph>
            <Text strong>Your Data:</Text> You retain ownership of all data you input into our service. We will not 
            sell your data to third parties.
          </Paragraph>
          <Paragraph>
            <Text strong>Content:</Text> You are responsible for ensuring that any content you upload or store 
            complies with applicable laws and does not infringe on third-party rights.
          </Paragraph>

          <Title level={4}>7. Intellectual Property</Title>
          <Paragraph>
            All content, features, and functionality of the Basepoint Cloud service are owned by Basepoint Cloud 
            and are protected by international copyright, trademark, and other intellectual property laws.
          </Paragraph>

          <Title level={4}>8. Service Availability</Title>
          <Paragraph>
            We strive to maintain high availability of our service. However, we do not guarantee that the service 
            will be uninterrupted, secure, or error-free. We reserve the right to suspend or discontinue the 
            service for maintenance or updates.
          </Paragraph>

          <Title level={4}>9. Limitation of Liability</Title>
          <Paragraph>
            To the fullest extent permitted by law, Basepoint Cloud shall not be liable for any indirect, 
            incidental, special, consequential, or punitive damages, including but not limited to loss of profits, 
            data, use, or other intangible losses, resulting from your use of the service.
          </Paragraph>

          <Title level={4}>10. Termination</Title>
          <Paragraph>
            We reserve the right to terminate or suspend your account at any time, with or without cause, with 
            or without notice. Upon termination, your right to use the service will immediately cease.
          </Paragraph>

          <Title level={4}>11. Governing Law</Title>
          <Paragraph>
            These terms shall be governed by and construed in accordance with the laws of Kenya, without regard 
            to its conflict of law provisions.
          </Paragraph>

          <Title level={4}>12. Changes to Terms</Title>
          <Paragraph>
            We reserve the right to modify these terms at any time. We will notify users of any material changes 
            by posting the new terms on this page and updating the "Last Updated" date.
          </Paragraph>

          <Title level={4}>13. Contact Information</Title>
          <Paragraph>
            If you have any questions about these Terms and Conditions, please contact us at:
          </Paragraph>
          <Paragraph>
            <Text strong>Email:</Text> legal@basepoint.co.ke<br />
            <Text strong>Website:</Text> https://basepoint.co.ke
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default TermsAndConditions;
