import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import { Button, Input, Modal, Spin, Tabs, Typography, message } from "antd";
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    DownloadOutlined,
    FilePdfOutlined,
    LeftOutlined,
    RightOutlined,
    SafetyCertificateOutlined,
    SignatureOutlined,
} from "@ant-design/icons";
import { BASE_URL } from "@utils/config";
import dayjs from "dayjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const { Text, Title } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PublicDocInfo {
    name: string;
    document_type: string;
    status: string;
    expires_at: string;
    already_signed: boolean;
    message?: string;
    fields: PendingField[];
}

interface PendingField {
    _id: string;
    field_id?: string;
    signer_name?: string;
    signature_type?: string;
    position: { x: number; y: number; page: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number };
}

interface Marker {
    id: string;
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    type: "signature" | "stamp";
    data: string; // data URL
    typedText?: string;
    signatureId?: string; // existing pending field being filled
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Render styled signature text onto a canvas → PNG data URL */
const renderTypedSignature = (text: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 700 56px 'Segoe Script', 'Brush Script MT', cursive";
    ctx.fillStyle = "#1a1a8c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
};

/** Draw text along a circular arc */
const drawArcText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
) => {
    const chars = text.split("");
    const step = (endAngle - startAngle) / chars.length;
    chars.forEach((ch, i) => {
        const angle = startAngle + step * (i + 0.5);
        ctx.save();
        ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    });
};

/** Generate a circular "digitally signed" stamp seal → PNG data URL */
const generateStampSeal = (name: string): string => {
    const size = 300;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const cx = size / 2;
    const cy = size / 2;
    const color = "#1d4ed8";

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Outer + inner rings
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 118, 0, Math.PI * 2);
    ctx.stroke();

    // Arc text around the top
    ctx.font = "bold 20px Arial";
    drawArcText(ctx, "DIGITALLY SIGNED", cx, cy, 129, -Math.PI * 0.82, -Math.PI * 0.18);

    // Divider line
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 88, cy - 8);
    ctx.lineTo(cx + 88, cy - 8);
    ctx.stroke();

    // Signer name + date
    ctx.font = "bold 24px Arial";
    ctx.fillText((name || "SIGNER").toUpperCase().slice(0, 18), cx, cy + 22);
    ctx.font = "15px Arial";
    ctx.fillText(dayjs().format("DD MMM YYYY"), cx, cy + 56);

    return canvas.toDataURL("image/png");
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE PAD (draw with mouse or finger)
// ─────────────────────────────────────────────────────────────────────────────

const DrawPad: React.FC<{ onSave: (data: string) => void }> = ({ onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const hasInkRef = useRef(false);
    const [hasInk, setHasInk] = useState(false);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * canvas.width,
            y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
    };

    const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.strokeStyle = "#1a1a8c";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        drawingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const p = getPos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (!hasInkRef.current) {
            hasInkRef.current = true;
            setHasInk(true);
        }
    };

    const stop = () => { drawingRef.current = false; };

    const clear = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        hasInkRef.current = false;
        setHasInk(false);
    };

    const save = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasInkRef.current) {
            message.warning("Please draw your signature first");
            return;
        }
        onSave(canvas.toDataURL("image/png"));
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={640}
                height={240}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={stop}
                onPointerLeave={stop}
                style={{
                    width: "100%",
                    height: 200,
                    border: "2px dashed #c7d2fe",
                    borderRadius: 10,
                    background: "#fafbff",
                    touchAction: "none",
                    cursor: "crosshair",
                }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <Button onClick={clear}>Clear</Button>
                <Button type="primary" disabled={!hasInk} onClick={save}>
                    Use Signature
                </Button>
            </div>
        </div>
    );
};

const TypePad: React.FC<{ onSave: (data: string, text: string) => void }> = ({ onSave }) => {
    const [text, setText] = useState("");
    return (
        <div>
            <Input
                size="large"
                placeholder="Type your full name"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={40}
            />
            <div
                style={{
                    marginTop: 12,
                    height: 120,
                    border: "2px dashed #c7d2fe",
                    borderRadius: 10,
                    background: "#fafbff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                {text ? (
                    <img src={renderTypedSignature(text)} alt="signature preview" style={{ maxHeight: 100, maxWidth: "90%" }} />
                ) : (
                    <Text type="secondary">Preview</Text>
                )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <Button type="primary" disabled={!text.trim()} onClick={() => onSave(renderTypedSignature(text.trim()), text.trim())}>
                    Use Signature
                </Button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF PAGE RENDERER (renders scaled to fit the container width)
// ─────────────────────────────────────────────────────────────────────────────

const PdfPage: React.FC<{
    url: string;
    pageNumber: number;
    width: number;
    onLoaded?: (numPages: number) => void;
    onDims: (page: number, dims: { w: number; h: number; naturalW: number; naturalH: number }) => void;
}> = ({ url, pageNumber, width, onLoaded, onDims }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        pdfjsLib
            .getDocument({ url })
            .promise.then((pdf) => {
                if (cancelled) { pdf.destroy(); return; }
                pdfRef.current = pdf;
                onLoaded?.(pdf.numPages);
            })
            .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
        return () => { cancelled = true; };
    }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const pdf = pdfRef.current;
        if (!pdf || width <= 0) return;
        let cancelled = false;
        (async () => {
            try {
                const p = await pdf.getPage(pageNumber);
                if (cancelled) return;
                const base = p.getViewport({ scale: 1 });
                const scale = width / base.width;
                const viewport = p.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext("2d")!;
                await p.render({ canvasContext: ctx, viewport }).promise;
                if (!cancelled) {
                    // natural dims at 96 DPI (the coordinate space used by the admin signer UI)
                    onDims(pageNumber, {
                        w: canvas.width,
                        h: canvas.height,
                        naturalW: base.width * (96 / 72),
                        naturalH: base.height * (96 / 72),
                    });
                    setLoading(false);
                }
            } catch (e: any) {
                if (!cancelled && e?.name !== "RenderingCancelledException") {
                    setError(true);
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [pageNumber, width]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) {
        return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>Failed to render this page.</div>;
    }
    return (
        <div style={{ position: "relative", lineHeight: 0 }}>
            {loading && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", minHeight: 300 }}>
                    <Spin size="large" />
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const PublicSignPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const companyCode = searchParams.get("c") || searchParams.get("companycode") || "";

    const [phase, setPhase] = useState<"loading" | "error" | "ready" | "done">("loading");
    const [errorMsg, setErrorMsg] = useState("This signing link is invalid or has expired.");
    const [docInfo, setDocInfo] = useState<PublicDocInfo | null>(null);
    const [fileUrl, setFileUrl] = useState("");
    const [isPdf, setIsPdf] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageDims, setPageDims] = useState<Record<number, { w: number; h: number; naturalW: number; naturalH: number }>>({});
    const [imgDims, setImgDims] = useState<{ w: number; h: number; naturalW: number; naturalH: number } | null>(null);
    const [containerW, setContainerW] = useState(0);

    const [signerName, setSignerName] = useState("");
    const [signerEmail, setSignerEmail] = useState("");
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [sigModalOpen, setSigModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [filledFieldIds, setFilledFieldIds] = useState<string[]>([]);

    const wrapRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const pendingFieldRef = useRef<PendingField | null>(null);

    const api = (p: string) => `${BASE_URL}/public-sign/${token}${p}${p.includes("?") ? "&" : "?"}companycode=${encodeURIComponent(companyCode)}`;

    // ── Load document info + file ────────────────────────────────────────────
    useEffect(() => {
        if (!token || !companyCode) {
            setErrorMsg("This signing link is missing required parameters.");
            setPhase("error");
            return;
        }
        (async () => {
            try {
                const { data } = await axios.get(api(""));
                setDocInfo(data);
                const fileResp = await axios.get(api("/file"), { responseType: "blob" });
                const mime = fileResp.headers["content-type"] || "application/pdf";
                setIsPdf(mime.includes("pdf"));
                setFileUrl(window.URL.createObjectURL(new Blob([fileResp.data], { type: mime })));
                setPhase("ready");
            } catch (err: any) {
                const status = err?.response?.status;
                setErrorMsg(
                    status === 410
                        ? "This signing link has expired. Please request a new one."
                        : err?.response?.data?.error || "This signing link is invalid or has been revoked."
                );
                setPhase("error");
            }
        })();
    }, [token, companyCode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Track container width for scaling ────────────────────────────────────
    useEffect(() => {
        const measure = () => {
            if (wrapRef.current) setContainerW(wrapRef.current.clientWidth);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [phase]);

    // ── Marker drag (pointer events → works with mouse + touch) ──────────────
    const onMarkerPointerDown = (e: React.PointerEvent, marker: Marker) => {
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        dragRef.current = { id: marker.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
        el.setPointerCapture(e.pointerId);
    };

    const onMarkerPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || !wrapRef.current) return;
        const wrapRect = wrapRef.current.getBoundingClientRect();
        const x = Math.max(0, e.clientX - wrapRect.left - drag.offsetX);
        const y = Math.max(0, e.clientY - wrapRect.top - drag.offsetY);
        setMarkers((prev) => prev.map((m) => (m.id === drag.id ? { ...m, x, y } : m)));
    };

    const onMarkerPointerUp = () => { dragRef.current = null; };

    // ── Add signature ────────────────────────────────────────────────────────
    const openSignatureModal = () => {
        if (!signerName.trim()) {
            message.warning("Please enter your name first");
            return;
        }
        setSigModalOpen(true);
    };

    const placeMarker = (data: string, type: "signature" | "stamp", typedText?: string, signatureId?: string) => {
        const dims = isPdf ? pageDims[page] : imgDims;
        const w = type === "stamp" ? 110 : 200;
        const h = type === "stamp" ? 110 : 50;
        setMarkers((prev) => [
            ...prev,
            {
                id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                page,
                x: Math.max(8, ((dims?.w ?? containerW) - w) / 2),
                y: Math.max(8, ((dims?.h ?? 400) - h) / 2 - 60),
                w,
                h,
                type,
                data,
                typedText,
                signatureId,
            },
        ]);
        if (signatureId) setFilledFieldIds((prev) => [...prev, signatureId]);
        setSigModalOpen(false);
        message.success(type === "stamp" ? "Stamp placed — drag to position" : "Signature placed — drag to position");
    };

    const handleSignPendingField = (field: PendingField) => {
        if (!signerName.trim()) {
            message.warning("Please enter your name first");
            return;
        }
        setSigModalOpen(true);
        // stash the field so the modal's onSave can bind it
        pendingFieldRef.current = field;
    };

    const handleModalSave = (data: string, typedText?: string) => {
        const field = pendingFieldRef.current;
        if (field) {
            // place the signature exactly on the pending field's position (scaled to current render)
            const dims = isPdf ? pageDims[field.position.page] : imgDims;
            const baseW = field.position.containerWidth || dims?.naturalW || dims?.w || 1;
            const scale = (dims?.w ?? containerW) / baseW;
            const w = field.position.width ? field.position.width * scale : 200;
            const h = field.position.height ? field.position.height * scale : 50;
            setMarkers((prev) => [
                ...prev,
                {
                    id: `m-${Date.now()}`,
                    page: field.position.page,
                    x: field.position.x * scale,
                    y: field.position.y * scale,
                    w,
                    h,
                    type: "signature",
                    data,
                    typedText,
                    signatureId: field._id,
                },
            ]);
            setFilledFieldIds((prev) => [...prev, field._id]);
            setPage(field.position.page);
            pendingFieldRef.current = null;
            setSigModalOpen(false);
            message.success("Signature placed");
        } else {
            placeMarker(data, "signature", typedText);
        }
    };

    const handleAddStamp = () => {
        if (!signerName.trim()) {
            message.warning("Please enter your name first");
            return;
        }
        placeMarker(generateStampSeal(signerName.trim()), "stamp");
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!signerName.trim()) {
            message.warning("Please enter your name");
            return;
        }
        if (markers.length === 0) {
            message.warning("Please add at least one signature or stamp");
            return;
        }
        setSubmitting(true);
        try {
            const signatures = markers.map((m) => {
                const dims = isPdf ? pageDims[m.page] : imgDims;
                const containerWidth = isPdf ? dims?.w : imgDims?.naturalW;
                const containerHeight = isPdf ? dims?.h : imgDims?.naturalH;
                // For image documents the backend draws in raw image pixels → convert display→natural
                const scaleToNatural = !isPdf && imgDims ? imgDims.naturalW / imgDims.w : 1;
                return {
                    signature_data: m.data,
                    signature_type: m.type === "stamp" ? "stamp" : m.typedText ? "type" : "draw",
                    typed_signature_text: m.typedText,
                    signature_id: m.signatureId,
                    position: {
                        x: m.x * scaleToNatural,
                        y: m.y * scaleToNatural,
                        page: m.page,
                        width: m.w * scaleToNatural,
                        height: m.h * scaleToNatural,
                        containerWidth,
                        containerHeight,
                    },
                };
            });
            await axios.post(api("/submit"), {
                signer_name: signerName.trim(),
                signer_email: signerEmail.trim() || undefined,
                signatures,
            });
            setPhase("done");
        } catch (err: any) {
            message.error(err?.response?.data?.error || "Failed to submit signature. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const resp = await axios.get(api("/download"), { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: resp.headers["content-type"] || "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `signed-${docInfo?.name || "document"}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            message.error("Download failed");
        } finally {
            setDownloading(false);
        }
    };

    // ── Scale a stored field position into current display coords ────────────
    const fieldDisplayPos = (f: PendingField) => {
        const dims = isPdf ? pageDims[f.position.page] : imgDims;
        const baseW = f.position.containerWidth || dims?.naturalW || dims?.w || 1;
        const scale = (dims?.w ?? containerW) / baseW;
        return {
            x: f.position.x * scale,
            y: f.position.y * scale,
            w: (f.position.width || 200) * scale,
            h: (f.position.height || 50) * scale,
        };
    };

    const pendingFields = (docInfo?.fields || []).filter((f) => !filledFieldIds.includes(f._id));

    // ── Renders ──────────────────────────────────────────────────────────────

    if (phase === "loading") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f1f5f9" }}>
                <Spin size="large" />
                <Text type="secondary">Loading document…</Text>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: 20 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: "40px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
                    <ClockCircleOutlined style={{ fontSize: 48, color: "#f59e0b" }} />
                    <Title level={4} style={{ marginTop: 16 }}>Unable to sign</Title>
                    <Text type="secondary">{errorMsg}</Text>
                </div>
            </div>
        );
    }

    if (phase === "done") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: 20 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: "40px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
                    <CheckCircleOutlined style={{ fontSize: 56, color: "#10b981" }} />
                    <Title level={4} style={{ marginTop: 16 }}>Document signed</Title>
                    <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
                        Thank you{signerName ? `, ${signerName}` : ""}. Your signature has been recorded on "{docInfo?.name}".
                    </Text>
                    <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleDownload} loading={downloading} block style={{ borderRadius: 10 }}>
                        Download signed copy
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: 190 }}>
            {/* Header */}
            <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 18px", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
                    <FilePdfOutlined style={{ fontSize: 22, color: "#f5222d" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{docInfo?.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            Sign before {docInfo?.expires_at ? dayjs(docInfo.expires_at).format("DD MMM YYYY, HH:mm") : "link expiry"}
                        </div>
                    </div>
                    {docInfo?.already_signed && (
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, background: "#ecfdf5", padding: "3px 10px", borderRadius: 20 }}>Signed</span>
                    )}
                </div>
            </div>

            {docInfo?.message && (
                <div style={{ maxWidth: 860, margin: "12px auto 0", padding: "0 14px" }}>
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1e40af" }}>
                        {docInfo.message}
                    </div>
                </div>
            )}

            {/* Document */}
            <div style={{ maxWidth: 860, margin: "14px auto", padding: "0 10px" }}>
                {/* Page nav */}
                {isPdf && totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <Button size="small" icon={<LeftOutlined />} disabled={page === 1} onClick={() => setPage(page - 1)} />
                        <Text style={{ fontSize: 13 }}>Page {page} of {totalPages}</Text>
                        <Button size="small" icon={<RightOutlined />} disabled={page === totalPages} onClick={() => setPage(page + 1)} />
                    </div>
                )}

                <div
                    ref={wrapRef}
                    style={{ position: "relative", background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.10)", overflow: "hidden" }}
                >
                    {isPdf ? (
                        <PdfPage
                            url={fileUrl}
                            pageNumber={page}
                            width={containerW}
                            onLoaded={(n) => setTotalPages(n)}
                            onDims={(p, dims) => setPageDims((prev) => ({ ...prev, [p]: dims }))}
                        />
                    ) : (
                        fileUrl && (
                            <img
                                src={fileUrl}
                                alt="Document"
                                style={{ width: "100%", display: "block" }}
                                onLoad={(e) => {
                                    const img = e.currentTarget;
                                    setImgDims({ w: img.clientWidth, h: img.clientHeight, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
                                    setTotalPages(1);
                                }}
                            />
                        )
                    )}

                    {/* pending "sign here" fields */}
                    {pendingFields
                        .filter((f) => (f.position.page || 1) === page && (isPdf ? !!pageDims[f.position.page] : !!imgDims))
                        .map((f) => {
                            const p = fieldDisplayPos(f);
                            return (
                                <div
                                    key={f._id}
                                    onClick={() => handleSignPendingField(f)}
                                    style={{
                                        position: "absolute",
                                        left: p.x,
                                        top: p.y,
                                        minWidth: p.w,
                                        minHeight: Math.max(p.h, 36),
                                        border: "2px dashed #f59e0b",
                                        background: "rgba(245,158,11,0.10)",
                                        borderRadius: 6,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#b45309",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        zIndex: 20,
                                        padding: "4px 8px",
                                    }}
                                >
                                    <SignatureOutlined style={{ marginRight: 6 }} />
                                    Tap to sign{f.signer_name ? ` (${f.signer_name})` : ""}
                                </div>
                            );
                        })}

                    {/* placed markers */}
                    {markers
                        .filter((m) => m.page === page)
                        .map((m) => (
                            <div
                                key={m.id}
                                onPointerDown={(e) => onMarkerPointerDown(e, m)}
                                onPointerMove={onMarkerPointerMove}
                                onPointerUp={onMarkerPointerUp}
                                style={{
                                    position: "absolute",
                                    left: m.x,
                                    top: m.y,
                                    width: m.w,
                                    height: m.h,
                                    cursor: "grab",
                                    zIndex: 30,
                                    touchAction: "none",
                                }}
                            >
                                <img
                                    src={m.data}
                                    alt={m.type}
                                    draggable={false}
                                    style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                                />
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMarkers((prev) => prev.filter((x) => x.id !== m.id));
                                        if (m.signatureId) setFilledFieldIds((prev) => prev.filter((id) => id !== m.signatureId));
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: -10,
                                        right: -10,
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "none",
                                        background: "#ef4444",
                                        color: "#fff",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                    }}
                                >
                                    <CloseOutlined />
                                </button>
                            </div>
                        ))}
                </div>
            </div>

            {/* Sticky bottom action bar */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "#fff",
                    borderTop: "1px solid #e5e7eb",
                    padding: "12px 14px calc(12px + env(safe-area-inset-bottom))",
                    zIndex: 100,
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                }}
            >
                <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Input
                            placeholder="Your full name *"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Input
                            placeholder="Email (optional)"
                            type="email"
                            value={signerEmail}
                            onChange={(e) => setSignerEmail(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Button icon={<SignatureOutlined />} onClick={openSignatureModal} style={{ flex: 1, borderRadius: 8 }}>
                            Sign
                        </Button>
                        <Button icon={<SafetyCertificateOutlined />} onClick={handleAddStamp} style={{ flex: 1, borderRadius: 8 }}>
                            Add stamp
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={markers.length === 0}
                            style={{ flex: 1.4, borderRadius: 8, fontWeight: 600 }}
                        >
                            Finish signing
                        </Button>
                    </div>
                </div>
            </div>

            {/* Signature capture modal */}
            <Modal
                open={sigModalOpen}
                onCancel={() => { setSigModalOpen(false); pendingFieldRef.current = null; }}
                footer={null}
                title="Add your signature"
                width={520}
                style={{ maxWidth: "94vw" }}
                destroyOnClose
            >
                <Tabs
                    defaultActiveKey="draw"
                    items={[
                        { key: "draw", label: "Draw", children: <DrawPad onSave={(d) => handleModalSave(d)} /> },
                        { key: "type", label: "Type", children: <TypePad onSave={(d, t) => handleModalSave(d, t)} /> },
                    ]}
                />
            </Modal>
        </div>
    );
};

export default PublicSignPage;
