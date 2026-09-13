/**
 * BarcodeScanPanel.tsx
 *
 * POS barcode scanning panel with:
 *  - Camera scanner via BarcodeScannerModal (@zxing/library) using Ant Design Modal & Select
 *  - Physical USB/Bluetooth scanner via useBarcodeScanner hook
 *  - Manual barcode entry with Ant Design Space.Compact input & button
 *  - Real-time Ant Design feedback alerts and session badges
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Modal,
    Input,
    Button,
    Select,
    Alert,
    Tag,
    Space,
    Typography,
    Spin,
    Card,
} from "antd";
import type { InputRef } from "antd";
import {
    BarcodeOutlined,
    CameraOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    ScanOutlined,
    ReloadOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { useAppDispatch } from "../../store";
import { addToCartByBarcode } from "../../features/Cart/CartActions";
import { usePrimaryColor } from "@context/PrimaryColorContext";

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA BARCODE SCANNER MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeScannerModalProps {
    open: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
    primaryColor?: string;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    open,
    onClose,
    onScan,
    primaryColor = "#10b981",
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>("");
    const [scanned, setScanned] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    const stopScanner = useCallback(() => {
        if (readerRef.current) {
            readerRef.current.reset();
            readerRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
        setScanning(false);
    }, []);

    useEffect(() => {
        if (!open) return;
        setScanned(null);
        setError(null);
        setLoading(true);

        if (
            location.protocol !== "https:" &&
            location.hostname !== "localhost" &&
            location.hostname !== "127.0.0.1"
        ) {
            setError("Camera access requires HTTPS. Open the app via https:// on your network.");
            setLoading(false);
            return;
        }

        const enumerate = () =>
            navigator.mediaDevices.enumerateDevices().then((devices) => {
                const videoDevices = devices.filter((d) => d.kind === "videoinput");
                setCameras(videoDevices);
                const back = videoDevices.find(
                    (d) =>
                        d.label.toLowerCase().includes("back") ||
                        d.label.toLowerCase().includes("rear") ||
                        d.label.toLowerCase().includes("environment")
                );
                setSelectedCamera(back?.deviceId || videoDevices[0]?.deviceId || "");
                setLoading(false);
            });

        enumerate().catch(() =>
            navigator.mediaDevices
                .getUserMedia({ video: true })
                .then(enumerate)
                .catch(() => {
                    setError("Could not access camera. Please allow camera permissions and try again.");
                    setLoading(false);
                })
        );

        return () => {
            stopScanner();
        };
    }, [open, stopScanner]);

    useEffect(() => {
        if (!open || !selectedCamera || !videoRef.current || loading) return;
        stopScanner();
        setScanned(null);
        setError(null);

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        setScanning(true);

        reader
            .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
                if (result) {
                    setScanned(result.getText());
                    stopScanner();
                }
                if (err && !(err instanceof NotFoundException)) console.warn("Scanner:", err);
            })
            .catch((e) => {
                setError("Failed to start camera: " + e.message);
                setScanning(false);
            });

        return () => {
            stopScanner();
        };
    }, [open, selectedCamera, loading, stopScanner]);

    const handleConfirm = () => {
        if (scanned) {
            onScan(scanned);
            handleClose();
        }
    };

    const handleClose = () => {
        stopScanner();
        setScanned(null);
        setError(null);
        onClose();
    };

    const handleRescan = () => {
        setScanned(null);
        setError(null);
        const cam = selectedCamera;
        setSelectedCamera("");
        setTimeout(() => setSelectedCamera(cam), 50);
    };

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            title={
                <Space align="center">
                    <ScanOutlined style={{ color: primaryColor, fontSize: 18 }} />
                    <span style={{ fontWeight: 600 }}>Camera Barcode Scanner</span>
                </Space>
            }
            centered
            destroyOnClose
            width={440}
        >
            {/* Camera selector */}
            {cameras.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                    <Select
                        value={selectedCamera}
                        onChange={(val) => setSelectedCamera(val)}
                        style={{ width: "100%" }}
                        options={cameras.map((c, i) => ({
                            label: c.label || `Camera ${i + 1}`,
                            value: c.deviceId,
                        }))}
                    />
                </div>
            )}

            {/* Video preview */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4/3",
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: "#0f172a",
                    marginBottom: 16,
                }}
            >
                <video
                    ref={videoRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: scanned ? "none" : "block",
                    }}
                    muted
                    playsInline
                />

                {/* Loading spinner */}
                {loading && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: 8,
                            background: "rgba(15, 23, 42, 0.75)",
                        }}
                    >
                        <Spin tip="Starting camera…" />
                    </div>
                )}

                {/* Scan aim corners + sweep line */}
                {scanning && !scanned && !loading && (
                    <>
                        <div
                            style={{
                                position: "absolute",
                                top: "18%",
                                left: "15%",
                                width: 22,
                                height: 22,
                                borderTop: `3px solid ${primaryColor}`,
                                borderLeft: `3px solid ${primaryColor}`,
                                pointerEvents: "none",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                top: "18%",
                                right: "15%",
                                width: 22,
                                height: 22,
                                borderTop: `3px solid ${primaryColor}`,
                                borderRight: `3px solid ${primaryColor}`,
                                pointerEvents: "none",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                bottom: "18%",
                                left: "15%",
                                width: 22,
                                height: 22,
                                borderBottom: `3px solid ${primaryColor}`,
                                borderLeft: `3px solid ${primaryColor}`,
                                pointerEvents: "none",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                bottom: "18%",
                                right: "15%",
                                width: 22,
                                height: 22,
                                borderBottom: `3px solid ${primaryColor}`,
                                borderRight: `3px solid ${primaryColor}`,
                                pointerEvents: "none",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                left: "15%",
                                right: "15%",
                                top: "18%",
                                height: 2,
                                background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
                                animation: "scanline 2s ease-in-out infinite",
                            }}
                        />
                        <style>{`
                            @keyframes scanline {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(130px); }
                            }
                        `}</style>
                        <div
                            style={{
                                position: "absolute",
                                bottom: 10,
                                left: 0,
                                right: 0,
                                textAlign: "center",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: 12,
                            }}
                        >
                            Align barcode within frame
                        </div>
                    </>
                )}

                {/* Success overlay */}
                {scanned && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: 8,
                            background: "rgba(5, 150, 105, 0.95)",
                            color: "#fff",
                            padding: 16,
                        }}
                    >
                        <CheckCircleOutlined style={{ fontSize: 44, color: "#fff" }} />
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Barcode Detected!</div>
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.2)",
                                borderRadius: 6,
                                padding: "4px 14px",
                                fontFamily: "monospace",
                                fontSize: 15,
                                fontWeight: 600,
                            }}
                        >
                            {scanned}
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {scanned ? (
                    <>
                        <Button icon={<ReloadOutlined />} onClick={handleRescan}>
                            Scan Again
                        </Button>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={handleConfirm}
                            style={{ background: "#059669", borderColor: "#059669" }}
                        >
                            Use This Barcode
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleClose} block>
                        Cancel
                    </Button>
                )}
            </div>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// USB / BLUETOOTH SCANNER HOOK
// ─────────────────────────────────────────────────────────────────────────────

const useBarcodeScanner = ({
    onScan,
    minLength = 3,
    maxKeystrokeGap = 50,
    enabled = true,
}: {
    onScan: (barcode: string) => void;
    minLength?: number;
    maxKeystrokeGap?: number;
    enabled?: boolean;
}) => {
    const bufferRef = useRef<string>("");
    const lastKeyTime = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const tag = target.tagName;
            // Don't intercept typing in inputs/textareas — manual entry handles those
            if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
            if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;

            const now = Date.now();
            const gap = now - lastKeyTime.current;
            lastKeyTime.current = now;

            if (gap > maxKeystrokeGap && bufferRef.current.length > 0) bufferRef.current = "";

            if (e.key === "Enter") {
                const code = bufferRef.current.trim();
                if (code.length >= minLength) onScan(code);
                bufferRef.current = "";
                return;
            }

            if (e.key.length === 1) bufferRef.current += e.key;

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                const code = bufferRef.current.trim();
                if (code.length >= minLength) onScan(code);
                bufferRef.current = "";
            }, maxKeystrokeGap * 3);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [enabled, minLength, maxKeystrokeGap, onScan]);
};

// ─────────────────────────────────────────────────────────────────────────────
// SCAN RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface ScanResult {
    status: "success" | "error" | "not_found";
    barcode: string;
    productName?: string;
    message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeScanPanelProps {
    tableId: string | null;
    onCartUpdate?: () => void;
}

const BarcodeScanPanel: React.FC<BarcodeScanPanelProps> = ({ tableId, onCartUpdate }) => {
    const dispatch = useAppDispatch();
    const primaryColor = usePrimaryColor() || "#10b981";
    const inputRef = useRef<InputRef>(null);

    const [manualInput, setManualInput] = useState("");
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);

    const refocusInput = useCallback(() => {
        if (inputRef.current && !cameraOpen) inputRef.current.focus();
    }, [cameraOpen]);

    // Focus on mount and when tab regains visibility
    useEffect(() => {
        refocusInput();
        const onVisible = () => {
            if (document.visibilityState === "visible") refocusInput();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [refocusInput]);

    const processBarcode = useCallback(
        async (barcode: string) => {
            const clean = barcode.trim();
            if (!clean || !tableId || isProcessing) return;
            setIsProcessing(true);
            try {
                const result = (await dispatch(
                    addToCartByBarcode({ barcode: clean, tableId })
                )) as any;
                if (result?.payload?.success) {
                    setLastResult({
                        status: "success",
                        barcode: clean,
                        productName: result.payload.productName || clean,
                        message: "Added to cart",
                    });
                    setScanCount((c) => c + 1);
                    onCartUpdate?.();
                } else if (result?.payload?.notFound) {
                    setLastResult({ status: "not_found", barcode: clean, message: "Product not found" });
                } else {
                    setLastResult({ status: "error", barcode: clean, message: "Could not add item" });
                }
            } catch {
                setLastResult({ status: "error", barcode: clean, message: "Server error" });
            } finally {
                setIsProcessing(false);
                setManualInput("");
                setTimeout(() => setLastResult(null), 3500);
                refocusInput();
            }
        },
        [dispatch, tableId, isProcessing, onCartUpdate, refocusInput]
    );

    // USB/BT scanner gun hook
    useBarcodeScanner({
        enabled: !cameraOpen,
        onScan: useCallback((code: string) => processBarcode(code), [processBarcode]),
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                height: "100%",
                padding: "24px 16px",
                gap: 20,
                background: "#f8fafc",
                overflowY: "auto",
            }}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                const interactive = target.closest(
                    "button, input, a, select, textarea, [role='button'], .ant-select"
                );
                if (!interactive) refocusInput();
            }}
        >
            {/* Header / Icon */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: `${primaryColor}14`,
                        marginBottom: 12,
                    }}
                >
                    <BarcodeOutlined style={{ fontSize: 40, color: primaryColor }} />
                </div>
                <Typography.Title level={4} style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
                    Scan a Product
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
                    Use scanner gun, camera, or type the barcode below
                </Typography.Text>
            </div>

            {/* Session count badge */}
            {scanCount > 0 && (
                <Tag
                    color="green"
                    style={{
                        fontSize: 13,
                        padding: "4px 12px",
                        borderRadius: 16,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <CheckCircleOutlined />
                    {scanCount} item{scanCount !== 1 ? "s" : ""} added this session
                </Tag>
            )}

            {/* Scan result feedback alert */}
            {lastResult && (
                <Alert
                    style={{ width: "100%", maxWidth: 460, borderRadius: 8 }}
                    type={
                        lastResult.status === "success"
                            ? "success"
                            : lastResult.status === "not_found"
                            ? "warning"
                            : "error"
                    }
                    showIcon
                    icon={
                        lastResult.status === "success" ? (
                            <CheckCircleOutlined />
                        ) : lastResult.status === "not_found" ? (
                            <ExclamationCircleOutlined />
                        ) : (
                            <CloseCircleOutlined />
                        )
                    }
                    message={
                        <span style={{ fontWeight: 600 }}>
                            {lastResult.status === "success"
                                ? lastResult.productName || "Product Added"
                                : lastResult.status === "not_found"
                                ? "Product Not Found"
                                : "Could Not Add Item"}
                        </span>
                    }
                    description={
                        <span>
                            {lastResult.status === "success" ? (
                                <span>
                                    Barcode: <Typography.Text code>{lastResult.barcode}</Typography.Text> · Added to cart
                                </span>
                            ) : lastResult.status === "not_found" ? (
                                <span>
                                    No product found with barcode:{" "}
                                    <Typography.Text code>{lastResult.barcode}</Typography.Text>
                                </span>
                            ) : (
                                lastResult.message
                            )}
                        </span>
                    }
                />
            )}

            {/* Input row: Ant Design Input + Camera Button */}
            <Space.Compact style={{ width: "100%", maxWidth: 460 }}>
                <Input
                    ref={inputRef}
                    size="large"
                    prefix={<BarcodeOutlined style={{ color: primaryColor, fontSize: 18 }} />}
                    placeholder="Scan gun or type barcode + Enter"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onPressEnter={() => {
                        if (manualInput.trim()) processBarcode(manualInput.trim());
                    }}
                    allowClear
                    disabled={isProcessing}
                    autoFocus
                    style={{ borderRadius: "8px 0 0 8px" }}
                />
                <Button
                    size="large"
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={() => setCameraOpen(true)}
                    disabled={isProcessing}
                    title="Scan with camera"
                    style={{
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        borderRadius: "0 8px 8px 0",
                    }}
                />
            </Space.Compact>

            {/* Processing indicator */}
            {isProcessing && (
                <Space size={8} align="center">
                    <Spin size="small" />
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        Looking up barcode & adding to cart…
                    </Typography.Text>
                </Space>
            )}

            {/* 3 ways to scan guidance card */}
            <Card
                size="small"
                style={{
                    maxWidth: 460,
                    width: "100%",
                    borderRadius: 10,
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
            >
                <Typography.Text
                    strong
                    style={{
                        fontSize: 12,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        display: "block",
                        marginBottom: 8,
                    }}
                >
                    3 Ways to Scan
                </Typography.Text>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        🎯 <b>Scanner Gun:</b> Point and trigger — detects barcode and adds to cart automatically
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        📷 <b>Camera:</b> Tap the camera button to scan with your device webcam
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        ⌨️ <b>Manual:</b> Type barcode number in the box and press Enter
                    </Typography.Text>
                </Space>
            </Card>

            {/* Camera scanner modal */}
            <BarcodeScannerModal
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onScan={(code) => {
                    processBarcode(code);
                    setCameraOpen(false);
                }}
                primaryColor={primaryColor}
            />
        </div>
    );
};

export default BarcodeScanPanel;