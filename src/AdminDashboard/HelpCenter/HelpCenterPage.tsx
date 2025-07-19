import React, { useState } from "react";
import {
  Input,
  Card,
  Typography,
  Layout,
  List,
  Tag,
  Button,
  Drawer,
  Empty,
  Space,
  Rate,
} from "antd";
import {
  SearchOutlined,
  QuestionCircleOutlined,
  CreditCardOutlined,
  RocketOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

const categories = [
  {
    key: "onboarding",
    icon: <RocketOutlined />,
    title: "Getting Started",
    description: "Basic setup and first steps",
  },
  {
    key: "billing",
    icon: <CreditCardOutlined />,
    title: "Account & Billing",
    description: "Manage your subscription",
  },
  {
    key: "integrations",
    icon: <ApiOutlined />,
    title: "Integrations",
    description: "Connect third-party services",
  },
  {
    key: "faq",
    icon: <QuestionCircleOutlined />,
    title: "FAQ",
    description: "Common questions",
  },
];

const articles = {
  onboarding: [
    {
      id: 1,
      title: "Quick Start Guide",
      description: "Get up and running in 5 minutes",
      type: "video",
      readTime: "5 min",
      views: 1200,
      helpful: 89,
      content: "Basic getting started content with video tutorial...",
    },
    {
      id: 2,
      title: "Account Setup",
      description: "Configure your account settings",
      type: "article",
      readTime: "3 min",
      views: 800,
      helpful: 65,
      content: "Step-by-step account configuration guide...",
    },
  ],
  billing: [
    {
      id: 3,
      title: "Subscription Plans",
      description: "Compare plans and pricing",
      type: "article",
      readTime: "4 min",
      views: 950,
      helpful: 72,
      content: "Detailed pricing information and plan comparison...",
    },
    {
      id: 4,
      title: "Payment Methods",
      description: "Add and manage payment options",
      type: "article",
      readTime: "2 min",
      views: 650,
      helpful: 45,
      content: "How to update your payment methods...",
    },
  ],
  integrations: [
    {
      id: 5,
      title: "Popular Integrations",
      description: "Connect Gmail, Slack, and more",
      type: "video",
      readTime: "8 min",
      views: 1500,
      helpful: 120,
      content: "Guide to setting up popular integrations...",
    },
    {
      id: 6,
      title: "API Documentation",
      description: "Build custom integrations",
      type: "article",
      readTime: "12 min",
      views: 700,
      helpful: 85,
      content: "Complete API reference and examples...",
    },
  ],
  faq: [
    {
      id: 7,
      title: "Common Issues",
      description: "Troubleshoot frequent problems",
      type: "article",
      readTime: "6 min",
      views: 2100,
      helpful: 180,
      content: "Solutions to the most common issues...",
    },
    {
      id: 8,
      title: "Contact Support",
      description: "Get help from our team",
      type: "article",
      readTime: "1 min",
      views: 500,
      helpful: 30,
      content: "How to reach our support team...",
    },
  ],
};

const ArticleDrawer = ({ article, visible, onClose }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = () => {
    setSubmitted(true);
  };

  if (!article) return null;

  return (
    <Drawer
      title={article.title}
      width={600}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: "center" }}>
          {!submitted ? (
            <Space direction="vertical">
              <Text>Was this helpful?</Text>
              <Rate value={rating} onChange={setRating} />
              <Button
                type="primary"
                disabled={!rating}
                onClick={handleFeedback}
              >
                Submit
              </Button>
            </Space>
          ) : (
            <Text type="success">Thanks for your feedback!</Text>
          )}
        </div>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Space>
            <Tag color={article.type === "video" ? "red" : "blue"}>
              {article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
              {article.type}
            </Tag>
            <Text type="secondary">
              <ClockCircleOutlined /> {article.readTime}
            </Text>
            <Text type="secondary">
              <EyeOutlined /> {article.views}
            </Text>
            <Text type="secondary">
              <LikeOutlined /> {article.helpful}
            </Text>
          </Space>
        </div>

        <Paragraph>{article.content}</Paragraph>
      </Space>
    </Drawer>
  );
};

const HelpCenter = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filteredArticles = selectedCategory
    ? articles[selectedCategory]?.filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []
    : [];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "40px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Title level={1}>Help Center</Title>
            <Paragraph style={{ fontSize: 16, marginBottom: 24 }}>
              Find answers and get support
            </Paragraph>
            <Input.Search
              placeholder="Search articles..."
              size="large"
              style={{ maxWidth: 400 }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories or Articles */}
          {!selectedCategory ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {categories.map((category) => (
                <Card
                  key={category.key}
                  hoverable
                  onClick={() => setSelectedCategory(category.key)}
                  style={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: 32, marginBottom: 16, color: "#1890ff" }}>
                    {category.icon}
                  </div>
                  <Title level={4}>{category.title}</Title>
                  <Text type="secondary">{category.description}</Text>
                </Card>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Button onClick={() => setSelectedCategory(null)}>
                  ← Back to Categories
                </Button>
              </div>

              {filteredArticles.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 1 }}
                  dataSource={filteredArticles}
                  renderItem={(article) => (
                    <List.Item>
                      <Card
                        hoverable
                        onClick={() => setSelectedArticle(article)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <Title level={5} style={{ marginBottom: 8 }}>
                              {article.title}
                            </Title>
                            <Paragraph style={{ marginBottom: 12, color: "#666" }}>
                              {article.description}
                            </Paragraph>
                            <Space>
                              <Tag color={article.type === "video" ? "red" : "blue"}>
                                {article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
                                {article.type}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                <ClockCircleOutlined /> {article.readTime}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                <EyeOutlined /> {article.views}
                              </Text>
                            </Space>
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="No articles found"
                  style={{ padding: 40 }}
                />
              )}
            </div>
          )}
        </div>

        <ArticleDrawer
          article={selectedArticle}
          visible={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      </Content>
    </Layout>
  );
};

export default HelpCenter;