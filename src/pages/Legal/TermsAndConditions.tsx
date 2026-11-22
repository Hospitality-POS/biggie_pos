import React from "react";
import { Typography, Card } from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

// Bump this whenever the terms change; it is shown to users as the effective date.
const LAST_UPDATED = "22 November 2026";

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
          <Text type="secondary">Last Updated: {LAST_UPDATED}</Text>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          <Title level={4}>1. Acceptance of Terms</Title>
          <Paragraph>
            These Terms and Conditions ("Terms") govern your access to and use of Basepoint Cloud, including the web
            application, the Base mobile apps, the desktop app and printing agent, and any related services
            (together, the "Service"). By creating an account, starting a free trial, or using the Service, you agree
            to these Terms on behalf of yourself and the business you represent. If you do not agree, do not use the
            Service.
          </Paragraph>

          <Title level={4}>2. Description of Service</Title>
          <Paragraph>
            Basepoint Cloud is a modular business management platform. Each product below is subscribed to separately,
            and you only have access to the products your business has activated:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li><Text strong>Duka (Point of Sale):</Text> sales, tills, inventory, recipes, restaurant tables, kitchen display, and offline orders</li>
            <li><Text strong>Pesa (Accounting):</Text> bookkeeping, invoices, expenses, bank reconciliation, VAT reports, and KRA eTIMS invoicing</li>
            <li><Text strong>Mteja (CRM):</Text> customer records, leads, campaigns, forms, and WhatsApp and other messaging channels</li>
            <li><Text strong>Bandu (HR):</Text> staff records, shifts, attendance, and payroll</li>
            <li><Text strong>Dala (Property):</Text> properties, units, leases, rent invoicing, and meter readings</li>
            <li><Text strong>ESign:</Text> document templates and electronic signatures</li>
            <li><Text strong>Biashara AI:</Text> an AI assistant that answers questions about your business data</li>
          </ul>
          <Paragraph>
            Features may differ by plan. We may add, change, or remove features over time to improve the Service.
          </Paragraph>

          <Title level={4}>3. User Accounts</Title>
          <Paragraph>
            To use the Service you must register a business account. You agree to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Provide accurate, current, and complete business and contact information, and keep it up to date</li>
            <li>Keep login details, PINs, and company codes confidential, and use two-factor authentication where available</li>
            <li>Control which staff members get access and what permissions they have</li>
            <li>Accept responsibility for all activity under your account, including activity by your staff</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>

          <Title level={4}>4. Acceptable Use</Title>
          <Paragraph>
            You agree to:
          </Paragraph>
          <ul style={{ paddingLeft: 20 }}>
            <li>Use the Service only for lawful business purposes</li>
            <li>Not send spam or unsolicited messages through Mteja, and obtain any consent required before messaging your customers</li>
            <li>Not upload or transmit harmful, offensive, or illegal content</li>
            <li>Not attempt to gain unauthorized access to our systems, other accounts, or networks</li>
            <li>Not interfere with, overload, or disrupt the Service</li>
            <li>Comply with all applicable laws, including tax, consumer protection, employment, and data protection laws</li>
          </ul>

          <Title level={4}>5. Free Trial</Title>
          <Paragraph>
            Paid products may include a one-month free trial unless stated otherwise. At the end of the trial, you must
            subscribe to a paid plan to keep using that product. If you do not, access to it may be restricted. We may
            change or withdraw trial offers at any time, and trials are limited to one per business per product.
          </Paragraph>

          <Title level={4}>6. Subscriptions, Billing, and Payment</Title>
          <ul style={{ paddingLeft: 20 }}>
            <li>
              <Text strong>Per-product plans:</Text> Each product is billed under its own plan. The plan you choose sets
              the features and limits you get, such as the number of tills, branches, or users.
            </li>
            <li>
              <Text strong>Billing cycles:</Text> Plans are billed monthly, quarterly, or yearly. Yearly plans may come
              with a discount (currently 10%) shown at checkout.
            </li>
            <li>
              <Text strong>Prices and tax:</Text> Prices are in Kenya Shillings (KES) and exclude Value Added Tax (VAT),
              which is added at the applicable rate (currently 16%). One-time setup or onboarding fees, if any, are
              shown before you subscribe.
            </li>
            <li>
              <Text strong>Add-ons and usage:</Text> Extra tills, branches, users, or other add-ons beyond your plan's
              limits are charged at the rates shown in the app. Messaging and similar usage-based services may be
              charged separately.
            </li>
            <li>
              <Text strong>Invoices:</Text> We issue an invoice at the start of each billing cycle. Invoices are due
              within 7 days of issue unless the invoice states otherwise. You can view invoices and receipts under
              Billing in the app, and receipts are sent to your registered business email.
            </li>
            <li>
              <Text strong>Payment:</Text> Invoices can be paid by M-Pesa or any other method shown in the app. You are
              responsible for any charges your bank or mobile money provider applies.
            </li>
            <li>
              <Text strong>Renewal:</Text> Subscriptions renew at the end of each billing cycle, and a new invoice is
              issued, until you cancel.
            </li>
            <li>
              <Text strong>Price changes:</Text> We may change our prices. We will give you reasonable notice in the app
              or by email before a new price applies to your next billing cycle.
            </li>
          </ul>

          <Title level={4}>7. Late Payment and Suspension</Title>
          <Paragraph>
            An invoice that is not paid by its due date is marked overdue. If an invoice remains unpaid, we may restrict
            or suspend access to the affected products, or to your whole account, until the balance is cleared. While
            suspended, account administrators may be redirected to the Billing page. Access is restored once payment is
            received. Suspension does not delete your data.
          </Paragraph>

          <Title level={4}>8. Upgrades, Downgrades, and Cancellation</Title>
          <Paragraph>
            You can upgrade, downgrade, or cancel a product subscription from Billing or by contacting us. Upgrades take
            effect when payment for the new plan is received. Downgrades and cancellations take effect at the end of the
            current billing cycle, and you keep access until then. Downgrading may reduce limits or remove features, so
            data beyond the new plan's limits may become read-only or hidden.
          </Paragraph>

          <Title level={4}>9. Refunds</Title>
          <Paragraph>
            Fees are non-refundable, including for partial billing periods and unused features, except where required by
            law or where we decide otherwise in writing. If we bill you in error, we will correct the invoice or issue a
            credit or refund.
          </Paragraph>

          <Title level={4}>10. Your Data</Title>
          <Paragraph>
            <Text strong>Ownership:</Text> You keep ownership of all data you enter into the Service, including sales,
            customer, employee, and financial records. We do not sell your data. Our handling of personal data is
            described in our <Link to="/privacy-policy">Privacy Policy</Link>.
          </Paragraph>
          <Paragraph>
            <Text strong>Your responsibilities:</Text> You are responsible for the accuracy and lawfulness of the data
            you upload. Where your data includes personal data of your customers or staff, you are responsible for having
            a lawful basis to collect it and for informing them as required by the Kenya Data Protection Act, 2019, and
            other applicable laws.
          </Paragraph>
          <Paragraph>
            <Text strong>Export and deletion:</Text> You can export your data from the Service at any time while your
            account is active. After cancellation or termination, we may delete your data after a reasonable period,
            except where we must keep it by law.
          </Paragraph>

          <Title level={4}>11. Tax Compliance and Third-Party Services</Title>
          <Paragraph>
            The Service connects to third-party services such as KRA eTIMS (through an approved integrator), M-Pesa,
            WhatsApp and other messaging platforms, email and SMS providers, and app stores. Your use of those services
            may also be governed by their own terms. We are not responsible for their availability or actions. You remain
            responsible for your own tax filings and for checking that invoices and reports meet your legal obligations.
          </Paragraph>

          <Title level={4}>12. Biashara AI</Title>
          <Paragraph>
            Biashara AI generates answers automatically from your business data, using AI models provided by third
            parties. Answers may be incomplete or wrong and are not professional, financial, legal, or tax advice. Check
            important figures before relying on them.
          </Paragraph>

          <Title level={4}>13. Intellectual Property</Title>
          <Paragraph>
            The Service, including its software, design, and trademarks such as Basepoint, Duka, Pesa, Mteja, Bandu,
            Dala, and Biashara AI, is owned by Basepoint Cloud and its licensors and is protected by intellectual property
            laws. We grant you a limited, non-exclusive, non-transferable right to use the Service for your business
            while your subscription is active. You may not copy, resell, or reverse engineer the Service.
          </Paragraph>

          <Title level={4}>14. Service Availability</Title>
          <Paragraph>
            We work to keep the Service available, and some features, such as offline orders and printing, can keep
            working during short connectivity outages. However, we do not guarantee that the Service will be
            uninterrupted, secure, or error-free. We may carry out maintenance and updates, and will try to give notice
            of planned downtime.
          </Paragraph>

          <Title level={4}>15. Limitation of Liability</Title>
          <Paragraph>
            To the fullest extent permitted by law, Basepoint Cloud is not liable for any indirect, incidental, special,
            consequential, or punitive damages, including loss of profits, revenue, data, or goodwill, resulting from your
            use of the Service. Our total liability for any claim relating to the Service is limited to the fees you paid
            us for the affected product in the three months before the claim arose.
          </Paragraph>

          <Title level={4}>16. Termination</Title>
          <Paragraph>
            You may stop using the Service and cancel your subscriptions at any time, as described in section 8. We may
            suspend or terminate your account if you breach these Terms, fail to pay amounts due, or use the Service in a
            way that could harm us, other users, or third parties. Where reasonable, we will give you notice first. When
            your account is terminated, your right to use the Service ends, and any unpaid amounts remain due.
          </Paragraph>

          <Title level={4}>17. Governing Law</Title>
          <Paragraph>
            These Terms are governed by the laws of Kenya, and the courts of Kenya have jurisdiction over any dispute
            arising from them.
          </Paragraph>

          <Title level={4}>18. Changes to These Terms</Title>
          <Paragraph>
            We may update these Terms from time to time. We will post the new version on this page and update the "Last
            Updated" date, and will notify you in the app or by email of material changes, including changes to billing.
            If you keep using the Service after changes take effect, you accept the updated Terms.
          </Paragraph>

          <Title level={4}>19. Contact Information</Title>
          <Paragraph>
            If you have any questions about these Terms, please contact us at:
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
