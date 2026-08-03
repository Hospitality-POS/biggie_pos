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
    Spin,
    Empty,
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
    AppstoreOutlined,
    UnorderedListOutlined,
    MailOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import PdfCanvasViewer from "./PdfCanvasViewer";

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
// PENDING MARKER TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface PendingMarker {
    id: string;
    x: number;
    y: number;
    page: number;
    type: "signature" | "initials" | "stamp";
    preloadedData?: string;   // existing signature_image_url — skip capture modal
    preloadedType?: string;
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

    shareDocument: async (documentId: string, data: { emails: string[]; message?: string }) => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/share`,
            data
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

    getFileProxyUrl: (documentId: string): string => {
        return `${BASE_URL}/documents/${documentId}/signing/file`;
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
    { label: "Script",      value: "'Brush Script MT', 'Segoe Script', cursive" },
    { label: "Elegant",     value: "Georgia, 'Palatino Linotype', serif" },
    { label: "Print",       value: "'Arial', Helvetica, sans-serif" },
    { label: "Handwritten", value: "'Comic Sans MS', 'Chalkboard SE', cursive" },
];

const SIG_COLORS = ["#1a1a2e", "#1d4ed8", "#dc2626", "#16a34a"];

const TypeSignature: React.FC<{
    onSave: (data: string, type: string) => void;
    onCancel: () => void;
    signerName?: string;
    mode?: "signature" | "initials";
}> = ({ onSave, onCancel, signerName = "", mode = "signature" }) => {
    const getInitials = (n: string) => n.split(" ").filter(Boolean).map(w => w[0].toUpperCase()).join("").slice(0, 3);
    const [text, setText] = useState(mode === "initials" ? getInitials(signerName) : signerName);
    const [selectedFont, setSelectedFont] = useState(TYPE_FONTS[0].value);
    const [selectedColor, setSelectedColor] = useState(SIG_COLORS[0]);

    const displayText = mode === "initials" ? (text ? getInitials(text) : getInitials(signerName)) : text;

    const handleSave = () => {
        const canvas = document.createElement("canvas");
        canvas.width = mode === "initials" ? 200 : 460;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.font = `${mode === "initials" ? "bold" : "italic"} ${mode === "initials" ? 64 : 48}px ${selectedFont}`;
        ctx.fillStyle = selectedColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
        onSave(canvas.toDataURL("image/png"), mode === "initials" ? "initials" : "type");
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: 500 }}>
                    {mode === "initials" ? "Initials" : "Full name"}
                </div>
                <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={mode === "initials" ? "e.g. MK" : "Type your full name"}
                    size="large"
                    autoFocus
                />
            </div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>Style</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {TYPE_FONTS.map(f => (
                        <div
                            key={f.value}
                            onClick={() => setSelectedFont(f.value)}
                            style={{
                                border: `2px solid ${selectedFont === f.value ? "#1890ff" : "#e8e8e8"}`,
                                borderRadius: 8, padding: "10px 14px",
                                cursor: "pointer",
                                background: selectedFont === f.value ? "#e6f4ff" : "#fafafa",
                                display: "flex", alignItems: "center", gap: 10,
                                transition: "all 0.18s",
                            }}
                        >
                            <span style={{ color: selectedFont === f.value ? "#1890ff" : "#d0d0d0", fontSize: 12 }}>
                                {selectedFont === f.value ? "●" : "○"}
                            </span>
                            <span style={{ fontFamily: f.value, fontSize: mode === "initials" ? 28 : 22, color: selectedColor, flex: 1 }}>
                                {displayText || (mode === "initials" ? "MK" : "Your Name")}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>Color</div>
                <div style={{ display: "flex", gap: 10 }}>
                    {SIG_COLORS.map(c => (
                        <div
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            style={{
                                width: 26, height: 26, borderRadius: "50%",
                                background: c, cursor: "pointer",
                                boxShadow: selectedColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : "none",
                                transition: "all 0.18s",
                            }}
                        />
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" onClick={handleSave} disabled={!displayText.trim()}>Apply</Button>
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
// STAMP UPLOAD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const StampUpload: React.FC<{
    onSave: (data: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onSave(ev.target?.result as string);
        reader.readAsDataURL(file);
    };
    return (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChange} />
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🏢</div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>Select a stamp image</p>
                <p style={{ color: "#999", fontSize: 12 }}>PNG with transparent background recommended</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <Button type="primary" onClick={() => inputRef.current?.click()}>Choose Image</Button>
                <Button onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE CAPTURE MODAL
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
    { key: "signature", label: "Signature",     icon: "✍️" },
    { key: "initials",  label: "Initials",      icon: "AC" },
    { key: "stamp",     label: "Company Stamp", icon: "🏢" },
] as const;

const SIG_SUB_TABS = [
    { key: "type",   label: "Type"   },
    { key: "draw",   label: "Draw"   },
    { key: "upload", label: "Upload" },
];

const SignatureCaptureModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSave: (data: string, type: string) => void;
    signerName?: string;
    defaultTab?: string;
}> = ({ open, onClose, onSave, signerName = "", defaultTab = "signature" }) => {
    const [fieldType, setFieldType] = useState(defaultTab);
    const [subTab, setSubTab] = useState("type");
    React.useEffect(() => { if (open) { setFieldType(defaultTab); setSubTab("type"); } }, [open, defaultTab]);

    const handleSave = (data: string, type: string) => { onSave(data, type); onClose(); };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Set your signature details</span>
                    {signerName && <span style={{ color: "#aaa", fontSize: 13, fontWeight: 400, marginLeft: "auto" }}>{signerName}</span>}
                </div>
            }
            footer={null}
            width={580}
            styles={{ body: { paddingTop: 0 } }}
        >
            {/* Top-level field type tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid #f0f0f0", marginBottom: 20 }}>
                {FIELD_TYPES.map(ft => (
                    <button
                        key={ft.key}
                        onClick={() => { setFieldType(ft.key); setSubTab("type"); }}
                        style={{
                            flex: 1, padding: "12px 8px", border: "none", background: "none",
                            borderBottom: `3px solid ${fieldType === ft.key ? "#1890ff" : "transparent"}`,
                            color: fieldType === ft.key ? "#1890ff" : "#666",
                            fontWeight: fieldType === ft.key ? 600 : 400,
                            cursor: "pointer", fontSize: 13, marginBottom: -2,
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        }}
                    >
                        <span style={{ fontSize: ft.key === "initials" ? 15 : 20 }}>{ft.icon}</span>
                        <span>{ft.label}</span>
                    </button>
                ))}
            </div>

            {/* Signature: Type | Draw | Upload */}
            {fieldType === "signature" && (
                <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                        {SIG_SUB_TABS.map(st => (
                            <button
                                key={st.key}
                                onClick={() => setSubTab(st.key)}
                                style={{
                                    padding: "5px 14px",
                                    border: `1.5px solid ${subTab === st.key ? "#1890ff" : "#d9d9d9"}`,
                                    borderRadius: 20, background: subTab === st.key ? "#e6f4ff" : "#fff",
                                    color: subTab === st.key ? "#1890ff" : "#555",
                                    cursor: "pointer", fontSize: 12, fontWeight: subTab === st.key ? 600 : 400,
                                }}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ minHeight: 240 }}>
                        {subTab === "type"   && <TypeSignature onSave={handleSave} onCancel={onClose} signerName={signerName} mode="signature" />}
                        {subTab === "draw"   && <SignatureCanvas onSave={(d) => handleSave(d, "draw")} onCancel={onClose} />}
                        {subTab === "upload" && <UploadSignature onSave={(d) => handleSave(d, "upload")} onCancel={onClose} />}
                    </div>
                </>
            )}

            {/* Initials */}
            {fieldType === "initials" && (
                <div style={{ minHeight: 240 }}>
                    <TypeSignature onSave={handleSave} onCancel={onClose} signerName={signerName} mode="initials" />
                </div>
            )}

            {/* Company Stamp */}
            {fieldType === "stamp" && (
                <div style={{ minHeight: 240 }}>
                    <StampUpload onSave={(d) => handleSave(d, "stamp")} onCancel={onClose} />
                </div>
            )}
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
    const [pendingMarkers, setPendingMarkers] = useState<PendingMarker[]>([]);
    const [previewSignDragging, setPreviewSignDragging] = useState(false);
    const [workflowType, setWorkflowType] = useState<"self_sign" | "send_for_signing">("self_sign");
    const [signers, setSigners] = useState<Signer[]>([]);
    const [selectedDocForInitiate, setSelectedDocForInitiate] = useState<Document | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [signatureFieldModalOpen, setSignatureFieldModalOpen] = useState(false);
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
    const [previewSignMode, setPreviewSignMode] = useState<"signature" | "initials" | "stamp">("signature");
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareDocId, setShareDocId] = useState<string | null>(null);
    const [shareEmails, setShareEmails] = useState<string[]>([]);
    const [shareMessage, setShareMessage] = useState("");
    const [shareLoading, setShareLoading] = useState(false);

    const handleShare = async () => {
        if (!shareDocId || shareEmails.length === 0) {
            message.warning("Add at least one email address.");
            return;
        }
        setShareLoading(true);
        try {
            await eSignService.shareDocument(shareDocId, { emails: shareEmails, message: shareMessage });
            message.success(`Shared with ${shareEmails.length} recipient${shareEmails.length > 1 ? "s" : ""}`);
            setShareModalOpen(false);
            setShareEmails([]);
            setShareMessage("");
        } catch {
            message.error("Failed to share document");
        } finally {
            setShareLoading(false);
        }
    };
    // Local position overrides - persists positions across renders without server refetch
    const localPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
    // Ref to measure the rendered preview container for coordinate scaling
    const previewContainerRef = useRef<HTMLDivElement>(null);
    // Stable drag state stored in a ref so document-level handlers never go stale
    const activeDragRef = useRef<{
        type: 'pendingMarker' | 'signature';
        index?: number;
        markerId?: string;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    // Keep currentPage in a ref so drag handlers always see latest value
    const currentPageRef = useRef(currentPage);
    React.useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    // Tracks whether a pending-marker drag just finished so the following click is ignored
    const hasDraggedRef = useRef(false);

    const getSigDimensions = (type: string) => {
        if (type === "stamp")   return { width: 110, height: 110 };
        if (type === "initials") return { width: 120, height: 50 };
        return { width: 200, height: 50 }; // signature default
    };

    const getContainerSize = () => {
        const el = previewContainerRef.current;
        return {
            containerWidth: el?.scrollWidth ?? 0,
            containerHeight: el?.scrollHeight ?? 0,
        };
    };

    const queryClient = useQueryClient();

    const updateSignaturePositionMutation = useMutation({
        mutationFn: ({ fieldId, position }: { fieldId: string; position: { x: number; y: number; page: number; containerWidth?: number; containerHeight?: number } }) =>
            eSignService.updateSignatureField(selectedDocument?._id || "", fieldId, { position }),
        onSuccess: (_data, variables) => {
            // Keep local ref in sync with confirmed server position
            localPositionsRef.current[variables.fieldId] = { x: variables.position.x, y: variables.position.y };
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

    const deleteSignatureMutation = {
        mutate: (fieldId: string) => {
            // Remove from local state immediately — never block the user on a 404
            setSelectedDocument(prev => {
                if (!prev) return prev;
                return { ...prev, signatures: (prev.signatures || []).filter(s => s._id !== fieldId) };
            });
            message.success("Signature removed");
            queryClient.invalidateQueries(["documents"]);
            // Fire API silently — 404 is expected for submitted signatures whose IDs differ
            eSignService.deleteSignatureField(selectedDocument?._id || "", fieldId).catch(() => { /* silent */ });
        },
    };

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

    const handleDuplicateSignature = (field: SignatureField) => {
        const pagesToAdd: number[] = [];
        for (let p = 1; p <= totalPages; p++) {
            if (p !== field.position.page) pagesToAdd.push(p);
        }
        if (pagesToAdd.length === 0) { message.info("No other pages to copy to"); return; }
        pagesToAdd.forEach(page => {
            addSignatureFieldMutation.mutate({
                signer_name: field.signer_name,
                position: { x: field.position.x, y: field.position.y, page },
            });
        });
        message.success(`Duplicating signature to ${pagesToAdd.length} page(s)`);
    };

    const addSidebarMarker = (type: PendingMarker["type"], imageUrl: string, sigType: string) => {
        const el = previewContainerRef.current;
        const cx = el ? el.clientWidth / 2 - 100 : 100;
        const cy = el ? el.scrollTop + el.clientHeight / 2 - 25 : 100;
        setPendingMarkers(prev => [...prev, {
            id: `pm-${Date.now()}`,
            x: Math.max(10, cx),
            y: Math.max(10, cy),
            page: currentPageRef.current,
            type,
            preloadedData: imageUrl,
            preloadedType: sigType,
        }]);
        message.success("Field placed — drag to reposition, then click Sign");
    };

    const handlePreviewSigned = async (doc: Document) => {
        // Open modal immediately — user gets instant feedback; spinner shown while data loads
        setPreviewModalOpen(true);
        setIsPreviewLoading(true);
        setPreviewUrl("");
        setPendingMarkers([]);
        setLoadingDocId(doc._id);
        try {
            const response = await axiosInstance.get(`${BASE_URL}/documents/${doc._id}`);
            const freshDoc = response.data;
            setSelectedDocument(freshDoc);
            localPositionsRef.current = {};
            if (freshDoc.signatures) {
                freshDoc.signatures.forEach((sig: SignatureField) => {
                    if (sig.position) localPositionsRef.current[sig._id] = { x: sig.position.x, y: sig.position.y };
                });
            }
            if (freshDoc.signatures && freshDoc.signatures.length > 0) {
                const maxPage = Math.max(...freshDoc.signatures.map((s: SignatureField) => s.position.page || 1));
                setTotalPages(maxPage);
            } else {
                setTotalPages(1);
            }
            setCurrentPage(1);
            const isPdf = freshDoc.attachments?.[0]?.file_type === "application/pdf" ||
                freshDoc.attachments?.[0]?.file_url?.toLowerCase().includes(".pdf") ||
                freshDoc.name?.toLowerCase().includes(".pdf");
            setPreviewIsPdf(!!isPdf);

            // Try preview API (page images)
            try {
                const data = await eSignService.previewSignedDocument(freshDoc._id);
                if (data.previewType === "images" && data.pages && data.pages.length > 0 && !data.isPlaceholder) {
                    setPreviewType("images");
                    setPreviewPages(data.pages);
                    setPreviewUrl(data.pages[0]);
                    setTotalPages(data.pages.length);
                    return;
                }
            } catch (err: unknown) {
                console.error("Preview API failed:", err);
            }

            // Blob URL (auth-safe)
            try {
                if (previewBlobUrlRef.current) window.URL.revokeObjectURL(previewBlobUrlRef.current);
                const blobUrl = await eSignService.getFileBlobUrl(freshDoc._id);
                previewBlobUrlRef.current = blobUrl;
                setPreviewType("url");
                setPreviewUrl(blobUrl);
                return;
            } catch (blobError: unknown) {
                console.error("Blob fetch failed:", blobError);
            }

            // Last resort: direct attachment URL
            if (freshDoc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(freshDoc.attachments[0].file_url);
            }
        } catch (error: unknown) {
            message.error((error as Error)?.message || "Failed to load document");
            setSelectedDocument(doc);
            if (doc.attachments?.[0]?.file_url) {
                setPreviewType("url");
                setPreviewUrl(doc.attachments[0].file_url);
                setPreviewIsPdf(doc.attachments[0].file_type === "application/pdf" || doc.attachments[0].file_url.toLowerCase().includes(".pdf"));
            }
        } finally {
            setIsPreviewLoading(false);
            setLoadingDocId(null);
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

    // Document-level drag: reliable even when mouse moves fast outside the container
    React.useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const drag = activeDragRef.current;
            if (!drag || !previewContainerRef.current) return;
            const rect = previewContainerRef.current.getBoundingClientRect();
            const scrollLeft = previewContainerRef.current.scrollLeft;
            const scrollTop = previewContainerRef.current.scrollTop;
            const x = Math.max(0, e.clientX - rect.left + scrollLeft - drag.offsetX);
            const y = Math.max(0, e.clientY - rect.top + scrollTop - drag.offsetY);
            if (drag.type === 'pendingMarker' && drag.markerId) {
                const mid = drag.markerId;
                hasDraggedRef.current = true;
                setPendingMarkers(prev => prev.map(m => m.id === mid ? { ...m, x, y } : m));
            } else if (drag.type === 'signature' && drag.index !== undefined) {
                const idx = drag.index;
                setSelectedDocument(prev => {
                    if (!prev?.signatures) return prev;
                    const field = prev.signatures[idx];
                    if (!field) return prev;
                    localPositionsRef.current[field._id] = { x, y };
                    return {
                        ...prev,
                        signatures: prev.signatures.map((sig, i) =>
                            i === idx ? { ...sig, position: { ...sig.position, x, y } } : sig
                        ),
                    };
                });
            }
        };
        const onUp = () => {
            const drag = activeDragRef.current;
            if (!drag) return;
            if (drag.type === 'signature' && drag.index !== undefined) {
                const idx = drag.index;
                setSelectedDocument(prev => {
                    if (!prev?.signatures) return prev;
                    const field = prev.signatures[idx];
                    if (field) {
                        const pos = localPositionsRef.current[field._id];
                        if (pos) {
                            const { containerWidth, containerHeight } = getContainerSize();
                            updateSignaturePositionMutation.mutate({
                                fieldId: field._id,
                                position: { x: pos.x, y: pos.y, page: currentPageRef.current, containerWidth, containerHeight },
                            });
                        }
                    }
                    return prev;
                });
                setPreviewDraggingIndex(null);
            }
            activeDragRef.current = null;
            setPreviewSignDragging(false);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [updateSignaturePositionMutation]);

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
        (updated[index] as any)[field] = value;
        setSigners(updated);
    };

    const removeSigner = (index: number) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    const allDocs: Document[] = documents?.data || [];
    const filteredDocs = allDocs.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const statCounts = {
        total: allDocs.length,
        pending: allDocs.filter(d => ["pending_signature", "partially_signed"].includes(d.status)).length,
        signed: allDocs.filter(d => d.status === "signed").length,
        draft: allDocs.filter(d => d.status === "draft").length,
    };

    return (
        <div style={{ padding: "28px 36px" }}>

            {/* ── Page header ──────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>E-Signature</Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>Upload, manage and sign documents electronically</Text>
                </div>
                <Button type="primary" icon={<UploadOutlined />} size="large"
                    onClick={() => setUploadModalOpen(true)}
                    style={{ borderRadius: 8, height: 42, paddingInline: 20, fontWeight: 600 }}
                >
                    Upload Document
                </Button>
            </div>

            {/* ── Stat chips ───────────────────────────────── */}
            {!isLoading && (
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                    {([
                        { label: "Total",   value: statCounts.total,   color: "#6366f1", bg: "#eef2ff" },
                        { label: "Pending", value: statCounts.pending, color: "#f59e0b", bg: "#fffbeb" },
                        { label: "Signed",  value: statCounts.signed,  color: "#10b981", bg: "#ecfdf5" },
                        { label: "Draft",   value: statCounts.draft,   color: "#6b7280", bg: "#f3f4f6" },
                    ] as const).map(s => (
                        <div key={s.label}
                            onClick={() => setStatusFilter(s.label === "Total" ? "all" : s.label === "Pending" ? "pending_signature" : s.label.toLowerCase())}
                            style={{ display: "flex", alignItems: "center", gap: 10, background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 12, padding: "10px 18px", cursor: "pointer", transition: "box-shadow .15s" }}
                        >
                            <span style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search + filter + view toggle ──────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
                <Input
                    placeholder="Search documents…"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                    prefix={<span style={{ color: "#9ca3af", marginRight: 2 }}>🔍</span>}
                    style={{ flex: 1, borderRadius: 8, height: 40 }}
                />
                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 190, height: 40 }}
                    options={[
                        { value: "all",                label: "All Status" },
                        { value: "draft",              label: "Draft" },
                        { value: "pending_signature",  label: "Pending Signature" },
                        { value: "partially_signed",   label: "Partially Signed" },
                        { value: "signed",             label: "Signed" },
                        { value: "declined",           label: "Declined" },
                    ]}
                />
                {/* View mode toggle */}
                <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", height: 40 }}>
                    <button
                        onClick={() => setViewMode("grid")}
                        title="Card view"
                        style={{ width: 40, height: 40, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === "grid" ? "#1677ff" : "#fff", color: viewMode === "grid" ? "#fff" : "#6b7280", transition: "background .15s" }}
                    >
                        <AppstoreOutlined style={{ fontSize: 16 }} />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        title="List view"
                        style={{ width: 40, height: 40, border: "none", borderLeft: "1px solid #e5e7eb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === "list" ? "#1677ff" : "#fff", color: viewMode === "list" ? "#fff" : "#6b7280", transition: "background .15s" }}
                    >
                        <UnorderedListOutlined style={{ fontSize: 16 }} />
                    </button>
                </div>
            </div>

            {/* ── Document grid ────────────────────────────── */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
            ) : filteredDocs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <Empty description={searchText || statusFilter !== "all" ? "No documents match your filters" : "No documents yet"} />
                    {!searchText && statusFilter === "all" && (
                        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)} style={{ marginTop: 16, borderRadius: 8 }}>
                            Upload your first document
                        </Button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
                    {filteredDocs.map((doc: Document) => {
                        const isPdf = doc.attachments?.[0]?.file_type?.includes("pdf") || doc.name?.toLowerCase().endsWith(".pdf");
                        const sc = ({
                            signed:             { color: "#10b981", bg: "#d1fae5", label: "Signed",  dot: "🟢" },
                            pending_signature:  { color: "#f59e0b", bg: "#fef3c7", label: "Pending", dot: "🟡" },
                            partially_signed:   { color: "#3b82f6", bg: "#dbeafe", label: "Partial", dot: "🔵" },
                            draft:              { color: "#6b7280", bg: "#f3f4f6", label: "Draft",   dot: "⚪" },
                            declined:           { color: "#ef4444", bg: "#fee2e2", label: "Declined",dot: "🔴" },
                        } as Record<string, {color:string;bg:string;label:string;dot:string}>)[doc.status] || { color: "#6b7280", bg: "#f3f4f6", label: doc.status, dot: "⚪" };
                        return (
                            <div
                                key={doc._id}
                                style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, display: "flex", flexDirection: "column", gap: 14, transition: "box-shadow .18s, transform .18s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.10)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: isPdf ? "#fff1f0" : "#e6f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {isPdf ? <FilePdfOutlined style={{ fontSize: 24, color: "#f5222d" }} /> : <FileImageOutlined style={{ fontSize: 24, color: "#1677ff" }} />}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 20 }}>{sc.dot} {sc.label}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", lineHeight: 1.4, marginBottom: 4, wordBreak: "break-word" }}>{doc.name}</div>
                                    {doc.signing_workflow && (
                                        <span style={{ fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
                                            {doc.signing_workflow.workflow_type === "self_sign" ? "Self-sign" : "Multi-signer"}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    {doc.signing_workflow ? (
                                        <>
                                            <Button type="primary" icon={<SignatureOutlined />} onClick={() => handleOpenSigning(doc)} loading={loadingDocId === doc._id} style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}>{doc.status === "signed" ? "Preview" : "Sign"}</Button>
                                            {doc.status === "signed" && <Button icon={<DownloadOutlined />} onClick={() => eSignService.downloadSignedDocument(doc._id)} style={{ borderRadius: 8 }} title="Download" />}
                                            {doc.status === "signed" && <Button icon={<MailOutlined />} onClick={() => { setShareDocId(doc._id); setShareModalOpen(true); }} style={{ borderRadius: 8 }} title="Share via email" />}
                                            {doc.status === "signed" && <Button title="Re-sign" style={{ borderRadius: 8 }} onClick={() => Modal.confirm({ title: "Clear & Re-sign", content: "Erase existing signature to re-sign?", okText: "Clear & Re-sign", okButtonProps: { danger: true }, onOk: async () => { await eSignService.clearSignature(doc._id); message.success("Cleared."); queryClient.invalidateQueries({ queryKey: ["documents"] }); } })}>🧹</Button>}
                                        </>
                                    ) : (
                                        <>
                                            <Button type="primary" icon={<EditOutlined />} onClick={() => handleInitiateSigning(doc)} style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}>Initiate</Button>
                                            <Button icon={<EditOutlined />} onClick={() => handleAddSignatureField(doc)} style={{ borderRadius: 8 }} title="Add field" />
                                        </>
                                    )}
                                    <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} title="Delete" onClick={() => Modal.confirm({ title: "Delete Document", content: `Delete "${doc.name}"? This cannot be undone.`, okText: "Delete", okButtonProps: { danger: true }, onOk: async () => { await eSignService.deleteDocument(doc._id); message.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["documents"] }); } })} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── List view ───────────────────────────────── */
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                    {/* Header row */}
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 120px 200px", gap: 0, padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        {["Type", "Document Name", "Status", "Workflow", "Actions"].map((h, i) => (
                            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, gridColumn: i === 4 ? "5 / 6" : undefined, textAlign: i === 4 ? "right" : "left" }}>{h}</div>
                        ))}
                    </div>
                    {filteredDocs.map((doc: Document, idx) => {
                        const isPdf = doc.attachments?.[0]?.file_type?.includes("pdf") || doc.name?.toLowerCase().endsWith(".pdf");
                        const sc = ({
                            signed:             { color: "#10b981", bg: "#d1fae5", label: "Signed",  dot: "🟢" },
                            pending_signature:  { color: "#f59e0b", bg: "#fef3c7", label: "Pending", dot: "🟡" },
                            partially_signed:   { color: "#3b82f6", bg: "#dbeafe", label: "Partial", dot: "🔵" },
                            draft:              { color: "#6b7280", bg: "#f3f4f6", label: "Draft",   dot: "⚪" },
                            declined:           { color: "#ef4444", bg: "#fee2e2", label: "Declined",dot: "🔴" },
                        } as Record<string, {color:string;bg:string;label:string;dot:string}>)[doc.status] || { color: "#6b7280", bg: "#f3f4f6", label: doc.status, dot: "⚪" };
                        return (
                            <div
                                key={doc._id}
                                style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 120px 200px", alignItems: "center", gap: 0, padding: "12px 16px", borderBottom: idx < filteredDocs.length - 1 ? "1px solid #f3f4f6" : "none", transition: "background .12s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                                {/* Type icon */}
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    {isPdf ? <FilePdfOutlined style={{ fontSize: 20, color: "#f5222d" }} /> : <FileImageOutlined style={{ fontSize: 20, color: "#1677ff" }} />}
                                </div>
                                {/* Name */}
                                <div style={{ fontWeight: 500, fontSize: 13, color: "#111827", paddingRight: 16, wordBreak: "break-word" }}>{doc.name}</div>
                                {/* Status */}
                                <div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: "2px 9px", borderRadius: 20 }}>{sc.dot} {sc.label}</span>
                                </div>
                                {/* Workflow */}
                                <div>
                                    {doc.signing_workflow ? (
                                        <span style={{ fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
                                            {doc.signing_workflow.workflow_type === "self_sign" ? "Self-sign" : "Multi-signer"}
                                        </span>
                                    ) : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                                </div>
                                {/* Actions */}
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                    {doc.signing_workflow ? (
                                        <>
                                            <Button size="small" type="primary" icon={<SignatureOutlined />} onClick={() => handleOpenSigning(doc)} loading={loadingDocId === doc._id} style={{ borderRadius: 6, fontWeight: 600 }}>{doc.status === "signed" ? "Preview" : "Sign"}</Button>
                                            {doc.status === "signed" && <Button size="small" icon={<DownloadOutlined />} onClick={() => eSignService.downloadSignedDocument(doc._id)} style={{ borderRadius: 6 }} title="Download" />}
                                            {doc.status === "signed" && <Button size="small" icon={<MailOutlined />} onClick={() => { setShareDocId(doc._id); setShareModalOpen(true); }} style={{ borderRadius: 6 }} title="Share via email" />}
                                            {doc.status === "signed" && <Button size="small" title="Re-sign" style={{ borderRadius: 6 }} onClick={() => Modal.confirm({ title: "Clear & Re-sign", content: "Erase existing signature to re-sign?", okText: "Clear & Re-sign", okButtonProps: { danger: true }, onOk: async () => { await eSignService.clearSignature(doc._id); message.success("Cleared."); queryClient.invalidateQueries({ queryKey: ["documents"] }); } })}>🧹</Button>}
                                        </>
                                    ) : (
                                        <>
                                            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleInitiateSigning(doc)} style={{ borderRadius: 6 }}>Initiate</Button>
                                            <Button size="small" icon={<EditOutlined />} onClick={() => handleAddSignatureField(doc)} style={{ borderRadius: 6 }} title="Add field" />
                                        </>
                                    )}
                                    <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} title="Delete" onClick={() => Modal.confirm({ title: "Delete Document", content: `Delete "${doc.name}"? This cannot be undone.`, okText: "Delete", okButtonProps: { danger: true }, onOk: async () => { await eSignService.deleteDocument(doc._id); message.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["documents"] }); } })} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
                    setIsPreviewLoading(false);
                    setPreviewUrl("");
                    setPreviewType("url");
                    setPreviewPages([]);
                    setEditingSignatureIndex(null);
                    setCurrentPage(1);
                    setPendingMarkers([]);
                }}
                title="Document Preview"
                footer={null}
                width="95vw"
                style={{ top: 0, paddingBottom: 0, maxWidth: 1600 }}
            >
                <div style={{ display: "flex", height: "calc(90vh - 55px)", overflow: "hidden" }}>
                <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
                {isPreviewLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
                        <Spin size="large" />
                        <span style={{ color: "#888", fontSize: 14 }}>Loading document…</span>
                    </div>
                ) : previewUrl ? (
                    <div style={{ textAlign: "center" }}>
                        {selectedDocument?.signatures && selectedDocument.signatures.length > 0 && (
                            <Alert
                                message={previewType === "images"
                                    ? "Drag signatures to reposition them on the document. Use page controls to navigate between pages."
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
                                style={{ position: "relative", display: "inline-block", cursor: selectedDocument?.signing_workflow ? "crosshair" : "default" }}
                                onClick={(e) => {
                                    if (hasDraggedRef.current) { hasDraggedRef.current = false; return; }
                                    if (activeDragRef.current || previewSignDragging) return;
                                    if (selectedDocument?.signing_workflow) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setPendingMarkers(prev => [...prev, {
                                            id: `pm-${Date.now()}`,
                                            x: e.clientX - rect.left - 100,
                                            y: e.clientY - rect.top - 18,
                                            page: currentPage,
                                            type: previewSignMode,
                                        }]);
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
                                                const containerScrollTop = previewContainerRef.current?.scrollTop ?? 0;
                                                const containerScrollLeft = previewContainerRef.current?.scrollLeft ?? 0;
                                                activeDragRef.current = {
                                                    type: 'signature',
                                                    index,
                                                    offsetX: e.clientX - rect.left + containerScrollLeft,
                                                    offsetY: e.clientY - rect.top + containerScrollTop,
                                                };
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
                                                cursor: isLocked ? "default" : isDraggingThis ? "grabbing" : "grab",
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
                                                            const p = localPositionsRef.current[field._id] || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: { x: p.x, y: p.y, page: field.position.page },
                                                            });
                                                        }}
                                                        title={isLocked ? "Unlock signature" : "Lock signature"}
                                                    >
                                                        {isLocked ? "🔓" : "🔒"}
                                                    </Button>
                                                    {!isLocked && (
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicateSignature(field); }}
                                                            title="Duplicate to other pages"
                                                            disabled={totalPages <= 1}
                                                        >
                                                            📋
                                                        </Button>
                                                    )}
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
                                {pendingMarkers.filter(m => m.page === currentPage).map(marker => {
                                    const mc = marker.type === "initials" ? "#722ed1" : marker.type === "stamp" ? "#52c41a" : "#1890ff";
                                    const ml = marker.type === "initials" ? "Aa Initials" : marker.type === "stamp" ? "🏢 Stamp" : "✍️ Sig";
                                    return (
                                        <div
                                            key={marker.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                activeDragRef.current = { type: 'pendingMarker', markerId: marker.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                                                setPreviewSignDragging(true);
                                            }}
                                            style={{ position: "absolute", left: marker.x, top: marker.y, border: `2px dashed ${mc}`, backgroundColor: `${mc}20`, padding: "6px 12px", color: mc, fontSize: "12px", fontWeight: "bold", cursor: "grab", userSelect: "none", zIndex: 50, borderRadius: 4, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                                        >
                                            <span>{ml}</span>
                                            <span onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setPendingMarkers(prev => prev.filter(m => m.id !== marker.id)); }} style={{ cursor: "pointer", opacity: 0.7, fontSize: 14, lineHeight: 1 }}>×</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : previewIsPdf ? (
                            // PDF rendered via PDF.js canvas — pixel-perfect, no browser chrome
                            <div
                                style={{
                                    position: "relative",
                                    display: "inline-block",
                                    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                                    cursor: selectedDocument?.signing_workflow ? "crosshair" : "default",
                                }}
                                onClick={(e) => {
                                    if (hasDraggedRef.current) { hasDraggedRef.current = false; return; }
                                    if (activeDragRef.current || previewSignDragging) return;
                                    if (selectedDocument?.signing_workflow) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setPendingMarkers(prev => [...prev, {
                                            id: `pm-${Date.now()}`,
                                            x: e.clientX - rect.left - 100,
                                            y: e.clientY - rect.top - 18,
                                            page: currentPage,
                                            type: previewSignMode,
                                        }]);
                                    }
                                }}
                                ref={previewContainerRef}
                            >
                                <PdfCanvasViewer
                                    url={previewUrl}
                                    pageNumber={currentPage}
                                    onPdfLoaded={(numPages) => setTotalPages(numPages)}
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
                                                activeDragRef.current = {
                                                    type: 'signature',
                                                    index,
                                                    offsetX: e.clientX - rect.left,
                                                    offsetY: e.clientY - rect.top,
                                                };
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
                                                cursor: isLocked ? "default" : isDraggingThis ? "grabbing" : "grab",
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
                                                            const p = localPositionsRef.current[field._id] || field.position;
                                                            lockSignatureMutation.mutate({
                                                                fieldId: field._id,
                                                                locked: !isLocked,
                                                                position: { x: p.x, y: p.y, page: field.position.page },
                                                            });
                                                        }}
                                                        title={isLocked ? "Unlock signature" : "Lock signature"}
                                                    >
                                                        {isLocked ? "🔓" : "🔒"}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicateSignature(field); }}
                                                        title="Duplicate to other pages"
                                                        disabled={totalPages <= 1}
                                                    >
                                                        📋
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
                                {pendingMarkers.filter(m => m.page === currentPage).map(marker => {
                                    const mc = marker.type === "initials" ? "#722ed1" : marker.type === "stamp" ? "#52c41a" : "#1890ff";
                                    const ml = marker.type === "initials" ? "Aa Initials" : marker.type === "stamp" ? "🏢 Stamp" : "✍️ Sig";
                                    return (
                                        <div
                                            key={marker.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                activeDragRef.current = { type: 'pendingMarker', markerId: marker.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                                                setPreviewSignDragging(true);
                                            }}
                                            style={{ position: "absolute", left: marker.x, top: marker.y, border: `2px dashed ${mc}`, backgroundColor: `${mc}20`, padding: "6px 12px", color: mc, fontSize: "12px", fontWeight: "bold", cursor: "grab", userSelect: "none", zIndex: 50, borderRadius: 4, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                                        >
                                            <span>{ml}</span>
                                            <span onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setPendingMarkers(prev => prev.filter(m => m.id !== marker.id)); }} style={{ cursor: "pointer", opacity: 0.7, fontSize: 14, lineHeight: 1 }}>×</span>
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
                </div>
                {/* Signing options sidebar */}
                <div style={{ width: 284, borderLeft: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, background: "#fff" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Signing options</div>
                    </div>
                    <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
                        {selectedDocument?.signing_workflow ? (
                            <>
                                {selectedDocument.status === "signed" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                                        <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 15 }} />
                                        <span style={{ color: "#389e0d", fontSize: 12, fontWeight: 600 }}>Signed — click the document to add more</span>
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 14, lineHeight: 1.5 }}>Click a field to place it, or draw directly on the document.</div>

                                {/* ── Required fields ── */}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Required fields</div>
                                {(() => {
                                    const sig = selectedDocument?.signatures?.filter(s => (!s.signature_type || s.signature_type === "signature") && s.signature_image_url).slice(-1)[0];
                                    return sig ? (
                                        <div style={{ border: "2px solid #1677ff33", borderRadius: 10, marginBottom: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                                            <div style={{ display: "flex", alignItems: "stretch", minHeight: 58 }}>
                                                <div title="Drag handle" style={{ padding: "0 10px", color: "#ccc", display: "flex", alignItems: "center", borderRight: "1px solid #f0f0f0", fontSize: 16, cursor: "grab" }}>⠿</div>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", cursor: "pointer", background: "#fafeff" }}
                                                    title="Click to place on document"
                                                    onClick={() => addSidebarMarker("signature", sig.signature_image_url ?? "", "signature")}>
                                                    <img src={sig.signature_image_url} style={{ height: 40, maxWidth: "100%", objectFit: "contain" }} alt="Signature" />
                                                </div>
                                                <button title="Sign again" onClick={e => { e.stopPropagation(); setPreviewSignMode("signature"); setSignCaptureModalOpen(true); }}
                                                    style={{ border: "none", borderLeft: "1px solid #f0f0f0", background: "#f9f9f9", cursor: "pointer", padding: "0 12px", color: "#888", fontSize: 15 }}>✏️</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ border: "2px dashed #1677ff55", borderRadius: 10, padding: "14px", cursor: "pointer", textAlign: "center", marginBottom: 8, color: "#1677ff", fontSize: 13, fontWeight: 500, background: "#f0f7ff" }}
                                            onClick={() => { setPreviewSignMode("signature"); setSignCaptureModalOpen(true); }}>
                                            ✍️ Draw signature
                                        </div>
                                    );
                                })()}

                                {/* ── Optional fields ── */}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, marginTop: 18, textTransform: "uppercase", letterSpacing: 0.8 }}>Optional fields</div>
                                {([
                                    { key: "initials" as const, icon: "AC", label: "Initials" },
                                    { key: "stamp" as const,    icon: "🏢", label: "Company Stamp" },
                                ]).map(ft => {
                                    const existing = selectedDocument?.signatures?.filter(s => s.signature_type === ft.key && s.signature_image_url).slice(-1)[0];
                                    return existing ? (
                                        <div key={ft.key} style={{ border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                            <div style={{ display: "flex", alignItems: "stretch", minHeight: 50 }}>
                                                <div style={{ padding: "0 10px", color: "#ccc", display: "flex", alignItems: "center", borderRight: "1px solid #f0f0f0", fontSize: 16, cursor: "grab" }}>⠿</div>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", cursor: "pointer", background: "#fafeff" }}
                                                    onClick={() => addSidebarMarker(ft.key, existing.signature_image_url ?? "", ft.key)}>
                                                    <img src={existing.signature_image_url} style={{ height: 34, maxWidth: "100%", objectFit: "contain" }} alt={ft.label} />
                                                </div>
                                                <button title="Re-draw" onClick={e => { e.stopPropagation(); setPreviewSignMode(ft.key); setSignCaptureModalOpen(true); }}
                                                    style={{ border: "none", borderLeft: "1px solid #f0f0f0", background: "#f9f9f9", cursor: "pointer", padding: "0 12px", color: "#888", fontSize: 15 }}>✏️</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={ft.key} style={{ border: `1px solid ${previewSignMode === ft.key ? "#1677ff" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: previewSignMode === ft.key ? "#e6f4ff" : "#fafafa", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, transition: "all .15s" }}
                                            onClick={() => setPreviewSignMode(ft.key)}>
                                            <span style={{ fontSize: ft.key === "initials" ? 13 : 18, fontWeight: ft.key === "initials" ? 700 : "normal" }}>{ft.icon}</span>
                                            <span style={{ fontWeight: 500, flex: 1, fontSize: 14 }}>{ft.label}</span>
                                            {previewSignMode === ft.key && <span style={{ fontSize: 10, color: "#1677ff", background: "#bae0ff", padding: "2px 6px", borderRadius: 10 }}>Active</span>}
                                        </div>
                                    );
                                })}
                            </>
                        ) : null}
                    </div>
                    <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 8 }}>

                        {/* Pending markers summary */}
                        {pendingMarkers.length > 0 && (
                            <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, padding: "8px 12px", marginBottom: 2 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#389e0d" }}>{pendingMarkers.length} field{pendingMarkers.length > 1 ? "s" : ""} ready to sign</span>
                                    <span style={{ fontSize: 11, color: "#ff4d4f", cursor: "pointer" }} onClick={() => setPendingMarkers([])}>Clear all</span>
                                </div>
                                {pendingMarkers.map(m => (
                                    <div key={m.id} style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 4, padding: "1px 0" }}>
                                        <span>{m.type === "initials" ? "Aa" : m.type === "stamp" ? "🏢" : "✍️"}</span>
                                        <span style={{ flex: 1, textTransform: "capitalize" }}>{m.type}{m.preloadedData ? " ✓" : ""}</span>
                                        <span style={{ color: "#aaa", fontSize: 10 }}>pg {m.page}</span>
                                        <span onClick={() => setPendingMarkers(prev => prev.filter(pm => pm.id !== m.id))} style={{ cursor: "pointer", color: "#ff4d4f", fontSize: 13, marginLeft: 4 }}>×</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sign button */}
                        {selectedDocument?.signing_workflow && (
                            <Button
                                type="primary"
                                size="large"
                                icon={<SignatureOutlined />}
                                block
                                disabled={pendingMarkers.length === 0}
                                onClick={async () => {
                                    if (pendingMarkers.every(m => m.preloadedData)) {
                                        const containerSize = getContainerSize();
                                        setIsSigningAllPages(true);
                                        try {
                                            for (const marker of pendingMarkers) {
                                                await eSignService.submitSignature(selectedDocument?._id || "", {
                                                    signature_data: marker.preloadedData ?? "",
                                                    signature_type: marker.preloadedType || marker.type,
                                                    field_id: marker.id,
                                                    position: { x: marker.x, y: marker.y, page: marker.page, ...getSigDimensions(marker.preloadedType || marker.type), ...containerSize },
                                                });
                                            }
                                            message.success(`${pendingMarkers.length} field${pendingMarkers.length !== 1 ? "s" : ""} placed successfully`);
                                            setPendingMarkers([]);
                                            queryClient.invalidateQueries({ queryKey: ["documents"] });
                                            if (selectedDocument) {
                                                try { const r = await axiosInstance.get(`${BASE_URL}/documents/${selectedDocument._id}`); setSelectedDocument(r.data); } catch (_e) { /* silent */ }
                                            }
                                        } catch { message.error("Failed to place some fields"); }
                                        finally { setIsSigningAllPages(false); }
                                        return;
                                    }
                                    setSignCaptureModalOpen(true);
                                }}
                                loading={submitPreviewMutation.isLoading || isSigningAllPages}
                                style={{ borderRadius: 8, fontWeight: 600 }}
                                danger
                            >
                                {pendingMarkers.length === 0
                                    ? "Place a field to sign"
                                    : pendingMarkers.length > 1
                                        ? `Sign ${pendingMarkers.length} Fields →`
                                        : "Sign →"}
                            </Button>
                        )}

                        {/* Download + Share — shown whenever doc is signed */}
                        {selectedDocument?.status === "signed" && (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    block
                                    size="large"
                                    onClick={() => selectedDocument && eSignService.downloadSignedDocument(selectedDocument._id).catch(() => message.error("Download failed"))}
                                    style={{ borderRadius: 8, fontWeight: 600, flex: 1 }}
                                >
                                    Download
                                </Button>
                                <Button
                                    icon={<MailOutlined />}
                                    size="large"
                                    onClick={() => { setShareDocId(selectedDocument._id); setShareModalOpen(true); }}
                                    style={{ borderRadius: 8, fontWeight: 600 }}
                                    title="Share via email"
                                />
                            </div>
                        )}

                        {/* Hint when no markers placed yet */}
                        {pendingMarkers.length === 0 && selectedDocument?.signing_workflow && (
                            <p style={{ margin: 0, fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.5 }}>
                                Click a field card above or click on the document to place a signature
                            </p>
                        )}
                    </div>
                </div>
                </div>
            </Modal>

            {/* Signature capture modal triggered from preview */}
            <SignatureCaptureModal
                open={signCaptureModalOpen}
                onClose={() => setSignCaptureModalOpen(false)}
                defaultTab={previewSignMode}
                signerName={selectedDocument?.signing_workflow?.signers?.[selectedDocument?.signing_workflow?.current_signer_index ?? 0]?.name ?? selectedDocument?.signing_workflow?.signers?.[0]?.name ?? ""}
                onSave={async (data, type) => {
                    const containerSize = getContainerSize();
                    setIsSigningAllPages(true);
                    setSignCaptureModalOpen(false);
                    try {
                        for (const marker of pendingMarkers) {
                            await eSignService.submitSignature(selectedDocument?._id || "", {
                                signature_data: marker.preloadedData || data,
                                signature_type: marker.preloadedType || type,
                                field_id: marker.id,
                                position: { x: marker.x, y: marker.y, page: marker.page, ...getSigDimensions(marker.preloadedType || type), ...containerSize },
                            });
                        }
                        message.success(`${pendingMarkers.length} field${pendingMarkers.length !== 1 ? "s" : ""} signed successfully`);
                        setPendingMarkers([]);
                        queryClient.invalidateQueries({ queryKey: ["documents"] });
                        // Silently refresh doc data so overlays update without closing signing mode
                        if (selectedDocument) {
                            try {
                                const resp = await axiosInstance.get(`${BASE_URL}/documents/${selectedDocument._id}`);
                                setSelectedDocument(resp.data);
                            } catch { /* keep current view */ }
                        }
                    } catch {
                        message.error("Failed to sign some fields");
                    } finally {
                        setIsSigningAllPages(false);
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
                                    onDragStart={() => setEditingSignatureIndex(index)}
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
                                        setEditingSignatureIndex(null);
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

        {/* ── Share via email modal ── */}
            <Modal
                open={shareModalOpen}
                onCancel={() => { setShareModalOpen(false); setShareEmails([]); setShareMessage(""); }}
                title={<span><MailOutlined style={{ marginRight: 8, color: "#1677ff" }} />Share Signed Document</span>}
                onOk={handleShare}
                okText="Send"
                okButtonProps={{ loading: shareLoading, icon: <MailOutlined />, disabled: shareEmails.length === 0 }}
                cancelText="Cancel"
                width={480}
            >
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Recipients <span style={{ color: "#ff4d4f" }}>*</span></div>
                    <Select
                        mode="tags"
                        style={{ width: "100%" }}
                        placeholder="Type email and press Enter..."
                        value={shareEmails}
                        onChange={(vals: string[]) => {
                            const valid = vals.filter(v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v));
                            if (valid.length < vals.length) message.warning("Some entries are not valid email addresses");
                            setShareEmails(valid);
                        }}
                        tokenSeparators={[",", " "]}
                        notFoundContent={null}
                        suffixIcon={null}
                    />
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Enter email addresses separated by comma or Enter</div>
                </div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Message <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></div>
                    <Input.TextArea
                        rows={3}
                        placeholder="Add a message to the recipients..."
                        value={shareMessage}
                        onChange={e => setShareMessage(e.target.value)}
                        maxLength={500}
                        showCount
                    />
                </div>
            </Modal>

        </div>
    );
};

export default ESignPage;
