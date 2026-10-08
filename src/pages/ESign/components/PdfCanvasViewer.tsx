import React from "react";
import { Progress } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import { usePdfViewer } from "../hooks/usePdfViewer";

export interface PdfCanvasViewerProps {
    url: string;
    pageNumber: number;
    scale?: number;
    onPdfLoaded?: (totalPages: number) => void;
}

const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
    url,
    pageNumber,
    scale,
    onPdfLoaded,
}) => {
    const { canvasRef, loading, loadProgress, error, canvasDims } = usePdfViewer({
        url,
        pageNumber,
        scale,
        onPdfLoaded,
    });

    return (
        <div style={{ position: "relative", lineHeight: 0, display: "inline-block" }}>
            {loading && !error && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(248, 248, 248, 0.94)",
                        minWidth: canvasDims.w,
                        minHeight: canvasDims.h,
                        padding: 24,
                    }}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            padding: "20px 24px",
                            borderRadius: 10,
                            border: "1px solid #e8e8e8",
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
                            textAlign: "center",
                            minWidth: 260,
                            maxWidth: 320,
                        }}
                    >
                        <FilePdfOutlined style={{ fontSize: 32, color: "#1677ff", marginBottom: 10 }} />
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#262626", marginBottom: 8, lineHeight: 1.4 }}>
                            Rendering Page {pageNumber}
                        </div>
                        <Progress
                            percent={loadProgress || 50}
                            size="small"
                            status="active"
                            strokeColor={{ "0%": "#1677ff", "100%": "#52c41a" }}
                            style={{ marginBottom: 6 }}
                        />
                        <div style={{ fontSize: 11, color: "#8c8c8c", lineHeight: 1 }}>
                            {loadProgress >= 100 ? "Processing canvas..." : `${loadProgress || 50}% loaded`}
                        </div>
                    </div>
                </div>
            )}
            {error && (
                <div
                    style={{
                        width: canvasDims.w,
                        height: canvasDims.h,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ff4d4f",
                        background: "#fff1f0",
                        fontSize: 14,
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
