/**
 * Barcodescanner/index.tsx
 *
 * POS barcode scanning panel with:
 *  - Camera scanner via BarcodeScannerModal (@zxing/library) using Ant Design Pro ModalForm (trigger way)
 *  - Physical USB/Bluetooth scanner via useBarcodeScanner hook
 *  - Manual barcode entry with Ant Design Space.Compact input & trigger button
 *  - Real-time Ant Design feedback alerts and session badges
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Input,
    Button,
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
} from "@ant-design/icons";
import { useAppDispatch } from "../../../store";
import { addToCartByBarcode } from "../../../features/Cart/CartActions";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import BarcodeScannerModal from "./Modal";
import useBarcodeScanner from "./useBarcodeScanner";
import type { BarcodeScanPanelProps, ScanResult } from "./types";

export const BarcodeScanPanel: React.FC<BarcodeScanPanelProps> = ({ tableId, onCartUpdate }) => {
    const dispatch = useAppDispatch();
    const primaryColor = usePrimaryColor() || "#10b981";
    const inputRef = useRef<InputRef>(null);

    const [manualInput, setManualInput] = useState("");
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const refocusInput = useCallback(() => {
        if (inputRef.current && !isCameraActive) inputRef.current.focus();
    }, [isCameraActive]);

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
                const result = await dispatch(
                    addToCartByBarcode({ barcode: clean, tableId })
                );
                const payload = result.payload as
                    | { success?: boolean; productName?: string; notFound?: boolean }
                    | undefined;

                if (payload?.success) {
                    setLastResult({
                        status: "success",
                        barcode: clean,
                        productName: payload.productName || clean,
                        message: "Added to cart",
                    });
                    setScanCount((c) => c + 1);
                    onCartUpdate?.();
                } else if (payload?.notFound) {
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

    // USB/BT scanner gun hook (paused while camera scanner modal is active)
    useBarcodeScanner({
        enabled: !isCameraActive,
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

            {/* Input row: Ant Design Input + Camera Trigger via ModalForm */}
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
                <BarcodeScannerModal
                    trigger={
                        <Button
                            size="large"
                            type="primary"
                            icon={<CameraOutlined />}
                            disabled={isProcessing}
                            title="Scan with camera"
                            style={{
                                backgroundColor: primaryColor,
                                borderColor: primaryColor,
                                borderRadius: "0 8px 8px 0",
                            }}
                        />
                    }
                    onOpenChange={setIsCameraActive}
                    onScan={processBarcode}
                    primaryColor={primaryColor}
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
        </div>
    );
};

export default BarcodeScanPanel;
