import { useState, useEffect } from "react";
import {
    Button, Drawer, Form, Input, Select, Typography, message, Tabs, Upload, Tag,
} from "antd";
import {
    FileOutlined, UploadOutlined, DeleteOutlined, UserOutlined, ShopOutlined,
    MailOutlined, PhoneOutlined, EnvironmentOutlined, IdcardOutlined,
    DownloadOutlined, EyeOutlined,
} from "@ant-design/icons";
import { uploadCustomerDocument, deleteCustomerDocument, CustomerDocument } from "@services/customerDocuments";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const INDIVIDUAL_DOCUMENT_TYPES = [
    { value: 'kra_pin_certificate_individual', label: 'KRA PIN Certificate (Individual)' },
    { value: 'proof_of_residence', label: 'Proof of Residence' },
    { value: 'bank_statement_individual', label: 'Bank Statement (Individual)' },
    { value: 'pay_slip', label: 'Pay Slip' },
    { value: 'id_passport', label: 'ID/Passport' },
    { value: 'contract_agreement', label: 'Contract/Agreement' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'quotation', label: 'Quotation' }
];

const COMPANY_DOCUMENT_TYPES = [
    { value: 'kra_pin_certificate_company', label: 'KRA PIN Certificate (Company)' },
    { value: 'certificate_of_incorporation', label: 'Certificate of Incorporation' },
    { value: 'business_permit', label: 'Business Permit' },
    { value: 'bank_statement_company', label: 'Bank Statement (Company)' },
    { value: 'memorandum_of_association', label: 'Memorandum of Association' },
    { value: 'directors_resolution', label: 'Directors Resolution' },
    { value: 'contract_agreement', label: 'Contract/Agreement' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'quotation', label: 'Quotation' }
];

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.primary, fontSize: 14, marginTop: 1 }}>{icon}</span>
        <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{label}</Text>
            <div style={{ fontSize: 12, color: C.darkText }}>{value || "—"}</div>
        </div>
    </div>
);

interface CustomerDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    customer: any;
    onUpdated?: () => void;
}

const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({ open, onClose, customer, onUpdated }) => {
    const [documentForm] = Form.useForm();
    const [documents, setDocuments] = useState<CustomerDocument[]>([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [fileList, setFileList] = useState<any[]>([]);

    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;
    const entityType = customer?.type || 'individual';
    const documentTypes = entityType === 'company' ? COMPANY_DOCUMENT_TYPES : INDIVIDUAL_DOCUMENT_TYPES;

    // Fetch documents when drawer opens - documents are embedded in customer object
    useEffect(() => {
        if (open && customer) {
            const docs = customer.documents || [];
            setDocuments(Array.isArray(docs) ? docs.filter((d: any) => d.document_type !== 'folder') : []);
            // Auto-populate document name with customer name
            documentForm.setFieldValue('name', customer.customer_name || customer.company_name);
        }
    }, [open, customer, documentForm]);

    if (!customer) return null;

    const handleDocumentUpload = async (values: any) => {
        setUploadLoading(true);
        try {
            await uploadCustomerDocument(customer._id, {
                customer_id: customer._id,
                shop_id,
                document_type: values.document_type,
                name: values.name,
                description: values.description,
                files: fileList.map(f => f.originFileObj).filter(Boolean),
            });
            documentForm.resetFields();
            setFileList([]);
            // Refresh customer data to get updated documents
            onUpdated?.();
            message.success("Document uploaded successfully");
        } catch (error) {
            message.error("Failed to upload document");
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        try {
            await deleteCustomerDocument(customer._id, documentId, shop_id);
            // Refresh customer data to get updated documents
            onUpdated?.();
            message.success("Document deleted");
        } catch (error) {
            message.error("Failed to delete document");
        }
    };

    const SectionTitle = ({ label }: { label: string }) => (
        <Text strong style={{
            fontSize: 11, color: C.primary, textTransform: "uppercase",
            letterSpacing: "0.5px", display: "block",
            borderBottom: `2px solid ${C.primaryLight}`, paddingBottom: 6, marginBottom: 10,
        }}>
            {label}
        </Text>
    );

    const displayName = entityType === 'company' ? (customer.company_name || 'Unnamed Company') : (customer.customer_name || 'Unnamed Individual');

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width="min(580px, 98vw)"
            destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        {entityType === 'company' ? <ShopOutlined /> : <UserOutlined />}
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>{displayName}</Text>
                        {entityType === 'company' && customer.contact_person && (
                            <Text style={{ fontSize: 11, color: C.subText }}>Contact: {customer.contact_person}</Text>
                        )}
                        {entityType === 'individual' && customer.company_name && (
                            <Text style={{ fontSize: 11, color: C.subText }}>{customer.company_name}</Text>
                        )}
                    </div>
                    <Tag color={entityType === 'company' ? C.blue : C.green} style={{ marginLeft: "auto", borderRadius: 10, fontSize: 11 }}>
                        {entityType.toUpperCase()}
                    </Tag>
                </div>
            }
        >
            <Tabs
                defaultActiveKey="info"
                items={[
                    {
                        key: 'info',
                        label: 'Details',
                        children: (
                            <>
                                {/* ── Contact Info ─────────────────────────────────────── */}
                                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                                    <SectionTitle label="Contact Info" />
                                    <InfoRow icon={<PhoneOutlined />} label="Phone" value={customer.phone} />
                                    <InfoRow icon={<MailOutlined />} label="Email" value={customer.email} />
                                    <InfoRow icon={<EnvironmentOutlined />} label="Location" value={customer.location} />
                                    <InfoRow icon={<IdcardOutlined />} label="KRA PIN" value={customer.kra_pin} />
                                    {customer.payment_terms && (
                                        <InfoRow icon={<UserOutlined />} label="Payment Terms" value={`${customer.payment_terms} days`} />
                                    )}
                                    {customer.credit_limit && (
                                        <InfoRow icon={<UserOutlined />} label="Credit Limit" value={`KES ${customer.credit_limit.toLocaleString()}`} />
                                    )}
                                </div>

                                {/* ── Address ─────────────────────────────────────── */}
                                {customer.address && (
                                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                                        <SectionTitle label="Address" />
                                        {customer.address.street && <InfoRow icon={<EnvironmentOutlined />} label="Street" value={customer.address.street} />}
                                        {customer.address.city && <InfoRow icon={<EnvironmentOutlined />} label="City" value={customer.address.city} />}
                                        {customer.address.county && <InfoRow icon={<EnvironmentOutlined />} label="County" value={customer.address.county} />}
                                        {customer.address.country && <InfoRow icon={<EnvironmentOutlined />} label="Country" value={customer.address.country} />}
                                    </div>
                                )}

                                {/* ── Notes ─────────────────────────────────────── */}
                                {customer.notes && (
                                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                        <SectionTitle label="Notes" />
                                        <Text style={{ fontSize: 12 }}>{customer.notes}</Text>
                                    </div>
                                )}
                            </>
                        ),
                    },
                    {
                        key: 'documents',
                        label: 'Documents',
                        children: (
                            <>
                                {/* ── Upload Document ─────────────────────────────────────── */}
                                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                                    <SectionTitle label="Upload Document" />
                                    <Form form={documentForm} layout="vertical" onFinish={handleDocumentUpload}>
                                        <Form.Item name="document_type" label="Document Type"
                                            rules={[{ required: true, message: "Select document type" }]}
                                        >
                                            <Select placeholder="Select document type">
                                                {documentTypes.map(t => (
                                                    <Option key={t.value} value={t.value}>{t.label}</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Form.Item name="name" label="Document Name">
                                            <Input placeholder="Optional document name" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                        <Form.Item name="description" label="Description">
                                            <TextArea rows={2} placeholder="Optional description" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                        <Form.Item label="Files">
                                            <Upload
                                                fileList={fileList}
                                                onChange={({ fileList }) => setFileList(fileList)}
                                                beforeUpload={() => false}
                                                multiple
                                                style={{ borderRadius: 8 }}
                                            >
                                                <Button icon={<UploadOutlined />}>Select Files</Button>
                                            </Upload>
                                        </Form.Item>
                                        <Button htmlType="submit" loading={uploadLoading} icon={<UploadOutlined />}
                                            style={{ background: C.primary, borderColor: C.primary, color: "#fff", borderRadius: 8, width: "100%" }}>
                                            Upload Document
                                        </Button>
                                    </Form>
                                </div>

                                {/* ── Documents List ─────────────────────────────────────── */}
                                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                    <SectionTitle label="Documents" />
                                    {documentsLoading ? (
                                        <div style={{ textAlign: "center", padding: 20 }}>Loading...</div>
                                    ) : documents.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: 20, color: C.subText }}>No documents uploaded</div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {documents.map(doc => (
                                                <div key={doc._id} style={{
                                                    display: "flex", flexDirection: "column", gap: 8,
                                                    padding: "12px", border: `1px solid ${C.border}`,
                                                    borderRadius: 8, background: C.bg
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <FileOutlined style={{ color: C.primary, fontSize: 18 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <Text strong style={{ fontSize: 12, display: "block" }}>
                                                                {doc.name || documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                                            </Text>
                                                            {doc.description && (
                                                                <Text style={{ fontSize: 11, color: C.subText }}>{doc.description}</Text>
                                                            )}
                                                            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>
                                                                {doc.attachments?.length || 0} file(s) · {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                                                            </Text>
                                                        </div>
                                                        <Button
                                                            danger
                                                            size="small"
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleDeleteDocument(doc._id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                    {doc.attachments && doc.attachments.length > 0 && (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 28 }}>
                                                            {doc.attachments.map((attachment: any) => (
                                                                <div key={attachment._id} style={{
                                                                    display: "flex", alignItems: "center", gap: 8,
                                                                    padding: "6px 10px", background: "#fff",
                                                                    borderRadius: 6, border: `1px solid ${C.border}`
                                                                }}>
                                                                    <FileOutlined style={{ color: C.subText, fontSize: 14 }} />
                                                                    <Text style={{ fontSize: 11, flex: 1, color: C.darkText }}>
                                                                        {attachment.file_name}
                                                                    </Text>
                                                                    <Button
                                                                        size="small"
                                                                        type="link"
                                                                        icon={<EyeOutlined />}
                                                                        onClick={() => window.open(attachment.file_url, '_blank')}
                                                                        style={{ padding: "0 4px", fontSize: 11 }}
                                                                    >
                                                                        View
                                                                    </Button>
                                                                    <Button
                                                                        size="small"
                                                                        type="link"
                                                                        icon={<DownloadOutlined />}
                                                                        onClick={() => {
                                                                            const link = document.createElement('a');
                                                                            link.href = attachment.file_url;
                                                                            link.download = attachment.file_name;
                                                                            link.click();
                                                                        }}
                                                                        style={{ padding: "0 4px", fontSize: 11 }}
                                                                    >
                                                                        Download
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ),
                    },
                ]}
            />
        </Drawer>
    );
};

export default CustomerDetailDrawer;
