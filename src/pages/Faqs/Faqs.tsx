import React, { useState, useEffect } from "react";
import { Input, Collapse, Card, Typography, Tabs, Button, Space, Tooltip, Table } from "antd";
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import {
  fetchAllFaqs,
  fetchAllFaqCategories,
  deleteFaq,
  deleteFaqCategory
} from "../../services/faq";
import FaqModal from "../../components/MODALS/pro/AddFaqModal";
import FaqCategoryModal from "../../components/MODALS/pro/AddFaqCategoryModal";

const { Panel } = Collapse;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [faqCategories, setFaqCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Modal states
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);

  // Fetch FAQs and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const faqData = await fetchAllFaqs({});
      setFaqs(faqData);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const categoryData = await fetchAllFaqCategories({});
      setFaqCategories(categoryData);
    } catch (error) {
      console.error("Error fetching FAQ categories:", error);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, []);

  // Filter FAQs based on search term
  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal handlers
  const handleAddFaq = () => {
    setCurrentFaq(null);
    setFaqModalVisible(true);
  };

  const handleEditFaq = (faq) => {
    setCurrentFaq(faq);
    setFaqModalVisible(true);
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category) => {
    setCurrentCategory(category);
    setCategoryModalVisible(true);
  };

  const handleDeleteFaq = async (id) => {
    try {
      await deleteFaq(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteFaqCategory(id);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Category table columns
  const categoryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditCategory(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteCategory(record._id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Frequently Asked Questions"
      header={{
        title: <Title level={2}>Frequently Asked Questions</Title>,
      }}
    >
      <Card bordered={false} style={{ margin: "0 auto" }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="FAQs" key="1">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Input
                size="large"
                placeholder="Search FAQs..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddFaq}
              >
                Add FAQ
              </Button>
            </div>

            <Collapse accordion bordered={false} className="faq-collapse">
              {filteredFaqs.map((faq) => (
                <Panel
                  header={faq.question}
                  key={faq._id}
                  className="faq-panel"
                  extra={
                    <Space>
                      <Tooltip title="Edit">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFaq(faq);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFaq(faq._id);
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                >
                  <p>{faq.answer}</p>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      Category: {faq.faq_category_id?.name || "Uncategorized"}
                    </Text>
                  </div>
                </Panel>
              ))}
            </Collapse>

            {filteredFaqs.length === 0 && !loading && (
              <Typography.Text
                type="secondary"
                style={{ display: "block", textAlign: "center", margin: 24 }}
              >
                No FAQs found matching your search.
              </Typography.Text>
            )}
          </TabPane>

          <TabPane tab="FAQ Categories" key="2">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddCategory}
              >
                Add Category
              </Button>
            </div>

            <Table
              columns={categoryColumns}
              dataSource={faqCategories}
              rowKey="_id"
              loading={categoryLoading}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* FAQ Modal */}
      <FaqModal
        visible={faqModalVisible}
        onCancel={() => setFaqModalVisible(false)}
        faq={currentFaq}
        categories={faqCategories}
        onSuccess={() => {
          setFaqModalVisible(false);
          fetchData();
        }}
      />

      {/* Category Modal */}
      <FaqCategoryModal
        visible={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        category={currentCategory}
        onSuccess={() => {
          setCategoryModalVisible(false);
          fetchCategories();
        }}
      />
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