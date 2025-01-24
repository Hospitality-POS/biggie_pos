import React, { useState } from "react";
import {
  Input,
  Card,
  Typography,
  Layout,
  Menu,
  List,
  Tag,
  Button,
  Breadcrumb,
  Modal,
  Spin,
  Rate,
  Drawer,
  Empty,
} from "antd";
import {
  SearchOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  TeamOutlined,
  StarOutlined,
  FireOutlined,
  LikeOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";

const { Title, Paragraph, Text } = Typography;
const { Header, Sider, Content } = Layout;

// Mock data for the help center
const categories = [
  {
    key: "getting-started",
    icon: <BookOutlined />,
    label: "Getting Started",
    description: "Essential guides to get you up and running",
  },
  {
    key: "account",
    icon: <TeamOutlined />,
    label: "Account & Billing",
    description: "Manage your account and subscription",
  },
  {
    key: "faq",
    icon: <QuestionCircleOutlined />,
    label: "FAQ",
    description: "Common questions and answers",
  },
];

const articles = {
  "getting-started": [
    {
      id: 1,
      title: "Quick Start Guide",
      description: "Learn the basics of our platform in 5 minutes",
      tags: ["beginner", "setup"],
      content: "Detailed quick start guide content goes here...",
      views: 1520,
      helpful: 423,
      lastUpdated: "2024-01-10",
      readTime: "5 min",
      relatedArticles: [2, 3],
    },
    {
      id: 2,
      title: "Installation Guide",
      description: "Step-by-step installation instructions",
      tags: ["setup", "technical"],
      content: "Detailed installation guide content goes here...",
      views: 980,
      helpful: 256,
      lastUpdated: "2024-01-12",
      readTime: "8 min",
      relatedArticles: [1, 4],
    },
  ],
  account: [
    {
      id: 3,
      title: "Managing Your Subscription",
      description:
        "Learn how to upgrade, downgrade, or cancel your subscription",
      tags: ["billing", "subscription"],
      content: "Detailed subscription management guide goes here...",
      views: 750,
      helpful: 180,
      lastUpdated: "2024-01-08",
      readTime: "6 min",
      relatedArticles: [4],
    },
    {
      id: 4,
      title: "Security Settings",
      description: "Configure your account security and privacy settings",
      tags: ["security", "settings"],
      content: "Detailed security settings guide goes here...",
      views: 890,
      helpful: 312,
      lastUpdated: "2024-01-14",
      readTime: "7 min",
      relatedArticles: [3],
    },
  ],
  faq: [
    {
      id: 5,
      title: "Common Issues",
      description: "Solutions to frequently reported problems",
      tags: ["troubleshooting"],
      content: "Detailed common issues solutions go here...",
      views: 2100,
      helpful: 567,
      lastUpdated: "2024-01-13",
      readTime: "10 min",
      relatedArticles: [6],
    },
    {
      id: 6,
      title: "API Integration",
      description: "Common questions about API usage and integration",
      tags: ["api", "technical"],
      content: "Detailed API integration guide goes here...",
      views: 1230,
      helpful: 445,
      lastUpdated: "2024-01-11",
      readTime: "12 min",
      relatedArticles: [5],
    },
  ],
};

const ArticleDetail = ({ article, onClose, visible }) => {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const handleFeedback = () => {
    setFeedbackSubmitted(true);
    // Here you would typically send the feedback to your backend
  };

  const relatedArticlesData = article.relatedArticles
    .map((id) =>
      Object.values(articles)
        .flat()
        .find((a) => a.id === id)
    )
    .filter(Boolean);

  return (
    <Drawer
      title={
        <Breadcrumb
          items={[{ title: "Help Center" }, { title: article.title }]}
        />
      }
      width={720}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: "center" }}>
          {!feedbackSubmitted ? (
            <>
              <Text>Was this article helpful?</Text>
              <Rate value={rating} onChange={setRating} />
              <Button
                type="primary"
                onClick={handleFeedback}
                disabled={!rating}
              >
                Submit Feedback
              </Button>
            </>
          ) : (
            <Text type="success">Thank you for your feedback!</Text>
          )}
        </div>
      }
    >
      <ProCard>
        <Title level={2}>{article.title}</Title>
        <div style={{ marginBottom: 16 }}>
          {article.tags.map((tag) => (
            <Tag key={tag} color="blue" style={{ marginRight: 8 }}>
              {tag}
            </Tag>
          ))}
        </div>
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary" style={{ marginRight: 16 }}>
            <ClockCircleOutlined /> {article.readTime}
          </Text>
          <Text type="secondary" style={{ marginRight: 16 }}>
            <FireOutlined /> {article.views} views
          </Text>
          <Text type="secondary">
            <LikeOutlined /> {article.helpful} found helpful
          </Text>
        </div>
        <Paragraph>{article.content}</Paragraph>

        {relatedArticlesData.length > 0 && (
          <>
            <Title level={4}>Related Articles</Title>
            <List
              dataSource={relatedArticlesData}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </ProCard>
    </Drawer>
  );
};

const HelpCenter = () => {
  const [selectedCategory, setSelectedCategory] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = (value) => {
    setLoading(true);
    setSearchQuery(value);
    // Simulate API call delay
    setTimeout(() => setLoading(false), 500);
  };

  const filteredArticles = articles[selectedCategory].filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const currentCategory = categories.find(
    (cat) => cat.key === selectedCategory
  );

  return (
    <>
      <Layout style={{ minHeight: "80vh", background: "#f6ffed" }}>
        <Sider width={250} style={{ background: "#f6ffed" }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedCategory]}
            items={categories}
            onClick={({ key }) => setSelectedCategory(key)}
            style={{ borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: "0 24px 24px", background: "#fff" }}>
          <Content>
            <ProCard
              title={currentCategory?.label}
              subTitle={currentCategory?.description}
            >
              <Input.Search
                size="large"
                placeholder="Search for help..."
                allowClear
                enterButton
                onChange={(e) => handleSearch(e.target.value)}
                style={{ marginBottom: 24 }}
              />

              <Spin spinning={loading}>
                {filteredArticles.length > 0 ? (
                  <List
                    grid={{ gutter: 16, column: 1 }}
                    dataSource={filteredArticles}
                    renderItem={(article) => (
                      <List.Item>
                        <Card
                          hoverable
                          onClick={() => setSelectedArticle(article)}
                          style={{ height: "100%" }}
                        >
                          <Title level={4}>{article.title}</Title>
                          <Paragraph>{article.description}</Paragraph>
                          <div style={{ marginBottom: 16 }}>
                            {article.tags.map((tag) => (
                              <Tag
                                key={tag}
                                color="blue"
                                style={{ marginRight: 8 }}
                              >
                                {tag}
                              </Tag>
                            ))}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text type="secondary">
                              <ClockCircleOutlined style={{ marginRight: 8 }} />
                              {article.readTime}
                            </Text>
                            <Text type="secondary">
                              Last updated: {article.lastUpdated}
                            </Text>
                          </div>
                        </Card>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description="No articles found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </ProCard>
          </Content>
        </Layout>
      </Layout>

      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          visible={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
};

export default HelpCenter;
