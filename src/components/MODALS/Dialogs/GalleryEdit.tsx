import React, { useState } from "react";
import {
    Modal,
    Form,
    Input,
    Select,
    Button,
    Upload,
    Image,
    Row,
    Col,
    Typography,
    Space,
    message
} from "antd";
import {
    UploadOutlined,
    PictureOutlined,
    DeleteOutlined
} from "@ant-design/icons";
import { updateImage, validateImageFile } from "../../../services/gallery";

const { Option } = Select;
const { Text } = Typography;

const GalleryEditForm = ({
    visible,
    onCancel,
    onSuccess,
    editItem,
    categories = [
        { value: 'products', label: 'Products' },
        { value: 'store', label: 'Store' },
        { value: 'banners', label: 'Banners' },
        { value: 'logos', label: 'Logos' },
        { value: 'social', label: 'Social Media' },
        { value: 'other', label: 'Other' }
    ]
}) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [newImageFile, setNewImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    React.useEffect(() => {
        if (editItem && visible) {
            form.setFieldsValue({
                title: editItem.title || '',
                description: editItem.description || '',
                category: editItem.category || 'other',
                alt_text: editItem.alt_text || '',
                tags: editItem.tags || []
            });
            setPreviewUrl(editItem.imageUrl || '');
            setNewImageFile(null);
        }
    }, [editItem, visible, form]);

    const handleSubmit = async (values) => {
        if (!editItem) return;

        setSubmitting(true);
        try {
            await updateImage(editItem._id, {
                ...values,
                tags: values.tags || []
            }, newImageFile);

            message.success('Image updated successfully');
            onSuccess();
            handleCancel();
        } catch (error) {
            console.error("Error updating image:", error);
            message.error('Failed to update image');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setNewImageFile(null);
        setPreviewUrl('');
        onCancel();
    };

    const handleFileChange = (info) => {
        const { file } = info;

        if (file.status === 'removed') {
            setNewImageFile(null);
            setPreviewUrl(editItem?.imageUrl || '');
            return;
        }

        if (validateImageFile(file)) {
            setNewImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProps = {
        name: 'image',
        accept: 'image/*',
        showUploadList: false,
        beforeUpload: () => false,
        onChange: handleFileChange,
        maxCount: 1
    };

    return (
        <Modal
            title={
                <Space>
                    <PictureOutlined />
                    Edit Image
                </Space>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={700}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="large"
            >
                <Row gutter={24}>
                    <Col span={10}>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Current Image</Text>
                        </div>

                        <div
                            style={{
                                border: '1px dashed #d9d9d9',
                                borderRadius: '8px',
                                padding: '16px',
                                textAlign: 'center',
                                backgroundColor: '#fafafa',
                                marginBottom: 16
                            }}
                        >
                            {previewUrl ? (
                                <div>
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        style={{
                                            width: '100%',
                                            maxHeight: '200px',
                                            objectFit: 'cover',
                                            borderRadius: '4px'
                                        }}
                                        preview={false}
                                    />
                                    {newImageFile && (
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="success" style={{ fontSize: '12px' }}>
                                                New image selected
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '40px 0' }}>
                                    <PictureOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
                                    <div style={{ marginTop: 8, color: '#bfbfbf' }}>
                                        No image available
                                    </div>
                                </div>
                            )}
                        </div>

                        <Upload {...uploadProps}>
                            <Button
                                icon={<UploadOutlined />}
                                style={{ width: '100%' }}
                                type={newImageFile ? "default" : "dashed"}
                            >
                                {newImageFile ? 'Change Image' : 'Replace Image'}
                            </Button>
                        </Upload>

                        {newImageFile && (
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                type="text"
                                size="small"
                                onClick={() => {
                                    setNewImageFile(null);
                                    setPreviewUrl(editItem?.imageUrl || '');
                                }}
                                style={{ marginTop: 8, width: '100%' }}
                            >
                                Remove new image
                            </Button>
                        )}
                    </Col>

                    <Col span={14}>
                        <Form.Item
                            name="title"
                            label="Title"
                            rules={[
                                { required: true, message: 'Please enter a title' },
                                { max: 100, message: 'Title must be less than 100 characters' }
                            ]}
                        >
                            <Input
                                placeholder="Enter image title"
                                showCount
                                maxLength={100}
                            />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[
                                { max: 500, message: 'Description must be less than 500 characters' }
                            ]}
                        >
                            <Input.TextArea
                                rows={3}
                                placeholder="Enter image description"
                                showCount
                                maxLength={500}
                            />
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Category"
                            rules={[{ required: true, message: 'Please select a category' }]}
                        >
                            <Select placeholder="Select category">
                                {categories.map(cat => (
                                    <Option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="alt_text"
                            label="Alt Text"
                            help="Describe the image for screen readers and accessibility"
                            rules={[
                                { max: 150, message: 'Alt text must be less than 150 characters' }
                            ]}
                        >
                            <Input
                                placeholder="Describe the image"
                                showCount
                                maxLength={150}
                            />
                        </Form.Item>

                        <Form.Item
                            name="tags"
                            label="Tags"
                            help="Add tags to help organize and search for this image"
                        >
                            <Select
                                mode="tags"
                                placeholder="Add tags (press Enter to add)"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                                maxTagCount={10}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <div style={{ textAlign: 'right' }}>
                            <Space>
                                <Button
                                    onClick={handleCancel}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={submitting}
                                >
                                    Update Image
                                </Button>
                            </Space>
                        </div>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default GalleryEditForm;