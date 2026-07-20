import React, { useState, useRef } from "react";
import {
    Card,
    Button,
    Space,
    Typography,
    Tabs,
    Upload,
    Input,
    Select,
    Modal,
    Alert,
    Tag,
    List,
    Avatar,
    Divider,
    Spin,
    Empty,
    message,
    Drawer,
    Image,
} from "antd";
import {
    FilePdfOutlined,
    FileImageOutlined,
    EditOutlined,
    UploadOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    DownloadOutlined,
    SignatureOutlined,
    FontColorsOutlined,
    LeftOutlined,
    RightOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Signer {
    user_id: string;
    name: string;
    email: string;
    order?: number;
    status?: "pending" | "signed" | "declined" | "skipped";
}

interface SignatureField {
    _id: string;
    signer_name: string;
    position: {
        x: number;
        y: number;
        page: number;
        width?: number;
        height?: number;
    };
    status: "pending" | "signed";
    signature_image_url?: string;
    signature_type?: string;
    locked?: boolean;
}

interface SigningWorkflow {
    workflow_type: "self_sign" | "send_for_signing";
    signers: Signer[];
    current_signer_index: number;
    expires_at?: string;
    message?: string;
}

interface Document {
    _id: string;
    name: string;
    attachments: Array<{ file_url: string; file_name: string; file_type: string }>;
    signing_workflow?: SigningWorkflow;
    signatures?: SignatureField[];
    status: "draft" | "pending_signature" | "partially_signed" | "signed" | "declined";
}

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const eSignService = {
    uploadDocument: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    },

    initiateSigning: async (documentId: string, data: any) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/initiate`,
            data
        );
        return response.data;
    },

    addSignatureField: async (documentId: string, data: any) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/fields`,
            data
        );
        return response.data;
    },

    updateSignatureField: async (documentId: string, fieldId: string, data: any) => {
        const response = await axiosInstance.put(
            `${BASE_URL}/documents/${documentId}/signing/fields/${fieldId}`,
            data
        );
        return response.data;
    },

    deleteSignatureField: async (documentId: string, fieldId: string) => {
        const response = await axiosInstance.delete(
            `${BASE_URL}/documents/${documentId}/signing/fields/${fieldId}`
        );
        return response.data;
    },

    submitSignature: async (documentId: string, data: any) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/submit`,
            data
        );
        return response.data;
    },

    getSigningStatus: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/status`
        );
        return response.data;
    },

    sendForSignature: async (documentId: string) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/send`
        );
        return response.data;
    },

    declineSigning: async (documentId: string, reason?: string) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/decline`,
            { reason }
        );
        return response.data;
    },

    previewDocument: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/preview`
        );
        return response.data;
    },

    previewSignedDocument: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/preview`
        );
        return response.data;
    },

    downloadSignedDocument: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/download`
        );
        return response.data;
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE CANVAS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SignatureCanvas: React.FC<{
    onSave: (data: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const data = canvas.toDataURL("image/png");
        onSave(data);
    };

    return (
        <div style={{ textAlign: "center" }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                width={400}
                height={150}
                style={{
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    cursor: "crosshair",
                    background: "#fff",
                }}
            />
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
                <Button onClick={clearCanvas}>Clear</Button>
                <Button onClick={onCancel}>Cancel</Button>
                <Button type="primary" onClick={saveSignature}>
                    Save Signature
                </Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE SIGNATURE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TypeSignature: React.FC<{
    onSave: (data: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [signature, setSignature] = useState("");
    const [font, setFont] = useState("cursive");

    const fonts = [
        { label: "Cursive", value: "cursive" },
        { label: "Serif", value: "serif" },
        { label: "Sans-serif", value: "sans-serif" },
    ];

    return (
        <div style={{ textAlign: "center" }}>
            <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your signature"
                size="large"
                style={{
                    fontFamily: font,
                    fontSize: 24,
                    textAlign: "center",
                    marginBottom: 16,
                }}
            />
            <Select
                value={font}
                onChange={setFont}
                options={fonts}
                style={{ width: 200, marginBottom: 16 }}
            />
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
                <Button onClick={onCancel}>Cancel</Button>
                <Button
                    type="primary"
                    onClick={() => onSave(signature)}
                    disabled={!signature}
                >
                    Save Signature
                </Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD SIGNATURE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const UploadSignature: React.FC<{
    onSave: (data: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [fileList, setFileList] = useState<any[]>([]);

    const handleUpload = (info: any) => {
        const { file } = info;
        const reader = new FileReader();
        reader.onload = (e) => {
            onSave(e.target?.result as string);
        };
        reader.readAsDataURL(file.originFileObj);
    };

    return (
        <div style={{ textAlign: "center" }}>
            <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                customRequest={handleUpload}
                maxCount={1}
                accept="image/*"
            >
                <Button icon={<UploadOutlined />}>Upload Signature</Button>
            </Upload>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
                <Button onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE CAPTURE MODAL
// ─────────────────────────────────────────────────────────────────────────────

const SignatureCaptureModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSave: (data: string, type: string) => void;
}> = ({ open, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState("draw");

    const handleSave = (data: string) => {
        onSave(data, activeTab);
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title="Add Your Signature"
            footer={null}
            width={500}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: "draw",
                        label: (
                            <span>
                                <EditOutlined /> Draw
                            </span>
                        ),
                        children: <SignatureCanvas onSave={handleSave} onCancel={onClose} />,
                    },
                    {
                        key: "type",
                        label: (
                            <span>
                                <FontColorsOutlined /> Type
                            </span>
                        ),
                        children: <TypeSignature onSave={handleSave} onCancel={onClose} />,
                    },
                    {
                        key: "upload",
                        label: (
                            <span>
                                <UploadOutlined /> Upload
                            </span>
                        ),
                        children: <UploadSignature onSave={handleSave} onCancel={onClose} />,
                    },
                ]}
            />
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SIGNING INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

const DocumentSigningInterface: React.FC<{
    document: Document;
    onClose: () => void;
}> = ({ document, onClose }) => {
    const [signatureModalOpen, setSignatureModalOpen] = useState(false);
    const [signaturePosition, setSignaturePosition] = useState<{ x: number; y: number } | null>(null);

    const queryClient = useQueryClient();

    const updatePositionMutation = useMutation({
        mutationFn: ({ fieldId, position }: { fieldId: string; position: { x: number; y: number; page: number } }) =>
            eSignService.updateSignatureField(document._id, fieldId, { position }),
        onSuccess: () => {
            message.success("Signature position updated");
            queryClient.invalidateQueries(["signing-status", document._id]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to update signature position");
        },
    });

    const { data: status, isLoading } = useQuery({
        queryKey: ["signing-status", document._id],
        queryFn: () => eSignService.getSigningStatus(document._id),
        refetchInterval: 5000,
    });

    const submitMutation = useMutation({
        mutationFn: (data: any) =>
            eSignService.submitSignature(document._id, data),
        onSuccess: () => {
            message.success("Signature submitted successfully");
            queryClient.invalidateQueries(["signing-status", document._id]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to submit signature");
        },
    });

    const declineMutation = useMutation({
        mutationFn: (reason?: string) =>
            eSignService.declineSigning(document._id, reason),
        onSuccess: () => {
            message.success("Document declined");
            queryClient.invalidateQueries(["signing-status", document._id]);
            onClose();
        },
    });

    const handleSignatureSave = (data: string, type: string) => {
        submitMutation.mutate({
            signature_data: data,
            signature_type: type,
            position: signaturePosition || { x: 100, y: 100, page: 1 },
        });
    };

    const handleDecline = () => {
        Modal.confirm({
            title: "Decline to Sign",
            content: (
                <Input.TextArea
                    placeholder="Optional: Reason for declining"
                    rows={3}
                    id="decline-reason"
                />
            ),
            onOk: () => {
                const reason = (document.getElementById("decline-reason") as HTMLTextAreaElement)?.value;
                declineMutation.mutate(reason);
            },
        });
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: "center", padding: 40 }}>
                <Spin size="large" />
            </div>
        );
    }

    const isComplete = status?.is_complete;
    const currentSigner = status?.workflow?.signers[status?.workflow?.current_signer_index];

    return (
        <div>
            <Alert
                message={
                    isComplete
                        ? "Document signing complete"
                        : `Waiting for signature from ${currentSigner?.name || "next signer"}`
                }
                type={isComplete ? "success" : "info"}
                showIcon
                style={{ marginBottom: 16 }}
            />

            {/* Signers progress */}
            <Card size="small" title="Signing Progress" style={{ marginBottom: 16 }}>
                <List
                    dataSource={status?.workflow?.signers || []}
                    renderItem={(signer: Signer) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        icon={<UserOutlined />}
                                        style={{
                                            backgroundColor:
                                                signer.status === "signed"
                                                    ? "#52c41a"
                                                    : signer.status === "declined"
                                                    ? "#f5222d"
                                                    : "#faad14",
                                        }}
                                    />
                                }
                                title={
                                    <Space>
                                        <Text strong>{signer.name}</Text>
                                        {signer.status === "signed" && (
                                            <Tag color="success" icon={<CheckCircleOutlined />}>
                                                Signed
                                            </Tag>
                                        )}
                                        {signer.status === "declined" && (
                                            <Tag color="error" icon={<ExclamationCircleOutlined />}>
                                                Declined
                                            </Tag>
                                        )}
                                        {signer.status === "pending" && (
                                            <Tag color="warning" icon={<ClockCircleOutlined />}>
                                                Pending
                                            </Tag>
                                        )}
                                    </Space>
                                }
                                description={signer.email}
                            />
                        </List.Item>
                    )}
                />
            </Card>

            {/* Document preview with signature fields */}
            <Card size="small" title="Document Preview" style={{ marginBottom: 16 }}>
                <Alert
                    message="Drag the signature placeholder to position your signature on the document"
                    type="info"
                    showIcon
                    style={{ marginBottom: 8 }}
                />
                {document.attachments?.[0] ? (
                    <div style={{ position: "relative", textAlign: "center" }}>
                        {document.attachments[0].file_type?.includes("pdf") ? (
                            <div
                                style={{
                                    padding: 40,
                                    border: "1px dashed #d9d9d9",
                                    minHeight: 400,
                                    position: "relative",
                                }}
                            >
                                <FilePdfOutlined style={{ fontSize: 64, color: "#f5222d" }} />
                                <div style={{ marginTop: 16 }}>
                                    <Text>{document.attachments[0].file_name}</Text>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">Drag signature placeholder to desired position</Text>
                                </div>
                                {/* Draggable signature placeholder */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", "signature");
                                    }}
                                    onDragEnd={(e) => {
                                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                        if (rect) {
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            setSignaturePosition({ x, y });
                                            message.success(`Signature position: (${Math.round(x)}, ${Math.round(y)})`);

                                            // Update signature field position via API if document has signatures
                                            if (document.signatures && document.signatures.length > 0) {
                                                const lastSignature = document.signatures[document.signatures.length - 1];
                                                updatePositionMutation.mutate({
                                                    fieldId: lastSignature._id,
                                                    position: { x, y, page: 1 },
                                                });
                                            }
                                        }
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: signaturePosition?.x || 100,
                                        top: signaturePosition?.y || 100,
                                        border: "2px dashed #1890ff",
                                        backgroundColor: "rgba(24, 144, 255, 0.2)",
                                        padding: "12px 24px",
                                        color: "#1890ff",
                                        fontSize: "14px",
                                        cursor: "move",
                                        userSelect: "none",
                                        fontWeight: "bold",
                                    }}
                                >
                                    📝 Drag to Position Signature
                                </div>
                            </div>
                        ) : (
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <Image
                                    src={document.attachments[0].file_url}
                                    alt="Document"
                                    style={{ maxWidth: "100%", maxHeight: "50vh" }}
                                />
                                {/* Draggable signature placeholder */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", "signature");
                                    }}
                                    onDragEnd={(e) => {
                                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                        if (rect) {
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            setSignaturePosition({ x, y });
                                            message.success(`Signature position: (${Math.round(x)}, ${Math.round(y)})`);

                                            // Update signature field position via API if document has signatures
                                            if (document.signatures && document.signatures.length > 0) {
                                                const lastSignature = document.signatures[document.signatures.length - 1];
                                                updatePositionMutation.mutate({
                                                    fieldId: lastSignature._id,
                                                    position: { x, y, page: 1 },
                                                });
                                            }
                                        }
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: signaturePosition?.x || 100,
                                        top: signaturePosition?.y || 100,
                                        border: "2px dashed #1890ff",
                                        backgroundColor: "rgba(24, 144, 255, 0.2)",
                                        padding: "12px 24px",
                                        color: "#1890ff",
                                        fontSize: "14px",
                                        cursor: "move",
                                        userSelect: "none",
                                        fontWeight: "bold",
                                    }}
                                >
                                    📝 Drag to Position Signature
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Empty description="No document attached" />
                )}
            </Card>

            {/* Actions */}
            {!isComplete && (
                <Space>
                    <Button
                        type="primary"
                        icon={<SignatureOutlined />}
                        onClick={() => setSignatureModalOpen(true)}
                        loading={submitMutation.isLoading}
                    >
                        Sign Document
                    </Button>
                    <Button danger onClick={handleDecline} loading={declineMutation.isLoading}>
                        Decline
                    </Button>
                </Space>
            )}

            {isComplete && (
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => eSignService.downloadSignedDocument(document._id)}
                >
                    Download Signed Document
                </Button>
            )}

            <SignatureCaptureModal
                open={signatureModalOpen}
                onClose={() => setSignatureModalOpen(false)}
                onSave={handleSignatureSave}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN E-SIGN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ESignPage: React.FC = () => {
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [signingDrawerOpen, setSigningDrawerOpen] = useState(false);
    const [initiateModalOpen, setInitiateModalOpen] = useState(false);
    const [workflowType, setWorkflowType] = useState<"self_sign" | "send_for_signing">("self_sign");
    const [signers, setSigners] = useState<Signer[]>([]);
    const [selectedDocForInitiate, setSelectedDocForInitiate] = useState<Document | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [signatureFieldModalOpen, setSignatureFieldModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [previewType, setPreviewType] = useState<"url" | "images" | "original">("url");
    const [previewPages, setPreviewPages] = useState<string[]>([]);
    const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
    const [draggingField, setDraggingField] = useState<SignatureField | null>(null);
    const [editingSignatureIndex, setEditingSignatureIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const queryClient = useQueryClient();

    const updateSignaturePositionMutation = useMutation({
        mutationFn: ({ fieldId, position }: { fieldId: string; position: { x: number; y: number; page: number } }) =>
            eSignService.updateSignatureField(selectedDocument?._id || "", fieldId, { position }),
        onSuccess: (data, variables) => {
            message.success("Signature position updated");
            // Use the returned document and signatures data from backend
            if (data.document) {
                setSelectedDocument(data.document);
            } else if (data.signature) {
                // Fallback: update only the specific signature if document not returned
                if (selectedDocument?.signatures) {
                    const updatedSignatures = selectedDocument.signatures.map(sig =>
                        sig._id === variables.fieldId
                            ? { ...sig, position: variables.position }
                            : sig
                    );
                    setSelectedDocument({ ...selectedDocument, signatures: updatedSignatures });
                }
            }
            queryClient.invalidateQueries(["documents"]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to update signature position");
        },
    });

    const lockSignatureMutation = useMutation({
        mutationFn: ({ fieldId, locked, position }: { fieldId: string; locked: boolean; position: { x: number; y: number; page: number } }) =>
            eSignService.updateSignatureField(selectedDocument?._id || "", fieldId, { locked, position }),
        onSuccess: () => {
            message.success("Signature lock status updated");
            queryClient.invalidateQueries(["documents"]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to update signature lock status");
        },
    });

    const deleteSignatureMutation = useMutation({
        mutationFn: (fieldId: string) =>
            eSignService.deleteSignatureField(selectedDocument?._id || "", fieldId),
        onSuccess: () => {
            message.success("Signature deleted");
            queryClient.invalidateQueries(["documents"]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to delete signature");
        },
    });

    // Fetch documents from existing document service
    const { data: documents, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: async () => {
            const response = await axiosInstance.get(`${BASE_URL}/documents`);
            return response.data;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => eSignService.uploadDocument(file),
        onSuccess: () => {
            message.success("Document uploaded successfully");
            queryClient.invalidateQueries(["documents"]);
            setUploadModalOpen(false);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to upload document");
        },
    });

    const handlePreview = async (doc: Document) => {
        // Use attachment URL directly as primary source
        if (doc.attachments?.[0]?.file_url) {
            setPreviewUrl(doc.attachments[0].file_url);
            setPreviewModalOpen(true);
            return;
        }

        // Fallback to API if no attachment URL
        try {
            const data = await eSignService.previewDocument(doc._id);
            const url = data.preview_url || data.url;
            setPreviewUrl(url);
            setPreviewModalOpen(true);
        } catch (error: any) {
            message.error(error.message || "Failed to preview document");
        }
    };

    const handlePreviewSigned = async (doc: Document) => {
        // Fetch fresh document data to get latest signature positions
        try {
            const response = await axiosInstance.get(`${BASE_URL}/documents/${doc._id}`);
            const freshDoc = response.data;
            setSelectedDocument(freshDoc);

            // Calculate total pages from signatures
            if (freshDoc.signatures && freshDoc.signatures.length > 0) {
                const maxPage = Math.max(...freshDoc.signatures.map(s => s.position.page || 1));
                setTotalPages(maxPage);
            } else {
                setTotalPages(1);
            }
            setCurrentPage(1);

            // Try preview API first
            try {
                const data = await eSignService.previewSignedDocument(freshDoc._id);

                // Handle different preview types
                if (data.previewType === "original") {
                    // Use original document URL
                    const url = data.preview_url || data.url || freshDoc.attachments?.[0]?.file_url;
                    if (url) {
                        setPreviewType("url");
                        setPreviewUrl(url);
                        setPreviewModalOpen(true);
                        return;
                    }
                } else if (data.previewType === "images" && data.pages && data.pages.length > 0 && !data.isPlaceholder) {
                    // Use converted images (if not placeholders)
                    setPreviewType("images");
                    setPreviewPages(data.pages);
                    setPreviewUrl(data.pages[0]);
                    setTotalPages(data.pages.length);
                    setPreviewModalOpen(true);
                    return;
                }

                // Fallback to URL-based preview
                const url = data.preview_url || data.url;
                if (url) {
                    setPreviewType("url");
                    setPreviewUrl(url);
                    setPreviewModalOpen(true);
                    return;
                }
            } catch (error: any) {
                console.error("Preview API failed:", error);
            }

            // Fallback to attachment URL
            if (freshDoc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(freshDoc.attachments[0].file_url);
                setPreviewModalOpen(true);
                return;
            }
        } catch (error: any) {
            message.error(error.message || "Failed to fetch document data");
            // Fallback to original doc if fetch fails
            setSelectedDocument(doc);
            if (doc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(doc.attachments[0].file_url);
                setPreviewModalOpen(true);
            }
        }
    };

    const handleAddSignatureField = (doc: Document) => {
        setSelectedDocument(doc);
        setSignatureFields(doc.signatures || []);
        setSignatureFieldModalOpen(true);
    };

    const addSignatureFieldMutation = useMutation({
        mutationFn: (data: any) => eSignService.addSignatureField(selectedDocument?._id || "", data),
        onSuccess: () => {
            message.success("Signature field added");
            queryClient.invalidateQueries(["documents"]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to add signature field");
        },
    });

    const initiateMutation = useMutation({
        mutationFn: ({ documentId, data }: { documentId: string; data: any }) =>
            eSignService.initiateSigning(documentId, data),
        onSuccess: () => {
            message.success("Signing workflow initiated");
            queryClient.invalidateQueries(["documents"]);
            setInitiateModalOpen(false);
            setSigners([]);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to initiate signing");
        },
    });

    const handleInitiateSigning = (doc: Document) => {
        setSelectedDocForInitiate(doc);
        setInitiateModalOpen(true);
    };

    const handleInitiateSubmit = () => {
        if (!selectedDocForInitiate) return;

        const data: any = {
            workflow_type: workflowType,
        };

        if (workflowType === "send_for_signing") {
            data.signers = signers;
        }

        initiateMutation.mutate({
            documentId: selectedDocForInitiate._id,
            data,
        });
    };

    const handleOpenSigning = (doc: Document) => {
        setSelectedDocument(doc);
        setSigningDrawerOpen(true);
    };

    const addSigner = () => {
        setSigners([
            ...signers,
            { user_id: "", name: "", email: "", order: signers.length + 1 },
        ]);
    };

    const updateSigner = (index: number, field: keyof Signer, value: string) => {
        const updated = [...signers];
        updated[index][field] = value;
        setSigners(updated);
    };

    const removeSigner = (index: number) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>E-Signature</Title>
            <Text type="secondary">Electronically sign documents with multiple signers</Text>

            <Divider />

            {/* Upload button */}
            <Card style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={() => setUploadModalOpen(true)}
                    size="large"
                >
                    Upload Document to Sign
                </Button>
            </Card>

            {/* Documents list */}
            <Card title="Documents" loading={isLoading}>
                {documents?.data?.length === 0 ? (
                    <Empty description="No documents available" />
                ) : (
                    <List
                        dataSource={documents?.data || []}
                        renderItem={(doc: Document) => (
                            <List.Item
                                actions={[
                                    <Button
                                        icon={<FileImageOutlined />}
                                        onClick={() => handlePreview(doc)}
                                    >
                                        Preview
                                    </Button>,
                                    doc.signing_workflow && doc.status === "signed" ? (
                                        <Button
                                            type="primary"
                                            icon={<DownloadOutlined />}
                                            onClick={() => handlePreviewSigned(doc)}
                                        >
                                            Preview Signed
                                        </Button>
                                    ) : null,
                                    doc.signing_workflow ? (
                                        <Button
                                            type="primary"
                                            icon={<SignatureOutlined />}
                                            onClick={() => handleOpenSigning(doc)}
                                        >
                                            {doc.status === "signed" ? "View" : "Sign"}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                icon={<EditOutlined />}
                                                onClick={() => handleAddSignatureField(doc)}
                                            >
                                                Add Signature Field
                                            </Button>
                                            <Button
                                                icon={<EditOutlined />}
                                                onClick={() => handleInitiateSigning(doc)}
                                            >
                                                Initiate Signing
                                            </Button>
                                        </>
                                    ),
                                ].filter(Boolean)}
                            >
                                <List.Item.Meta
                                    avatar={
                                        doc.attachments?.[0]?.file_type?.includes("pdf") ? (
                                            <FilePdfOutlined style={{ fontSize: 32, color: "#f5222d" }} />
                                        ) : (
                                            <FileImageOutlined style={{ fontSize: 32, color: "#1677ff" }} />
                                        )
                                    }
                                    title={doc.name}
                                    description={
                                        <Space>
                                            {doc.signing_workflow && (
                                                <Tag color="blue">
                                                    {doc.signing_workflow.workflow_type === "self_sign"
                                                        ? "Self-sign"
                                                        : "Send for signing"}
                                                </Tag>
                                            )}
                                            <Tag
                                                color={
                                                    doc.status === "signed"
                                                        ? "success"
                                                        : doc.status === "declined"
                                                        ? "error"
                                                        : "processing"
                                                }
                                            >
                                                {doc.status}
                                            </Tag>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>

            {/* Upload document modal */}
            <Modal
                open={uploadModalOpen}
                onCancel={() => setUploadModalOpen(false)}
                title="Upload Document"
                footer={null}
            >
                <Upload.Dragger
                    accept=".pdf,.png,.jpg,.jpeg"
                    beforeUpload={(file) => {
                        uploadMutation.mutate(file);
                        return false;
                    }}
                    showUploadList={false}
                >
                    <p className="ant-upload-drag-icon">
                        <UploadOutlined style={{ fontSize: 48 }} />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">
                        Support for PDF, PNG, JPG, or JPEG files
                    </p>
                </Upload.Dragger>
            </Modal>

            {/* Document preview modal */}
            <Modal
                open={previewModalOpen}
                onCancel={() => {
                    setPreviewModalOpen(false);
                    setPreviewUrl("");
                    setPreviewType("url");
                    setPreviewPages([]);
                    setEditingSignatureIndex(null);
                    setCurrentPage(1);
                }}
                title="Document Preview"
                footer={null}
                width={1200}
                style={{ top: 20 }}
            >
                {previewUrl ? (
                    <div style={{ textAlign: "center" }}>
                        {selectedDocument?.signatures && selectedDocument.signatures.length > 0 && (
                            <Alert
                                message={previewType === "images"
                                    ? "Drag signatures to reposition them on the document. Use page controls to navigate between pages."
                                    : previewUrl.toLowerCase().includes(".pdf")
                                    ? "For PDFs: Signatures are positioned relative to the page. Drag to reposition. Note: PDF preview has scroll limitations - signatures may not scroll perfectly with document content."
                                    : "Drag signatures to reposition them on the document. Use page controls to navigate between pages."}
                                type="info"
                                showIcon
                                style={{ marginBottom: 8 }}
                            />
                        )}
                        {/* Page controls */}
                        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
                            <Button
                                icon={<LeftOutlined />}
                                onClick={() => {
                                    setCurrentPage(Math.max(1, currentPage - 1));
                                    if (previewType === "images" && previewPages.length > 0) {
                                        setPreviewUrl(previewPages[Math.max(1, currentPage - 1) - 1]);
                                    }
                                }}
                                disabled={currentPage === 1}
                            >
                                Previous Page
                            </Button>
                            <Text strong>Page {currentPage} of {totalPages}</Text>
                            <Button
                                icon={<RightOutlined />}
                                onClick={() => {
                                    setCurrentPage(Math.min(totalPages, currentPage + 1));
                                    if (previewType === "images" && previewPages.length > 0) {
                                        setPreviewUrl(previewPages[Math.min(totalPages, currentPage + 1) - 1]);
                                    }
                                }}
                                disabled={currentPage === totalPages}
                            >
                                Next Page
                            </Button>
                        </div>
                        {previewType === "images" ? (
                            // Image-based preview (converted PDF pages)
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <Image
                                    src={previewUrl}
                                    alt={`Page ${currentPage}`}
                                    style={{ maxWidth: "100%", maxHeight: "80vh" }}
                                    onError={() => {
                                        message.error("Failed to load page image. Falling back to original document.");
                                        // Fallback to original document URL
                                        if (selectedDocument?.attachments?.[0]?.file_url) {
                                            setPreviewType("url");
                                            setPreviewUrl(selectedDocument.attachments[0].file_url);
                                        }
                                    }}
                                />
                                {selectedDocument?.signatures?.map((field, index) => {
                                    // Only show signatures for current page
                                    if (field.position.page !== currentPage) return null;

                                    const posX = field.position.x === 0 ? 100 : field.position.x;
                                    const posY = field.position.y === 0 ? 100 : field.position.y;
                                    const isLocked = field.locked || false;
                                    return (
                                        <div
                                            key={index}
                                            draggable={!isLocked}
                                            onDragStart={() => !isLocked && setEditingSignatureIndex(index)}
                                            onDragEnd={(e) => {
                                                if (isLocked) return;
                                                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                                if (rect && selectedDocument.signatures) {
                                                    const x = e.clientX - rect.left;
                                                    const y = e.clientY - rect.top;
                                                    message.success(`Signature position: (${Math.round(x)}, ${Math.round(y)}) on page ${currentPage}`);

                                                    // Update via API - onSuccess will update local state
                                                    updateSignaturePositionMutation.mutate({
                                                        fieldId: field._id,
                                                        position: { x, y, page: currentPage },
                                                    });
                                                }
                                                setEditingSignatureIndex(null);
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: posX,
                                                top: posY,
                                                border: editingSignatureIndex === index ? "2px solid #1890ff" : isLocked ? "2px solid #faad14" : "2px solid #52c41a",
                                                backgroundColor: editingSignatureIndex === index ? "rgba(24, 144, 255, 0.2)" : isLocked ? "rgba(250, 173, 20, 0.1)" : "rgba(82, 196, 26, 0.1)",
                                                padding: "8px 16px",
                                                color: isLocked ? "#faad14" : "#52c41a",
                                                fontSize: "12px",
                                                cursor: isLocked ? "not-allowed" : "move",
                                                userSelect: "none",
                                                zIndex: 1000,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {field.signature_image_url ? (
                                                    <img
                                                        src={field.signature_image_url}
                                                        alt="Signature"
                                                        style={{
                                                            maxWidth: "150px",
                                                            maxHeight: "50px",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                ) : (
                                                    <span>✓ {field.signer_name}</span>
                                                )}
                                                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Get current position from state (not from field which might be stale)
                                                            const currentSig = selectedDocument?.signatures?.find(s => s._id === field._id);
                                                            const currentPosition = currentSig?.position || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: currentPosition,
                                                            });
                                                        }}
                                                        title={isLocked ? "Unlock signature" : "Lock signature"}
                                                    >
                                                        {isLocked ? "🔓" : "🔒"}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        danger
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            Modal.confirm({
                                                                title: "Delete Signature",
                                                                content: "Are you sure you want to delete this signature?",
                                                                onOk: () => {
                                                                    deleteSignatureMutation.mutate(field._id);
                                                                },
                                                            });
                                                        }}
                                                        title="Delete signature"
                                                    >
                                                        🗑️
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : previewUrl.toLowerCase().includes(".pdf") ? (
                            // Fallback to iframe for PDF (if image conversion fails)
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "80vh",
                                    border: "1px dashed #d9d9d9",
                                    backgroundColor: "#f5f5f5",
                                    overflow: "auto",
                                }}
                            >
                                <iframe
                                    src={previewUrl}
                                    style={{ width: "100%", height: "100%", border: "none", minHeight: "100%" }}
                                    title="PDF Preview"
                                />
                                {/* Signature overlay - positioned relative to scroll container */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                        pointerEvents: "none",
                                        overflow: "visible",
                                    }}
                                >
                                    {selectedDocument?.signatures?.map((field, index) => {
                                        // Only show signatures for current page
                                        if (field.position.page !== currentPage) return null;

                                        const posX = field.position.x === 0 ? 100 : field.position.x;
                                        const posY = field.position.y === 0 ? 100 : field.position.y;
                                        const isLocked = field.locked || false;
                                        return (
                                            <div
                                                key={index}
                                                draggable={!isLocked}
                                                onDragStart={() => !isLocked && setEditingSignatureIndex(index)}
                                                onDragEnd={(e) => {
                                                    if (isLocked) return;
                                                    const container = e.currentTarget.parentElement?.parentElement;
                                                    if (container && selectedDocument.signatures) {
                                                        const x = e.clientX - container.getBoundingClientRect().left + container.scrollLeft;
                                                        const y = e.clientY - container.getBoundingClientRect().top + container.scrollTop;
                                                        message.success(`Signature position: (${Math.round(x)}, ${Math.round(y)}) on page ${currentPage}`);

                                                        // Update local state immediately for visual feedback
                                                        const updatedSignatures = selectedDocument.signatures.map(sig =>
                                                            sig._id === field._id
                                                                ? { ...sig, position: { x, y, page: currentPage } }
                                                                : sig
                                                        );
                                                        setSelectedDocument({ ...selectedDocument, signatures: updatedSignatures });

                                                        // Update via API - will sync with backend response
                                                        updateSignaturePositionMutation.mutate({
                                                            fieldId: field._id,
                                                            position: { x, y, page: currentPage },
                                                        });
                                                    }
                                                    setEditingSignatureIndex(null);
                                                }}
                                                style={{
                                                    position: "absolute",
                                                    left: posX,
                                                    top: posY,
                                                    border: editingSignatureIndex === index ? "2px solid #1890ff" : isLocked ? "2px solid #faad14" : "2px solid #52c41a",
                                                    backgroundColor: editingSignatureIndex === index ? "rgba(24, 144, 255, 0.2)" : isLocked ? "rgba(250, 173, 20, 0.1)" : "rgba(82, 196, 26, 0.1)",
                                                    padding: "8px 16px",
                                                    color: isLocked ? "#faad14" : "#52c41a",
                                                    fontSize: "12px",
                                                    cursor: isLocked ? "not-allowed" : "move",
                                                    userSelect: "none",
                                                    pointerEvents: "auto",
                                                    zIndex: 1000,
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    {field.signature_image_url ? (
                                                        <img
                                                            src={field.signature_image_url}
                                                            alt="Signature"
                                                            style={{
                                                                maxWidth: "150px",
                                                                maxHeight: "50px",
                                                                objectFit: "contain",
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>✓ {field.signer_name}</span>
                                                    )}
                                                    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Get current position from state (not from field which might be stale)
                                                                const currentSig = selectedDocument?.signatures?.find(s => s._id === field._id);
                                                                const currentPosition = currentSig?.position || field.position;
                                                                lockSignatureMutation.mutate({
                                                                    fieldId: field._id,
                                                                    locked: !isLocked,
                                                                    position: currentPosition,
                                                                });
                                                            }}
                                                            title={isLocked ? "Unlock signature" : "Lock signature"}
                                                        >
                                                            {isLocked ? "🔓" : "🔒"}
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            danger
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                Modal.confirm({
                                                                    title: "Delete Signature",
                                                                    content: "Are you sure you want to delete this signature?",
                                                                    onOk: () => {
                                                                        deleteSignatureMutation.mutate(field._id);
                                                                    },
                                                                });
                                                            }}
                                                            title="Delete signature"
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <Image
                                    src={previewUrl}
                                    alt="Document preview"
                                    style={{ maxWidth: "100%", maxHeight: "70vh" }}
                                    onError={() => message.error("Failed to load image")}
                                />
                                {selectedDocument?.signatures?.map((field, index) => {
                                    const posX = field.position.x === 0 ? 100 : field.position.x;
                                    const posY = field.position.y === 0 ? 100 : field.position.y;
                                    const isLocked = field.locked || false;
                                    return (
                                        <div
                                            key={index}
                                            draggable={!isLocked}
                                            onDragStart={() => !isLocked && setEditingSignatureIndex(index)}
                                            onDragEnd={(e) => {
                                                if (isLocked) return;
                                                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                                if (rect && selectedDocument.signatures) {
                                                    const x = e.clientX - rect.left;
                                                    const y = e.clientY - rect.top;
                                                    message.success(`Signature position: (${Math.round(x)}, ${Math.round(y)})`);

                                                    // Update via API - onSuccess will update local state
                                                    updateSignaturePositionMutation.mutate({
                                                        fieldId: field._id,
                                                        position: { x, y, page: field.position.page },
                                                    });
                                                }
                                                setEditingSignatureIndex(null);
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: posX,
                                                top: posY,
                                                border: editingSignatureIndex === index ? "2px solid #1890ff" : isLocked ? "2px solid #faad14" : "2px solid #52c41a",
                                                backgroundColor: editingSignatureIndex === index ? "rgba(24, 144, 255, 0.2)" : isLocked ? "rgba(250, 173, 20, 0.1)" : "rgba(82, 196, 26, 0.1)",
                                                padding: "8px 16px",
                                                color: isLocked ? "#faad14" : "#52c41a",
                                                fontSize: "12px",
                                                cursor: isLocked ? "not-allowed" : "move",
                                                userSelect: "none",
                                                zIndex: 1000,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {field.signature_image_url ? (
                                                    <img
                                                        src={field.signature_image_url}
                                                        alt="Signature"
                                                        style={{
                                                            maxWidth: "150px",
                                                            maxHeight: "50px",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                ) : (
                                                    <span>✓ {field.signer_name}</span>
                                                )}
                                                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Get current position from state (not from field which might be stale)
                                                            const currentSig = selectedDocument?.signatures?.find(s => s._id === field._id);
                                                            const currentPosition = currentSig?.position || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: currentPosition,
                                                            });
                                                        }}
                                                        title={isLocked ? "Unlock signature" : "Lock signature"}
                                                    >
                                                        {isLocked ? "🔓" : "🔒"}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        danger
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            Modal.confirm({
                                                                title: "Delete Signature",
                                                                content: "Are you sure you want to delete this signature?",
                                                                onOk: () => {
                                                                    deleteSignatureMutation.mutate(field._id);
                                                                },
                                                            });
                                                        }}
                                                        title="Delete signature"
                                                    >
                                                        🗑️
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <Empty description="No document URL available for preview" />
                    </div>
                )}
            </Modal>

            {/* Signature field positioning modal */}
            <Modal
                open={signatureFieldModalOpen}
                onCancel={() => setSignatureFieldModalOpen(false)}
                title="Add Signature Field"
                width={800}
                footer={null}
            >
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                    <Alert
                        message="Click on the document to place signature fields, or drag existing fields to reposition them"
                        type="info"
                        showIcon
                    />
                    {selectedDocument?.attachments?.[0]?.file_url && (
                        <div style={{ position: "relative", textAlign: "center" }}>
                            <Image
                                src={selectedDocument.attachments[0].file_url}
                                alt="Document"
                                style={{ maxWidth: "100%", maxHeight: "60vh" }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    const newField: SignatureField = {
                                        _id: `temp-${Date.now()}`,
                                        signer_name: "Current Signer",
                                        position: { x, y, page: 1 },
                                        status: "pending",
                                    };
                                    setSignatureFields([...signatureFields, newField]);
                                    addSignatureFieldMutation.mutate({
                                        signer_name: "Current Signer",
                                        position: { x, y, page: 1 },
                                    });
                                }}
                            />
                            {signatureFields.map((field, index) => (
                                <div
                                    key={field._id || index}
                                    draggable
                                    onDragStart={() => setDraggingField(field)}
                                    onDragEnd={(e) => {
                                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                        if (rect) {
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            const updatedFields = [...signatureFields];
                                            updatedFields[index] = {
                                                ...field,
                                                position: { x, y, page: field.position.page },
                                            };
                                            setSignatureFields(updatedFields);
                                            addSignatureFieldMutation.mutate({
                                                signer_name: field.signer_name,
                                                position: { x, y, page: field.position.page },
                                            });
                                        }
                                        setDraggingField(null);
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: field.position.x,
                                        top: field.position.y,
                                        border: "2px dashed #1890ff",
                                        backgroundColor: "rgba(24, 144, 255, 0.1)",
                                        padding: "8px 16px",
                                        color: "#1890ff",
                                        fontSize: "12px",
                                        cursor: "move",
                                        userSelect: "none",
                                    }}
                                >
                                    {field.signer_name}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                        <Button onClick={() => setSignatureFieldModalOpen(false)}>
                            Done
                        </Button>
                    </div>
                </Space>
            </Modal>

            {/* Initiate signing modal */}
            <Modal
                open={initiateModalOpen}
                onCancel={() => setInitiateModalOpen(false)}
                title="Initiate Signing Workflow"
                onOk={handleInitiateSubmit}
                confirmLoading={initiateMutation.isLoading}
            >
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                    <div>
                        <Text strong>Workflow Type</Text>
                        <Select
                            value={workflowType}
                            onChange={setWorkflowType}
                            style={{ width: "100%", marginTop: 8 }}
                            options={[
                                { label: "Self-sign (I will sign)", value: "self_sign" },
                                { label: "Send for signing (Multiple signers)", value: "send_for_signing" },
                            ]}
                        />
                    </div>

                    {workflowType === "send_for_signing" && (
                        <div>
                            <Space style={{ marginBottom: 8 }}>
                                <Text strong>Signers</Text>
                                <Button size="small" icon={<UserOutlined />} onClick={addSigner}>
                                    Add Signer
                                </Button>
                            </Space>
                            {signers.map((signer, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    style={{ marginBottom: 8 }}
                                    extra={
                                        <Button
                                            size="small"
                                            danger
                                            onClick={() => removeSigner(index)}
                                        >
                                            Remove
                                        </Button>
                                    }
                                >
                                    <Space direction="vertical" style={{ width: "100%" }}>
                                        <Input
                                            placeholder="Name"
                                            value={signer.name}
                                            onChange={(e) => updateSigner(index, "name", e.target.value)}
                                        />
                                        <Input
                                            placeholder="Email"
                                            value={signer.email}
                                            onChange={(e) => updateSigner(index, "email", e.target.value)}
                                        />
                                    </Space>
                                </Card>
                            ))}
                        </div>
                    )}
                </Space>
            </Modal>

            {/* Signing drawer */}
            <Drawer
                open={signingDrawerOpen}
                onClose={() => setSigningDrawerOpen(false)}
                title="Document Signing"
                width={600}
            >
                {selectedDocument && (
                    <DocumentSigningInterface
                        document={selectedDocument}
                        onClose={() => setSigningDrawerOpen(false)}
                    />
                )}
            </Drawer>
        </div>
    );
};

export default ESignPage;
