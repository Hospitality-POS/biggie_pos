import type React from "react";

export interface ScanResult {
    status: "success" | "error" | "not_found";
    barcode: string;
    productName?: string;
    message: string;
}

export interface BarcodeScanPanelProps {
    tableId: string | null;
    onCartUpdate?: () => void;
}

export interface BarcodeScannerModalProps {
    open?: boolean;
    visible?: boolean;
    onClose?: () => void;
    onOpenChange?: (open: boolean) => void;
    onScan: (barcode: string) => void;
    primaryColor?: string;
    trigger?: React.JSX.Element;
}

export interface UseBarcodeScannerOptions {
    onScan: (barcode: string) => void;
    minLength?: number;
    maxKeystrokeGap?: number;
    enabled?: boolean;
}
