import React, { useState } from "react";
import {
  Input,
  Card,
  Typography,
  Layout,
  List,
  Tag,
  Button,
  Empty,
  Space,
} from "antd";
import {
  QuestionCircleOutlined,
  CreditCardOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  BookOutlined,
  ShoppingCartOutlined,
  DollarCircleOutlined,
  UserOutlined,
  HomeOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { helpCenterArticles, Article, Category } from "../../assets/help-center";
import { ArticleDrawer } from "./components/ArticleDrawer";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

const categories: Category[] = [
  {
    key: "duka",
    icon: <ShoppingCartOutlined />,
    title: "Duka (POS)",
    description: "Point of Sale & Store Management",
    color: "#3b82f6",
  },
  {
    key: "pesa",
    icon: <DollarCircleOutlined />,
    title: "Pesa (Accounting)",
    description: "Financial Management & Accounting",
    color: "#10b981",
  },
  {
    key: "mteja",
    icon: <UserOutlined />,
    title: "Mteja (CRM)",
    description: "Customer Relationship Management",
    color: "#8b5cf6",
  },
  {
    key: "dala",
    icon: <HomeOutlined />,
    title: "Dala (Property)",
    description: "Property & Real Estate Management",
    color: "#f59e0b",
  },
  {
    key: "bandu",
    icon: <RocketOutlined />,
    title: "Bandu (HR)",
    description: "Human Resources & Payroll",
    color: "#ec4899",
  },
  {
    key: "etims",
    icon: <SafetyOutlined />,
    title: "Etims (Tax)",
    description: "KRA Tax Compliance & Integration",
    color: "#ef4444",
  },
  {
    key: "admin",
    icon: <QuestionCircleOutlined />,
    title: "Admin Dashboard",
    description: "System Administration & Management",
    color: "#6366f1",
  },
  {
    key: "reports",
    icon: <FileTextOutlined />,
    title: "Reports & Analytics",
    description: "Business Intelligence & Insights",
    color: "#14b8a6",
  },
  {
    key: "onboarding",
    icon: <RocketOutlined />,
    title: "Getting Started",
    description: "Basic setup and first steps",
    color: "#6366f1",
  },
  {
    key: "billing",
    icon: <CreditCardOutlined />,
    title: "Account & Billing",
    description: "Manage your subscription",
    color: "#ec4899",
  },
  {
    key: "faq",
    icon: <QuestionCircleOutlined />,
    title: "FAQ",
    description: "Common questions",
    color: "#64748b",
  },
];

const HelpCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = selectedCategory
    ? (helpCenterArticles[selectedCategory] || []).filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <Content style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: 20,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                marginBottom: 20,
                boxShadow: "0 10px 40px rgba(102, 126, 234, 0.3)",
              }}
            >
              <BookOutlined style={{ fontSize: 40, color: "#fff" }} />
            </div>
            <Title level={1} style={{ marginBottom: 12, color: "#1f2937" }}>
              Help Center
            </Title>
            <Paragraph style={{ fontSize: 16, color: "#6b7280", marginBottom: 32 }}>
              Comprehensive guides for Duka, Pesa, Mteja, Dala, and Etims
            </Paragraph>
            <Input.Search
              placeholder="Search for guides, tutorials, and articles..."
              size="large"
              style={{ maxWidth: 500, borderRadius: 12 }}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            />
          </div>

          {/* Categories or Articles */}
          {!selectedCategory ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
              {categories.map((category) => (
                <Card
                  key={category.key}
                  hoverable
                  onClick={() => setSelectedCategory(category.key)}
                  style={{
                    textAlign: "center",
                    borderRadius: 16,
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  styles={{
                    body: { padding: "32px 24px" },
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: `${category.color}15`,
                      marginBottom: 20,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span style={{ fontSize: 32, color: category.color }}>
                      {category.icon}
                    </span>
                  </div>
                  <Title level={4} style={{ marginBottom: 8, color: "#1f2937" }}>
                    {category.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {category.description}
                  </Text>
                  <div style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 12, color: category.color, fontWeight: 500 }}>
                      {helpCenterArticles[category.key]?.length || 0} articles
                    </Text>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Button
                  onClick={() => setSelectedCategory(null)}
                  icon={<ArrowRightOutlined rotate={180} />}
                  style={{ borderRadius: 8 }}
                >
                  Back to Categories
                </Button>
              </div>

              <Title level={3} style={{ marginBottom: 24, color: "#1f2937" }}>
                {categories.find((c) => c.key === selectedCategory)?.title}
              </Title>

              {filteredArticles.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 1 }}
                  dataSource={filteredArticles}
                  renderItem={(article) => (
                    <List.Item style={{ marginBottom: 16 }}>
                      <Card
                        hoverable
                        onClick={() => setSelectedArticle(article)}
                        style={{
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.2s ease",
                        }}
                        styles={{
                          body: { padding: "20px 24px" },
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <Title level={5} style={{ marginBottom: 8, color: "#1f2937" }}>
                              {article.title}
                            </Title>
                            <Paragraph style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
                              {article.description}
                            </Paragraph>
                            <Space wrap>
                              <Tag
                                color={article.type === "video" ? "red" : "blue"}
                                icon={article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
                                style={{ fontSize: 12 }}
                              >
                                {article.type.toUpperCase()}
                              </Tag>
                              <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 12 }}>
                                {article.readTime}
                              </Tag>
                              <Tag icon={<EyeOutlined />} style={{ fontSize: 12 }}>
                                {article.views} views
                              </Tag>
                              <Tag icon={<LikeOutlined />} color="green" style={{ fontSize: 12 }}>
                                {article.helpful} helpful
                              </Tag>
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
                  style={{ padding: 60 }}
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
