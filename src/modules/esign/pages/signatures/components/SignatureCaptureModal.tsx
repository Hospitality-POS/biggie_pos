import React, { useState, useRef, useEffect } from "react";
import {
    Modal,
    Button,
    Input,
    Upload,
    Radio,
    Space,
    Typography,
    Checkbox,
    Empty,
} from "antd";
import { ModalForm } from "@ant-design/pro-components";
import {
    SignatureOutlined,
    EditOutlined,
    BankOutlined,
    UploadOutlined,
    FileImageOutlined,
    BookOutlined,
    ReloadOutlined,
    DeleteOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import {
    STORAGE_KEYS,
    saveToStorage,
    getFromStorage,
    deleteFromStorage,
} from "../services/esign.api";
import type { LibraryItem } from "../types/esign.types";

const { Text } = Typography;

const TYPE_FONTS = [
    { label: "Script", value: "'Brush Script MT', 'Segoe Script', cursive" },
    { label: "Elegant", value: "Georgia, 'Palatino Linotype', serif" },
    { label: "Print", value: "'Arial', Helvetica, sans-serif" },
    { label: "Handwritten", value: "'Comic Sans MS', 'Chalkboard SE', cursive" },
];

const SIG_COLORS = ["#1a1a2e", "#1d4ed8", "#dc2626", "#16a34a"];

// ── 1. DRAW SIGNATURE CANVAS ───────────────────────────────────────────────────
interface SignatureCanvasProps {
    onSave: (data: string) => void;
    onCancel: () => void;
    onSaveToLibrary?: (data: string, type: string) => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
    onSave,
    onCancel,
    onSaveToLibrary,
}) => {
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

    useEffect(() => {
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

    const handleApply = () => {
        const c = canvasRef.current;
        if (!c) return;
        const data = c.toDataURL("image/png");

        if (onSaveToLibrary) {
            Modal.confirm({
                title: "Signature Created",
                content: (
                    <div>
                        <p style={{ marginBottom: 16 }}>What would you like to do with this signature?</p>
                        <Radio.Group defaultValue="apply" id="draw-sig-action-group">
                            <Radio value="apply">Apply to document</Radio>
                            <Radio value="save">Save to library only</Radio>
                            <Radio value="both">Save to library and apply</Radio>
                        </Radio.Group>
                    </div>
                ),
                onOk: () => {
                    const radioGroup = document.getElementById("draw-sig-action-group") as HTMLInputElement;
                    const action = radioGroup?.value || "apply";

                    if (action === "save" || action === "both") {
                        onSaveToLibrary(data, "draw");
                    }
                    if (action === "apply" || action === "both") {
                        onSave(data);
                    }
                },
            });
        } else {
            onSave(data);
        }
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
                    style={{
                        border: "1px solid #e8e8e8",
                        borderRadius: 10,
                        cursor: "crosshair",
                        background: "#fafafa",
                        display: "block",
                        width: "100%",
                    }}
                />
                {!hasDrawn && (
                    <div
                        style={{
                            position: "absolute",
                            top: "42%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            color: "#c0c0c0",
                            pointerEvents: "none",
                            fontSize: 14,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Draw your signature here
                    </div>
                )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button size="small" type="text" icon={<ReloadOutlined />} onClick={clearCanvas} style={{ color: "#888" }}>
                    Clear
                </Button>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" onClick={handleApply} disabled={!hasDrawn}>
                        Use Signature
                    </Button>
                </Space>
            </div>
        </div>
    );
};

// ── 2. TYPE SIGNATURE ──────────────────────────────────────────────────────────
interface TypeSignatureProps {
    onSave: (data: string, type: string, typedText?: string) => void;
    onCancel: () => void;
    signerName?: string;
    mode?: "signature" | "initials";
    onSaveToLibrary?: (data: string, type: string) => void;
}

export const TypeSignature: React.FC<TypeSignatureProps> = ({
    onSave,
    onCancel,
    signerName = "",
    mode = "signature",
    onSaveToLibrary,
}) => {
    const getInitials = (n: string) =>
        n
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0].toUpperCase())
            .join("")
            .slice(0, 3);

    const [text, setText] = useState(mode === "initials" ? getInitials(signerName) : signerName);
    const [selectedFont, setSelectedFont] = useState(TYPE_FONTS[0].value);
    const [selectedColor, setSelectedColor] = useState(SIG_COLORS[0]);

    const displayText =
        mode === "initials" ? (text ? getInitials(text) : getInitials(signerName)) : text;

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
        const data = canvas.toDataURL("image/png");

        if (onSaveToLibrary) {
            Modal.confirm({
                title: "Signature Created",
                content: (
                    <div>
                        <p style={{ marginBottom: 16 }}>What would you like to do with this signature?</p>
                        <Radio.Group defaultValue="apply" id="type-sig-action-group">
                            <Radio value="apply">Apply to document</Radio>
                            <Radio value="save">Save to library only</Radio>
                            <Radio value="both">Save to library and apply</Radio>
                        </Radio.Group>
                    </div>
                ),
                onOk: () => {
                    const radioGroup = document.getElementById("type-sig-action-group") as HTMLInputElement;
                    const action = radioGroup?.value || "apply";

                    if (action === "save" || action === "both") {
                        onSaveToLibrary(data, mode === "initials" ? "initials" : "type");
                    }
                    if (action === "apply" || action === "both") {
                        onSave(data, mode === "initials" ? "initials" : "type");
                    }
                },
            });
        } else {
            onSave(data, mode === "initials" ? "initials" : "type", mode === "initials" ? undefined : displayText);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: 500 }}>
                    {mode === "initials" ? "Initials" : "Full name"}
                </div>
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={mode === "initials" ? "e.g. MK" : "Type your full name"}
                    size="large"
                    autoFocus
                />
            </div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>Style</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {TYPE_FONTS.map((f) => (
                        <div
                            key={f.value}
                            onClick={() => setSelectedFont(f.value)}
                            style={{
                                border: `2px solid ${selectedFont === f.value ? "#1890ff" : "#e8e8e8"}`,
                                borderRadius: 8,
                                padding: "10px 14px",
                                cursor: "pointer",
                                background: selectedFont === f.value ? "#e6f4ff" : "#fafafa",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                transition: "all 0.18s",
                            }}
                        >
                            <span style={{ color: selectedFont === f.value ? "#1890ff" : "#d0d0d0", fontSize: 12 }}>
                                {selectedFont === f.value ? "●" : "○"}
                            </span>
                            <span
                                style={{
                                    fontFamily: f.value,
                                    fontSize: mode === "initials" ? 28 : 22,
                                    color: selectedColor,
                                    flex: 1,
                                }}
                            >
                                {displayText || (mode === "initials" ? "MK" : "Your Name")}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>Color</div>
                <div style={{ display: "flex", gap: 10 }}>
                    {SIG_COLORS.map((c) => (
                        <div
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: c,
                                cursor: "pointer",
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
                    <Button type="primary" onClick={handleSave} disabled={!displayText.trim()}>
                        Apply
                    </Button>
                </Space>
            </div>
        </div>
    );
};

// ── 3. UPLOAD SIGNATURE ────────────────────────────────────────────────────────
interface UploadSignatureProps {
    onSave: (data: string) => void;
    onCancel: () => void;
    onSaveToLibrary?: (data: string, type: string) => void;
}

export const UploadSignature: React.FC<UploadSignatureProps> = ({
    onSave,
    onCancel,
    onSaveToLibrary,
}) => {
    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result as string;
            if (onSaveToLibrary) {
                Modal.confirm({
                    title: "Signature Uploaded",
                    content: (
                        <div>
                            <p style={{ marginBottom: 16 }}>What would you like to do with this signature?</p>
                            <Radio.Group defaultValue="apply" id="upload-sig-action-group">
                                <Radio value="apply">Apply to document</Radio>
                                <Radio value="save">Save to library only</Radio>
                                <Radio value="both">Save to library and apply</Radio>
                            </Radio.Group>
                        </div>
                    ),
                    onOk: () => {
                        const radioGroup = document.getElementById("upload-sig-action-group") as HTMLInputElement;
                        const action = radioGroup?.value || "apply";

                        if (action === "save" || action === "both") {
                            onSaveToLibrary(data, "upload");
                        }
                        if (action === "apply" || action === "both") {
                            onSave(data);
                        }
                    },
                });
            } else {
                onSave(data);
            }
        };
        reader.readAsDataURL(file);
        return false;
    };

    return (
        <div>
            <Upload.Dragger
                beforeUpload={handleUpload}
                maxCount={1}
                accept="image/*"
                showUploadList={false}
                style={{ marginBottom: 16, padding: "24px 0" }}
            >
                <p style={{ fontSize: 36, marginBottom: 8, color: "#1677ff" }}>
                    <FileImageOutlined />
                </p>
                <p style={{ fontWeight: 500 }}>Click or drag a signature image</p>
                <p style={{ color: "#999", fontSize: 12 }}>PNG, JPG supported — transparent background works best</p>
            </Upload.Dragger>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

// ── 4. STAMP UPLOAD ────────────────────────────────────────────────────────────
interface StampUploadProps {
    onSave: (data: string) => void;
    onCancel: () => void;
    onSaveToLibrary?: (data: string, type: string) => void;
}

export const StampUpload: React.FC<StampUploadProps> = ({
    onSave,
    onCancel,
    onSaveToLibrary,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = ev.target?.result as string;
            if (onSaveToLibrary) {
                Modal.confirm({
                    title: "Stamp Uploaded",
                    content: (
                        <div>
                            <p style={{ marginBottom: 16 }}>What would you like to do with this stamp?</p>
                            <Radio.Group defaultValue="apply" id="stamp-action-group">
                                <Radio value="apply">Apply to document</Radio>
                                <Radio value="save">Save to library only</Radio>
                                <Radio value="both">Save to library and apply</Radio>
                            </Radio.Group>
                        </div>
                    ),
                    onOk: () => {
                        const radioGroup = document.getElementById("stamp-action-group") as HTMLInputElement;
                        const action = radioGroup?.value || "apply";

                        if (action === "save" || action === "both") {
                            onSaveToLibrary(data, "stamp");
                        }
                        if (action === "apply" || action === "both") {
                            onSave(data);
                        }
                    },
                });
            } else {
                onSave(data);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChange} />
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 44, marginBottom: 8, color: "#1677ff" }}>
                    <BankOutlined />
                </div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>Select a company stamp image</p>
                <p style={{ color: "#999", fontSize: 12 }}>PNG with transparent background recommended</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <Button type="primary" icon={<UploadOutlined />} onClick={() => inputRef.current?.click()}>
                    Choose Image
                </Button>
                <Button onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

// ── MAIN CAPTURE MODAL ────────────────────────────────────────────────────────
const FIELD_TYPES = [
    { key: "signature", label: "Signature", icon: <SignatureOutlined /> },
    { key: "initials", label: "Initials", icon: <EditOutlined /> },
    { key: "stamp", label: "Company Stamp", icon: <BankOutlined /> },
] as const;

export interface SignatureCaptureModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    onSave: (data: string, type: string, duplicateToAllPages?: boolean, typedText?: string) => void;
    signerName?: string;
    defaultTab?: string;
    libraryOnly?: boolean;
    showSaveToLibraryOption?: boolean;
}

export const SignatureCaptureModal: React.FC<SignatureCaptureModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onClose,
    onSave,
    signerName = "",
    defaultTab = "signature",
    libraryOnly = false,
    showSaveToLibraryOption = false,
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

    const [fieldType, setFieldType] = useState(defaultTab);
    const [subTab, setSubTab] = useState<"type" | "draw" | "upload">("type");
    const [showLibrary, setShowLibrary] = useState(false);
    const [saveToLibrary, setSaveToLibrary] = useState(false);
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

    useEffect(() => {
        if (modalOpen) {
            setFieldType(defaultTab);
            setSubTab("type");
            setShowLibrary(false);
            setSaveToLibrary(false);
            const key = defaultTab === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;
            setLibraryItems(getFromStorage(key));
        }
    }, [modalOpen, defaultTab]);

    const handleApplyData = (data: string, type: string, typedText?: string) => {
        if (libraryOnly) {
            handleSaveToLibrary(data, type);
        } else {
            if (showSaveToLibraryOption && saveToLibrary) {
                const storageKey = fieldType === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;
                const defaultName = `${fieldType === "stamp" ? "Stamp" : "Signature"} - ${new Date().toLocaleDateString()}`;
                saveToStorage(storageKey, {
                    id: Date.now().toString(),
                    data,
                    type,
                    name: defaultName,
                    createdAt: new Date().toISOString(),
                });
            }
            onSave(data, type, false, typedText);
            handleOpenChange(false);
        }
    };

    const handleSaveToLibrary = (data: string, type: string) => {
        const storageKey = fieldType === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;
        const defaultName = `${fieldType === "stamp" ? "Stamp" : "Signature"} - ${new Date().toLocaleDateString()}`;

        Modal.confirm({
            title: "Save to Library",
            content: (
                <div>
                    <p style={{ marginBottom: 8 }}>Enter a label for this {fieldType === "stamp" ? "stamp" : "signature"}:</p>
                    <Input id="library-label-input" defaultValue={defaultName} placeholder="Enter label" autoFocus />
                </div>
            ),
            onOk: () => {
                const labelInput = document.getElementById("library-label-input") as HTMLInputElement;
                const customName = labelInput?.value?.trim() || defaultName;

                saveToStorage(storageKey, {
                    id: Date.now().toString(),
                    data,
                    type,
                    name: customName,
                    createdAt: new Date().toISOString(),
                });
                handleOpenChange(false);
            },
        });
    };

    const handleDeleteLibraryItem = (id: string) => {
        const storageKey = fieldType === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;
        deleteFromStorage(storageKey, id);
        setLibraryItems(getFromStorage(storageKey));
    };

    return (
        <ModalForm
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SignatureOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    <span style={{ fontWeight: 600 }}>Create Signature</span>
                </div>
            }
            submitter={false}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                footer: null,
                onCancel: () => handleOpenChange(false),
            }}
            width={520}
        >
            {/* Field Type Selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {FIELD_TYPES.map((ft) => (
                    <Button
                        key={ft.key}
                        type={fieldType === ft.key ? "primary" : "default"}
                        icon={ft.icon}
                        onClick={() => {
                            setFieldType(ft.key);
                            setShowLibrary(false);
                            const key = ft.key === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;
                            setLibraryItems(getFromStorage(key));
                        }}
                        style={{ flex: 1, borderRadius: 8 }}
                    >
                        {ft.label}
                    </Button>
                ))}
            </div>

            {/* Sub-tab Navigation (for signature/initials) */}
            {fieldType !== "stamp" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Radio.Group
                        value={showLibrary ? "library" : subTab}
                        onChange={(e) => {
                            if (e.target.value === "library") {
                                setShowLibrary(true);
                            } else {
                                setShowLibrary(false);
                                setSubTab(e.target.value);
                            }
                        }}
                        buttonStyle="solid"
                        size="small"
                    >
                        <Radio.Button value="type">Type</Radio.Button>
                        <Radio.Button value="draw">Draw</Radio.Button>
                        <Radio.Button value="upload">Upload</Radio.Button>
                        <Radio.Button value="library">
                            <BookOutlined style={{ marginRight: 4 }} />
                            Library
                        </Radio.Button>
                    </Radio.Group>
                </div>
            )}

            {/* Content Area */}
            {showLibrary ? (
                <div>
                    {libraryItems.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                            <Empty description={`No saved ${fieldType}s found`} />
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: 300, overflowY: "auto", padding: 4 }}>
                            {libraryItems.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        border: "1px solid #e8e8e8",
                                        borderRadius: 8,
                                        padding: 10,
                                        background: "#fafafa",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: 60,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#fff",
                                            borderRadius: 6,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <img src={item.data} alt={item.name} style={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }} />
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.name}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApplyData(item.data, item.type)} style={{ flex: 1 }}>
                                            Use
                                        </Button>
                                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteLibraryItem(item.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : fieldType === "stamp" ? (
                <StampUpload
                    onSave={(data) => handleApplyData(data, "stamp")}
                    onCancel={onClose}
                    onSaveToLibrary={libraryOnly ? undefined : (d, t) => handleSaveToLibrary(d, t)}
                />
            ) : subTab === "draw" ? (
                <SignatureCanvas
                    onSave={(data) => handleApplyData(data, "draw")}
                    onCancel={onClose}
                    onSaveToLibrary={libraryOnly ? undefined : (d, t) => handleSaveToLibrary(d, t)}
                />
            ) : subTab === "upload" ? (
                <UploadSignature
                    onSave={(data) => handleApplyData(data, "upload")}
                    onCancel={onClose}
                    onSaveToLibrary={libraryOnly ? undefined : (d, t) => handleSaveToLibrary(d, t)}
                />
            ) : (
                <TypeSignature
                    mode={fieldType === "initials" ? "initials" : "signature"}
                    signerName={signerName}
                    onSave={(data, type, textVal) => handleApplyData(data, type, textVal)}
                    onCancel={onClose}
                    onSaveToLibrary={libraryOnly ? undefined : (d, t) => handleSaveToLibrary(d, t)}
                />
            )}

            {/* Save to library option */}
            {showSaveToLibraryOption && !libraryOnly && !showLibrary && (
                <div style={{ marginTop: 16, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                    <Checkbox checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Save a copy to my personal library for future documents
                        </Text>
                    </Checkbox>
                </div>
            )}
        </ModalForm>
    );
};

export default SignatureCaptureModal;
