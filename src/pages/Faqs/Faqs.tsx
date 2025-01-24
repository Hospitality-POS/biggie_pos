import React, { useState } from "react";
import { Input, Collapse, Card, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";

const { Panel } = Collapse;
const { Title } = Typography;

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const faqs = [
    {
      id: "1",
      question: "How do I set up my Relia POS system?",
      answer:
        "Setting up your Relia POS system is straightforward: 1) Connect the hardware components, 2) Install the software using the provided installation key, 3) Follow the initial setup wizard to configure your business details, and 4) Import your inventory or start adding products manually.",
    },
    {
      id: "2",
      question: "What payment methods does Relia POS support?",
      answer:
        "Relia POS supports multiple payment methods including credit/debit cards (Visa, Mastercard, American Express), contactless payments (Apple Pay, Google Pay), cash transactions, and gift cards. Custom payment methods can also be configured based on your business needs.",
    },
    {
      id: "3",
      question: "How do I generate sales reports?",
      answer:
        'To generate sales reports: 1) Navigate to the Reports section, 2) Select your desired report type (daily, weekly, monthly), 3) Choose the date range, and 4) Click "Generate". You can export reports in PDF, CSV, or Excel formats.',
    },
    {
      id: "4",
      question: "How can I manage my inventory through Relia POS?",
      answer:
        "Inventory management in Relia POS includes real-time tracking, automatic reorder notifications, and batch updates. You can add/edit products, set stock alerts, track product variations, and perform inventory counts. The system also supports barcode scanning for quick updates.",
    },
    {
      id: "5",
      question: "What kind of customer support is available?",
      answer:
        "24/7 technical support is available through multiple channels: live chat, phone support, email, and our online knowledge base. Premium support plans include dedicated account managers and priority response times.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer
      title="Frequently Asked Questions"
      header={{
        title: <Title level={2}>Frequently Asked Questions</Title>,
      }}
    >
      <Card bordered={false} style={{ maxWidth: 800, margin: "0 auto" }}>
        <Input
          size="large"
          placeholder="Search FAQs..."
          prefix={<SearchOutlined />}
          style={{ marginBottom: 24 }}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />

        <Collapse accordion bordered={false} className="faq-collapse">
          {filteredFaqs.map((faq) => (
            <Panel header={faq.question} key={faq.id} className="faq-panel">
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>

        {filteredFaqs.length === 0 && (
          <Typography.Text
            type="secondary"
            style={{ display: "block", textAlign: "center" }}
          >
            No FAQs found matching your search.
          </Typography.Text>
        )}
      </Card>
    </PageContainer>
  );
};

// Add custom styles
const styles = `
  .faq-collapse .ant-collapse-item {
    margin-bottom: 16px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
  }

  .faq-collapse .ant-collapse-header {
    padding: 16px 24px !important;
    font-weight: 500;
  }

  .faq-collapse .ant-collapse-content-box {
    padding: 16px 24px;
  }

  .faq-panel:last-child {
    margin-bottom: 0;
  }
`;

// Export both the component and styles
export { FAQPage, styles };
export default FAQPage;
