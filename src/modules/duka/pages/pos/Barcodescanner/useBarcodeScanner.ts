import { useEffect, useRef } from "react";
import type { UseBarcodeScannerOptions } from "./types";

/**
 * useBarcodeScanner
 *
 * Listens for rapid keystroke sequences emitted by hardware USB or Bluetooth
 * barcode scanners in keyboard emulation mode.
 */
export const useBarcodeScanner = ({
    onScan,
    minLength = 3,
    maxKeystrokeGap = 50,
    enabled = true,
}: UseBarcodeScannerOptions) => {
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

export default useBarcodeScanner;
