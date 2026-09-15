import React, { useState, useRef, useEffect } from "react";
import {
    Modal,
    Button,
    Typography,
    Alert,
    Progress,
    Image,
    message,
} from "antd";
import { ModalForm } from "@ant-design/pro-components";
import {
    LeftOutlined,
    RightOutlined,
    SignatureOutlined,
    BankOutlined,
    EditOutlined,
    BookOutlined,
    LockOutlined,
    UnlockOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownloadOutlined,
    MailOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    AppstoreOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";
import PdfCanvasViewer from "./PdfCanvasViewer";
import { eSignService } from "../services/esign.api";
import type {
    Document,
    SignatureField,
    PendingMarker,
    LibraryItem,
} from "../types/esign.types";

const { Text } = Typography;

export interface DocumentPreviewModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose: () => void;
    document: Document | null;
    onOpenCapture: (mode: "signature" | "initials" | "stamp") => void;
    onOpenLibrary: (type: "signature" | "stamp") => void;
    onSignAll: (markers: PendingMarker[]) => Promise<void>;
    isSigning: boolean;
    onUpdatePosition: (params: {
        documentId: string;
        fieldId: string;
        position: { x: number; y: number; page: number; containerWidth?: number; containerHeight?: number };
    }) => void;
    onLockToggle: (params: {
        documentId: string;
        fieldId: string;
        locked: boolean;
        position: { x: number; y: number; page: number };
    }) => void;
    onDeleteSignature: (fieldId: string) => void;
    onDuplicateSignature: (field: SignatureField, totalPages: number) => void;
    onDownload: (docId: string) => void;
    onShare: (docId: string) => void;
    placingMode: boolean;
    placingItem: LibraryItem | null;
    onClearPlacingMode: () => void;
    pendingMarkers: PendingMarker[];
    setPendingMarkers: React.Dispatch<React.SetStateAction<PendingMarker[]>>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onClose,
    document: currentDocument,
    onOpenCapture,
    onOpenLibrary,
    onSignAll,
    isSigning,
    onUpdatePosition,
    onLockToggle,
    onDeleteSignature,
    onDuplicateSignature,
    onDownload,
    onShare,
    placingMode,
    placingItem,
    onClearPlacingMode,
    pendingMarkers,
    setPendingMarkers,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (v: boolean) => {
        if (!isControlled) setInternalOpen(v);
        onOpenChange?.(v);
        if (!v) {
            onClose();
        }
    };
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [previewType, setPreviewType] = useState<"url" | "images">("url");
    const [previewIsPdf, setPreviewIsPdf] = useState(false);
    const [previewPages, setPreviewPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [previewSignMode, setPreviewSignMode] = useState<"signature" | "initials" | "stamp">("signature");
    const [previewDraggingIndex, setPreviewDraggingIndex] = useState<number | null>(null);
    const [previewSignDragging, setPreviewSignDragging] = useState(false);
    const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});

    const previewBlobUrlRef = useRef<string>("");
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const localPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
    const activeDragRef = useRef<{
        type: "pendingMarker" | "signature";
        index?: number;
        fieldId?: string;
        markerId?: string;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const currentPageRef = useRef(currentPage);
    const hasDraggedRef = useRef(false);
    const lastDragEndRef = useRef(0);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    // Load preview when modal opens or document changes
    useEffect(() => {
        if (!modalOpen || !currentDocument) return;

        let active = true;
        setPreviewLoading(true);
        setPreviewProgress(20);
        setPreviewUrl("");
        setPendingMarkers([]);
        setCurrentPage(1);
        localPositionsRef.current = {};
        setLocalPositions({});

        if (currentDocument.signatures && currentDocument.signatures.length > 0) {
            const posMap: Record<string, { x: number; y: number }> = {};
            currentDocument.signatures.forEach((sig) => {
                if (sig.position) {
                    posMap[sig._id] = { x: sig.position.x, y: sig.position.y };
                }
            });
            localPositionsRef.current = posMap;
            setLocalPositions(posMap);
            const maxPage = Math.max(...currentDocument.signatures.map((s) => s.position.page || 1));
            setTotalPages(maxPage);
        } else {
            setTotalPages(1);
        }

        const isPdf =
            currentDocument.attachments?.[0]?.file_type === "application/pdf" ||
            currentDocument.attachments?.[0]?.file_url?.toLowerCase().includes(".pdf") ||
            currentDocument.name?.toLowerCase().includes(".pdf");
        setPreviewIsPdf(!!isPdf);

        const progressTimer = setInterval(() => {
            setPreviewProgress((prev) => (prev < 90 ? prev + Math.floor(Math.random() * 8) + 4 : prev));
        }, 200);

        const loadPreview = async () => {
            try {
                // 1. Try preview API first
                try {
                    const data = await eSignService.previewSignedDocument(currentDocument._id);
                    if (
                        active &&
                        data.previewType === "images" &&
                        data.pages &&
                        data.pages.length > 0 &&
                        !data.isPlaceholder
                    ) {
                        setPreviewProgress(100);
                        setPreviewType("images");
                        setPreviewPages(data.pages);
                        setPreviewUrl(data.pages[0]);
                        setTotalPages(data.pages.length);
                        setPreviewLoading(false);
                        return;
                    }
                } catch {
                    // Fallback to blob URL
                }

                // 2. Try auth blob URL
                try {
                    if (previewBlobUrlRef.current) {
                        window.URL.revokeObjectURL(previewBlobUrlRef.current);
                    }
                    const blobUrl = await eSignService.getFileBlobUrl(currentDocument._id, (p) => {
                        if (active) setPreviewProgress(Math.max(20, p));
                    });
                    if (active) {
                        setPreviewProgress(100);
                        previewBlobUrlRef.current = blobUrl;
                        setPreviewType("url");
                        setPreviewUrl(blobUrl);
                        setPreviewLoading(false);
                        return;
                    }
                } catch {
                    // Fallback to direct attachment
                }

                if (active && currentDocument.attachments?.[0]?.file_url) {
                    setPreviewProgress(100);
                    setPreviewType("url");
                    setPreviewUrl(currentDocument.attachments[0].file_url);
                }
            } finally {
                clearInterval(progressTimer);
                if (active) setPreviewLoading(false);
            }
        };

        loadPreview();

        return () => {
            active = false;
            clearInterval(progressTimer);
            if (previewBlobUrlRef.current) {
                window.URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = "";
            }
        };
    }, [modalOpen, currentDocument]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mouse drag handlers on document level only when modal is open
    useEffect(() => {
        if (!modalOpen) return;

        const onMove = (e: MouseEvent) => {
            const drag = activeDragRef.current;
            if (!drag || !previewContainerRef.current) return;
            hasDraggedRef.current = true;
            const rect = previewContainerRef.current.getBoundingClientRect();
            const scrollLeft = previewContainerRef.current.scrollLeft;
            const scrollTop = previewContainerRef.current.scrollTop;
            const x = Math.max(0, e.clientX - rect.left + scrollLeft - drag.offsetX);
            const y = Math.max(0, e.clientY - rect.top + scrollTop - drag.offsetY);

            if (drag.type === "pendingMarker" && drag.markerId) {
                const mid = drag.markerId;
                setPendingMarkers((prev) =>
                    prev.map((m) =>
                        m.id === mid
                            ? { ...m, x: Math.round(x), y: Math.round(y) }
                            : m
                    )
                );
            } else if (drag.type === "signature" && drag.fieldId) {
                const fid = drag.fieldId;
                localPositionsRef.current[fid] = { x: Math.round(x), y: Math.round(y) };
                setLocalPositions((prev) => ({
                    ...prev,
                    [fid]: { x: Math.round(x), y: Math.round(y) },
                }));
            }
        };

        const onUp = () => {
            const drag = activeDragRef.current;
            if (drag) {
                lastDragEndRef.current = Date.now();
                if (hasDraggedRef.current && drag.type === "signature" && drag.fieldId && currentDocument) {
                    const pos = localPositionsRef.current[drag.fieldId];
                    if (pos) {
                        const renderedDimensions = previewContainerRef.current
                            ? { width: previewContainerRef.current.scrollWidth, height: previewContainerRef.current.scrollHeight }
                            : { width: 0, height: 0 };
                        onUpdatePosition({
                            documentId: currentDocument._id,
                            fieldId: drag.fieldId,
                            position: {
                                x: pos.x,
                                y: pos.y,
                                page: currentPageRef.current,
                                containerWidth: Math.round(renderedDimensions.width),
                                containerHeight: Math.round(renderedDimensions.height),
                            },
                        });
                    }
                }
                setPreviewDraggingIndex(null);
                setPreviewSignDragging(false);
                activeDragRef.current = null;
                setTimeout(() => {
                    hasDraggedRef.current = false;
                }, 100);
            }
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, [modalOpen, currentDocument, onUpdatePosition, setPendingMarkers]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hasDraggedRef.current || Date.now() - lastDragEndRef.current < 350) {
            hasDraggedRef.current = false;
            return;
        }
        if (activeDragRef.current || previewSignDragging || previewDraggingIndex !== null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - 100;
        const y = e.clientY - rect.top - 18;

        if (placingMode && placingItem) {
            setPendingMarkers((prev) => [
                ...prev,
                {
                    id: `pm-${Date.now()}`,
                    x: Math.max(10, x),
                    y: Math.max(10, y),
                    page: currentPage,
                    type: placingItem.type === "stamp" ? "stamp" : "signature",
                    preloadedData: placingItem.data,
                    preloadedType: placingItem.type,
                },
            ]);
            onClearPlacingMode();
            message.success("Signature/stamp placed successfully");
            return;
        }

        if (currentDocument?.signing_workflow) {
            setPendingMarkers((prev) => [
                ...prev,
                {
                    id: `pm-${Date.now()}`,
                    x: Math.max(10, x),
                    y: Math.max(10, y),
                    page: currentPage,
                    type: previewSignMode,
                },
            ]);
        }
    };

    const addSidebarMarker = (type: PendingMarker["type"], imageUrl: string, sigType: string) => {
        const el = previewContainerRef.current;
        const cx = el ? el.clientWidth / 2 - 100 : 100;
        const cy = el ? el.scrollTop + el.clientHeight / 2 - 25 : 100;
        setPendingMarkers((prev) => [
            ...prev,
            {
                id: `pm-${Date.now()}`,
                x: Math.max(10, cx),
                y: Math.max(10, cy),
                page: currentPageRef.current,
                type,
                preloadedData: imageUrl,
                preloadedType: sigType,
            },
        ]);
        message.success("Field placed — drag to reposition, then click Sign");
    };

    const handleCopyToSamePage = (field: SignatureField) => {
        const offset = 30;
        setPendingMarkers((prev) => [
            ...prev,
            {
                id: `pm-${Date.now()}`,
                x: Math.max(10, field.position.x + offset),
                y: Math.max(10, field.position.y + offset),
                page: currentPage,
                type: field.signature_type === "stamp" ? "stamp" : "signature",
                preloadedData: field.signature_image_url || "",
                preloadedType: field.signature_type || "upload",
            },
        ]);
        message.success("Signature copied to this page — drag to reposition");
    };

    const renderSignaturesAndMarkers = () => (
        <>
            {/* Signatures overlay */}
            {currentDocument?.signatures?.map((field, index) => {
                if (field.position.page !== currentPage) return null;
                const savedPos = localPositions[field._id] ?? localPositionsRef.current[field._id];
                const posX = savedPos?.x ?? (field.position.x === 0 ? 100 : field.position.x);
                const posY = savedPos?.y ?? (field.position.y === 0 ? 100 : field.position.y);
                const isLocked = field.locked || false;
                const isDraggingThis = previewDraggingIndex === index;

                return (
                    <div
                        key={field._id}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                            if (isLocked) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            activeDragRef.current = {
                                type: "signature",
                                index,
                                fieldId: field._id,
                                offsetX: e.clientX - rect.left,
                                offsetY: e.clientY - rect.top,
                            };
                            setPreviewDraggingIndex(index);
                        }}
                        style={{
                            position: "absolute",
                            left: posX,
                            top: posY,
                            border: isDraggingThis
                                ? "2px solid #1890ff"
                                : isLocked
                                ? "2px solid #faad14"
                                : "2px solid #52c41a",
                            backgroundColor: isDraggingThis
                                ? "rgba(230, 244, 255, 0.94)"
                                : isLocked
                                ? "rgba(255, 251, 230, 0.94)"
                                : "rgba(255, 255, 255, 0.94)",
                            padding: "8px 16px",
                            color: isDraggingThis ? "#1890ff" : isLocked ? "#faad14" : "#52c41a",
                            fontSize: "12px",
                            cursor: isLocked ? "default" : isDraggingThis ? "grabbing" : "grab",
                            userSelect: "none",
                            zIndex: isDraggingThis ? 1000 : 10,
                            pointerEvents: "auto",
                            borderRadius: 6,
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {!isLocked && (
                                <span
                                    style={{ cursor: "grab", fontSize: "16px", userSelect: "none" }}
                                    title="Drag to move"
                                >
                                    &#x283F;
                                </span>
                            )}
                            {field.signature_image_url ? (
                                <img
                                    src={field.signature_image_url}
                                    alt="Signature"
                                    draggable={false}
                                    style={{ maxWidth: "150px", maxHeight: "50px", objectFit: "contain", pointerEvents: "none" }}
                                />
                            ) : (
                                <span style={{ pointerEvents: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <CheckOutlined /> {field.signer_name}
                                </span>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    marginLeft: 8,
                                    background: "#ffffff",
                                    padding: "2px 4px",
                                    borderRadius: 6,
                                    border: "1px solid #d9d9d9",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                                }}
                            >
                                <Button
                                    size="small"
                                    type="text"
                                    style={{
                                        fontSize: 13,
                                        padding: "2px 4px",
                                        height: 22,
                                        minWidth: 22,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: isLocked ? "#d48806" : "#262626",
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLockToggle({
                                            documentId: currentDocument._id,
                                            fieldId: field._id,
                                            locked: !isLocked,
                                            position: { x: posX, y: posY, page: field.position.page },
                                        });
                                    }}
                                    title={isLocked ? "Unlock signature" : "Lock signature"}
                                >
                                    {isLocked ? <UnlockOutlined /> : <LockOutlined />}
                                </Button>
                                {!isLocked && (
                                    <>
                                        <Button
                                            size="small"
                                            type="text"
                                            style={{
                                                fontSize: 13,
                                                padding: "2px 4px",
                                                height: 22,
                                                minWidth: 22,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#1677ff",
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyToSamePage(field);
                                            }}
                                            title="Copy to this page"
                                        >
                                            <CopyOutlined />
                                        </Button>
                                        <Button
                                            size="small"
                                            type="text"
                                            style={{
                                                fontSize: 13,
                                                padding: "2px 4px",
                                                height: 22,
                                                minWidth: 22,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#1677ff",
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDuplicateSignature(field, totalPages);
                                            }}
                                            title="Duplicate to other pages"
                                            disabled={totalPages <= 1}
                                        >
                                            <BookOutlined />
                                        </Button>
                                    </>
                                )}
                                <Button
                                    size="small"
                                    type="text"
                                    danger
                                    style={{
                                        fontSize: 13,
                                        padding: "2px 4px",
                                        height: 22,
                                        minWidth: 22,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#ff4d4f",
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        Modal.confirm({
                                            title: "Delete Signature",
                                            content: "Are you sure you want to delete this signature?",
                                            onOk: () => onDeleteSignature(field._id),
                                        });
                                    }}
                                    title="Delete signature"
                                >
                                    <DeleteOutlined />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Pending markers overlay */}
            {pendingMarkers
                .filter((m) => m.page === currentPage)
                .map((marker) => {
                    const mc = marker.type === "initials" ? "#722ed1" : marker.type === "stamp" ? "#52c41a" : "#1890ff";
                    return (
                        <div
                            key={marker.id}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => {
                                if (marker.locked) return;
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                activeDragRef.current = {
                                    type: "pendingMarker",
                                    markerId: marker.id,
                                    offsetX: e.clientX - rect.left,
                                    offsetY: e.clientY - rect.top,
                                };
                                setPreviewSignDragging(true);
                            }}
                            style={{
                                position: "absolute",
                                left: marker.x,
                                top: marker.y,
                                border: marker.locked ? "2px solid #faad14" : `2px dashed ${mc}`,
                                backgroundColor: marker.locked ? "rgba(255, 251, 230, 0.94)" : "rgba(255, 255, 255, 0.94)",
                                padding: marker.preloadedData ? "8px" : "6px 12px",
                                color: marker.locked ? "#faad14" : mc,
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: marker.locked ? "not-allowed" : "grab",
                                userSelect: "none",
                                zIndex: 50,
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                whiteSpace: "nowrap",
                                flexWrap: "nowrap",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
                            }}
                        >
                            {marker.preloadedData ? (
                                <img
                                    src={marker.preloadedData}
                                    alt={marker.type}
                                    style={{
                                        maxWidth: "150px",
                                        maxHeight: "50px",
                                        objectFit: "contain",
                                        pointerEvents: "none",
                                    }}
                                />
                            ) : (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    {marker.type === "stamp" ? (
                                        <BankOutlined />
                                    ) : marker.type === "initials" ? (
                                        <span style={{ fontWeight: 700 }}>AC</span>
                                    ) : (
                                        <SignatureOutlined />
                                    )}
                                    <span>{marker.type === "initials" ? "Initials" : marker.type === "stamp" ? "Stamp" : "Sig"}</span>
                                </span>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    marginLeft: 8,
                                    background: "#ffffff",
                                    padding: "2px 4px",
                                    borderRadius: 6,
                                    border: "1px solid #d9d9d9",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                                }}
                            >
                                <Button
                                    size="small"
                                    type="text"
                                    style={{
                                        fontSize: 13,
                                        padding: "2px 4px",
                                        height: 22,
                                        minWidth: 22,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: marker.locked ? "#d48806" : "#262626",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingMarkers((prev) =>
                                            prev.map((m) => (m.id === marker.id ? { ...m, locked: !m.locked } : m))
                                        );
                                    }}
                                    title={marker.locked ? "Unlock" : "Lock"}
                                >
                                    {marker.locked ? <UnlockOutlined /> : <LockOutlined />}
                                </Button>
                                <Button
                                    size="small"
                                    type="text"
                                    danger
                                    style={{
                                        fontSize: 13,
                                        padding: "2px 4px",
                                        height: 22,
                                        minWidth: 22,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#ff4d4f",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingMarkers((prev) => prev.filter((m) => m.id !== marker.id));
                                    }}
                                    title="Remove"
                                >
                                    <DeleteOutlined />
                                </Button>
                                <Button
                                    size="small"
                                    type="text"
                                    style={{
                                        fontSize: 13,
                                        padding: "2px 4px",
                                        height: 22,
                                        minWidth: 22,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#1677ff",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const pagesToAdd: number[] = [];
                                        for (let p = 1; p <= totalPages; p++) {
                                            if (p !== currentPage) pagesToAdd.push(p);
                                        }
                                        if (pagesToAdd.length === 0) {
                                            message.info("No other pages to copy to");
                                            return;
                                        }
                                        pagesToAdd.forEach((page, idx) => {
                                            setTimeout(() => {
                                                setPendingMarkers((prev) => [
                                                    ...prev,
                                                    {
                                                        id: `pm-${Date.now()}-${page}`,
                                                        x: marker.x,
                                                        y: marker.y,
                                                        page,
                                                        type: marker.type,
                                                        preloadedData: marker.preloadedData,
                                                        preloadedType: marker.preloadedType,
                                                        locked: marker.locked,
                                                    },
                                                ]);
                                            }, idx * 100);
                                        });
                                        message.success(`Duplicating to ${pagesToAdd.length} page(s)`);
                                    }}
                                    title="Duplicate to other pages"
                                >
                                    <BookOutlined />
                                </Button>
                            </div>
                        </div>
                    );
                })}
        </>
    );

    return (
        <ModalForm
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            title="Document Preview"
            submitter={false}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                footer: null,
                style: { paddingBottom: 0, maxWidth: 1600 },
                onCancel: () => handleOpenChange(false),
            }}
            width="95vw"
        >
            <div style={{ display: "flex", height: "calc(90vh - 55px)", overflow: "hidden" }}>
                {/* Left: Document View */}
                <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
                    {previewLoading ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "65vh",
                                padding: 24,
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 380,
                                    background: "#ffffff",
                                    border: "1px solid #e8e8e8",
                                    borderRadius: 12,
                                    padding: "28px 24px",
                                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                                    textAlign: "center",
                                }}
                            >
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: "50%",
                                        background: "#e6f4ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: "0 auto 16px",
                                        color: "#1677ff",
                                        fontSize: 26,
                                    }}
                                >
                                    <FilePdfOutlined />
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 16, color: "#262626", marginBottom: 4 }}>
                                    Loading Document
                                </div>
                                <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 18, wordBreak: "break-all" }}>
                                    {currentDocument?.name || "Preparing document preview..."}
                                </div>
                                <Progress
                                    percent={previewProgress}
                                    status="active"
                                    strokeColor={{ "0%": "#1677ff", "100%": "#52c41a" }}
                                    style={{ marginBottom: 8 }}
                                />
                                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                                    {previewProgress >= 100 ? "Ready!" : `Loading pages (${previewProgress}%)`}
                                </div>
                            </div>
                        </div>
                    ) : previewUrl ? (
                        <div style={{ textAlign: "center" }}>
                            {placingMode && (
                                <Alert
                                    message="Click anywhere on the document to place the signature/stamp"
                                    type="warning"
                                    showIcon
                                    closable
                                    onClose={onClearPlacingMode}
                                    style={{ marginBottom: 8 }}
                                />
                            )}
                            {currentDocument?.signatures && currentDocument.signatures.length > 0 && (
                                <Alert
                                    message="Drag signatures to reposition them on the document. Use page controls to navigate between pages."
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 8 }}
                                />
                            )}

                            {/* Page Controls Centered Toolbar */}
                            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
                                <Button
                                    icon={<LeftOutlined />}
                                    onClick={() => {
                                        const prevP = Math.max(1, currentPage - 1);
                                        setCurrentPage(prevP);
                                        if (previewType === "images" && previewPages.length > 0) {
                                            setPreviewUrl(previewPages[prevP - 1]);
                                        }
                                    }}
                                    disabled={currentPage === 1}
                                >
                                    Previous Page
                                </Button>
                                <Text strong>
                                    Page {currentPage} of {totalPages}
                                </Text>
                                <Button
                                    icon={<RightOutlined />}
                                    onClick={() => {
                                        const nextP = Math.min(totalPages, currentPage + 1);
                                        setCurrentPage(nextP);
                                        if (previewType === "images" && previewPages.length > 0) {
                                            setPreviewUrl(previewPages[nextP - 1]);
                                        }
                                    }}
                                    disabled={currentPage === totalPages}
                                >
                                    Next Page
                                </Button>
                                <div style={{ width: 1, height: 24, background: "#e8e8e8", margin: "0 8px" }} />
                                <Button
                                    size="small"
                                    icon={<SignatureOutlined />}
                                    onClick={() => onOpenLibrary("signature")}
                                >
                                    Signature Library
                                </Button>
                                <Button
                                    size="small"
                                    icon={<AppstoreOutlined />}
                                    onClick={() => onOpenLibrary("stamp")}
                                >
                                    Stamp Library
                                </Button>
                            </div>

                            {/* Document Canvas Rendering */}
                            {previewType === "images" ? (
                                <div
                                    ref={previewContainerRef}
                                    onClick={handleCanvasClick}
                                    style={{
                                        position: "relative",
                                        display: "inline-block",
                                        cursor: placingMode ? "crosshair" : currentDocument?.signing_workflow ? "crosshair" : "default",
                                    }}
                                >
                                    <Image
                                        src={previewUrl}
                                        alt={`Page ${currentPage}`}
                                        preview={false}
                                        style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
                                        onError={() => {
                                            message.error("Failed to load page image. Falling back to original document.");
                                            if (currentDocument?.attachments?.[0]?.file_url) {
                                                setPreviewType("url");
                                                setPreviewUrl(eSignService.getFileProxyUrl(currentDocument._id));
                                            }
                                        }}
                                    />
                                    {renderSignaturesAndMarkers()}
                                </div>
                            ) : previewIsPdf ? (
                                <div
                                    ref={previewContainerRef}
                                    onClick={handleCanvasClick}
                                    style={{
                                        position: "relative",
                                        display: "inline-block",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                                        cursor: placingMode ? "crosshair" : currentDocument?.signing_workflow ? "crosshair" : "default",
                                    }}
                                >
                                    <PdfCanvasViewer
                                        url={previewUrl}
                                        pageNumber={currentPage}
                                        onPdfLoaded={(numPages) => setTotalPages(numPages)}
                                    />
                                    {renderSignaturesAndMarkers()}
                                </div>
                            ) : (
                                <div
                                    ref={previewContainerRef}
                                    onClick={handleCanvasClick}
                                    style={{
                                        position: "relative",
                                        display: "inline-block",
                                        cursor: placingMode ? "crosshair" : currentDocument?.signing_workflow ? "crosshair" : "default",
                                    }}
                                >
                                    <Image
                                        src={previewUrl}
                                        alt="Document preview"
                                        preview={false}
                                        style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
                                        onError={() => message.error("Failed to load image")}
                                    />
                                    {renderSignaturesAndMarkers()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                            No document preview available
                        </div>
                    )}
                </div>

                {/* Right: Signing options sidebar */}
                <div style={{ width: 284, borderLeft: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, background: "#fff" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Signing options</div>
                    </div>

                    <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
                        {currentDocument?.signing_workflow ? (
                            <>
                                {currentDocument.status === "signed" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                                        <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16, flexShrink: 0 }} />
                                        <div style={{ lineHeight: 1.4 }}>
                                            <div style={{ color: "#274917", fontSize: 12, fontWeight: 600 }}>Document Signed</div>
                                            <div style={{ color: "#52c41a", fontSize: 11 }}>Click the document to add more</div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 14, lineHeight: 1.5 }}>
                                    Click a field to place it, or draw directly on the document.
                                </div>

                                {/* ── Required fields ── */}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                                    Required fields
                                </div>
                                {(() => {
                                    const sig = currentDocument?.signatures?.filter((s) => (!s.signature_type || s.signature_type === "signature") && s.signature_image_url).slice(-1)[0];
                                    return sig ? (
                                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                            <div style={{ display: "flex", alignItems: "stretch", minHeight: 58 }}>
                                                <div title="Drag handle" style={{ padding: "0 10px", color: "#ccc", display: "flex", alignItems: "center", borderRight: "1px solid #f0f0f0", fontSize: 16, cursor: "grab" }}>
                                                    &#x283F;
                                                </div>
                                                <div
                                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", cursor: "pointer", background: "#fafeff" }}
                                                    title="Click to place on document"
                                                    onClick={() => addSidebarMarker("signature", sig.signature_image_url ?? "", "signature")}
                                                >
                                                    <img src={sig.signature_image_url} style={{ height: 40, maxWidth: "100%", objectFit: "contain" }} alt="Signature" />
                                                </div>
                                                <button
                                                    title="Sign again"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewSignMode("signature");
                                                        onOpenCapture("signature");
                                                    }}
                                                    style={{ border: "none", borderLeft: "1px solid #f0f0f0", background: "#f9f9f9", cursor: "pointer", padding: "0 12px", color: "#888", fontSize: 15 }}
                                                >
                                                    <EditOutlined />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                border: "2px dashed #1677ff55",
                                                borderRadius: 10,
                                                padding: "14px",
                                                cursor: "pointer",
                                                textAlign: "center",
                                                marginBottom: 8,
                                                color: "#1677ff",
                                                fontSize: 13,
                                                fontWeight: 500,
                                                background: "#f0f7ff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 6,
                                            }}
                                            onClick={() => {
                                                setPreviewSignMode("signature");
                                                onOpenCapture("signature");
                                            }}
                                        >
                                            <SignatureOutlined style={{ fontSize: 15 }} /> Draw signature
                                        </div>
                                    );
                                })()}

                                {/* ── Optional fields ── */}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, marginTop: 18, textTransform: "uppercase", letterSpacing: 0.8 }}>
                                    Optional fields
                                </div>
                                {[
                                    { key: "initials" as const, icon: <span style={{ fontSize: 13, fontWeight: 700 }}>AC</span>, label: "Initials" },
                                    { key: "stamp" as const, icon: <BankOutlined style={{ fontSize: 16 }} />, label: "Company Stamp" },
                                ].map((ft) => {
                                    const existing = currentDocument?.signatures?.filter((s) => s.signature_type === ft.key && s.signature_image_url).slice(-1)[0];
                                    return existing ? (
                                        <div key={ft.key} style={{ border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                            <div style={{ display: "flex", alignItems: "stretch", minHeight: 50 }}>
                                                <div style={{ padding: "0 10px", color: "#ccc", display: "flex", alignItems: "center", borderRight: "1px solid #f0f0f0", fontSize: 16, cursor: "grab" }}>
                                                    &#x283F;
                                                </div>
                                                <div
                                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", cursor: "pointer", background: "#fafeff" }}
                                                    onClick={() => addSidebarMarker(ft.key, existing.signature_image_url ?? "", ft.key)}
                                                >
                                                    <img src={existing.signature_image_url} style={{ height: 34, maxWidth: "100%", objectFit: "contain" }} alt={ft.label} />
                                                </div>
                                                <button
                                                    title="Re-draw"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewSignMode(ft.key);
                                                        onOpenCapture(ft.key);
                                                    }}
                                                    style={{ border: "none", borderLeft: "1px solid #f0f0f0", background: "#f9f9f9", cursor: "pointer", padding: "0 12px", color: "#888", fontSize: 15 }}
                                                >
                                                    <EditOutlined />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={ft.key}
                                            style={{
                                                border: `1px solid ${previewSignMode === ft.key ? "#1677ff" : "#e5e7eb"}`,
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                cursor: "pointer",
                                                background: previewSignMode === ft.key ? "#e6f4ff" : "#fafafa",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                marginBottom: 8,
                                                transition: "all .15s",
                                            }}
                                            onClick={() => setPreviewSignMode(ft.key)}
                                        >
                                            <span style={{ display: "flex", alignItems: "center", width: 22, justifyContent: "center" }}>
                                                {ft.icon}
                                            </span>
                                            <span style={{ fontWeight: 500, flex: 1, fontSize: 14 }}>{ft.label}</span>
                                            {previewSignMode === ft.key && (
                                                <span style={{ fontSize: 10, color: "#1677ff", background: "#bae0ff", padding: "2px 6px", borderRadius: 10 }}>
                                                    Active
                                                </span>
                                            )}
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
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#389e0d" }}>
                                        {pendingMarkers.length} field{pendingMarkers.length > 1 ? "s" : ""} ready to sign
                                    </span>
                                    <span style={{ fontSize: 11, color: "#ff4d4f", cursor: "pointer" }} onClick={() => setPendingMarkers([])}>
                                        Clear all
                                    </span>
                                </div>
                                {pendingMarkers.map((m) => (
                                    <div key={m.id} style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 4, padding: "1px 0" }}>
                                        <span>{m.type === "initials" ? "Aa" : m.type === "stamp" ? <BankOutlined style={{ fontSize: 11 }} /> : <SignatureOutlined style={{ fontSize: 11 }} />}</span>
                                        <span style={{ flex: 1, textTransform: "capitalize", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                            {m.type}
                                            {m.preloadedData && <CheckOutlined style={{ fontSize: 10, color: "#52c41a" }} />}
                                        </span>
                                        <span style={{ color: "#aaa", fontSize: 10 }}>pg {m.page}</span>
                                        <span onClick={() => setPendingMarkers((prev) => prev.filter((pm) => pm.id !== m.id))} style={{ cursor: "pointer", color: "#ff4d4f", fontSize: 13, marginLeft: 4 }}>×</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sign button */}
                        {currentDocument?.signing_workflow && (
                            <Button
                                type="primary"
                                size="large"
                                icon={<EditOutlined />}
                                block
                                onClick={() => {
                                    if (pendingMarkers.length === 0) {
                                        onOpenCapture(previewSignMode);
                                    } else {
                                        onSignAll(pendingMarkers);
                                    }
                                }}
                                loading={isSigning}
                                style={{ borderRadius: 8, fontWeight: 600 }}
                            >
                                {pendingMarkers.length === 0
                                    ? "Place a field to sign"
                                    : pendingMarkers.length > 1
                                    ? `Sign ${pendingMarkers.length} Fields →`
                                    : "Sign →"}
                            </Button>
                        )}

                        {/* Download + Share — shown whenever doc is signed */}
                        {currentDocument?.status === "signed" && (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    block
                                    size="large"
                                    onClick={() => currentDocument && onDownload(currentDocument._id)}
                                    style={{ borderRadius: 8, fontWeight: 600, flex: 1 }}
                                >
                                    Download
                                </Button>
                                <Button
                                    icon={<MailOutlined />}
                                    size="large"
                                    onClick={() => currentDocument && onShare(currentDocument._id)}
                                    style={{ borderRadius: 8, fontWeight: 600 }}
                                    title="Share via email"
                                />
                            </div>
                        )}

                        {/* Hint when no markers placed yet */}
                        {pendingMarkers.length === 0 && currentDocument?.signing_workflow && (
                            <p style={{ margin: 0, fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.5 }}>
                                Click a field card above or click on the document to place a signature
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </ModalForm>
    );
};

export default DocumentPreviewModal;
