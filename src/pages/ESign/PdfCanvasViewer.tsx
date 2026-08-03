import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Spin } from "antd";

// Use CDN for PDF worker to ensure it works in both development and production
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const PDF_SCALE = 96 / 72; // render at 96 DPI so canvas px === screen px

export interface PdfCanvasViewerProps {
    url: string;
    pageNumber: number;
    onPdfLoaded?: (totalPages: number) => void;
}

const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
    url,
    pageNumber,
    onPdfLoaded,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

    const [loading, setLoading] = useState(true);
    const [renderKey, setRenderKey] = useState(0); // incremented after pdf load to trigger render effect
    const [canvasDims, setCanvasDims] = useState({ w: 640, h: 900 });
    const [error, setError] = useState<string | null>(null);

    // Effect 1 — load PDF document whenever url changes
    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setLoading(true);
        setError(null);

        pdfjsLib.getDocument({ url }).promise
            .then((pdf) => {
                if (cancelled) { pdf.destroy(); return; }
                if (pdfDocRef.current) pdfDocRef.current.destroy();
                pdfDocRef.current = pdf;
                onPdfLoaded?.(pdf.numPages);
                setRenderKey((k) => k + 1); // trigger render effect
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error("[PdfCanvasViewer] load error:", err);
                    setError("Failed to load PDF");
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect 2 — render the requested page whenever pdfDoc or pageNumber changes
    useEffect(() => {
        const pdf = pdfDocRef.current;
        if (!pdf) return;
        let cancelled = false;

        (async () => {
            try {
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                    renderTaskRef.current = null;
                }

                const page = await pdf.getPage(pageNumber);
                if (cancelled) return;

                const viewport = page.getViewport({ scale: PDF_SCALE });
                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;

                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                setCanvasDims({ w: canvas.width, h: canvas.height });

                const ctx = canvas.getContext("2d");
                if (!ctx || cancelled) return;

                renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
                await renderTaskRef.current.promise;
                if (!cancelled) setLoading(false);
            } catch (err: any) {
                if (!cancelled && err?.name !== "RenderingCancelledException") {
                    console.error("[PdfCanvasViewer] render error:", err);
                    setError("Failed to render page");
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [renderKey, pageNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ position: "relative", lineHeight: 0, display: "inline-block" }}>
            {loading && !error && (
                <div
                    style={{
                        position: "absolute", inset: 0, zIndex: 5,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "#f8f8f8",
                        minWidth: canvasDims.w, minHeight: canvasDims.h,
                    }}
                >
                    <Spin tip="Rendering page…" size="large" />
                </div>
            )}
            {error && (
                <div
                    style={{
                        width: canvasDims.w, height: canvasDims.h,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#ff4d4f", background: "#fff1f0", fontSize: 14,
                    }}
                >
                    {error}
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
    );
};

export default PdfCanvasViewer;
