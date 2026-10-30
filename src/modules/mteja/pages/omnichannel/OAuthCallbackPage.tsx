import React, { useEffect, useRef, useState } from "react";
import { Spin, Result, Typography } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { completeOAuthConnect } from "@services/whatsappService";

const { Text } = Typography;

const OAuthCallbackPage: React.FC = () => {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const hasRun = useRef(false); // ← prevents double-execution in React StrictMode

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // State format: "<channel>:<random_token>" e.g. "messenger:abc123"
        const channel = state ? state.split(":")[0] : "";

        // postMessage back to the opener popup window
        const notify = (type: "OAUTH_SUCCESS" | "OAUTH_ERROR", extraData?: object) => {
            if (window.opener && !window.opener.closed) {
                // Use "*" as origin fallback since opener may be on same host
                try {
                    window.opener.postMessage(
                        { type, state, ...extraData },
                        window.location.origin
                    );
                } catch {
                    // opener origin mismatch — silently ignore
                }
            }
        };

        // ── Meta returned an error (user denied, etc.) ─────────────────────
        if (error) {
            const msg = errorDescription || "Authorization was denied or cancelled.";
            setErrorMsg(msg);
            setStatus("error");
            notify("OAUTH_ERROR", { message: msg });
            setTimeout(() => window.close(), 2500);
            return;
        }

        // ── Missing required params ────────────────────────────────────────
        if (!code || !state || !channel) {
            const msg = "Invalid OAuth response — missing code, state, or channel.";
            setErrorMsg(msg);
            setStatus("error");
            notify("OAUTH_ERROR", { message: msg });
            setTimeout(() => window.close(), 2500);
            return;
        }

        // ── Valid channels guard ───────────────────────────────────────────
        const validChannels = ["whatsapp", "messenger", "instagram"];
        if (!validChannels.includes(channel)) {
            const msg = `Unknown channel type: "${channel}". Expected whatsapp, messenger, or instagram.`;
            setErrorMsg(msg);
            setStatus("error");
            notify("OAUTH_ERROR", { message: msg });
            setTimeout(() => window.close(), 2500);
            return;
        }

        // ── Exchange code → tokens via backend ─────────────────────────────
        completeOAuthConnect({ code, state, channel: channel as "whatsapp" | "messenger" | "instagram" })
            .then(() => {
                setStatus("success");
                notify("OAUTH_SUCCESS");
                setTimeout(() => window.close(), 1500);
            })
            .catch((err) => {
                // Backend returns { message: "..." } on error
                const msg =
                    err?.message ||
                    err?.response?.data?.message ||
                    "Failed to complete connection. Please try again.";
                setErrorMsg(msg);
                setStatus("error");
                notify("OAUTH_ERROR", { message: msg });
                setTimeout(() => window.close(), 3000);
            });
    }, []);

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "sans-serif",
                background: "#fafafa",
            }}
        >
            {status === "loading" && (
                <div style={{ textAlign: "center" }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Connecting your account…</Text>
                    </div>
                </div>
            )}

            {status === "success" && (
                <Result
                    icon={<CheckCircleFilled style={{ color: "#52c41a", fontSize: 56 }} />}
                    title="Connected!"
                    subTitle="Your account has been connected. This window will close automatically."
                />
            )}

            {status === "error" && (
                <Result
                    icon={<CloseCircleFilled style={{ color: "#ff4d4f", fontSize: 56 }} />}
                    title="Connection Failed"
                    subTitle={errorMsg || "Something went wrong. Please close this window and try again."}
                />
            )}
        </div>
    );
};

export default OAuthCallbackPage;