import React, { useState, useRef } from "react";
import {
    Card,
    Button,
    Space,
    Typography,
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
    Switch,
    message,
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
    DeleteOutlined,
    SignatureOutlined,
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
    // Fetches the document file as a blob URL (uses axiosInstance so auth headers are included)
    getFileBlobUrl: async (documentId: string): Promise<string> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/file`,
            { responseType: "blob" }
        );
        return window.URL.createObjectURL(new Blob([response.data], { type: response.headers["content-type"] || "application/pdf" }));
    },

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

    previewSignedDocument: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/preview`
        );
        return response.data;
    },

    downloadSignedDocument: async (documentId: string) => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/download`,
            { responseType: 'blob' }
        );
        
        // Extract filename from Content-Disposition header if available
        const disposition = response.headers['content-disposition'] || '';
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        const filename = match ? match[1].replace(/['"]/g, '') : `signed-document-${documentId}.pdf`;

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    clearSignature: async (documentId: string) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/clear`
        );
        return response.data;
    },

    deleteDocument: async (documentId: string) => {
        const response = await axiosInstance.delete(
            `${BASE_URL}/documents/${documentId}`
        );
        return response.data;
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE CANVAS COMPONENT (DRAW)
// ─────────────────────────────────────────────────────────────────────────────

const SignatureCanvas: React.FC<{
    onSave: (data: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const drawBaseline = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.save();
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(24, h - 28);
        ctx.lineTo(w - 24, h - 28);
        ctx.stroke();
        ctx.restore();
    };

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawBaseline(ctx, canvas.width, canvas.height);
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBaseline(ctx, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    return (
        <div>
            <div style={{ position: "relative", marginBottom: 16 }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    width={460}
                    height={160}
                    style={{ border: "1px solid #e8e8e8", borderRadius: 10, cursor: "crosshair", background: "#fafafa", display: "block", width: "100%" }}
                />
                {!hasDrawn && (
                    <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%,-50%)", color: "#c0c0c0", pointerEvents: "none", fontSize: 14, whiteSpace: "nowrap" }}>
                        Draw your signature here
                    </div>
                )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button size="small" type="text" onClick={clearCanvas} style={{ color: "#999" }}>↺ Clear</Button>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }} disabled={!hasDrawn}>
                        Use Signature
                    </Button>
                </Space>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE SIGNATURE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_FONTS = [
    { label: "Script",  value: "'Brush Script MT', 'Segoe Script', cursive" },
    { label: "Elegant", value: "'Palatino Linotype', Palatino, Georgia, serif" },
    { label: "Clean",   value: "'Arial', sans-serif" },
];

const TypeSignature: React.FC<{
    onSave: (data: string, type: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [text, setText] = useState("");
    const [selectedFont, setSelectedFont] = useState(TYPE_FONTS[0].value);
    const [useInitials, setUseInitials] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0].toUpperCase())
            .join("")
            .slice(0, 4);
    };

    const displayText = useInitials ? getInitials(text) : text;

    const handleSave = () => {
        const canvas = document.createElement("canvas");
        canvas.width = useInitials ? 200 : 400;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const fontSize = useInitials ? 62 : 48;
        ctx.font = `${useInitials ? "bold" : "italic"} ${fontSize}px ${selectedFont}`;
        ctx.fillStyle = "#1a1a2e";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(displayText, canvas.width / 2, 54);
        onSave(canvas.toDataURL("image/png"), useInitials ? "initials" : "type");
    };

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your full name"
                    size="large"
                    style={{ flex: 1, fontSize: 16 }}
                    autoFocus
                />
                <Button
                    type={useInitials ? "primary" : "default"}
                    onClick={() => setUseInitials(!useInitials)}
                    style={{ whiteSpace: "nowrap" }}
                >
                    {useInitials ? "Initials" : "Full Name"}
                </Button>
            </div>
            {/* Font style cards */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {TYPE_FONTS.map((f) => (
                    <div
                        key={f.value}
                        onClick={() => setSelectedFont(f.value)}
                        style={{
                            flex: 1,
                            border: `2px solid ${selectedFont === f.value ? "#1890ff" : "#e8e8e8"}`,
                            borderRadius: 8,
                            padding: "10px 8px",
                            cursor: "pointer",
                            background: selectedFont === f.value ? "#e6f4ff" : "#fafafa",
                            textAlign: "center",
                            transition: "all 0.2s",
                        }}
                    >
                        <div style={{ fontFamily: f.value, fontSize: useInitials ? 36 : 22, fontWeight: useInitials ? "bold" : "normal", color: "#1a1a2e", minHeight: 36, lineHeight: "36px" }}>
                            {displayText || (useInitials ? "MK" : "Sample")}
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{f.label}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" onClick={handleSave} disabled={!text.trim()}>
                        Use {useInitials ? "Initials" : "Signature"}
                    </Button>
                </Space>
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
        const reader = new FileReader();
        reader.onload = (e) => { onSave(e.target?.result as string); };
        reader.readAsDataURL(info.file);
    };

    return (
        <div>
            <Upload.Dragger
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl)}
                customRequest={({ file }) => handleUpload({ file })}
                maxCount={1}
                accept="image/*"
                showUploadList={false}
                style={{ marginBottom: 16 }}
            >
                <p style={{ fontSize: 32, marginBottom: 8 }}>🖼️</p>
                <p style={{ fontWeight: 500 }}>Click or drag a signature image</p>
                <p style={{ color: "#999", fontSize: 12 }}>PNG, JPG supported — transparent background works best</p>
            </Upload.Dragger>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE CAPTURE MODAL
// ─────────────────────────────────────────────────────────────────────────────

const SIG_TABS = [
    { key: "draw",   icon: "✏️", label: "Draw" },
    { key: "type",   icon: "Aa", label: "Type" },
    { key: "upload", icon: "⬆️", label: "Upload" },
];

const SignatureCaptureModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSave: (data: string, type: string) => void;
    signerName?: string;
}> = ({ open, onClose, onSave, signerName = "" }) => {
    const [activeTab, setActiveTab] = useState("draw");

    const handleSave = (data: string, type: string) => {
        onSave(data, type);
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✍️</span>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Add Your Signature</span>
                    {signerName && <span style={{ color: "#999", fontSize: 13, fontWeight: 400 }}>— {signerName}</span>}
                </div>
            }
            footer={null}
            width={560}
            styles={{ body: { paddingTop: 8 } }}
        >
            {/* Tab selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {SIG_TABS.map((tab) => (
                    <div
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "10px 4px",
                            borderRadius: 8,
                            border: `2px solid ${activeTab === tab.key ? "#1890ff" : "#f0f0f0"}`,
                            background: activeTab === tab.key ? "#e6f4ff" : "#fafafa",
                            cursor: "pointer",
                            transition: "all 0.18s",
                        }}
                    >
                        <div style={{ fontSize: 18, lineHeight: "22px" }}>{tab.icon}</div>
                        <div style={{ fontSize: 12, color: activeTab === tab.key ? "#1890ff" : "#666", marginTop: 2, fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</div>
                    </div>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ minHeight: 240 }}>
                {activeTab === "draw"   && <SignatureCanvas onSave={handleSave} onCancel={onClose} />}
                {activeTab === "type"   && <TypeSignature onSave={handleSave} onCancel={onClose} />}
                {activeTab === "upload" && <UploadSignature onSave={handleSave} onCancel={onClose} />}
            </div>
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
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [displayPosition, setDisplayPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
    const positionRef = useRef<{ x: number; y: number }>({ x: 100, y: 100 });
    const isInitializedRef = useRef(false);

    const queryClient = useQueryClient();

    // Initialize position from server data only once
    React.useEffect(() => {
        if (!isInitializedRef.current && document.signatures && document.signatures.length > 0) {
            const lastSignature = document.signatures[document.signatures.length - 1];
            if (lastSignature.position) {
                console.log('Loading saved position from server:', lastSignature.position);
                positionRef.current = { x: lastSignature.position.x, y: lastSignature.position.y };
                setDisplayPosition(positionRef.current);
                isInitializedRef.current = true;
            }
        }
    }, []);

    const updatePositionMutation = useMutation({
        mutationFn: ({ fieldId, position }: { fieldId: string; position: { x: number; y: number; page: number; width: number; height: number } }) =>
            eSignService.updateSignatureField(document._id, fieldId, { position }),
        onSuccess: (data) => {
            console.log('Position update successful, backend response:', data);
            message.success("Signature position updated");
            // Don't invalidate queries to prevent position reset from server data
        },
        onError: (error: any) => {
            console.error('Position update failed:', error);
            message.error(error.message || "Failed to update signature position");
        },
    });

    const { data: status, isLoading } = useQuery({
        queryKey: ["signing-status", document._id],
        queryFn: () => eSignService.getSigningStatus(document._id),
        refetchInterval: false, // Disable periodic refetch to prevent position reset
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
            position: { 
                x: positionRef.current.x, 
                y: positionRef.current.y, 
                page: 1,
                width: 200,
                height: 50
            },
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        console.log('handleMouseDown called');
        e.preventDefault();
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleContainerMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        
        const container = e.currentTarget;
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left - dragOffset.x;
        const y = e.clientY - containerRect.top - dragOffset.y;
        
        console.log('Dragging to position:', { x, y });
        positionRef.current = { x, y };
        setDisplayPosition({ x, y });
    };

    const handleMouseUp = () => {
        console.log('handleMouseUp called, isDragging:', isDragging, 'positionRef.current:', positionRef.current);
        if (isDragging && positionRef.current) {
            // Update signature field position via API if document has signatures
            if (document.signatures && document.signatures.length > 0) {
                const lastSignature = document.signatures[document.signatures.length - 1];
                const positionToSend = { 
                    x: positionRef.current.x, 
                    y: positionRef.current.y, 
                    page: 1,
                    width: 200,
                    height: 50
                };
                console.log('Sending position update to backend:', positionToSend);
                updatePositionMutation.mutate({
                    fieldId: lastSignature._id,
                    position: positionToSend,
                });
            } else {
                message.success(`Signature position: (${Math.round(positionRef.current.x)}, ${Math.round(positionRef.current.y)})`);
            }
        }
        setIsDragging(false);
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
                                onMouseMove={handleContainerMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
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
                                    onMouseDown={handleMouseDown}
                                    style={{
                                        position: "absolute",
                                        left: displayPosition.x,
                                        top: displayPosition.y,
                                        border: "2px dashed #1890ff",
                                        backgroundColor: "rgba(24, 144, 255, 0.2)",
                                        padding: "12px 24px",
                                        color: "#1890ff",
                                        fontSize: "14px",
                                        cursor: isDragging ? "grabbing" : "grab",
                                        userSelect: "none",
                                        fontWeight: "bold",
                                        zIndex: isDragging ? 1000 : 1,
                                    }}
                                >
                                    📝 Drag to Position Signature
                                </div>
                            </div>
                        ) : (
                            <div 
                                onMouseMove={handleContainerMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={{ position: "relative", display: "inline-block" }}
                            >
                                <Image
                                    src={document.attachments[0].file_url}
                                    alt="Document"
                                    style={{ maxWidth: "100%", maxHeight: "50vh" }}
                                />
                                {/* Draggable signature placeholder */}
                                <div
                                    onMouseDown={handleMouseDown}
                                    style={{
                                        position: "absolute",
                                        left: displayPosition.x,
                                        top: displayPosition.y,
                                        border: "2px dashed #1890ff",
                                        backgroundColor: "rgba(24, 144, 255, 0.2)",
                                        padding: "12px 24px",
                                        color: "#1890ff",
                                        fontSize: "14px",
                                        cursor: isDragging ? "grabbing" : "grab",
                                        userSelect: "none",
                                        fontWeight: "bold",
                                        zIndex: isDragging ? 1000 : 1,
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
    const [initiateModalOpen, setInitiateModalOpen] = useState(false);
    const [signCaptureModalOpen, setSignCaptureModalOpen] = useState(false);
    // Draggable position for signing within preview
    const [previewSignPos, setPreviewSignPos] = useState({ x: 100, y: 100 });
    const [previewSignDragging, setPreviewSignDragging] = useState(false);
    const [previewSignDragOffset, setPreviewSignDragOffset] = useState({ x: 0, y: 0 });
    const [workflowType, setWorkflowType] = useState<"self_sign" | "send_for_signing">("self_sign");
    const [signers, setSigners] = useState<Signer[]>([]);
    const [selectedDocForInitiate, setSelectedDocForInitiate] = useState<Document | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [signatureFieldModalOpen, setSignatureFieldModalOpen] = useState(false);
    const [signAllPages, setSignAllPages] = useState(false);
    const [isSigningAllPages, setIsSigningAllPages] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [previewType, setPreviewType] = useState<"url" | "images" | "original">("url");
    const [previewIsPdf, setPreviewIsPdf] = useState<boolean>(false);
    const [previewPages, setPreviewPages] = useState<string[]>([]);
    const previewBlobUrlRef = useRef<string>("");  // track blob URL for cleanup
    const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
    const [editingSignatureIndex, setEditingSignatureIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // Mouse-based drag state for preview modal
    const [previewDraggingIndex, setPreviewDraggingIndex] = useState<number | null>(null);
    const [previewDragOffset, setPreviewDragOffset] = useState({ x: 0, y: 0 });
    // Local position overrides - persists positions across renders without server refetch
    const localPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
    // Ref to measure the rendered preview container for coordinate scaling
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const getContainerSize = () => {
        const rect = previewContainerRef.current?.getBoundingClientRect();
        return { containerWidth: rect?.width ?? 0, containerHeight: rect?.height ?? 0 };
    };

    const queryClient = useQueryClient();

    const updateSignaturePositionMutation = useMutation({
        mutationFn: ({ fieldId, position }: { fieldId: string; position: { x: number; y: number; page: number; containerWidth?: number; containerHeight?: number } }) => {
            console.log('Preview modal calling update API:', { fieldId, position });
            return eSignService.updateSignatureField(selectedDocument?._id || "", fieldId, { position });
        },
        onSuccess: (data, variables) => {
            console.log('Preview modal update successful, backend response:', data);
            message.success("Signature position updated");
            // Use the returned document and signatures data from backend
            if (data.document) {
                console.log('Updating selectedDocument from backend response:', data.document);
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

    const submitPreviewMutation = useMutation({
        mutationFn: (data: { signature_data: string; signature_type: string; position: { x: number; y: number; page: number; width: number; height: number; containerWidth?: number; containerHeight?: number } }) =>
            eSignService.submitSignature(selectedDocument?._id || "", data),
        onSuccess: () => {
            message.success("Signature submitted successfully");
            setSignCaptureModalOpen(false);
            queryClient.invalidateQueries(["documents"]);
            // Re-fetch fresh document to show signature overlay
            if (selectedDocument) handlePreviewSigned(selectedDocument);
        },
        onError: (error: any) => {
            message.error(error.message || "Failed to submit signature");
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

    const handlePreviewSigned = async (doc: Document) => {
        console.log('handlePreviewSigned called for document:', doc._id);
        // Fetch fresh document data to get latest signature positions
        try {
            const response = await axiosInstance.get(`${BASE_URL}/documents/${doc._id}`);
            const freshDoc = response.data;
            console.log('Fresh document data:', freshDoc);
            setSelectedDocument(freshDoc);

            // Calculate total pages from signatures
            if (freshDoc.signatures && freshDoc.signatures.length > 0) {
                const maxPage = Math.max(...freshDoc.signatures.map(s => s.position.page || 1));
                setTotalPages(maxPage);
            } else {
                setTotalPages(1);
            }
            setCurrentPage(1);

            // Determine if doc is a PDF
            const isPdf = freshDoc.attachments?.[0]?.file_type === "application/pdf" ||
                freshDoc.attachments?.[0]?.file_url?.toLowerCase().includes(".pdf") ||
                freshDoc.name?.toLowerCase().includes(".pdf");
            setPreviewIsPdf(!!isPdf);

            // Try preview API first
            try {
                const data = await eSignService.previewSignedDocument(freshDoc._id);

                if (data.previewType === "images" && data.pages && data.pages.length > 0 && !data.isPlaceholder) {
                    // Use converted images (not placeholders)
                    setPreviewType("images");
                    setPreviewPages(data.pages);
                    setPreviewUrl(data.pages[0]);
                    setTotalPages(data.pages.length);
                    setPreviewModalOpen(true);
                    return;
                }
            } catch (error: unknown) {
                console.error("Preview API failed:", error);
            }

            // Fetch via proxy blob URL so auth headers are sent correctly
            try {
                // Revoke previous blob URL if any
                if (previewBlobUrlRef.current) {
                    window.URL.revokeObjectURL(previewBlobUrlRef.current);
                }
                const blobUrl = await eSignService.getFileBlobUrl(freshDoc._id);
                previewBlobUrlRef.current = blobUrl;
                setPreviewType("url");
                setPreviewUrl(blobUrl);
                setPreviewModalOpen(true);
                return;
            } catch (blobError: unknown) {
                console.error("Blob fetch failed:", blobError);
            }

            // Last resort: use direct attachment URL
            if (freshDoc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(freshDoc.attachments[0].file_url);
                setPreviewModalOpen(true);
            }
        } catch (error: unknown) {
            message.error((error as Error)?.message || "Failed to fetch document data");
            // Fallback to original doc if fetch fails
            setSelectedDocument(doc);
            if (doc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(doc.attachments[0].file_url);
                setPreviewIsPdf(doc.attachments[0].file_type === "application/pdf" || doc.attachments[0].file_url.toLowerCase().includes(".pdf"));
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
        handlePreviewSigned(doc);
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
                                    doc.signing_workflow && doc.status === "signed" ? (
                                        <Button
                                            type="primary"
                                            icon={<DownloadOutlined />}
                                            onClick={() => eSignService.downloadSignedDocument(doc._id)}
                                        >
                                            Download
                                        </Button>
                                    ) : null,
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                            Modal.confirm({
                                                title: "Delete Document",
                                                content: `Are you sure you want to delete "${doc.name}"? This cannot be undone.`,
                                                okText: "Delete",
                                                okButtonProps: { danger: true },
                                                onOk: async () => {
                                                    await eSignService.deleteDocument(doc._id);
                                                    message.success("Document deleted");
                                                    queryClient.invalidateQueries({ queryKey: ["documents"] });
                                                },
                                            });
                                        }}
                                    >
                                        Delete
                                    </Button>,
                                    doc.signing_workflow && doc.status === "signed" ? (
                                        <Button
                                            danger
                                            onClick={() => {
                                                Modal.confirm({
                                                    title: "Clear Signature & Re-sign",
                                                    content: "This will erase the existing signature so you can re-sign at a new position. Continue?",
                                                    okText: "Clear & Re-sign",
                                                    okButtonProps: { danger: true },
                                                    onOk: async () => {
                                                        await eSignService.clearSignature(doc._id);
                                                        message.success("Signature cleared. You can now re-sign.");
                                                        queryClient.invalidateQueries({ queryKey: ["documents"] });
                                                    },
                                                });
                                            }}
                                        >
                                            🧹 Re-sign
                                        </Button>
                                    ) : null,
                                    doc.signing_workflow ? (
                                        <Button
                                            type="primary"
                                            icon={<SignatureOutlined />}
                                            onClick={() => handleOpenSigning(doc)}
                                        >
                                            {doc.status === "signed" ? "Preview Signed" : "Sign / Preview"}
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
                footer={
                    selectedDocument?.signing_workflow && selectedDocument.status !== "signed" ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 12 }}>
                                <span>📍 Click on the document to place your signature, then click Sign</span>
                                {totalPages > 1 && (
                                    <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 16 }}>
                                        <Switch
                                            size="small"
                                            checked={signAllPages}
                                            onChange={setSignAllPages}
                                        />
                                        <span style={{ color: signAllPages ? "#1890ff" : "#888" }}>
                                            Apply to all {totalPages} pages
                                        </span>
                                    </span>
                                )}
                            </div>
                            <Button
                                type="primary"
                                icon={<SignatureOutlined />}
                                onClick={() => setSignCaptureModalOpen(true)}
                                loading={submitPreviewMutation.isLoading || isSigningAllPages}
                            >
                                {signAllPages && totalPages > 1 ? `Sign All ${totalPages} Pages` : "Sign Document"}
                            </Button>
                        </div>
                    ) : null
                }
                width={1200}
                style={{ top: 20 }}
            >
                {previewUrl ? (
                    <div style={{ textAlign: "center" }}>
                        {selectedDocument?.signatures && selectedDocument.signatures.length > 0 && (
                            <Alert
                                message={previewType === "images"
                                    ? "Drag signatures to reposition them on the document. Use page controls to navigate between pages."
                                    : previewIsPdf
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
                            <div
                                style={{ position: "relative", display: "inline-block", cursor: selectedDocument?.signing_workflow && selectedDocument.status !== "signed" ? "crosshair" : "default" }}
                                onClick={(e) => {
                                    if (previewDraggingIndex !== null || previewSignDragging) return;
                                    if (selectedDocument?.signing_workflow && selectedDocument.status !== "signed") {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setPreviewSignPos({
                                            x: e.clientX - rect.left - 100,
                                            y: e.clientY - rect.top - 18,
                                        });
                                    }
                                }}
                                onMouseMove={(e) => {
                                    // Move sign position marker
                                    if (previewSignDragging) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setPreviewSignPos({
                                            x: e.clientX - rect.left - previewSignDragOffset.x,
                                            y: e.clientY - rect.top - previewSignDragOffset.y,
                                        });
                                        return;
                                    }
                                    if (previewDraggingIndex === null) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left - previewDragOffset.x;
                                    const y = e.clientY - rect.top - previewDragOffset.y;
                                    const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                    if (field) {
                                        localPositionsRef.current[field._id] = { x, y };
                                        // Update local state for immediate visual feedback
                                        if (selectedDocument?.signatures) {
                                            const updated = selectedDocument.signatures.map((sig, i) =>
                                                i === previewDraggingIndex ? { ...sig, position: { ...sig.position, x, y } } : sig
                                            );
                                            setSelectedDocument({ ...selectedDocument, signatures: updated });
                                        }
                                    }
                                }}
                                onMouseUp={() => {
                                    setPreviewSignDragging(false);
                                    if (previewDraggingIndex === null) return;
                                    const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                    if (field) {
                                        const pos = localPositionsRef.current[field._id];
                                        if (pos) {
                                            updateSignaturePositionMutation.mutate({
                                                fieldId: field._id,
                                                position: { x: pos.x, y: pos.y, page: currentPage, ...getContainerSize() },
                                            });
                                        }
                                    }
                                    setPreviewDraggingIndex(null);
                                }}
                                onMouseLeave={() => {
                                    setPreviewSignDragging(false);
                                    if (previewDraggingIndex !== null) {
                                        const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                        if (field) {
                                            const pos = localPositionsRef.current[field._id];
                                            if (pos) {
                                                updateSignaturePositionMutation.mutate({
                                                    fieldId: field._id,
                                                    position: { x: pos.x, y: pos.y, page: currentPage, ...getContainerSize() },
                                                });
                                            }
                                        }
                                        setPreviewDraggingIndex(null);
                                    }
                                }}
                                ref={previewContainerRef}
                            >
                                <Image
                                    src={previewUrl}
                                    alt={`Page ${currentPage}`}
                                    style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
                                    onError={() => {
                                        message.error("Failed to load page image. Falling back to original document.");
                                        if (selectedDocument?.attachments?.[0]?.file_url) {
                                            setPreviewType("url");
                                            setPreviewUrl(eSignService.getFileProxyUrl(selectedDocument._id));
                                        }
                                    }}
                                />
                                {selectedDocument?.signatures?.map((field, index) => {
                                    if (field.position.page !== currentPage) return null;
                                    const savedPos = localPositionsRef.current[field._id];
                                    const posX = savedPos?.x ?? (field.position.x === 0 ? 100 : field.position.x);
                                    const posY = savedPos?.y ?? (field.position.y === 0 ? 100 : field.position.y);
                                    const isLocked = field.locked || false;
                                    const isDraggingThis = previewDraggingIndex === index;
                                    return (
                                        <div
                                            key={field._id}
                                            onMouseDown={(e) => {
                                                if (isLocked) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setPreviewDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                                setPreviewDraggingIndex(index);
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: posX,
                                                top: posY,
                                                border: isDraggingThis ? "2px solid #1890ff" : isLocked ? "2px solid #faad14" : "2px solid #52c41a",
                                                backgroundColor: isDraggingThis ? "rgba(24, 144, 255, 0.15)" : isLocked ? "rgba(250, 173, 20, 0.08)" : "rgba(82, 196, 26, 0.08)",
                                                padding: "8px 16px",
                                                color: isDraggingThis ? "#1890ff" : isLocked ? "#faad14" : "#52c41a",
                                                fontSize: "12px",
                                                cursor: isLocked ? "not-allowed" : isDraggingThis ? "grabbing" : "grab",
                                                userSelect: "none",
                                                zIndex: isDraggingThis ? 1000 : 10,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {field.signature_image_url ? (
                                                    <img
                                                        src={field.signature_image_url}
                                                        alt="Signature"
                                                        draggable={false}
                                                        style={{ maxWidth: "150px", maxHeight: "50px", objectFit: "contain" }}
                                                    />
                                                ) : (
                                                    <span>✓ {field.signer_name}</span>
                                                )}
                                                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const pos = localPositionsRef.current[field._id] || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: pos,
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
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            Modal.confirm({
                                                                title: "Delete Signature",
                                                                content: "Are you sure you want to delete this signature?",
                                                                onOk: () => deleteSignatureMutation.mutate(field._id),
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
                                {/* Draggable position marker for signing (unsigned docs only) */}
                                {selectedDocument?.signing_workflow && selectedDocument.status !== "signed" && (
                                    <div
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setPreviewSignDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                            setPreviewSignDragging(true);
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: previewSignPos.x,
                                            top: previewSignPos.y,
                                            border: "2px dashed #1890ff",
                                            backgroundColor: "rgba(24,144,255,0.15)",
                                            padding: "10px 20px",
                                            color: "#1890ff",
                                            fontSize: "13px",
                                            fontWeight: "bold",
                                            cursor: previewSignDragging ? "grabbing" : "grab",
                                            userSelect: "none",
                                            zIndex: 50,
                                            borderRadius: 4,
                                        }}
                                    >
                                        📝 Sign Here — drag to reposition, or click elsewhere to move
                                    </div>
                                )}
                            </div>
                        ) : previewIsPdf ? (
                            // Fallback to iframe for PDF (if image conversion fails)
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "80vh",
                                    border: "1px dashed #d9d9d9",
                                    backgroundColor: "#f5f5f5",
                                    overflow: "auto",
                                    cursor: selectedDocument?.signing_workflow && selectedDocument.status !== "signed" ? "crosshair" : "default",
                                }}
                                onClick={(e) => {
                                    if (previewDraggingIndex !== null) return;
                                    if (selectedDocument?.signing_workflow && selectedDocument.status !== "signed") {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const scrollTop = e.currentTarget.scrollTop;
                                        const scrollLeft = e.currentTarget.scrollLeft;
                                        setPreviewSignPos({
                                            x: e.clientX - rect.left + scrollLeft - 100,
                                            y: e.clientY - rect.top + scrollTop - 18,
                                        });
                                    }
                                }}
                                onMouseMove={(e) => {
                                    if (previewDraggingIndex === null) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const scrollTop = e.currentTarget.scrollTop;
                                    const scrollLeft = e.currentTarget.scrollLeft;
                                    const x = e.clientX - rect.left + scrollLeft - previewDragOffset.x;
                                    const y = e.clientY - rect.top + scrollTop - previewDragOffset.y;
                                    const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                    if (field) {
                                        localPositionsRef.current[field._id] = { x, y };
                                        if (selectedDocument?.signatures) {
                                            const updated = selectedDocument.signatures.map((sig, i) =>
                                                i === previewDraggingIndex ? { ...sig, position: { ...sig.position, x, y } } : sig
                                            );
                                            setSelectedDocument({ ...selectedDocument, signatures: updated });
                                        }
                                    }
                                }}
                                onMouseUp={() => {
                                    if (previewDraggingIndex === null) return;
                                    const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                    if (field) {
                                        const pos = localPositionsRef.current[field._id];
                                        if (pos) {
                                            updateSignaturePositionMutation.mutate({
                                                fieldId: field._id,
                                                position: { x: pos.x, y: pos.y, page: currentPage, ...getContainerSize() },
                                            });
                                        }
                                    }
                                    setPreviewDraggingIndex(null);
                                }}
                                onMouseLeave={() => {
                                    if (previewDraggingIndex !== null) {
                                        const field = selectedDocument?.signatures?.[previewDraggingIndex];
                                        if (field) {
                                            const pos = localPositionsRef.current[field._id];
                                            if (pos) {
                                                updateSignaturePositionMutation.mutate({
                                                    fieldId: field._id,
                                                    position: { x: pos.x, y: pos.y, page: currentPage, ...getContainerSize() },
                                                });
                                            }
                                        }
                                        setPreviewDraggingIndex(null);
                                    }
                                }}
                                ref={previewContainerRef}
                            >
                                <iframe
                                    src={previewUrl}
                                    style={{ width: "100%", height: "100%", border: "none", minHeight: "100%" }}
                                    title="PDF Preview"
                                />
                                {selectedDocument?.signatures?.map((field, index) => {
                                    if (field.position.page !== currentPage) return null;
                                    const savedPos = localPositionsRef.current[field._id];
                                    const posX = savedPos?.x ?? (field.position.x === 0 ? 100 : field.position.x);
                                    const posY = savedPos?.y ?? (field.position.y === 0 ? 100 : field.position.y);
                                    const isLocked = field.locked || false;
                                    const isDraggingThis = previewDraggingIndex === index;
                                    return (
                                        <div
                                            key={field._id}
                                            onMouseDown={(e) => {
                                                if (isLocked) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setPreviewDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                                setPreviewDraggingIndex(index);
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: posX,
                                                top: posY,
                                                border: isDraggingThis ? "2px solid #1890ff" : isLocked ? "2px solid #faad14" : "2px solid #52c41a",
                                                backgroundColor: isDraggingThis ? "rgba(24, 144, 255, 0.15)" : isLocked ? "rgba(250, 173, 20, 0.08)" : "rgba(82, 196, 26, 0.08)",
                                                padding: "8px 16px",
                                                color: isDraggingThis ? "#1890ff" : isLocked ? "#faad14" : "#52c41a",
                                                fontSize: "12px",
                                                cursor: isLocked ? "not-allowed" : isDraggingThis ? "grabbing" : "grab",
                                                userSelect: "none",
                                                zIndex: isDraggingThis ? 1000 : 10,
                                                pointerEvents: "auto",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {field.signature_image_url ? (
                                                    <img
                                                        src={field.signature_image_url}
                                                        alt="Signature"
                                                        draggable={false}
                                                        style={{ maxWidth: "150px", maxHeight: "50px", objectFit: "contain" }}
                                                    />
                                                ) : (
                                                    <span>✓ {field.signer_name}</span>
                                                )}
                                                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const pos = localPositionsRef.current[field._id] || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: pos,
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
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            Modal.confirm({
                                                                title: "Delete Signature",
                                                                content: "Are you sure you want to delete this signature?",
                                                                onOk: () => deleteSignatureMutation.mutate(field._id),
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

            {/* Signature capture modal triggered from preview */}
            <SignatureCaptureModal
                open={signCaptureModalOpen}
                onClose={() => setSignCaptureModalOpen(false)}
                signerName={selectedDocument?.signing_workflow?.signers?.[selectedDocument?.signing_workflow?.current_signer_index ?? 0]?.name ?? selectedDocument?.signing_workflow?.signers?.[0]?.name ?? ""}
                onSave={async (data, type) => {
                    const containerSize = getContainerSize();
                    if (signAllPages && totalPages > 1 && selectedDocument) {
                        setIsSigningAllPages(true);
                        setSignCaptureModalOpen(false);
                        try {
                            for (let page = 1; page <= totalPages; page++) {
                                await eSignService.submitSignature(selectedDocument._id, {
                                    signature_data: data,
                                    signature_type: type,
                                    position: { x: previewSignPos.x, y: previewSignPos.y, page, width: 200, height: 50, ...containerSize },
                                });
                            }
                            message.success(`Signature applied to all ${totalPages} pages`);
                            queryClient.invalidateQueries({ queryKey: ["documents"] });
                            handlePreviewSigned(selectedDocument);
                        } catch {
                            message.error("Failed to apply signature to some pages");
                        } finally {
                            setIsSigningAllPages(false);
                            setSignAllPages(false);
                        }
                    } else {
                        submitPreviewMutation.mutate({
                            signature_data: data,
                            signature_type: type,
                            position: {
                                x: previewSignPos.x,
                                y: previewSignPos.y,
                                page: currentPage,
                                width: 200,
                                height: 50,
                                ...containerSize,
                            },
                        });
                    }
                }}
            />

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

        </div>
    );
};

export default ESignPage;
