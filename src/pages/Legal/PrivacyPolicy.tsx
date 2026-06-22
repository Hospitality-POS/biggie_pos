import React from "react";
import { Typography, Card } from "antd";

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicy: React.FC = () => {
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
          <Title level={2} style={{ marginBottom: 8 }}>Privacy Policy</Title>
          <Text type="secondary">Last Updated: {new Date().toLocaleDateString()}</Text>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          <Title level={4}>1. Introduction</Title>
          <Paragraph>
            Basepoint Cloud ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
            explains how we collect, use, disclose, and safeguard your information when you use our Business 
            Management Suite, including Duka (Store Front), Pesa (Accounting), Mteja (CRM), and Bandu (HR) services.
          </Paragraph>

          <Title level={4}>2. Information We Collect</Title>
          <Paragraph>
            <Text strong>Personal Information:</Text> We collect information you provide directly, such as your name, 
            email address, phone number, and company details when you register for our services.
          </Paragraph>
          <Paragraph>
            <Text strong>Business Information:</Text> We collect information related to your business operations, 
            including sales data, inventory records, customer information, employee data, and financial transactions.
          </Paragraph>
          <Paragraph>
            <Text strong>Usage Data:</Text> We automatically collect information about how you use our services, 
            including log data, device information, and browsing patterns.
          </Paragraph>

          <Title level={4}>3. How We Use Your Information</Title>
          <Paragraph>
            We use the information we collect to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to comments and questions and provide customer service</li>
            <li>Monitor and analyze trends, usage, and activities</li>
            <li>Detect, investigate, and prevent security incidents and fraud</li>
            <li>Comply with legal obligations</li>
          </ul>

          <Title level={4}>4. Data Security</Title>
          <Paragraph>
            We implement appropriate technical and organizational measures to protect your personal information 
            against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
            over the Internet is 100% secure.
          </Paragraph>

          <Title level={4}>5. Data Retention</Title>
          <Paragraph>
            We retain your personal information for as long as necessary to provide our services and fulfill the 
            purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
          </Paragraph>

          <Title level={4}>6. Your Rights</Title>
          <Paragraph>
            You have the right to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Access and update your personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt-out of marketing communications</li>
            <li>Object to processing of your personal information</li>
            <li>Request data portability</li>
          </ul>

          <Title level={4}>7. Third-Party Services</Title>
          <Paragraph>
            We may employ third-party companies to facilitate our services, provide services on our behalf, or assist 
            us in analyzing how our services are used. These third parties have access to your personal information only 
            to perform specific tasks on our behalf.
          </Paragraph>

          <Title level={4}>8. International Data Transfers</Title>
          <Paragraph>
            Your information may be transferred to and maintained on computers located outside of your state, province, 
            country or other governmental jurisdiction where data protection laws may differ.
          </Paragraph>

          <Title level={4}>9. Changes to This Privacy Policy</Title>
          <Paragraph>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page and updating the "Last Updated" date.
          </Paragraph>

          <Title level={4}>10. Contact Us</Title>
          <Paragraph>
            If you have any questions about this Privacy Policy, please contact us at:
          </Paragraph>
          <Paragraph>
            <Text strong>Email:</Text> privacy@basepoint.co.ke<br />
            <Text strong>Website:</Text> https://basepoint.co.ke
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
