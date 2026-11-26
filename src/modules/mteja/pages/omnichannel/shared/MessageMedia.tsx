/**
 * Received WhatsApp media that has no stored file yet (only Meta's media_id):
 * loads it through /omnichannel/messages/:id/media with the user's auth, then
 * plays/shows it. The API keeps a copy, so the next load uses media_url.
 */
import React, { useEffect, useState } from "react";
import { Space, Spin, Typography } from "antd";
import { AudioOutlined, PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { fetchMessageMediaBlob } from "@services/whatsappService";

const { Text } = Typography;

type Kind = "audio" | "image" | "video" | "sticker";

const placeholderIcon = (kind: Kind) =>
    kind === "audio" ? <AudioOutlined /> : kind === "video" ? <VideoCameraOutlined /> : <PictureOutlined />;

const label = (kind: Kind) =>
    kind === "audio" ? "Voice message" : kind === "video" ? "Video" : kind === "sticker" ? "Sticker" : "Photo";

export const MessageMedia: React.FC<{ messageId: string; kind: Kind; mime?: string }> = ({ messageId, kind, mime }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let url: string | null = null;
        let cancelled = false;
        fetchMessageMediaBlob(messageId)
            .then((blob) => {
                if (cancelled) return;
                url = URL.createObjectURL(blob);
                setSrc(url);
            })
            .catch((err: any) => {
                if (!cancelled) setError(err?.message || "Couldn't load this file");
            });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [messageId]);

    if (error) {
        return (
            <Space>
                {placeholderIcon(kind)}
                <Text style={{ color: "#667781" }}>
                    {label(kind)} — {error}
                </Text>
            </Space>
        );
    }
    if (!src) {
        return (
            <Space>
                <Spin size="small" />
                <Text style={{ color: "#667781" }}>Loading {label(kind).toLowerCase()}…</Text>
            </Space>
        );
    }
    if (kind === "audio") {
        return (
            <audio controls style={{ maxWidth: 240, height: 36 }}>
                <source src={src} type={mime} />
            </audio>
        );
    }
    if (kind === "video") {
        return <video src={src} controls style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block" }} />;
    }
    return <img src={src} alt={label(kind)} style={{ maxWidth: kind === "sticker" ? 120 : 220, maxHeight: 220, borderRadius: 8, display: "block" }} />;
};

export default MessageMedia;
