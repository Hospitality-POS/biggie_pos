/**
 * WhatsApp calls on Meta (Cloud API) numbers — answered and placed in the
 * browser over WebRTC.
 *
 *   Incoming: the API's /calls/cloud list (polled) shows a ringing call with
 *   the customer's SDP offer → Answer builds our SDP answer with the mic
 *   attached and sends it (the API does Meta's pre_accept + accept).
 *
 *   Outgoing: needs the customer's call permission (we can send them a
 *   request). Our SDP offer goes to /calls/cloud/start; Meta's answer comes
 *   back on the call (answer_sdp) once they pick up and is applied here.
 *
 * Meta's side is ICE-lite with public addresses and no STUN/TURN, so the
 * browser takes the controlling ICE role on its own and gathers candidates
 * before sending its SDP (no trickle).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { App, Avatar, Button, Space, Tooltip, Typography } from "antd";
import { AudioMutedOutlined, AudioOutlined, PhoneFilled, PhoneOutlined } from "@ant-design/icons";
import {
    acceptCloudCall,
    CloudCall,
    fetchCallPermission,
    fetchCloudCall,
    fetchCloudCalls,
    rejectCloudCall,
    requestCallPermission,
    startCloudCall,
    terminateCloudCall,
} from "@services/whatsappService";

const { Text } = Typography;

// For fire-and-forget calls whose failure needs no handling.
const noop = () => undefined;

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const LIST_POLL_MS = 2000;
const OUTBOUND_POLL_MS = 1000;
// Give up on an outgoing call nobody picks up (Meta also times it out).
const OUTBOUND_RING_TIMEOUT_MS = 60_000;
const ENDED = new Set(["ended", "missed", "rejected", "failed"]);

// Only what a call needs, so any conversation shape (the inbox page's or the
// service's) can be passed.
export interface CallableConversation {
    _id: string;
    channel: string;
    external_contact_id: string;
    external_contact_name?: string;
    external_contact_phone?: string;
}

type Phase = "preparing" | "ringing" | "connecting" | "active";

interface Session {
    callId: string;
    direction: "inbound" | "outbound";
    contactName: string;
    contactNumber: string;
    conversationId: string | null;
    phase: Phase;
    startedAt: number | null;
    muted: boolean;
}

interface CallsContextValue {
    /** A Meta-connected WhatsApp number exists, so calls can be made. */
    available: boolean;
    /** A call is in progress in this tab. */
    busy: boolean;
    callConversation: (conversation: CallableConversation) => Promise<void>;
}

const CallsContext = createContext<CallsContextValue>({
    available: false,
    busy: false,
    callConversation: async () => undefined,
});

export const useWhatsAppCalls = () => useContext(CallsContext);

// Resolve once ICE gathering finishes, or after `ms` with what we have.
const waitForIce = (pc: RTCPeerConnection, ms = 3000) =>
    new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const timer = setTimeout(resolve, ms);
        pc.addEventListener("icegatheringstatechange", () => {
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timer);
                resolve();
            }
        });
    });

const formatTimer = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const formatNumber = (n?: string | null) => {
    const d = String(n || "").replace(/\D/g, "");
    return d ? `+${d}` : "";
};

const micErrorMessage = (err: any) =>
    err?.name === "NotAllowedError"
        ? "Allow microphone access in your browser to take WhatsApp calls."
        : err?.name === "NotFoundError"
            ? "No microphone found on this device."
            : err?.message || "Could not start the call audio.";

// Soft two-tone ring using WebAudio (no sound file needed).
const useRingtone = (on: boolean) => {
    useEffect(() => {
        if (!on) return undefined;
        let ctx: AudioContext | null = null;
        let stopped = false;
        try {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch {
            return undefined;
        }
        const ring = () => {
            if (stopped || !ctx) return;
            const now = ctx.currentTime;
            [0, 0.4].forEach((offset) => {
                const osc = ctx!.createOscillator();
                const gain = ctx!.createGain();
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.0001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
                osc.connect(gain).connect(ctx!.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.36);
            });
        };
        ring();
        const id = setInterval(ring, 3000);
        return () => {
            stopped = true;
            clearInterval(id);
            ctx?.close().catch(noop);
        };
    }, [on]);
};

interface ProviderProps {
    shopId: string;
    /** True when the shop has a WhatsApp number connected with Meta. */
    enabled: boolean;
    children: React.ReactNode;
}

export const WhatsAppCallsProvider: React.FC<ProviderProps> = ({ shopId, enabled, children }) => {
    const { message, modal } = App.useApp();
    const [calls, setCalls] = useState<CloudCall[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [session, setSession] = useState<Session | null>(null);
    const [, setTick] = useState(0);

    const sessionRef = useRef<Session | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const outboundPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const updateSession = useCallback((next: Session | null | ((s: Session | null) => Session | null)) => {
        setSession((prev) => {
            const value = typeof next === "function" ? (next as any)(prev) : next;
            sessionRef.current = value;
            return value;
        });
    }, []);

    // ── Media ────────────────────────────────────────────────────────────────

    const cleanup = useCallback(() => {
        if (outboundPollRef.current) clearInterval(outboundPollRef.current);
        outboundPollRef.current = null;
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
        pcRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (audioRef.current) audioRef.current.srcObject = null;
        updateSession(null);
    }, [updateSession]);

    const markActive = useCallback(() => {
        updateSession((s) => (s && s.phase !== "active" ? { ...s, phase: "active", startedAt: s.startedAt || Date.now() } : s));
    }, [updateSession]);

    // Mic + peer connection, with the customer's audio wired to <audio>.
    const openMedia = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
        });
        streamRef.current = stream;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (e) => {
            if (!audioRef.current) return;
            audioRef.current.srcObject = e.streams[0] || new MediaStream([e.track]);
            audioRef.current.play().catch(noop);
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") markActive();
            if (pc.connectionState === "failed") {
                message.error("The call's audio connection failed.");
                const id = sessionRef.current?.callId;
                if (id) terminateCloudCall(id).catch(noop);
                cleanup();
            }
        };
        return pc;
    }, [cleanup, markActive, message]);

    // ── Incoming ─────────────────────────────────────────────────────────────

    const answer = useCallback(
        async (call: CloudCall) => {
            if (sessionRef.current) {
                message.warning("Finish your current call first.");
                return;
            }
            if (!call.offer_sdp) {
                message.error("This call can no longer be answered.");
                return;
            }
            updateSession({
                callId: call.call_id,
                direction: "inbound",
                contactName: call.contact_name,
                contactNumber: call.contact_wa_id,
                conversationId: call.conversation_id,
                phase: "connecting",
                startedAt: null,
                muted: false,
            });
            try {
                const pc = await openMedia();
                await pc.setRemoteDescription({ type: "offer", sdp: call.offer_sdp });
                await pc.setLocalDescription(await pc.createAnswer());
                await waitForIce(pc);
                await acceptCloudCall(call.call_id, pc.localDescription!.sdp);
                markActive();
            } catch (err: any) {
                message.error(err?.name ? micErrorMessage(err) : err?.message || "Could not answer the call");
                cleanup();
            }
        },
        [cleanup, markActive, message, openMedia, updateSession]
    );

    const decline = useCallback(
        async (call: CloudCall) => {
            setDismissed((d) => new Set(d).add(call.call_id));
            try {
                await rejectCloudCall(call.call_id);
            } catch (err: any) {
                message.error(err?.message || "Could not decline the call");
            }
        },
        [message]
    );

    // ── Outgoing ─────────────────────────────────────────────────────────────

    const placeCall = useCallback(
        async (conversation: CallableConversation) => {
            updateSession({
                callId: "",
                direction: "outbound",
                contactName: conversation.external_contact_name || conversation.external_contact_id,
                contactNumber: conversation.external_contact_phone || conversation.external_contact_id,
                conversationId: conversation._id,
                phase: "preparing",
                startedAt: null,
                muted: false,
            });
            try {
                const pc = await openMedia();
                await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
                await waitForIce(pc);
                const call = await startCloudCall(conversation._id, pc.localDescription!.sdp);
                updateSession((s) => (s ? { ...s, callId: call.call_id, phase: "ringing" } : s));

                const startedRinging = Date.now();
                outboundPollRef.current = setInterval(async () => {
                    try {
                        const latest = await fetchCloudCall(call.call_id);
                        const current = pcRef.current;
                        if (!latest || !current) return;
                        if (latest.answer_sdp && !current.remoteDescription) {
                            updateSession((s) => (s ? { ...s, phase: "connecting" } : s));
                            await current.setRemoteDescription({ type: "answer", sdp: latest.answer_sdp });
                        }
                        if (latest.status === "active") markActive();
                        if (ENDED.has(latest.status)) {
                            if (latest.status === "rejected") message.info("The customer declined the call.");
                            else if (!latest.answered_at && latest.status !== "ended") message.info("The call wasn't answered.");
                            cleanup();
                            return;
                        }
                        if (!latest.answer_sdp && Date.now() - startedRinging > OUTBOUND_RING_TIMEOUT_MS) {
                            message.info("No answer.");
                            terminateCloudCall(call.call_id).catch(noop);
                            cleanup();
                        }
                    } catch {
                        /* keep polling */
                    }
                }, OUTBOUND_POLL_MS);
            } catch (err: any) {
                message.error(err?.name ? micErrorMessage(err) : err?.message || "Could not start the call");
                cleanup();
            }
        },
        [cleanup, markActive, message, openMedia, updateSession]
    );

    const callConversation = useCallback(
        async (conversation: CallableConversation) => {
            if (sessionRef.current) {
                message.warning("Finish your current call first.");
                return;
            }
            if (conversation.channel !== "whatsapp") {
                message.info("Calls are only available for WhatsApp conversations.");
                return;
            }
            const name = conversation.external_contact_name || formatNumber(conversation.external_contact_id);
            let check;
            try {
                check = await fetchCallPermission(conversation._id);
            } catch (err: any) {
                message.error(err?.message || "Could not check whether this customer can be called");
                return;
            }
            const { permission } = check;
            if (permission.can_call) {
                await placeCall(conversation);
                return;
            }
            if (!permission.can_request) {
                message.warning(
                    `${name} hasn't allowed calls yet, and WhatsApp only lets you ask once a day (twice a week). Try again later, or ask them to call you.`
                );
                return;
            }
            modal.confirm({
                title: `Ask ${name} for permission to call?`,
                content: check.window_open
                    ? "WhatsApp needs the customer's OK before a business can call them. They'll get a message where they can allow calls for 7 days or always. You'll see their answer in this chat."
                    : "WhatsApp needs the customer's OK before a business can call them. This request can only be sent within 24 hours of their last message — if it fails, wait for them to message you first.",
                okText: "Send request",
                cancelText: "Cancel",
                onOk: async () => {
                    try {
                        await requestCallPermission(conversation._id);
                        message.success("Call request sent. You can call once they allow it.");
                    } catch (err: any) {
                        message.error(err?.message || "Could not send the call request");
                    }
                },
            });
        },
        [message, modal, placeCall]
    );

    // ── Controls ─────────────────────────────────────────────────────────────

    const hangUp = useCallback(async () => {
        const id = sessionRef.current?.callId;
        cleanup();
        if (id) {
            try {
                await terminateCloudCall(id);
            } catch {
                /* already over on Meta's side */
            }
        }
    }, [cleanup]);

    const toggleMute = useCallback(() => {
        updateSession((s) => {
            if (!s) return s;
            const muted = !s.muted;
            streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
            return { ...s, muted };
        });
    }, [updateSession]);

    // ── Polling ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!enabled || !shopId) return undefined;
        let stopped = false;
        const poll = async () => {
            try {
                const list = await fetchCloudCalls(shopId);
                if (stopped) return;
                setCalls(list);
                // Our inbound call ended on the customer's side.
                const current = sessionRef.current;
                if (current?.direction === "inbound" && current.callId) {
                    const mine = list.find((c) => c.call_id === current.callId);
                    if (mine && ENDED.has(mine.status)) {
                        message.info("The call has ended.");
                        cleanup();
                    }
                }
            } catch {
                /* transient — try again next tick */
            }
        };
        poll();
        const id = setInterval(poll, LIST_POLL_MS);
        return () => {
            stopped = true;
            clearInterval(id);
        };
    }, [cleanup, enabled, message, shopId]);

    // Tick the call timer.
    useEffect(() => {
        if (session?.phase !== "active") return undefined;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [session?.phase]);

    // Leaving the page ends the call instead of leaving it open on Meta's side.
    useEffect(() => {
        const onUnload = (e: BeforeUnloadEvent) => {
            if (!sessionRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onUnload);
        return () => {
            window.removeEventListener("beforeunload", onUnload);
            const id = sessionRef.current?.callId;
            if (id) terminateCloudCall(id).catch(noop);
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const incoming = useMemo(
        () => calls.filter((c) => c.direction === "inbound" && c.status === "ringing" && !dismissed.has(c.call_id) && c.call_id !== session?.callId),
        [calls, dismissed, session?.callId]
    );

    useRingtone(incoming.length > 0 && !session);

    const value = useMemo<CallsContextValue>(
        () => ({ available: enabled, busy: !!session, callConversation }),
        [callConversation, enabled, session]
    );

    const phaseText = (s: Session) =>
        s.phase === "preparing" ? "Starting…"
        : s.phase === "ringing" ? "Calling…"
        : s.phase === "connecting" ? "Connecting…"
        : formatTimer(Date.now() - (s.startedAt || Date.now()));

    return (
        <CallsContext.Provider value={value}>
            {children}
            <audio ref={audioRef} autoPlay style={{ display: "none" }} />

            {(session || (incoming.length > 0 && !session)) && (
                <div
                    style={{
                        position: "fixed",
                        right: 24,
                        bottom: 24,
                        zIndex: 1100,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        width: 300,
                    }}
                >
                    {session ? (
                        <CallCard
                            title={session.direction === "inbound" ? "WhatsApp call" : "Calling on WhatsApp"}
                            name={session.contactName}
                            number={formatNumber(session.contactNumber)}
                            status={phaseText(session)}
                        >
                            <Tooltip title={session.muted ? "Unmute" : "Mute"}>
                                <Button
                                    shape="circle"
                                    size="large"
                                    icon={session.muted ? <AudioMutedOutlined /> : <AudioOutlined />}
                                    onClick={toggleMute}
                                    disabled={session.phase === "preparing"}
                                />
                            </Tooltip>
                            <Tooltip title="Hang up">
                                <Button
                                    shape="circle"
                                    size="large"
                                    danger
                                    type="primary"
                                    icon={<PhoneFilled style={{ transform: "rotate(135deg)" }} />}
                                    onClick={hangUp}
                                />
                            </Tooltip>
                        </CallCard>
                    ) : (
                        incoming.map((call) => (
                            <CallCard
                                key={call.call_id}
                                title="Incoming WhatsApp call"
                                name={call.contact_name}
                                number={formatNumber(call.contact_wa_id)}
                                status="Ringing…"
                                ringing
                            >
                                <Button danger shape="round" icon={<PhoneFilled style={{ transform: "rotate(135deg)" }} />} onClick={() => decline(call)}>
                                    Decline
                                </Button>
                                <Button
                                    type="primary"
                                    shape="round"
                                    icon={<PhoneOutlined />}
                                    style={{ background: "#16a34a", borderColor: "#16a34a" }}
                                    onClick={() => answer(call)}
                                >
                                    Answer
                                </Button>
                            </CallCard>
                        ))
                    )}
                </div>
            )}
        </CallsContext.Provider>
    );
};

const CallCard: React.FC<{
    title: string;
    name: string;
    number: string;
    status: string;
    ringing?: boolean;
    children: React.ReactNode;
}> = ({ title, name, number, status, ringing, children }) => (
    <div
        style={{
            background: "#0f172a",
            color: "#fff",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 32px rgba(15,23,42,.35)",
            animation: ringing ? "wa-call-pulse 1.6s ease-in-out infinite" : undefined,
        }}
    >
        <style>{"@keyframes wa-call-pulse{0%,100%{box-shadow:0 12px 32px rgba(22,163,74,.25)}50%{box-shadow:0 12px 40px rgba(22,163,74,.6)}}"}</style>
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>{title}</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 14px" }}>
            <Avatar size={44} style={{ background: "#16a34a", flexShrink: 0 }}>
                {(name || "?").trim().charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {name}
                </div>
                {number && number !== name && <div style={{ color: "#94a3b8", fontSize: 12 }}>{number}</div>}
                <div style={{ color: "#4ade80", fontSize: 12, marginTop: 2 }}>{status}</div>
            </div>
        </div>
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>{children}</Space>
    </div>
);

export default WhatsAppCallsProvider;
