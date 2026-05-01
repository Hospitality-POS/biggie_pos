import { useState, useEffect, useRef } from "react";
import { Button, Space, Tag, Typography, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { PageContainer, ProCard, ProTable, ProDescriptions } from "@ant-design/pro-components";
import {
  fetchAllFaqs,
  fetchAllFaqCategories,
  deleteFaq,
  deleteFaqCategory
} from "../../services/faq";
import FaqModal from "../../components/MODALS/pro/AddFaqModal";
import FaqCategoryModal from "../../components/MODALS/pro/AddFaqCategoryModal";

const { Text } = Typography;

const FAQPage = () => {
  const [activeTab, setActiveTab] = useState("faqs");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqCategories, setFaqCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Modal states
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  
  const actionRef = useRef();
  const categoryActionRef = useRef();

  // Fetch FAQs and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const faqData = await fetchAllFaqs({});
      setFaqs(Array.isArray(faqData) ? faqData : []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      message.error("Failed to fetch FAQs");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const categoryData = await fetchAllFaqCategories({});
      setFaqCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      console.error("Error fetching FAQ categories:", error);
      message.error("Failed to fetch FAQ categories");
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, []);

  // Modal handlers
  const handleAddFaq = () => {
    setCurrentFaq(null);
    setFaqModalVisible(true);
  };

  const handleEditFaq = (faq: any) => {
    setCurrentFaq(faq);
    setFaqModalVisible(true);
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: any) => {
    setCurrentCategory(category);
    setCategoryModalVisible(true);
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await deleteFaq(id);
      message.success("FAQ deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      message.error("Failed to delete FAQ");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteFaqCategory(id);
      message.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      message.error("Failed to delete category");
    }
  };

  // Category table columns
  const categoryColumns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'FAQ Count',
      dataIndex: '_id',
      key: 'faqCount',
      render: (_: any, record: any) => {
        const count = faqs.filter(faq => faq.faq_category_id?._id === record._id).length;
        return <Tag color="blue">{count}</Tag>;
      },
      sorter: (a: any, b: any) => {
        const countA = faqs.filter(faq => faq.faq_category_id?._id === a._id).length;
        const countB = faqs.filter(faq => faq.faq_category_id?._id === b._id).length;
        return countA - countB;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCategory(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this category?"
            description="This will also delete all FAQs in this category."
            onConfirm={() => handleDeleteCategory(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // FAQ columns for ProTable
  const faqColumns = [
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      render: (text: any) => <Text strong>{text}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'faq_category_id',
      key: 'category',
      render: (_: any, record: any) => {
        const category = faqCategories.find(cat => cat._id === record.faq_category_id?._id);
        return category ? <Tag color="geekblue">{category.name}</Tag> : <Tag>Uncategorized</Tag>;
      },
      filters: faqCategories.map(cat => ({
        text: cat.name,
        value: cat._id,
      })),
      onFilter: (value: any, record: any) => record.faq_category_id?._id === value,
    },
    {
      title: 'Answer',
      dataIndex: 'answer',
      key: 'answer',
      ellipsis: true,
      search: false,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      search: false,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditFaq(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this FAQ?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteFaq(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Frequently Asked Questions"
      subTitle="Manage your FAQs and help customers find answers quickly"
      extra={[
        <Button
          key="addFaq"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddFaq}
        >
          Add FAQ
        </Button>,
      ]}
    >
      <ProCard
        tabs={{
          activeKey: activeTab,
          onChange: setActiveTab,
          items: [
            {
              label: (
                <span>
                  <QuestionCircleOutlined />
                  FAQs
                </span>
              ),
              key: 'faqs',
              children: (
                <ProCard bordered={false}>
                  <ProTable
                    actionRef={actionRef}
                    columns={faqColumns}
                    dataSource={faqs}
                    rowKey="_id"
                    loading={loading}
                    search={{
                      labelWidth: 'auto',
                    }}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} FAQs`,
                    }}
                    dateFormatter="string"
                    headerTitle="All FAQs"
                    options={{
                      density: true,
                      fullScreen: true,
                      reload: true,
                      setting: true,
                    }}
                    expandable={{
                      expandedRowRender: (record: any) => (
                        <ProDescriptions
                          column={1}
                          title="FAQ Details"
                          bordered
                        >
                          <ProDescriptions.Item label="Question">
                            {record.question}
                          </ProDescriptions.Item>
                          <ProDescriptions.Item label="Answer">
                            {record.answer}
                          </ProDescriptions.Item>
                          <ProDescriptions.Item label="Category">
                            {record.faq_category_id?.name || "Uncategorized"}
                          </ProDescriptions.Item>
                        </ProDescriptions>
                      ),
                      rowExpandable: (record: any) => record.question && record.answer,
                    }}
                  />
                </ProCard>
              ),
            },
            {
              label: 'Categories',
              key: 'categories',
              children: (
                <ProCard bordered={false}>
                  <ProTable
                    actionRef={categoryActionRef}
                    columns={categoryColumns}
                    dataSource={faqCategories}
                    rowKey="_id"
                    loading={categoryLoading}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} categories`,
                    }}
                    toolBarRender={() => [
                      <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddCategory}
                      >
                        Add Category
                      </Button>,
                    ]}
                    search={false}
                    headerTitle="FAQ Categories"
                    options={{
                      density: true,
                      fullScreen: true,
                      reload: true,
                      setting: true,
                    }}
                  />
                </ProCard>
              ),
            },
          ],
        }}
      />

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

export default FAQPage;