/**
 * BarcodeScanPanel.tsx
 *
 * POS barcode scanning panel with:
 *  - Camera scanner via BarcodeScannerModal (@zxing/library)
 *  - Physical USB/Bluetooth scanner via useBarcodeScanner hook
 *  - Manual barcode entry fallback
 *
 * Install: yarn add @zxing/library
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Box,
    Typography,
    Paper,
    Alert,
    AlertTitle,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Button,
    Modal as MuiModal,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ClearIcon from "@mui/icons-material/Clear";
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
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ open, onClose, onScan }) => {
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
                    setError("Could not access camera. Allow camera permissions and try again.");
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedCamera, loading]);

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
        <MuiModal open={open} onClose={handleClose}>
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 420,
                    bgcolor: "background.paper",
                    borderRadius: 3,
                    boxShadow: 24,
                    p: 3,
                    outline: "none",
                }}
            >
                {/* Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <QrCodeScannerIcon sx={{ color: "#6366f1", fontSize: 22 }} />
                    <Typography variant="h6" fontWeight={600} fontSize={16}>
                        Scan Barcode
                    </Typography>
                </Box>

                {/* Camera selector */}
                {cameras.length > 1 && (
                    <select
                        value={selectedCamera}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        style={{
                            width: "100%",
                            height: 34,
                            borderRadius: 6,
                            border: "1px solid #d1d5db",
                            padding: "0 8px",
                            fontSize: 13,
                            marginBottom: 10,
                        }}
                    >
                        {cameras.map((c, i) => (
                            <option key={c.deviceId} value={c.deviceId}>
                                {c.label || `Camera ${i + 1}`}
                            </option>
                        ))}
                    </select>
                )}

                {/* Video preview */}
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4/3",
                        borderRadius: 2,
                        overflow: "hidden",
                        bgcolor: "#0f172a",
                        mb: 1.5,
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
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    border: "3px solid #6366f1",
                                    borderTopColor: "transparent",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                    "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                                }}
                            />
                            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                Starting camera…
                            </Typography>
                        </Box>
                    )}

                    {/* Scan aim corners + sweep line */}
                    {scanning && !scanned && !loading && (
                        <>
                            {[
                                { top: "20%", left: "15%", borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
                                { top: "20%", right: "15%", borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
                                { bottom: "20%", left: "15%", borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
                                { bottom: "20%", right: "15%", borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
                            ].map((s, i) => (
                                <Box
                                    key={i}
                                    sx={{ position: "absolute", width: 20, height: 20, pointerEvents: "none", ...s }}
                                />
                            ))}
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: "15%",
                                    right: "15%",
                                    top: "20%",
                                    height: 2,
                                    background: "linear-gradient(90deg, transparent, #6366f1, transparent)",
                                    animation: "scanline 2s ease-in-out infinite",
                                    "@keyframes scanline": {
                                        "0%,100%": { transform: "translateY(0)" },
                                        "50%": { transform: "translateY(120px)" },
                                    },
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    position: "absolute",
                                    bottom: 10,
                                    left: 0,
                                    right: 0,
                                    textAlign: "center",
                                    color: "rgba(255,255,255,0.75)",
                                }}
                            >
                                Point camera at barcode
                            </Typography>
                        </>
                    )}

                    {/* Success overlay */}
                    {scanned && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(5,150,105,0.95)",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >
                            <Typography sx={{ fontSize: 44, color: "#fff" }}>✓</Typography>
                            <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                                Barcode detected!
                            </Typography>
                            <Box sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1, px: 2, py: 0.5 }}>
                                <Typography component="code" sx={{ color: "#fff", fontSize: 14 }}>
                                    {scanned}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Error */}
                {error && (
                    <Box
                        sx={{
                            bgcolor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 2,
                            p: 1.5,
                            mb: 1.5,
                            fontSize: 13,
                            color: "#dc2626",
                        }}
                    >
                        {error}
                    </Box>
                )}

                {/* Actions */}
                <Box sx={{ display: "flex", gap: 1 }}>
                    {scanned ? (
                        <>
                            <Button
                                variant="outlined"
                                onClick={handleRescan}
                                sx={{ flex: 1, borderRadius: 2, height: 38 }}
                            >
                                Scan Again
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleConfirm}
                                sx={{
                                    flex: 2,
                                    borderRadius: 2,
                                    height: 38,
                                    bgcolor: "#059669",
                                    fontWeight: 600,
                                    "&:hover": { bgcolor: "#047857" },
                                }}
                            >
                                Use This Barcode
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                            fullWidth
                            sx={{ borderRadius: 2, height: 38 }}
                        >
                            Cancel
                        </Button>
                    )}
                </Box>
            </Box>
        </MuiModal>
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
    const primaryColor = usePrimaryColor();
    const inputRef = useRef<HTMLInputElement>(null);

    const [manualInput, setManualInput] = useState("");
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);

    const refocusInput = useCallback(() => {
        if (inputRef.current && !cameraOpen) inputRef.current.focus();
    }, [cameraOpen]);

    // Only refocus on mount and when the tab regains visibility —
    // never on a polling interval, which steals focus from the cart FAB/drawer
    useEffect(() => {
        refocusInput();
        const onVisible = () => { if (document.visibilityState === "visible") refocusInput(); };
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

    // USB/BT hook — listens on window, fires when scanner gun sends fast keystrokes
    // Disabled when camera modal is open to avoid conflict
    useBarcodeScanner({
        enabled: !cameraOpen,
        onScan: useCallback((code: string) => processBarcode(code), [processBarcode]),
    });

    // Manual input Enter handler
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && manualInput.trim()) {
                processBarcode(manualInput.trim());
            }
        },
        [manualInput, processBarcode]
    );

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                height: "100%",
                p: 3,
                gap: 3,
                bgcolor: "background.default",
            }}
            onClick={(e) => {
                // Only refocus when clicking the panel background itself,
                // never when clicking a button, input, or any interactive child
                const target = e.target as HTMLElement;
                const interactive = target.closest("button, input, a, select, textarea, [role='button']");
                if (!interactive) refocusInput();
            }}
        >
            {/* Icon + heading */}
            <Box sx={{ textAlign: "center", mt: 2 }}>
                <QrCodeScannerIcon sx={{ fontSize: 72, color: primaryColor, opacity: 0.85, mb: 1 }} />
                <Typography variant="h5" fontWeight={600} color="text.primary">
                    Scan a product
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Use scanner gun, camera, or type the barcode below
                </Typography>
            </Box>

            {/* Session count badge */}
            {scanCount > 0 && (
                <Chip
                    label={`${scanCount} item${scanCount !== 1 ? "s" : ""} added this session`}
                    size="small"
                    sx={{ bgcolor: `${primaryColor}18`, color: primaryColor, fontWeight: 600 }}
                />
            )}

            {/* Scan result feedback */}
            {lastResult && (
                <Alert
                    severity={
                        lastResult.status === "success"
                            ? "success"
                            : lastResult.status === "not_found"
                                ? "warning"
                                : "error"
                    }
                    icon={
                        lastResult.status === "success" ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />
                    }
                    sx={{ width: "100%", maxWidth: 420, borderRadius: 2 }}
                >
                    <AlertTitle sx={{ fontWeight: 600, mb: 0 }}>
                        {lastResult.status === "success" ? lastResult.productName : lastResult.message}
                    </AlertTitle>
                    {lastResult.status === "success" && (
                        <Typography variant="caption" color="text.secondary">
                            Barcode: {lastResult.barcode}
                        </Typography>
                    )}
                </Alert>
            )}

            {/* Input row: text field + camera button */}
            <Box sx={{ width: "100%", maxWidth: 420, display: "flex", gap: 1 }}>
                <TextField
                    inputRef={inputRef}
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan gun or type barcode + Enter"
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            fontSize: 13,
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <QrCodeScannerIcon sx={{ color: primaryColor, fontSize: 18 }} />
                            </InputAdornment>
                        ),
                        endAdornment: manualInput ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setManualInput("")}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                    disabled={isProcessing}
                    autoComplete="off"
                />

                <Button
                    variant="outlined"
                    onClick={() => setCameraOpen(true)}
                    disabled={isProcessing}
                    title="Scan with camera"
                    sx={{
                        minWidth: 48,
                        height: 40,
                        borderRadius: 2,
                        borderColor: "#6366f1",
                        color: "#6366f1",
                        bgcolor: "#eef2ff",
                        flexShrink: 0,
                        "&:hover": { bgcolor: "#e0e7ff", borderColor: "#4f46e5" },
                    }}
                >
                    <CameraAltIcon fontSize="small" />
                </Button>
            </Box>

            {isProcessing && (
                <Typography variant="caption" color="text.secondary">
                    Adding to cart…
                </Typography>
            )}

            {/* 3 ways to scan tip card */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    maxWidth: 420,
                    width: "100%",
                    borderRadius: 2,
                    borderColor: `${primaryColor}30`,
                    bgcolor: `${primaryColor}06`,
                }}
            >
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    fontWeight={600}
                    mb={0.75}
                >
                    3 ways to scan
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                    🔫 Scanner gun — aim at any barcode, adds automatically
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                    📷 Camera — tap the blue button, point phone/webcam at barcode
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                    ⌨️ Manual — type the barcode number in the box and press Enter
                </Typography>
            </Paper>

            {/* Camera scanner modal */}
            <BarcodeScannerModal
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onScan={(code) => {
                    processBarcode(code);
                    setCameraOpen(false);
                }}
            />
        </Box>
    );
};

export default BarcodeScanPanel;