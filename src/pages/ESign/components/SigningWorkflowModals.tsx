import React, { useState } from "react";
import {
    Modal,
    Button,
    Input,
    Select,
    Space,
    Alert,
    Spin,
    Card,
    Typography,
    Upload,
    Progress,
    message,
} from "antd";
import {
    MailOutlined,
    LinkOutlined,
    CopyOutlined,
    UserOutlined,
    DeleteOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FilePdfOutlined,
    FileImageOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { ModalForm } from "@ant-design/pro-components";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Document, Signer, PublicLinkInfo, ShareDocumentParams } from "../types/esign.types";
import { eSignService } from "../services/esign.api";

dayjs.extend(relativeTime);

const { Text } = Typography;

// ── 1. INITIATE SIGNING MODAL ────────────────────────────────────────────────
export interface InitiateSigningModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    document: Document | null;
    loading?: boolean;
    onInitiate: (params: { workflow_type: "self_sign" | "send_for_signing"; signers?: Signer[] }) => Promise<void>;
}

export const InitiateSigningModal: React.FC<InitiateSigningModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onCancel,
    document,
    loading = false,
    onInitiate,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const [workflowType, setWorkflowType] = useState<"self_sign" | "send_for_signing">("self_sign");
    const [signers, setSigners] = useState<Signer[]>([]);

    const handleOpenChange = (v: boolean) => {
        if (!isControlled) setInternalOpen(v);
        onOpenChange?.(v);
        if (!v) {
            setWorkflowType("self_sign");
            setSigners([]);
            onCancel?.();
        }
    };

    const addSigner = () => {
        setSigners((prev) => [
            ...prev,
            { user_id: "", name: "", email: "", order: prev.length + 1 },
        ]);
    };

    const updateSigner = (index: number, field: keyof Signer, value: string) => {
        setSigners((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const removeSigner = (index: number) => {
        setSigners((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!document) return false;
        if (workflowType === "send_for_signing") {
            if (signers.length === 0) {
                message.warning("Please add at least one signer");
                return false;
            }
            const hasInvalid = signers.some((s) => !s.name.trim() || !s.email.trim());
            if (hasInvalid) {
                message.warning("Please fill in name and email for all signers");
                return false;
            }
        }
        await onInitiate({
            workflow_type: workflowType,
            signers: workflowType === "send_for_signing" ? signers : undefined,
        });
        setWorkflowType("self_sign");
        setSigners([]);
        handleOpenChange(false);
        return true;
    };

    return (
        <ModalForm
            title="Initiate Signing Workflow"
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            onFinish={handleSubmit}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                confirmLoading: loading,
                onCancel: () => handleOpenChange(false),
            }}
            submitter={{
                searchConfig: {
                    submitText: "Initiate Workflow",
                    resetText: "Cancel",
                },
                submitButtonProps: {
                    loading,
                    type: "primary",
                    style: { borderRadius: 6 },
                },
                resetButtonProps: {
                    style: { borderRadius: 6 },
                },
            }}
            width={520}
        >
            <Space direction="vertical" style={{ width: "100%", marginTop: 8 }} size="large">
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <Text strong>Signers</Text>
                            <Button size="small" icon={<UserOutlined />} onClick={addSigner}>
                                Add Signer
                            </Button>
                        </div>
                        {signers.map((signer, index) => (
                            <Card
                                key={index}
                                size="small"
                                style={{ marginBottom: 8 }}
                                extra={
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeSigner(index)}
                                    />
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
        </ModalForm>
    );
};

// ── 2. SHARE DOCUMENT MODAL ──────────────────────────────────────────────────
export interface ShareDocumentModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    documentId: string | null;
    loading?: boolean;
    onShare: (docId: string, params: ShareDocumentParams) => Promise<boolean>;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onCancel,
    documentId,
    loading = false,
    onShare,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const [shareEmails, setShareEmails] = useState<string[]>([]);
    const [shareMessage, setShareMessage] = useState("");

    const handleOpenChange = (v: boolean) => {
        if (!isControlled) setInternalOpen(v);
        onOpenChange?.(v);
        if (!v) {
            setShareEmails([]);
            setShareMessage("");
            onCancel?.();
        }
    };

    const handleShareSubmit = async () => {
        if (!documentId) return false;
        if (shareEmails.length === 0) {
            message.warning("Add at least one email address.");
            return false;
        }
        const success = await onShare(documentId, {
            emails: shareEmails,
            message: shareMessage,
        });
        if (success) {
            setShareEmails([]);
            setShareMessage("");
            handleOpenChange(false);
            return true;
        }
        return false;
    };

    return (
        <ModalForm
            title={
                <span>
                    <MailOutlined style={{ marginRight: 8, color: "#1677ff" }} />
                    Share Signed Document
                </span>
            }
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            onFinish={handleShareSubmit}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                onCancel: () => handleOpenChange(false),
            }}
            submitter={{
                searchConfig: {
                    submitText: "Send",
                    resetText: "Cancel",
                },
                submitButtonProps: {
                    loading,
                    icon: <MailOutlined />,
                    disabled: shareEmails.length === 0,
                    type: "primary",
                    style: { borderRadius: 6 },
                },
                resetButtonProps: {
                    style: { borderRadius: 6 },
                },
            }}
            width={480}
        >
            <div style={{ marginBottom: 16, marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
                    Recipients <span style={{ color: "#ff4d4f" }}>*</span>
                </div>
                <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Type email and press Enter..."
                    value={shareEmails}
                    onChange={(vals: string[]) => {
                        const valid = vals.filter((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v));
                        if (valid.length < vals.length) {
                            message.warning("Some entries are not valid email addresses");
                        }
                        setShareEmails(valid);
                    }}
                    tokenSeparators={[",", " "]}
                    notFoundContent={null}
                    suffixIcon={null}
                />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                    Enter email addresses separated by comma or Enter
                </div>
            </div>
            <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
                    Message <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span>
                </div>
                <Input.TextArea
                    rows={3}
                    placeholder="Add a message to the recipients..."
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    maxLength={500}
                    showCount
                />
            </div>
        </ModalForm>
    );
};

// ── 3. PUBLIC SIGNING LINK MODAL ─────────────────────────────────────────────
export interface PublicLinkModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    linkInfo: PublicLinkInfo | null;
    linkLoading: boolean;
    onCreateLink: () => void;
    onRevokeLink: () => void;
    onCopyLink: (token: string) => void;
}

export const PublicLinkModal: React.FC<PublicLinkModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onClose,
    linkInfo,
    linkLoading,
    onCreateLink,
    onRevokeLink,
    onCopyLink,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (v: boolean) => {
        if (!isControlled) setInternalOpen(v);
        onOpenChange?.(v);
        if (!v) {
            onClose?.();
        }
    };

    return (
        <ModalForm
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LinkOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    <span style={{ fontWeight: 600 }}>Share Public Signing Link</span>
                </div>
            }
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                footer: null,
                onCancel: () => handleOpenChange(false),
            }}
            submitter={false}
            width={520}
        >
            {linkLoading && !linkInfo ? (
                <div style={{ textAlign: "center", padding: 36 }}>
                    <Spin size="large" />
                </div>
            ) : linkInfo?.active && linkInfo.token ? (
                <div>
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 14 }}
                        message={
                            <span>
                                Anyone with this link can sign the document — no login needed.
                                It expires {dayjs(linkInfo.expires_at).fromNow()}
                                {linkInfo.expires_at
                                    ? ` (${dayjs(linkInfo.expires_at).format("DD MMM YYYY, HH:mm")})`
                                    : ""}.
                            </span>
                        }
                    />
                    {linkInfo.signed_at && (
                        <Alert
                            type="success"
                            showIcon
                            style={{ marginBottom: 14 }}
                            message={`Signed by ${linkInfo.signer_name || "external signer"} ${dayjs(
                                linkInfo.signed_at
                            ).fromNow()}`}
                        />
                    )}
                    <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                        <Input
                            readOnly
                            value={eSignService.buildPublicSignUrl(linkInfo.token)}
                            onFocus={(e) => e.target.select()}
                            style={{ fontSize: 12 }}
                        />
                        <Button
                            type="primary"
                            icon={<CopyOutlined />}
                            onClick={() => linkInfo.token && onCopyLink(linkInfo.token)}
                        >
                            Copy
                        </Button>
                    </Space.Compact>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Button
                            danger
                            onClick={() =>
                                Modal.confirm({
                                    title: "Revoke link",
                                    content: "The link will stop working immediately. Continue?",
                                    okText: "Revoke",
                                    okButtonProps: { danger: true },
                                    onOk: onRevokeLink,
                                })
                            }
                        >
                            Revoke link
                        </Button>
                        <Button
                            loading={linkLoading}
                            onClick={() =>
                                Modal.confirm({
                                    title: "Regenerate link",
                                    content:
                                        "The current link will stop working and a new 24-hour link will be created.",
                                    okText: "Regenerate",
                                    onOk: onCreateLink,
                                })
                            }
                        >
                            Regenerate (new 24h link)
                        </Button>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                    <div style={{ fontSize: 44, color: "#1677ff", marginBottom: 12 }}>
                        <LinkOutlined />
                    </div>
                    <p style={{ margin: "0 auto 20px", color: "#4b5563", fontSize: 13, maxWidth: 400 }}>
                        Create a shareable link to let someone sign this document on their mobile device or laptop
                        — no login required. The link expires after 24 hours.
                    </p>
                    <Button
                        type="primary"
                        size="large"
                        icon={<LinkOutlined />}
                        loading={linkLoading}
                        onClick={onCreateLink}
                        style={{ borderRadius: 8 }}
                    >
                        Create signing link
                    </Button>
                </div>
            )}
        </ModalForm>
    );
};

// ── 4. UPLOAD DOCUMENT MODAL ──────────────────────────────────────────────────
export interface UploadDocumentModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    onUpload?: (file: File) => void;
    onSuccess?: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onCancel,
    onUpload,
    onSuccess,
}) => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "exception">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const resetState = () => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        setStatus("idle");
        setErrorMessage(null);
    };

    const handleOpenChange = (v: boolean) => {
        if (!v && uploading) return;
        if (!isControlled) {
            setInternalOpen(v);
        }
        onOpenChange?.(v);
        if (!v) {
            resetState();
            onCancel?.();
        }
    };

    const handleClose = () => {
        handleOpenChange(false);
    };

    const startUpload = async (uploadFile: File) => {
        setFile(uploadFile);
        setUploading(true);
        setProgress(0);
        setStatus("uploading");
        setErrorMessage(null);

        try {
            await eSignService.uploadDocument(uploadFile, (percent) => {
                setProgress(percent);
                if (percent >= 100) {
                    setStatus("processing");
                }
            });
            setProgress(100);
            setStatus("success");
            message.success("Document uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            onUpload?.(uploadFile);
            onSuccess?.();
            setTimeout(() => {
                handleOpenChange(false);
            }, 900);
        } catch (err: any) {
            setStatus("exception");
            const msg = err?.response?.data?.message || err?.message || "Failed to upload document";
            setErrorMessage(msg);
            message.error(msg);
        } finally {
            setUploading(false);
        }
    };

    const isPdf = file?.name?.toLowerCase().endsWith(".pdf");

    return (
        <ModalForm
            title="Upload Document"
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                footer: null,
                onCancel: handleClose,
            }}
            submitter={false}
            width={520}
        >
            {status === "idle" ? (
                <Upload.Dragger
                    accept=".pdf,.png,.jpg,.jpeg"
                    beforeUpload={(chosenFile) => {
                        startUpload(chosenFile);
                        return false;
                    }}
                    showUploadList={false}
                    style={{ padding: "36px 20px", marginTop: 12, borderRadius: 10 }}
                >
                    <p style={{ fontSize: 44, color: "#1677ff", marginBottom: 10 }}>
                        <InboxOutlined />
                    </p>
                    <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: "#262626" }}>
                        Click or drag file to this area to upload
                    </p>
                    <p style={{ color: "#8c8c8c", fontSize: 13, margin: 0 }}>
                        Supports PDF, PNG, JPG, or JPEG files (up to 50MB)
                    </p>
                </Upload.Dragger>
            ) : (
                <div
                    style={{
                        padding: "24px 20px",
                        marginTop: 12,
                        background: "#fafafa",
                        borderRadius: 12,
                        border: "1px solid #f0f0f0",
                        textAlign: "center",
                    }}
                >
                    {/* File Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: "#ffffff",
                            padding: "12px 16px",
                            borderRadius: 8,
                            border: "1px solid #e8e8e8",
                            marginBottom: 20,
                            textAlign: "left",
                        }}
                    >
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 6,
                                background: isPdf ? "#fff1f0" : "#e6f4ff",
                                color: isPdf ? "#ff4d4f" : "#1677ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 22,
                                flexShrink: 0,
                            }}
                        >
                            {isPdf ? <FilePdfOutlined /> : <FileImageOutlined />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: "#262626",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {file?.name}
                            </div>
                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                                {file ? formatFileSize(file.size) : ""}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div style={{ marginBottom: 16, padding: "0 8px" }}>
                        <Progress
                            percent={progress}
                            status={
                                status === "exception"
                                    ? "exception"
                                    : status === "success"
                                    ? "success"
                                    : "active"
                            }
                            strokeColor={
                                status === "exception"
                                    ? "#ff4d4f"
                                    : { "0%": "#1677ff", "100%": "#52c41a" }
                            }
                            strokeWidth={10}
                        />
                    </div>

                    {/* Status Text / States */}
                    <div style={{ minHeight: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {status === "uploading" && (
                            <Text style={{ fontSize: 13, color: "#1677ff", fontWeight: 500 }}>
                                Uploading document ({progress}%)...
                            </Text>
                        )}
                        {status === "processing" && (
                            <Text style={{ fontSize: 13, color: "#52c41a", fontWeight: 500 }}>
                                Processing and verifying document...
                            </Text>
                        )}
                        {status === "success" && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#52c41a", fontWeight: 600, fontSize: 14 }}>
                                <CheckCircleOutlined style={{ fontSize: 16 }} />
                                <span>Upload complete!</span>
                            </div>
                        )}
                        {status === "exception" && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#ff4d4f", fontSize: 13 }}>
                                    <CloseCircleOutlined style={{ fontSize: 15 }} />
                                    <span>{errorMessage || "Upload failed. Please try again."}</span>
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                    {file && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ReloadOutlined />}
                                            onClick={() => startUpload(file)}
                                        >
                                            Retry
                                        </Button>
                                    )}
                                    <Button size="small" onClick={resetState}>
                                        Choose Another File
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ModalForm>
    );
};
