import React, { useMemo, useState } from "react";
import {
  Input,
  Card,
  Typography,
  List,
  Tag,
  Button,
  Empty,
  Space,
  Spin,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantDetails, getCurrentTenantId } from "@services/tenants";
import { isTenantModuleEnabled, TenantModuleId } from "@utils/tenantModules";
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

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", faint: "#94a3b8" };

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

// Categories that belong to a Discover module — shown only once that module is
// activated. Categories not listed here (admin, reports, billing…) always show.
const CATEGORY_MODULE: Record<string, TenantModuleId> = {
  duka: "relia_pos",
  pesa: "relia_accounting",
  mteja: "mteja",
  dala: "dala",
  bandu: "relia_payroll",
  etims: "etims",
};

const HelpCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Same query as the Discover page, so the tenant record is shared from cache
  const tenantId = getCurrentTenantId() as string;
  const { data: tenantDetails, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantDetails(tenantId),
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const availableCategories = useMemo(
    () =>
      categories.filter((category) => {
        const moduleId = CATEGORY_MODULE[category.key];
        return !moduleId || isTenantModuleEnabled(tenantDetails?.data, moduleId);
      }),
    [tenantDetails]
  );

  const filteredCategories = searchQuery.trim()
    ? availableCategories.filter(
        (category) =>
          category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (helpCenterArticles[category.key] || []).some(
            (article) =>
              article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              article.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : availableCategories;

  const moduleNames = availableCategories
    .filter((c) => CATEGORY_MODULE[c.key])
    .map((c) => c.title.split(" (")[0]);

  const filteredArticles = selectedCategory
    ? (helpCenterArticles[selectedCategory] || []).filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <div style={{ padding: "16px 20px 24px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 8,
              padding: "6px 8px",
              color: "#3b82f6",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: C.text, fontWeight: 600, lineHeight: 1.3 }}>
              Help Center
            </Title>
            <Text style={{ fontSize: 12, color: C.sub, lineHeight: 1.3 }}>
              {moduleNames.length
                ? `Guides for your activated modules: ${moduleNames.join(", ")}`
                : "Guides for getting started and managing your account"}
            </Text>
          </div>
        </div>

        <Input.Search
          placeholder="Search for guides, tutorials, and articles..."
          style={{ width: 380, maxWidth: "100%" }}
          allowClear
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined style={{ color: C.faint }} />}
        />
      </div>

      {/* Categories or Articles */}
      {tenantLoading ? (
        <div style={{ display: "grid", placeContent: "center", padding: 60 }}>
          <Spin />
        </div>
      ) : !selectedCategory ? (
        filteredCategories.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {filteredCategories.map((category) => (
              <Card
                key={category.key}
                hoverable
                onClick={() => setSelectedCategory(category.key)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                }}
                styles={{
                  body: { padding: "18px 18px" },
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${category.color}14`,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 20, color: category.color }}>
                    {category.icon}
                  </span>
                </div>
                <Text strong style={{ display: "block", fontSize: 14, color: C.text, marginBottom: 2 }}>
                  {category.title}
                </Text>
                <Text style={{ fontSize: 12, color: C.sub }}>
                  {category.description}
                </Text>
                <div style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 11, color: category.color, fontWeight: 600 }}>
                    {helpCenterArticles[category.key]?.length || 0} articles
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            description="No categories or articles found"
            style={{ padding: 60 }}
          />
        )
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Button
              onClick={() => setSelectedCategory(null)}
              icon={<ArrowRightOutlined rotate={180} />}
              style={{ borderRadius: 8 }}
            >
              Back to Categories
            </Button>
            <Title level={4} style={{ margin: 0, color: C.text, fontWeight: 600 }}>
              {categories.find((c) => c.key === selectedCategory)?.title}
            </Title>
          </div>

          {filteredArticles.length > 0 ? (
            <List
              grid={{ gutter: 16, column: 1 }}
              dataSource={filteredArticles}
              renderItem={(article) => (
                <List.Item style={{ marginBottom: 10 }}>
                  <Card
                    hoverable
                    onClick={() => setSelectedArticle(article)}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    styles={{
                      body: { padding: "14px 16px" },
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ display: "block", fontSize: 14, color: C.text, marginBottom: 4 }}>
                          {article.title}
                        </Text>
                        <Paragraph style={{ marginBottom: 10, color: C.sub, fontSize: 13 }}>
                          {article.description}
                        </Paragraph>
                        <Space wrap size={6}>
                          <Tag
                            color={article.type === "video" ? "red" : "blue"}
                            icon={article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
                            style={{ fontSize: 11, margin: 0 }}
                          >
                            {article.type.toUpperCase()}
                          </Tag>
                          <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>
                            {article.readTime}
                          </Tag>
                          <Tag icon={<EyeOutlined />} style={{ fontSize: 11, margin: 0 }}>
                            {article.views} views
                          </Tag>
                          <Tag icon={<LikeOutlined />} color="green" style={{ fontSize: 11, margin: 0 }}>
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

      <ArticleDrawer
        article={selectedArticle}
        visible={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default HelpCenter;
