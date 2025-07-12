import React, { useState, useEffect } from "react";
import {
    Input,
    Card,
    Typography,
    Tabs,
    Button,
    Tooltip,
    Row,
    Col,
    Image,
    Modal,
    Upload,
    message,
    Spin,
    Select
} from "antd";
import {
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    UploadOutlined,
    GlobalOutlined,
    ShoppingCartOutlined,
    PictureOutlined,
    PhoneOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import {
    fetchAllImages,
    uploadImage,
    deleteImage,
    toggleImageStatus,
    validateImageFile,
    prepareImageFormData
} from "../../services/gallery";
import GalleryEditForm from "../../components/MODALS/Dialogs/GalleryEdit";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const POSWebsiteBuilder = () => {
    const shopId = localStorage.getItem("shopId");

    const [searchTerm, setSearchTerm] = useState("");
    const [galleryItems, setGalleryItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentEditItem, setCurrentEditItem] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalImages: 0
    });
    const [filters, setFilters] = useState({
        category: 'all',
        isActive: undefined
    });

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'products', label: 'Products' },
        { value: 'store', label: 'Store' },
        { value: 'banners', label: 'Banners' },
        { value: 'logos', label: 'Logos' },
        { value: 'social', label: 'Social Media' },
        { value: 'other', label: 'Other' }
    ];

    const formCategories = categories.slice(1);

    const fetchImages = async (page = 1) => {


        setLoading(true);
        try {
            const response = await fetchAllImages({
                category: filters.category === 'all' ? undefined : filters.category,
                isActive: filters.isActive,
                search: searchTerm,
                page,
                limit: 12
            });

            setGalleryItems(response.images || []);
            setPagination(response.pagination || {
                currentPage: 1,
                totalPages: 1,
                totalImages: 0
            });
        } catch (error) {
            console.error("Error fetching images:", error);
            message.error("Failed to fetch images");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) {
            const timeoutId = setTimeout(() => {
                fetchImages(1);
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [filters.category, filters.isActive, shopId]);

    useEffect(() => {
        if (shopId) {
            const timeoutId = setTimeout(() => {
                fetchImages(1);
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [searchTerm]);

    const handleUpload = async (info) => {
        const { fileList } = info;

        if (fileList.length === 0 || uploading) return;

        const newFiles = fileList
            .filter(file => file.originFileObj && file.status !== 'done')
            .map(file => file.originFileObj);

        if (newFiles.length === 0) return;

        setUploading(true);
        try {
            for (const file of newFiles) {
                if (validateImageFile(file)) {
                    const formData = prepareImageFormData(file, {
                        category: 'other',
                        title: file.name.split('.')[0]
                    });
                    await uploadImage(formData);
                }
            }

            await fetchImages(pagination.currentPage);
        } catch (error) {
            console.error("Error uploading images:", error);
            message.error("Failed to upload images");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = (id) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this image?',
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await deleteImage(id);
                    await fetchImages(pagination.currentPage);
                } catch (error) {
                    console.error("Error deleting image:", error);
                }
            },
        });
    };

    const handlePreview = (imageUrl) => {
        setPreviewImage(imageUrl);
        setPreviewVisible(true);
    };

    const handleEditImage = (item) => {
        setCurrentEditItem(item);
        setEditModalVisible(true);
    };

    const handleEditSuccess = async () => {
        await fetchImages(pagination.currentPage);
        setEditModalVisible(false);
        setCurrentEditItem(null);
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleImageStatus(id);
            await fetchImages(pagination.currentPage);
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handlePageChange = (page) => {
        fetchImages(page);
    };

    const isTabDisabled = (key) => {
        return key !== "gallery";
    };

    const uploadProps = {
        name: 'image',
        multiple: false,
        accept: 'image/*',
        showUploadList: false,
        beforeUpload: (file) => {
            const isValid = validateImageFile(file);
            if (isValid && !uploading) {
                setTimeout(() => {
                    handleUpload({ fileList: [{ originFileObj: file, status: 'uploading' }] });
                }, 0);
            }
            return false;
        },
        disabled: uploading
    };

    if (!shopId) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Shop ID not found. Please log in again.</Text>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Website Builder
                </Title>
                <Text type="secondary">
                    Build and customize your point-of-sale website with ease
                </Text>
            </div>

            <Card bordered={false}>
                <Tabs defaultActiveKey="gallery">
                    <TabPane
                        tab={
                            <span style={{ color: isTabDisabled("home") ? '#d9d9d9' : undefined }}>
                                <GlobalOutlined /> Home Page
                            </span>
                        }
                        key="home"
                        disabled={isTabDisabled("home")}
                    >
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            <GlobalOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <Title level={4} type="secondary">Home Page Builder</Title>
                            <Text type="secondary">Coming soon - Build your homepage with drag & drop components</Text>
                        </div>
                    </TabPane>

                    <TabPane
                        tab={
                            <span style={{ color: isTabDisabled("products") ? '#d9d9d9' : undefined }}>
                                <ShoppingCartOutlined /> Products
                            </span>
                        }
                        key="products"
                        disabled={isTabDisabled("products")}
                    >
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            <ShoppingCartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <Title level={4} type="secondary">Product Management</Title>
                            <Text type="secondary">Coming soon - Manage your product catalog and inventory</Text>
                        </div>
                    </TabPane>

                    <TabPane
                        tab={
                            <span>
                                <PictureOutlined /> Gallery
                            </span>
                        }
                        key="gallery"
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col flex="auto">
                                    <Input
                                        size="large"
                                        placeholder="Search images by name, title, or description..."
                                        prefix={<SearchOutlined />}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        value={searchTerm}
                                        allowClear
                                    />
                                </Col>
                                <Col>
                                    <Select
                                        size="large"
                                        style={{ width: 150 }}
                                        value={filters.category}
                                        onChange={(value) => handleFilterChange('category', value)}
                                    >
                                        {categories.map(cat => (
                                            <Option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                                <Col>
                                    <Upload {...uploadProps}>
                                        <Button
                                            type="primary"
                                            icon={uploading ? <Spin size="small" /> : <UploadOutlined />}
                                            loading={uploading}
                                            size="large"
                                        >
                                            Upload Images
                                        </Button>
                                    </Upload>
                                </Col>
                            </Row>
                        </div>

                        <Spin spinning={loading}>
                            <Row gutter={[16, 16]}>
                                {galleryItems.map((item) => (
                                    <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                        <Card
                                            hoverable
                                            cover={
                                                <div style={{ position: 'relative' }}>
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt={item.alt_text || item.title || item.filename}
                                                        style={{ height: '200px', objectFit: 'cover' }}
                                                        preview={false}
                                                    />
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            backgroundColor: item.isActive ? '#52c41a' : '#ff4d4f',
                                                            color: 'white',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        {item.isActive ? 'Active' : 'Inactive'}
                                                    </div>
                                                </div>
                                            }
                                            actions={[
                                                <Tooltip title="Preview" key="preview">
                                                    <EyeOutlined
                                                        onClick={() => handlePreview(item.imageUrl)}
                                                    />
                                                </Tooltip>,
                                                <Tooltip title="Edit" key="edit">
                                                    <EditOutlined
                                                        onClick={() => handleEditImage(item)}
                                                    />
                                                </Tooltip>,
                                                <Tooltip title={item.isActive ? "Deactivate" : "Activate"} key="toggle">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        onClick={() => handleToggleStatus(item._id)}
                                                        style={{
                                                            color: item.isActive ? '#52c41a' : '#ff4d4f',
                                                            border: 'none',
                                                            padding: 0
                                                        }}
                                                    >
                                                        {item.isActive ? '●' : '○'}
                                                    </Button>
                                                </Tooltip>,
                                                <Tooltip title="Delete" key="delete">
                                                    <DeleteOutlined
                                                        style={{ color: '#ff4d4f' }}
                                                        onClick={() => handleDeleteImage(item._id)}
                                                    />
                                                </Tooltip>
                                            ]}
                                        >
                                            <Card.Meta
                                                title={item.title || item.filename}
                                                description={
                                                    <div>
                                                        {item.description && (
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                {item.description}
                                                            </Text>
                                                        )}
                                                        <div style={{ marginTop: '4px' }}>
                                                            <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
                                                                {item.category}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </Card>
                                    </Col>
                                ))}
                            </Row>

                            {galleryItems.length === 0 && !loading && (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <PictureOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                                    <Title level={4} type="secondary">No Images Found</Title>
                                    <Text type="secondary">
                                        {searchTerm || filters.category !== 'all'
                                            ? 'No images match your current filters. Try adjusting your search or filters.'
                                            : 'No images uploaded yet. Click "Upload Images" to get started.'
                                        }
                                    </Text>
                                </div>
                            )}

                            {pagination.totalPages > 1 && (
                                <div style={{ textAlign: 'center', marginTop: 24 }}>
                                    <Button.Group>
                                        <Button
                                            disabled={pagination.currentPage === 1}
                                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button disabled>
                                            {pagination.currentPage} of {pagination.totalPages}
                                        </Button>
                                        <Button
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        >
                                            Next
                                        </Button>
                                    </Button.Group>
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Total: {pagination.totalImages} images
                                        </Text>
                                    </div>
                                </div>
                            )}
                        </Spin>
                    </TabPane>

                    <TabPane
                        tab={
                            <span style={{ color: isTabDisabled("contact") ? '#d9d9d9' : undefined }}>
                                <PhoneOutlined /> Contact
                            </span>
                        }
                        key="contact"
                        disabled={isTabDisabled("contact")}
                    >
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            <PhoneOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <Title level={4} type="secondary">Contact Page</Title>
                            <Text type="secondary">Coming soon - Set up your contact information and forms</Text>
                        </div>
                    </TabPane>

                    <TabPane
                        tab={
                            <span style={{ color: isTabDisabled("about") ? '#d9d9d9' : undefined }}>
                                <InfoCircleOutlined /> About
                            </span>
                        }
                        key="about"
                        disabled={isTabDisabled("about")}
                    >
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            <InfoCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <Title level={4} type="secondary">About Page</Title>
                            <Text type="secondary">Coming soon - Tell your story and showcase your business</Text>
                        </div>
                    </TabPane>
                </Tabs>
            </Card>

            <Modal
                open={previewVisible}
                title="Image Preview"
                footer={null}
                onCancel={() => setPreviewVisible(false)}
                centered
                width={800}
            >
                <Image
                    alt="preview"
                    style={{ width: '100%' }}
                    src={previewImage}
                />
            </Modal>

            <GalleryEditForm
                visible={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setCurrentEditItem(null);
                }}
                onSuccess={handleEditSuccess}
                editItem={currentEditItem}
                categories={formCategories}
            />
        </div>
    );
};

export default POSWebsiteBuilder;