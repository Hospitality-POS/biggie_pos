import React, { useState } from "react";
import { Drawer, Space, Tag, Button, Rate, Typography } from "antd";
import {
  BookOutlined,
  LikeOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Article } from "../../../assets/help-center/types";

const { Title, Paragraph, Text } = Typography;

interface ArticleDrawerProps {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}

export const ArticleDrawer: React.FC<ArticleDrawerProps> = ({
  article,
  visible,
  onClose,
}) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = () => {
    setSubmitted(true);
  };

  if (!article) return null;

  return (
    <Drawer
      title={
        <Space>
          <BookOutlined style={{ color: "#1890ff" }} />
          <span>{article.title}</span>
        </Space>
      }
      width={720}
      open={visible}
      onClose={onClose}
      styles={{
        body: { background: "#fafafa" },
      }}
      footer={
        <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid #f0f0f0" }}>
          {!submitted ? (
            <Space direction="vertical" size="small">
              <Text style={{ fontSize: 13 }}>Was this helpful?</Text>
              <Rate value={rating} onChange={setRating} />
              <Button
                type="primary"
                disabled={!rating}
                onClick={handleFeedback}
                icon={<LikeOutlined />}
              >
                Submit Feedback
              </Button>
            </Space>
          ) : (
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
              <Text type="success" style={{ fontSize: 14 }}>Thanks for your feedback!</Text>
            </Space>
          )}
        </div>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Article Meta */}
        <div style={{ background: "#fff", padding: "16px", borderRadius: 8, border: "1px solid #f0f0f0" }}>
          <Space wrap>
            <Tag
              color={article.type === "video" ? "red" : "blue"}
              icon={article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
              style={{ fontSize: 12, padding: "4px 12px" }}
            >
              {article.type.toUpperCase()}
            </Tag>
            <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.readTime}
            </Tag>
            <Tag icon={<EyeOutlined />} style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.views} views
            </Tag>
            <Tag icon={<LikeOutlined />} color="green" style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.helpful} helpful
            </Tag>
          </Space>
        </div>

        {/* Article Content */}
        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: 8,
            border: "1px solid #f0f0f0",
            minHeight: 400,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <Title level={2} style={{ marginTop: 24, marginBottom: 16, color: "#1f2937" }}>
                  {children}
                </Title>
              ),
              h2: ({ children }) => (
                <Title level={3} style={{ marginTop: 20, marginBottom: 12, color: "#374151" }}>
                  {children}
                </Title>
              ),
              h3: ({ children }) => (
                <Title level={4} style={{ marginTop: 16, marginBottom: 8, color: "#4b5563" }}>
                  {children}
                </Title>
              ),
              p: ({ children }) => (
                <Paragraph style={{ marginBottom: 12, lineHeight: 1.7, color: "#6b7280" }}>
                  {children}
                </Paragraph>
              ),
              ul: ({ children }) => (
                <ul style={{ marginBottom: 16, paddingLeft: 20, color: "#6b7280" }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ marginBottom: 16, paddingLeft: 20, color: "#6b7280" }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 8, lineHeight: 1.6 }}>
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: "#1f2937", fontWeight: 600 }}>
                  {children}
                </strong>
              ),
              code: ({ children }) => (
                <code
                  style={{
                    background: "#f3f4f6",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 13,
                    color: "#dc2626",
                  }}
                >
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <div
                  style={{
                    borderLeft: "4px solid #3b82f6",
                    background: "#eff6ff",
                    padding: "12px 16px",
                    margin: "16px 0",
                    borderRadius: 4,
                    color: "#1e40af",
                  }}
                >
                  {children}
                </div>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </Space>
    </Drawer>
  );
};

export default ArticleDrawer;
