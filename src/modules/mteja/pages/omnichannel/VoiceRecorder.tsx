/**
 * Record a WhatsApp voice note in the inbox.
 *
 * Idle: a mic button. Recording: red dot + timer, delete, send.
 * WhatsApp needs Ogg/Opus: Firefox records that directly; Chrome records
 * WebM/Opus, which is rewrapped as Ogg (no re-encoding) before sending.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Tooltip } from "antd";
import { AudioOutlined, DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { webmOpusToOgg } from "./shared/oggOpus";

const MAX_MS = 5 * 60 * 1000;
const OGG = "audio/ogg;codecs=opus";
const WEBM = "audio/webm;codecs=opus";

const pickMime = () => {
    if (typeof MediaRecorder === "undefined") return null;
    if (MediaRecorder.isTypeSupported(OGG)) return OGG;
    if (MediaRecorder.isTypeSupported(WEBM)) return WEBM;
    return null;
};

const toBase64DataUrl = (bytes: Uint8Array<ArrayBuffer>, mime: string) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Couldn't read the recording"));
        reader.readAsDataURL(new Blob([bytes], { type: mime }));
    });

const formatTimer = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export interface VoiceNote {
    /** data:audio/ogg;base64,… */
    dataUrl: string;
    durationMs: number;
    filename: string;
}

interface Props {
    onSend: (note: VoiceNote) => Promise<void> | void;
    disabled?: boolean;
    /** Shown while a recording is in progress, so the composer can hide its other controls. */
    onRecordingChange?: (recording: boolean) => void;
}

const VoiceRecorder: React.FC<Props> = ({ onSend, disabled, onRecordingChange }) => {
    const { message } = App.useApp();
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [busy, setBusy] = useState(false);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedRef = useRef(0);
    const sendOnStopRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const setRec = useCallback(
        (on: boolean) => {
            setRecording(on);
            onRecordingChange?.(on);
        },
        [onRecordingChange]
    );

    const release = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
    }, []);

    useEffect(() => () => {
        sendOnStopRef.current = false;
        try {
            recorderRef.current?.stop();
        } catch {
            /* already stopped */
        }
        release();
    }, [release]);

    const finish = useCallback(
        async (mime: string) => {
            const blob = new Blob(chunksRef.current, { type: mime });
            chunksRef.current = [];
            if (!sendOnStopRef.current) return; // discarded
            const recordedMs = Date.now() - startedRef.current;
            if (recordedMs < 700 || blob.size === 0) {
                message.info("Hold on a little longer — that voice note was too short.");
                return;
            }
            setBusy(true);
            try {
                let bytes: Uint8Array<ArrayBuffer> = new Uint8Array(await blob.arrayBuffer());
                let durationMs = recordedMs;
                if (mime.startsWith("audio/webm")) {
                    const converted = webmOpusToOgg(bytes.buffer);
                    bytes = converted.ogg;
                    durationMs = converted.durationMs || recordedMs;
                }
                const dataUrl = await toBase64DataUrl(bytes, "audio/ogg");
                const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                await onSend({ dataUrl, durationMs, filename: `voice-note-${stamp}.ogg` });
            } catch (err: any) {
                message.error(err?.message || "Couldn't prepare the voice note");
            } finally {
                setBusy(false);
            }
        },
        [message, onSend]
    );

    const start = useCallback(async () => {
        const mime = pickMime();
        if (!mime) {
            message.error("This browser can't record voice notes. Try Chrome, Edge or Firefox.");
            return;
        }
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
            });
        } catch (err: any) {
            message.error(
                err?.name === "NotAllowedError"
                    ? "Allow microphone access in your browser to record voice notes."
                    : err?.name === "NotFoundError"
                        ? "No microphone found on this device."
                        : "Couldn't start the microphone."
            );
            return;
        }
        streamRef.current = stream;
        chunksRef.current = [];
        sendOnStopRef.current = false;
        const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
            if (e.data.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            release();
            setRec(false);
            finish(mime);
        };
        recorder.start(250);
        startedRef.current = Date.now();
        setElapsed(0);
        setRec(true);
        timerRef.current = setInterval(() => {
            const ms = Date.now() - startedRef.current;
            setElapsed(ms);
            if (ms >= MAX_MS) {
                sendOnStopRef.current = true;
                recorder.stop();
                message.info("Voice notes are limited to 5 minutes — sending what you recorded.");
            }
        }, 200);
    }, [finish, message, release, setRec]);

    const stop = useCallback((send: boolean) => {
        sendOnStopRef.current = send;
        try {
            recorderRef.current?.stop();
        } catch {
            /* already stopped */
        }
    }, []);

    if (!recording) {
        return (
            <Tooltip title="Record a voice note">
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<AudioOutlined />}
                    onClick={start}
                    loading={busy}
                    disabled={disabled}
                    style={{ background: "#25D366", borderColor: "#25D366", width: 44, height: 44, flexShrink: 0 }}
                />
            </Tooltip>
        );
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Tooltip title="Delete">
                <Button shape="circle" icon={<DeleteOutlined />} onClick={() => stop(false)} />
            </Tooltip>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 64, fontVariantNumeric: "tabular-nums", color: "#111b21" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "vn-blink 1s steps(2) infinite" }} />
                {formatTimer(elapsed)}
            </span>
            <style>{"@keyframes vn-blink{50%{opacity:.25}}"}</style>
            <Tooltip title="Send voice note">
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={() => stop(true)}
                    style={{ background: "#25D366", borderColor: "#25D366", width: 44, height: 44 }}
                />
            </Tooltip>
        </div>
    );
};

export default VoiceRecorder;
