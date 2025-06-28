import React, { useState, useEffect } from "react";
import {
    SettingOutlined,
    BgColorsOutlined,
    PictureOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    TagOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    DeleteOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import {
    Card,
    Row,
    Col,
    Form,
    Input,
    Button,
    Upload,
    ColorPicker,
    Space,
    Typography,
    Avatar,
    Tag,
    Divider,
    Skeleton,
    Result,
    message,
    Select,
    Modal,
    Tabs,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
    fetchTenantDetails,
    updateTenant,
    getCurrentTenantId,
} from "@services/tenants";

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface TenantData {
    _id: string;
    id?: string;
    name: string;
    email: string;
    phone: string;
    tenant_code: string;
    subscription_status: 'pending_approval' | 'active' | 'suspended' | 'terminated';
    subscription_id: {
        _id: string;
        name: string;
        price: number;
    };
    business_type: {
        _id: string;
        name: string;
    };
    business_type_name?: string;
    subscription_cycle: 'Monthly' | 'Quarterly' | 'Yearly';
    next_billing_date?: string;
    db_host?: string;
    db_password?: string;
    db_user?: string;
    db_name?: string;
    additional_info?: string;
    business_size?: string;
    color_scheme?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    primary_color?: string;
    tenant_logo?: {
        url: string;
        filename: string;
        size: number;
    };
    __v?: number;
    createdAt: string;
    updatedAt: string;
}

function TenantSettings() {
    const [form] = Form.useForm();
    const [colorForm] = Form.useForm();
    const [fileList, setFileList] = useState<any[]>([]);
    const [colors, setColors] = useState({
        primary: "#1976d2",
        secondary: "#dc004e",
        accent: "#9c27b0",
        background: "#ffffff",
        text: "#000000",
    });

    const params = useParams();
    const queryClient = useQueryClient();
    const { id } = params;

    const tenantId = id || getCurrentTenantId();

    useEffect(() => {
        const uploadStyles = `
      .logo-upload .ant-upload.ant-upload-select {
        width: 100% !important;
        height: auto !important;
        border: 2px dashed ${colors.primary} !important;
        border-radius: 8px !important;
        background: ${colors.primary}08 !important;
        transition: all 0.3s ease !important;
      }
      
      .logo-upload .ant-upload.ant-upload-select:hover {
        border-color: ${colors.secondary} !important;
        background: ${colors.secondary}08 !important;
      }
      
      .logo-upload .ant-upload-drag {
        padding: 20px !important;
      }
    `;

        const styleElement = document.createElement('style');
        styleElement.setAttribute('id', 'tenant-upload-styles');
        styleElement.innerHTML = uploadStyles;

        const existingStyles = document.getElementById('tenant-upload-styles');
        if (existingStyles) {
            document.head.removeChild(existingStyles);
        }

        document.head.appendChild(styleElement);

        return () => {
            const styleToRemove = document.getElementById('tenant-upload-styles');
            if (styleToRemove) {
                document.head.removeChild(styleToRemove);
            }
        };
    }, [colors]);

    const { data: tenantDetails, isLoading, refetch } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
        networkMode: "always",
    });

    const updateTenantMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateTenant(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
            refetch();
        },
    });

    useEffect(() => {
        if (tenantDetails?.data) {
            const tenant = tenantDetails.data;
            form.setFieldsValue({
                name: tenant.name,
                email: tenant.email,
                phone: tenant.phone,
                subscription_id: typeof tenant.subscription_id === 'object' ? tenant.subscription_id._id : tenant.subscription_id,
            });

            if (tenant.color_scheme) {
                setColors(tenant.color_scheme);
                colorForm.setFieldsValue(tenant.color_scheme);
            } else if (tenant.color_scheme.primary) {
                const colorScheme = {
                    primary: tenant.color_scheme.primary,
                    secondary: "#dc004e",
                    accent: "#9c27b0",
                    background: "#ffffff",
                    text: "#000000",
                };
                setColors(colorScheme);
                colorForm.setFieldsValue(colorScheme);
            }
        }
    }, [tenantDetails, form, colorForm]);

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) {
            try {
                const tenant = JSON.parse(storedTenant);
                if (tenant.color_scheme) {
                    setColors(tenant.color_scheme);
                } else if (tenant.color_scheme.primary) {
                    setColors(prev => ({ ...prev, primary: tenant.color_scheme.primary }));
                }
            } catch (e) {
                console.warn("Failed to parse stored tenant for colors:", e);
            }
        }
    }, []);

    const handleUpdateTenant = async (values: any) => {
        if (!tenantId) {
            message.error("Tenant ID not found");
            return;
        }
        updateTenantMutation.mutate({ id: tenantId, data: values });
    };

    const handleUpdateColors = async () => {
        if (!tenantId) {
            message.error("Tenant ID not found");
            return;
        }

        const updateData = {
            color_scheme: colors,
            primary_color: colors.primary
        };

        updateTenantMutation.mutate({
            id: tenantId,
            data: updateData
        });
    };

    const handleColorChange = (color: string, type: string) => {
        setColors(prev => ({ ...prev, [type]: color }));
    };

    const handleLogoUpload = async (info: any) => {
        if (!tenantId) {
            message.error("Tenant ID not found");
            return;
        }

        const { file } = info;

        if (file.status === 'uploading') {
            setFileList([{ ...file, status: 'uploading' }]);
            return;
        }

        if (file.status === 'done' || file.originFileObj || file instanceof File) {
            try {
                setFileList([{ ...file, status: 'uploading' }]);

                const formData = new FormData();
                const uploadFile = file.originFileObj || file;

                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
                if (!allowedTypes.includes(uploadFile.type)) {
                    message.error("Only image files are allowed (JPEG, PNG, GIF, SVG, WebP)");
                    setFileList([]);
                    return;
                }

                if (uploadFile.size > 5 * 1024 * 1024) {
                    message.error("File size must be less than 5MB");
                    setFileList([]);
                    return;
                }

                formData.append('logo', uploadFile);

                if (colors) {
                    formData.append('color_scheme', JSON.stringify(colors));
                    formData.append('primary_color', colors.primary);
                }

                await updateTenantMutation.mutateAsync({ id: tenantId, data: formData });

                setFileList([]);
                message.success("Logo uploaded successfully");
            } catch (error) {
                console.error("Upload error:", error);
                message.error("Failed to upload logo");
                setFileList([]);
            }
        }

        if (file.status === 'error') {
            message.error("Upload failed");
            setFileList([]);
        }
    };

    const handleBeforeUpload = (file: File) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            message.error("Only image files are allowed (JPEG, PNG, GIF, SVG, WebP)");
            return false;
        }

        if (file.size > 5 * 1024 * 1024) {
            message.error("File size must be less than 5MB");
            return false;
        }

        handleLogoUpload({ file: { ...file, status: 'done', originFileObj: file } });
        return false;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'pending_approval':
                return 'orange';
            case 'suspended':
                return 'red';
            case 'terminated':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircleOutlined />;
            case 'pending_approval':
                return <LoadingOutlined />;
            case 'suspended':
            case 'terminated':
                return <CloseCircleOutlined />;
            default:
                return null;
        }
    };

    if (!tenantId) {
        return (
            <PageContainer
                title="Tenant Settings"
                content="Manage tenant configuration and branding"
                style={{ padding: "24px" }}
            >
                <Card>
                    <Result
                        status="404"
                        title="Tenant ID not found"
                        subTitle="Please make sure you're logged in and try again."
                    />
                </Card>
            </PageContainer>
        );
    }

    if (!tenantDetails) {
        return (
            <PageContainer
                title="Tenant Settings"
                content="Manage tenant configuration and branding"
                style={{ padding: "24px" }}
            >
                <Card>
                    <Row gutter={[16, 16]} align="middle">
                        <Col span={24}>
                            {isLoading ? (
                                <Skeleton active />
                            ) : (
                                <Result
                                    status="404"
                                    title="Tenant not found"
                                    subTitle="Sorry, the tenant you're looking for does not exist."
                                />
                            )}
                        </Col>
                    </Row>
                </Card>
            </PageContainer>
        );
    }

    const tenant = tenantDetails.data;

    return (
        <PageContainer
            title="Tenant Settings"
            content="Manage tenant configuration and branding"
            style={{ padding: "24px" }}
        >
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card title={<Space><UserOutlined /> Tenant Overview</Space>}>
                        <Row gutter={[16, 16]} align="middle">
                            <Col xs={24} sm={6} style={{ textAlign: "center" }}>
                                <Avatar
                                    size={80}
                                    icon={<UserOutlined />}
                                    src={tenant.tenant_logo?.url}
                                    style={{ border: `2px solid ${colors.primary}` }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <Text strong>{tenant.name}</Text>
                                    <br />
                                    <Text type="secondary">{tenant.tenant_code}</Text>
                                </div>
                            </Col>
                            <Col xs={24} sm={18}>
                                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                                    <Space>
                                        <Tag color={getStatusColor(tenant.subscription_status)} icon={getStatusIcon(tenant.subscription_status)}>
                                            {tenant.subscription_status.replace('_', ' ').toUpperCase()}
                                        </Tag>
                                        <Tag color="blue">
                                            {tenant.subscription_cycle}
                                        </Tag>
                                        {tenant.subscription_id && (
                                            <Tag color="purple">
                                                {typeof tenant.subscription_id === 'object' ? `${tenant.subscription_id.name} - $${tenant.subscription_id.price}` : 'Subscription'}
                                            </Tag>
                                        )}
                                    </Space>
                                    <Text type="secondary">
                                        Business: {tenant.business_type_name || (typeof tenant.business_type === 'object' ? tenant.business_type.name : 'Not specified')}
                                    </Text>
                                    <Text type="secondary">
                                        Size: {tenant.business_size || 'Not specified'}
                                    </Text>
                                    <Text type="secondary">
                                        Created: {new Date(tenant.createdAt).toLocaleDateString()}
                                    </Text>
                                    {tenant.next_billing_date && (
                                        <Text type="secondary">
                                            Next Billing: {new Date(tenant.next_billing_date).toLocaleDateString()}
                                        </Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card>
                        <Tabs defaultActiveKey="1" type="card">
                            <TabPane tab={<Space><SettingOutlined /> Basic Information</Space>} key="1">
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleUpdateTenant}
                                    disabled={updateTenantMutation.isPending}
                                >
                                    <Row gutter={16}>
                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Tenant Name"
                                                name="name"
                                                rules={[{ required: true, message: 'Please enter tenant name' }]}
                                            >
                                                <Input prefix={<UserOutlined />} placeholder="Enter tenant name" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Email Address"
                                                name="email"
                                                rules={[
                                                    { required: true, message: 'Please enter email address' },
                                                    { type: 'email', message: 'Please enter a valid email' }
                                                ]}
                                            >
                                                <Input prefix={<MailOutlined />} placeholder="Enter email address" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Phone Number"
                                                name="phone"
                                                rules={[{ required: true, message: 'Please enter phone number' }]}
                                            >
                                                <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Subscription Plan ID"
                                                name="subscription_id"
                                                help="Contact support to change subscription plan"
                                            >
                                                <Input
                                                    prefix={<TagOutlined />}
                                                    placeholder="Subscription ID"
                                                    disabled
                                                    value={typeof tenant.subscription_id === 'object' ? tenant.subscription_id._id : tenant.subscription_id}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Form.Item>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={updateTenantMutation.isPending}
                                            size="large"
                                        >
                                            Update Information
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </TabPane>

                            <TabPane tab={<Space><PictureOutlined /> Logo & Branding</Space>} key="2">
                                <Row gutter={[24, 24]}>
                                    <Col xs={24} md={12}>
                                        <Space direction="vertical" style={{ width: "100%" }} size="large">
                                            <div style={{ textAlign: "center" }}>
                                                <div style={{
                                                    border: `3px dashed ${colors.primary}`,
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    background: `${colors.primary}08`,
                                                    marginBottom: '16px'
                                                }}>
                                                    <Avatar
                                                        size={120}
                                                        icon={<PictureOutlined />}
                                                        src={tenant.tenant_logo?.url}
                                                        style={{
                                                            border: `3px solid ${colors.primary}`,
                                                            backgroundColor: tenant.tenant_logo?.url ? 'transparent' : '#f5f5f5'
                                                        }}
                                                    />
                                                    {tenant.tenant_logo?.url && (
                                                        <div style={{ marginTop: 12 }}>
                                                            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                                                                {tenant.tenant_logo.filename}
                                                            </Text>
                                                            <br />
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                {tenant.tenant_logo.size ? `${(tenant.tenant_logo.size / 1024).toFixed(1)} KB` : ''}
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <Upload
                                                accept="image/*"
                                                fileList={fileList}
                                                onChange={handleLogoUpload}
                                                beforeUpload={handleBeforeUpload}
                                                disabled={updateTenantMutation.isPending}
                                                maxCount={1}
                                                listType="picture-card"
                                                showUploadList={false}
                                                style={{ width: '100%' }}
                                                className="logo-upload"
                                            >
                                                <Button
                                                    icon={<UploadOutlined />}
                                                    loading={updateTenantMutation.isPending}
                                                    block
                                                    size="large"
                                                    style={{ height: 'auto', minHeight: '60px' }}
                                                >
                                                    {updateTenantMutation.isPending ? 'Uploading...' : 'Upload New Logo'}
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Click or drag image here
                                                    </Text>
                                                </Button>
                                            </Upload>

                                            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                                                Recommended: PNG, JPG, SVG. Max size: 5MB
                                                <br />
                                                Support drag and drop or click to browse
                                            </Text>
                                        </Space>
                                    </Col>

                                    <Col xs={24} md={12}>
                                        <Title level={5}>Color Scheme</Title>
                                        <Form form={colorForm} layout="vertical">
                                            <Row gutter={[16, 16]}>
                                                <Col span={12}>
                                                    <Form.Item label="Primary Color">
                                                        <ColorPicker
                                                            value={colors.primary}
                                                            onChange={(color) => handleColorChange(color.toHexString(), 'primary')}
                                                            showText
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Secondary Color">
                                                        <ColorPicker
                                                            value={colors.secondary}
                                                            onChange={(color) => handleColorChange(color.toHexString(), 'secondary')}
                                                            showText
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Accent Color">
                                                        <ColorPicker
                                                            value={colors.accent}
                                                            onChange={(color) => handleColorChange(color.toHexString(), 'accent')}
                                                            showText
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Background">
                                                        <ColorPicker
                                                            value={colors.background}
                                                            onChange={(color) => handleColorChange(color.toHexString(), 'background')}
                                                            showText
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Button
                                                type="primary"
                                                onClick={handleUpdateColors}
                                                loading={updateTenantMutation.isPending}
                                                block
                                                size="large"
                                            >
                                                Update Colors
                                            </Button>
                                        </Form>
                                    </Col>
                                </Row>

                                <Divider>Preview</Divider>
                                <div style={{ textAlign: 'center' }}>
                                    <div
                                        style={{
                                            background: colors.background,
                                            color: colors.text,
                                            padding: '20px',
                                            borderRadius: '8px',
                                            border: `2px solid ${colors.primary}`,
                                            maxWidth: '400px',
                                            margin: '0 auto',
                                        }}
                                    >
                                        <div style={{
                                            backgroundColor: colors.primary,
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '6px',
                                            marginBottom: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            Primary Button
                                        </div>
                                        <div style={{
                                            backgroundColor: colors.secondary,
                                            color: 'white',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            marginBottom: '8px'
                                        }}>
                                            Secondary Button
                                        </div>
                                        <div style={{
                                            backgroundColor: colors.accent,
                                            color: 'white',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px'
                                        }}>
                                            Accent Element
                                        </div>
                                    </div>
                                </div>
                            </TabPane>
                        </Tabs>
                    </Card>
                </Col>
            </Row>
        </PageContainer>
    );
}

export default TenantSettings;