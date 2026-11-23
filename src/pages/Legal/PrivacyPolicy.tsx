import React from "react";
import { Typography, Card } from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

// Bump this whenever the policy changes; it is shown to users as the effective date.
const LAST_UPDATED = "22 November 2026";

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
          <Text type="secondary">Last Updated: {LAST_UPDATED}</Text>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          <Title level={4}>1. Introduction</Title>
          <Paragraph>
            Basepoint Cloud ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, share, and protect information when you use Basepoint Cloud, including Duka (Point of
            Sale), Pesa (Accounting), Mteja (CRM), Bandu (HR), Dala (Property), ESign, and Biashara AI. It covers the web
            application, the Base mobile apps, and the desktop app and printing agent. We process personal data in line
            with the Kenya Data Protection Act, 2019. Use of the Service is also governed by
            our <Link to="/terms-and-conditions">Terms and Conditions</Link>.
          </Paragraph>

          <Title level={4}>2. Our Role</Title>
          <Paragraph>
            For account, billing, and usage information about our customers, we are the <Text strong>data
            controller</Text>. For data that businesses store in the Service about their own customers, staff, tenants,
            or suppliers, the business is the data controller. We act as its <Text strong>data processor</Text> and only
            process that data to provide the Service on its instructions. If you are a customer of a business that uses
            Basepoint Cloud, please contact that business about your data.
          </Paragraph>

          <Title level={4}>3. Information We Collect</Title>
          <Paragraph>
            <Text strong>Account information:</Text> Name, email address, phone number, business name, company code, KRA
            PIN, branch details, and login details for you and your staff.
          </Paragraph>
          <Paragraph>
            <Text strong>Billing information:</Text> Your subscription plans, billing cycle, invoices, and payment
            records, including the M-Pesa phone number and transaction references used to pay. We do not store full
            card numbers or mobile money PINs.
          </Paragraph>
          <Paragraph>
            <Text strong>Business data:</Text> Information you enter while using the Service, such as sales, orders,
            inventory, customers, staff and payroll records, attendance, leases and meter readings, financial
            transactions, forms, and signed documents.
          </Paragraph>
          <Paragraph>
            <Text strong>Messages:</Text> Messages sent and received through connected channels in Mteja, such as
            WhatsApp, Instagram, Facebook, SMS, and email.
          </Paragraph>
          <Paragraph>
            <Text strong>Biashara AI conversations:</Text> The questions you ask Biashara AI and the answers it gives.
          </Paragraph>
          <Paragraph>
            <Text strong>Usage and device data:</Text> Log data, IP address, browser and device information, app
            version, connected printers, and how you use the Service. With your permission, the apps may also use your
            camera to scan barcodes and QR codes.
          </Paragraph>

          <Title level={4}>4. How We Use Your Information</Title>
          <Paragraph>
            We use information to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Provide, maintain, and improve the Service and the products you subscribe to</li>
            <li>Manage subscriptions and free trials, issue invoices and receipts, and process payments</li>
            <li>Send billing reminders and notices about overdue invoices, account restrictions, or suspension</li>
            <li>Send technical notices, security alerts, and support messages</li>
            <li>Answer Biashara AI questions and generate insights from your business data</li>
            <li>Submit invoices to KRA eTIMS when you use that feature</li>
            <li>Monitor usage, fix problems, and prevent fraud and security incidents</li>
            <li>Send product updates and marketing, which you can opt out of at any time</li>
            <li>Comply with legal, tax, and accounting obligations</li>
          </ul>
          <Paragraph>
            We do not sell your personal information, and we do not use your business data to train public AI models.
          </Paragraph>

          <Title level={4}>5. How We Share Information</Title>
          <Paragraph>
            We share information only as needed to run the Service, with:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li><Text strong>Payment providers</Text> such as M-Pesa, to process subscription payments and payments you accept</li>
            <li><Text strong>Tax systems</Text>, namely KRA eTIMS through an approved integrator, when you submit tax invoices</li>
            <li><Text strong>Messaging providers</Text>, such as WhatsApp and Meta, Twilio, Africa's Talking, and email delivery services, to send and receive messages you initiate</li>
            <li><Text strong>AI providers</Text>, such as OpenAI and Google, to process Biashara AI questions; only the data needed to answer each question is sent</li>
            <li><Text strong>Hosting and storage providers</Text>, which store our databases, files, images, and backups</li>
            <li><Text strong>Authorities</Text>, when the law requires it, or to protect our rights, users, or the public</li>
            <li><Text strong>A buyer or successor</Text>, if our business is sold or merged, subject to this policy</li>
          </ul>
          <Paragraph>
            These providers may use the information only to perform services for us and must protect it.
          </Paragraph>

          <Title level={4}>6. Data Security</Title>
          <Paragraph>
            We use technical and organizational measures to protect information, including encrypted connections,
            access controls and role-based permissions, optional two-factor authentication, and audit trails. However,
            no method of transmission or storage is 100% secure. You are responsible for keeping your login details
            and staff access secure.
          </Paragraph>

          <Title level={4}>7. Data Retention</Title>
          <Paragraph>
            We keep information for as long as your account is active and as needed to provide the Service. Billing and
            financial records are kept for as long as tax and accounting laws require. If your account is suspended for
            non-payment, your data is kept and is not deleted. After you cancel or your account is terminated, we delete
            or anonymize business data within a reasonable period, unless the law requires us to keep it. You can export
            your data before closing your account.
          </Paragraph>

          <Title level={4}>8. Your Rights</Title>
          <Paragraph>
            Under the Kenya Data Protection Act, 2019, and other applicable laws, you have the right to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Be informed about how your personal data is used</li>
            <li>Access your personal data</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Request deletion of your data, subject to legal retention requirements</li>
            <li>Object to processing, including for direct marketing</li>
            <li>Request data portability</li>
          </ul>
          <Paragraph>
            To exercise these rights, contact us using the details below. You may also complain to the Office of the
            Data Protection Commissioner (ODPC) in Kenya.
          </Paragraph>

          <Title level={4}>9. Cookies and Local Storage</Title>
          <Paragraph>
            The Service uses cookies, browser local storage, and similar technologies to keep you signed in, remember
            your settings (such as your selected branch and product), and support offline use. Clearing them may sign you
            out or remove unsynced offline data.
          </Paragraph>

          <Title level={4}>10. International Data Transfers</Title>
          <Paragraph>
            Some of our service providers, including hosting and AI providers, are located outside Kenya. When we transfer
            personal data abroad, we take steps to make sure it is protected as required by the Kenya Data Protection
            Act, 2019.
          </Paragraph>

          <Title level={4}>11. Children's Privacy</Title>
          <Paragraph>
            The Service is intended for businesses and is not directed at children under 18. We do not knowingly collect
            personal data from children.
          </Paragraph>

          <Title level={4}>12. Changes to This Privacy Policy</Title>
          <Paragraph>
            We may update this Privacy Policy from time to time. We will post the new version on this page and update the
            "Last Updated" date, and will notify you in the app or by email of material changes.
          </Paragraph>

          <Title level={4}>13. Contact Us</Title>
          <Paragraph>
            If you have any questions about this Privacy Policy or how we handle your data, please contact us at:
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
