import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use CDN for PDF worker to ensure it works across environments
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const PDF_DEFAULT_SCALE = 96 / 72; // render at 96 DPI so canvas px === screen px

export interface UsePdfViewerOptions {
    url: string;
    pageNumber: number;
    scale?: number;
    onPdfLoaded?: (totalPages: number) => void;
}

export interface UsePdfViewerReturn {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    loading: boolean;
    loadProgress: number;
    error: string | null;
    totalPages: number;
    canvasDims: { w: number; h: number };
}

export const usePdfViewer = ({
    url,
    pageNumber,
    scale = PDF_DEFAULT_SCALE,
    onPdfLoaded,
}: UsePdfViewerOptions): UsePdfViewerReturn => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [renderKey, setRenderKey] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [canvasDims, setCanvasDims] = useState({ w: 640, h: 900 });
    const [error, setError] = useState<string | null>(null);

    // Effect 1: Load PDF document whenever URL changes
    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setLoading(true);
        setLoadProgress(10);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({ url });
        loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
            if (total > 0 && !cancelled) {
                setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)));
            }
        };

        loadingTask.promise
            .then((pdf) => {
                if (cancelled) {
                    pdf.destroy();
                    return;
                }
                if (pdfDocRef.current) {
                    pdfDocRef.current.destroy();
                }
                pdfDocRef.current = pdf;
                setTotalPages(pdf.numPages);
                setLoadProgress(100);
                onPdfLoaded?.(pdf.numPages);
                setRenderKey((k) => k + 1);
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error("[usePdfViewer] PDF load error:", err);
                    setError("Failed to load PDF");
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect 2: Render requested page
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

                const viewport = page.getViewport({ scale });
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
                    console.error("[usePdfViewer] render error:", err);
                    setError("Failed to render page");
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [renderKey, pageNumber, scale]);

    return {
        canvasRef,
        loading,
        loadProgress,
        error,
        totalPages,
        canvasDims,
    };
};
