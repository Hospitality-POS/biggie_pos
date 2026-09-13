import React, { useEffect, useRef, useState, useCallback } from "react";
import { ModalForm } from "@ant-design/pro-components";
import { Button, Select, Alert, Typography, Spin, Space } from "antd";
import {
    ScanOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import type { BarcodeScannerModalProps } from "./types";

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    open,
    visible,
    onClose,
    onOpenChange,
    onScan,
    primaryColor = "#10b981",
    trigger,
}) => {
    const isControlled = typeof open !== "undefined" || typeof visible !== "undefined";
    const isOpen = typeof open !== "undefined" ? open : visible;

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

    const handleClose = useCallback(() => {
        stopScanner();
        setScanned(null);
        setError(null);
        onClose?.();
        onOpenChange?.(false);
    }, [stopScanner, onClose, onOpenChange]);

    const handleConfirm = useCallback(() => {
        if (scanned) {
            onScan(scanned);
            handleClose();
        }
    }, [scanned, onScan, handleClose]);

    const handleRescan = useCallback(() => {
        setScanned(null);
        setError(null);
        const cam = selectedCamera;
        setSelectedCamera("");
        setTimeout(() => setSelectedCamera(cam), 50);
    }, [selectedCamera]);

    useEffect(() => {
        if (isControlled && !isOpen) return;

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
    }, [isControlled, isOpen, stopScanner]);

    useEffect(() => {
        if ((isControlled && !isOpen) || !selectedCamera || !videoRef.current || loading) return;
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
    }, [isControlled, isOpen, selectedCamera, loading, stopScanner]);

    return (
        <ModalForm
            title={
                <Space align="center" size={8}>
                    <ScanOutlined style={{ color: primaryColor, fontSize: 18 }} />
                    <Typography.Text strong style={{ fontSize: 16 }}>
                        Camera Barcode Scanner
                    </Typography.Text>
                </Space>
            }
            open={isOpen}
            onOpenChange={(v) => {
                if (!v) {
                    handleClose();
                } else {
                    onOpenChange?.(true);
                }
            }}
            trigger={trigger}
            width={440}
            modalProps={{
                centered: true,
                destroyOnClose: true,
                maskClosable: false,
                onCancel: handleClose,
                styles: {
                    body: { padding: "16px 24px 20px" },
                },
            }}
            onFinish={async () => {
                if (scanned) {
                    handleConfirm();
                    return true;
                }
                return false;
            }}
            submitter={{
                render: () => {
                    if (scanned) {
                        return [
                            <Button key="rescan" icon={<ReloadOutlined />} onClick={handleRescan}>
                                Scan Again
                            </Button>,
                            <Button
                                key="confirm"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={handleConfirm}
                                style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                            >
                                Use This Barcode
                            </Button>,
                        ];
                    }
                    return [
                        <Button key="cancel" onClick={handleClose} block>
                            Cancel
                        </Button>,
                    ];
                },
            }}
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
        </ModalForm>
    );
};

export default BarcodeScannerModal;
