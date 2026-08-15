import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
    Button,
    Space,
    Typography,
    Badge,
    App,
    Tooltip,
    Alert,
    Segmented,
    Empty,
    Row,
    Col,
    Tag,
    Card,
    Statistic,
    Avatar,
    List,
    Modal,
    Input,
    Select,
    Form,
    message,
} from "antd";
import {
    PlusOutlined,
    MessageOutlined,
    ReloadOutlined,
    WifiOutlined,
    PhoneOutlined,
    TrophyOutlined,
    UserOutlined,
    ClockCircleOutlined,
    PhoneFilled,
    VideoCameraOutlined,
    CommentOutlined,
    CloseCircleOutlined,
    FileOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchConversations,
    fetchWhatsappChannels,
    sendTextMessage,
} from "@services/whatsappService";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import CallInterfaceModal from "./CallInterfaceModal";
import { getAgentStatus, getCallHistory, initiateCall, getPhoneNumbers, getActiveCalls, answerCall, rejectCall, endCall, getAfricasTalkingVoiceToken, getAfricasTalkingAccounts, initiateAfricasTalkingCall, getTwilioVoiceToken } from "@services/twilio";
import { getAfricasTalkingVoiceManager } from "@services/africasTalkingVoice";
import { fetchAllUsersList } from "@services/users";
import { 
    getShopId, 
    CHANNEL_CONFIG, 
    ConversationStatus,
    WhatsAppIconComponent,
    Conversation
} from "./omnichannelConstants.tsx";

const { Text, Title } = Typography;
const { TextArea } = Input;

export type Channel = "all" | "whatsapp" | "africastalking";

export interface Call {
    _id: string;
    from_number?: string;
    to_number?: string;
    direction?: "inbound" | "outbound";
    status?: string;
    agent_id?: string;
    duration?: number;
    start_time?: string;
    createdAt?: string;
}

export interface Agent {
    _id: string;
    fullname: string;
    thumbnail?: string;
    role_type?: string;
    email?: string;
}

export interface AgentStatus {
    agent_id: string;
    agent_name: string;
    status: string;
    total_calls_today: number;
}

export interface PhoneNumber {
    _id: string;
    voice_phone_number: string;
    whatsapp_phone_number: string;
    friendly_name?: string;
    username?: string;
    capabilities?: {
        voice: boolean;
        whatsapp: boolean;
        sms: boolean;
        ussd: boolean;
    };
}

export interface CallFormValues {
    phone_number_id: string;
    country_code: string;
    phone_number: string;
    entity_type?: "customer" | "lead";
    customer_id?: string;
    lead_id?: string;
    record?: boolean;
    from_number?: string;
}

export interface WhatsAppFormValues {
    conversation_id: string;
    message: string;
}

const OmnichannelInboxPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [activeChannel, setActiveChannel] = useState<Channel>("all");
    const [activeStatus, setActiveStatus] = useState<ConversationStatus | "all">("all");
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Get user ID from localStorage user object
    const getUserId = () => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user._id || user.userId || undefined;
            }
            return undefined;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            return undefined;
        }
    };

    const userId = getUserId();
    
    // New call modal state
    const [newCallModalOpen, setNewCallModalOpen] = useState(false);
    const [callForm] = Form.useForm();
    
    // Device test state
    const [deviceReady, setDeviceReady] = useState(false);
    
    // New WhatsApp message modal state
    const [newWhatsAppModalOpen, setNewWhatsAppModalOpen] = useState(false);
    const [whatsappForm] = Form.useForm();
    
    // Incoming call state
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [callTimer, setCallTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    
    // Track if incoming call came from WebSocket (to prevent polling from clearing it)
    const [isWebSocketCall, setIsWebSocketCall] = useState(false);
    
    // Voice manager reference for making callbacks
    const voiceManagerRef = useRef(getAfricasTalkingVoiceManager());
    
    // WebSocket connection for incoming call notifications
    const wsRef = useRef<WebSocket | null>(null);
    
    // Auto-initialize Africa's Talking device on mount
    useEffect(() => {
        const initializeDevice = async () => {
            try {
                console.log('🧪 Auto-initializing Africa\'s Talking device...');
                // AfricasTalking doesn't have a browser SDK like Twilio
                // We use backend-mediated calling instead
                console.log('ℹ️ Africa\'s Talking uses backend-mediated calling, no browser SDK needed');
                setDeviceReady(true);
            } catch (error) {
                console.error('❌ Auto-initialization failed:', error);
            }
        };

        if (shopId) {
            initializeDevice();
        }
    }, [shopId, userId]);
    
    // WebSocket effect
    useEffect(() => {
        const wsUrl = 'ws://localhost:3003';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
            console.log('🔌 WebSocket connected for incoming call notifications');
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 WebSocket message received:', message);
                
                if (message.type === 'incoming_call') {
                    console.log('📞📞📞 INCOMING CALL via WebSocket! 📞📞📞');
                    console.log('📞 Call data:', message.data);
                    
                    // Create a call object from the WebSocket notification
                    const callData: Call = {
                        _id: message.data.call_sid,
                        call_sid: message.data.call_sid,
                        direction: message.data.direction,
                        from_number: message.data.from,
                        to_number: message.data.to,
                        status: message.data.status,
                        created_at: new Date(message.data.timestamp),
                        updated_at: new Date(message.data.timestamp),
                    };
                    
                    setIncomingCall(callData);
                    setIsWebSocketCall(true); // Mark as WebSocket call
                    console.log('📞 Set isWebSocketCall to true');
                    
                    // Play ring sound
                    try {
                        const audio = new Audio('/ringtone.mp3');
                        audio.play().catch(err => console.warn('Failed to play ringtone:', err));
                    } catch (error) {
                        console.warn('Failed to create audio element:', error);
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);
    
    // Call notes state
    const [callNotes, setCallNotes] = useState("");
    const [showCallPanel, setShowCallPanel] = useState(false);
    
    // Call interface modal state
    const [callInterfaceOpen, setCallInterfaceOpen] = useState(false);
    const [currentCallInfo, setCurrentCallInfo] = useState<{
        phoneNumber: string;
        contactName?: string;
        customerId?: string;
        leadId?: string;
        twilioToken?: string;
        conferenceName?: string;
    } | null>(null);

    const {
        data: channelsData,
        isLoading: channelsLoading,
    } = useQuery({
        queryKey: ["omnichannel-channels", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const channels = channelsData?.channels || [];

    const connected = {
        whatsapp: channels.some((c: { channel: string; is_active: boolean }) => c.channel === "whatsapp" && c.is_active),
    };
    const anyConnected = connected.whatsapp;

    // Twilio agent status for call readiness
    const { data: agentStatus } = useQuery({
        queryKey: ["twilio-agent-status", shopId, userId],
        queryFn: () => getAgentStatus(shopId || "", userId || ""),
        enabled: !!shopId && !!userId,
        staleTime: 30_000,
        refetchInterval: 30_000,
    });

    // Debug: Log agent status to check API response structure
    useEffect(() => {
        console.log('👥 Agent Status Debug:', {
            agentStatus,
            agentCount: agentStatus?.agent_statuses?.length,
            sampleAgent: agentStatus?.agent_statuses?.[0]
        });
    }, [agentStatus]);

    // Twilio call history
    const { data: callHistory } = useQuery({
        queryKey: ["twilio-call-history", shopId],
        queryFn: () => getCallHistory({ shop_id: shopId || "", limit: 100 }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    // Handle different API response structures
    const callsArray = useMemo(() => {
        return callHistory?.calls || callHistory?.data || (Array.isArray(callHistory) ? callHistory : []);
    }, [callHistory]);
    
    const todayCalls = useMemo(() => {
        return callsArray.filter((call: Call) => {
            // Use start_time if available, otherwise fall back to createdAt
            const callTime = call.start_time || call.createdAt;
            if (!callTime) return false;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const callDate = new Date(callTime);
            callDate.setHours(0, 0, 0, 0);
            
            return callDate.getTime() === today.getTime();
        }).length || 0;
    }, [callsArray]);

    // Debug: Log call history to check API response structure
    useEffect(() => {
        console.log('📞 Call History Debug:', {
            callHistory,
            callHistoryKeys: callHistory ? Object.keys(callHistory) : 'null',
            todayCalls,
            totalCalls: callsArray.length,
            sampleCall: callsArray[0],
            today: new Date().toDateString(),
            // Check if response structure is different
            hasCallsArray: !!callHistory?.calls,
            hasDataArray: !!callHistory?.data,
            isArray: Array.isArray(callHistory),
            // Check how many calls have start_time vs createdAt
            callsWithStartTime: callsArray.filter((c: Call) => c.start_time).length,
            callsWithCreatedAt: callsArray.filter((c: Call) => c.createdAt).length,
            callsWithNoTime: callsArray.filter((c: Call) => !c.start_time && !c.createdAt).length
        });
    }, [callHistory, todayCalls, callsArray]);

    // Fetch users with CRM agent roles
    const { data: usersData } = useQuery({
        queryKey: ["users-list", shopId],
        queryFn: () => fetchAllUsersList({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    // Filter users with CRM agent roles (CRM_AGENT, CRM_MANAGER)
    const crmAgents = useMemo(() => {
        // Handle different API response structures
        const users = usersData?.users || usersData || (Array.isArray(usersData) ? usersData : []);
        const usersArray = Array.isArray(users) ? users : [];
        
        const filtered = usersArray.filter((user: { role?: { role_type?: string } }) => {
            const roleType = user.role?.role_type?.toLowerCase() || "";
            return roleType.includes("crm_agent") || roleType.includes("crm_manager");
        });
        
        // Debug: Log users filtering
        console.log('👥 CRM Agents Debug:', {
            usersData,
            usersDataKeys: usersData ? Object.keys(usersData) : 'null',
            usersArray,
            totalUsers: usersArray.length,
            crmAgentsCount: filtered.length,
            sampleUser: usersArray[0],
            sampleUserRole: usersArray[0]?.role
        });
        
        return filtered;
    }, [usersData]);

    // Fetch available phone numbers for calls from AfricasTalking
    const { data: africasTalkingAccountsData } = useQuery({
        queryKey: ["africastalking-accounts", shopId],
        queryFn: () => {
            const singleShopId = Array.isArray(shopId) ? shopId[0] : shopId;
            return getAfricasTalkingAccounts(singleShopId, 'admin');
        },
        enabled: !!shopId,
        staleTime: 60_000,
    });

    const phoneNumbers = africasTalkingAccountsData?.accounts as Array<{
        _id: string;
        voice_phone_number: string;
        whatsapp_phone_number: string;
        friendly_name?: string;
        username?: string;
        capabilities?: {
            voice: boolean;
            whatsapp: boolean;
            sms: boolean;
            ussd: boolean;
        };
    }> || [];

    // Poll for active calls (incoming calls)
    const { data: activeCallsData } = useQuery({
        queryKey: ["twilio-active-calls", shopId],
        queryFn: () => getActiveCalls(shopId),
        enabled: !!shopId,
        staleTime: 0,
        refetchInterval: 3000, // Poll every 3 seconds
    });

    // Track incoming calls
    useEffect(() => {
        const activeCalls = activeCallsData?.calls || [];
        const inboundCalls = activeCalls.filter((call: Call) => 
            call.direction === "inbound" && call.status === "ringing"
        );
        
        if (inboundCalls.length > 0 && !incomingCall) {
            // New incoming call
            setIncomingCall(inboundCalls[0]);
            // Play ring sound
            try {
                const audio = new Audio('/ringtone.mp3');
                audio.play().catch((error) => {
                    console.warn('Failed to play ringtone:', error);
                });
            } catch (error) {
                console.warn('Failed to create audio element:', error);
            }
        } else if (inboundCalls.length === 0 && incomingCall && !isWebSocketCall) {
            // Call ended or answered elsewhere (only clear if not WebSocket call)
            setIncomingCall(null);
        }
    }, [activeCallsData, incomingCall]);

    // Track active call (answered)
    useEffect(() => {
        const activeCalls = activeCallsData?.calls || [];
        const myActiveCall = activeCalls.find((call: Call) => 
            call.status === "in-progress" && call.agent_id === userId
        );
        
        if (myActiveCall && !activeCall) {
            setActiveCall(myActiveCall);
        } else if (!myActiveCall && activeCall) {
            setActiveCall(null);
            setCallTimer(0);
        }
    }, [activeCallsData, activeCall, userId]);

    // Call timer
    useEffect(() => {
        let interval: number | undefined;
        if (activeCall) {
            interval = setInterval(() => {
                setCallTimer(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeCall]);

    // Add pulse animation styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.05);
                    opacity: 0.8;
                }
            }
            .pulse-animation {
                animation: pulse 1.5s infinite;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const {
        data: conversationsData,
        isLoading: conversationsLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [
            "omnichannel-conversations",
            shopId,
            activeChannel,
            activeStatus,
            page,
            search,
        ],
        queryFn: () =>
            fetchConversations({
                shop_id: shopId,
                channel: activeChannel === "all" ? undefined : activeChannel,
                status: activeStatus === "all" ? undefined : activeStatus,
                page,
                limit: 30,
                search: search || undefined,
            }),
        enabled: !!shopId && anyConnected,
        staleTime: 5_000,
        retry: 1,
        refetchInterval: anyConnected ? 5_000 : false,
        refetchOnWindowFocus: true,
    });

    const conversations = useMemo(() => conversationsData?.conversations || [], [conversationsData?.conversations]);
    const totalCount = conversationsData?.total || 0;

    // Calculate status counts from conversations array
    const statusCounts = useMemo(() => {
        const counts = {
            open: 0,
            pending: 0,
            resolved: 0,
            closed: 0,
            resolved_today: conversationsData?.status_counts?.resolved_today || 0
        };

        conversations.forEach((conv: Conversation) => {
            if (conv.status === "open") counts.open++;
            else if (conv.status === "pending") counts.pending++;
            else if (conv.status === "resolved") counts.resolved++;
            else if (conv.status === "closed") counts.closed++;
        });

        return counts;
    }, [conversations, conversationsData]);

    // Calculate channel counts from conversations array
    const channelCounts = useMemo(() => {
        const counts: Record<string, number> = {
            whatsapp: 0,
        };

        conversations.forEach((conv: Conversation) => {
            if (conv.channel === "whatsapp") counts.whatsapp++;
        });

        return counts;
    }, [conversations]);

    const handleConversationSelect = useCallback((conv: Conversation) => {
        setSelectedConversation(conv);
    }, []);

    const handleMessageSent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
    }, [queryClient]);

    const handleConversationUpdate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
        if (selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation._id] });
        }
    }, [queryClient, selectedConversation]);

    const handleMakeCall = async (values: CallFormValues) => {
        try {
            const fullPhoneNumber = `${values.country_code}${values.phone_number}`;
            const currentUserId = userId || 'default_agent'; // Fallback if userId is not available

            console.log('Initiating AfricasTalking call with userId:', currentUserId);

            // Get the selected phone number details
            const selectedPhone = phoneNumbers.find((pn: PhoneNumber) => pn._id === values.phone_number_id);
            const fromPhoneNumber = selectedPhone?.voice_phone_number || '';

            // Ensure shopId is a string, not an array
            const singleShopId = Array.isArray(shopId) ? shopId[0] : shopId;

            const response = await initiateAfricasTalkingCall({
                shop_id: singleShopId,
                account_id: values.phone_number_id,
                to_number: fullPhoneNumber,
                from_number: fromPhoneNumber,
                customer_id: values.entity_type === "customer" ? values.customer_id : undefined,
                lead_id: values.entity_type === "lead" ? values.lead_id : undefined,
                agent_id: currentUserId,
                record: values.record !== false,
            });

            console.log('Backend response:', response); // Debug: Check what backend returns

            message.success("Call initiated successfully");
            setNewCallModalOpen(false);

            // Extract sessionId from XML response if available
            let sessionId = undefined;
            if (typeof response === 'string' && response.includes('sessionId')) {
                const match = response.match(/<sessionId>([^<]+)<\/sessionId>/);
                if (match) {
                    sessionId = match[1];
                }
            } else if (response.sessionId) {
                sessionId = response.sessionId;
            }

            // Open call interface modal with basic call information
            // Since AfricasTalking doesn't have browser SDK, we show basic info without WebRTC
            setCurrentCallInfo({
                phoneNumber: fullPhoneNumber,
                customerId: values.entity_type === "customer" ? values.customer_id : undefined,
                leadId: values.entity_type === "lead" ? values.lead_id : undefined,
                twilioToken: "", // No token needed for AfricasTalking
                conferenceName: sessionId || undefined,
            });
            setCallInterfaceOpen(true);

            callForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["twilio-call-history"] });
        } catch (error: any) {
            console.error('Failed to initiate call:', error);

            // Handle specific error cases
            if (error.response?.status === 402) {
                message.error('Insufficient airtime/credit. Please top up your Africa\'s Talking account to make calls.');
            } else if (error.response?.status === 404) {
                message.error('Phone number not found. Please check your Africa\'s Talking account configuration.');
            } else {
                message.error(error.response?.data?.message || 'Failed to initiate call. Please try again.');
            }
        }
    };

    const handleSendWhatsApp = async (values: WhatsAppFormValues) => {
        try {
            if (values.conversation_id) {
                // Send to existing conversation
                await sendTextMessage({
                    conversation_id: values.conversation_id,
                    content: values.message,
                });
                message.success("WhatsApp message sent successfully");
                setNewWhatsAppModalOpen(false);
                whatsappForm.resetFields();
                queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
            } else {
                message.warning("Please select a conversation to send the message to");
            }
        } catch (error) {
            console.error("Failed to send WhatsApp message:", error);
            message.error("Failed to send WhatsApp message");
        }
    };

    const handleCallInterfaceClose = () => {
        setCallInterfaceOpen(false);
        setCurrentCallInfo(null);
    };

    const handleCallInterfaceEnd = () => {
        setCallInterfaceOpen(false);
        setCurrentCallInfo(null);
        // Additional cleanup if needed
    };

    const handleCallMute = (muted: boolean) => {
        setIsMuted(muted);
    };

    const handleCallHold = (onHold: boolean) => {
        setIsOnHold(onHold);
    };

    const handleCallSpeaker = (speaker: boolean) => {
        // Handle speaker toggle logic
        console.log('Speaker toggled:', speaker);
    };

    // Test Africa's Talking device initialization
    const testAfricasTalkingDevice = async () => {
        try {
            console.log('🧪 Testing Africa\'s Talking device initialization...');
            
            const shopId = localStorage.getItem("shopId");
            const userStr = localStorage.getItem("user");
            
            if (!shopId || !userStr) {
                console.error('Missing shopId or user');
                message.error('Missing shopId or user');
                return;
            }

            const user = JSON.parse(userStr);
            const userId = user.id || user._id || user.userId;
            
            if (!userId) {
                console.error('Missing userId');
                message.error('Missing userId');
                return;
            }

            const tokenData = await getAfricasTalkingVoiceToken({
                shop_id: shopId,
                account_id: phoneNumbers[0]?._id,
                user_id: userId,
                clientName: `agent_${userId}`,
            });

            console.log('✅ Token received:', tokenData);
            console.log('🔍 Token details:', {
                clientName: tokenData?.clientName,
                phoneNumber: tokenData?.phoneNumber,
                hasToken: !!tokenData?.token
            });

            // AfricasTalking doesn't have a browser SDK like Twilio
            // We use backend-mediated calling instead
            console.log('ℹ️ Africa\'s Talking uses backend-mediated calling, no browser SDK needed');
            setTwilioDeviceReady(true);
        } catch (error) {
            console.error('❌ Failed to initialize Africa\'s Talking device:', error);
            message.error('Failed to initialize Africa\'s Talking device');
        }
    };



    if (!shopId) {
        return (
            <App>
                <Alert
                    type="warning"
                    showIcon
                    message="Shop not found"
                    description="Could not determine your shop ID. Please log out and log back in."
                />
            </App>
        );
    }

    const channelOptions = [
        {
            label: (
                <Space size={4}>
                    <span>All</span>
                    {totalCount > 0 && (
                        <Badge count={totalCount} size="small" style={{ fontSize: 10 }} />
                    )}
                </Space>
            ),
            value: "all",
        },
        ...["whatsapp"].map((ch) => ({
            label: (
                <Space size={6} align="center">
                    <span style={{ color: CHANNEL_CONFIG[ch].color, display: "flex", alignItems: "center" }}>
                        {CHANNEL_CONFIG[ch].icon}
                    </span>
                    <span style={{ lineHeight: 1 }}>{CHANNEL_CONFIG[ch].label}</span>
                    {((channelCounts as Record<string, number>)[ch] || 0) > 0 && (
                        <Badge
                            count={(channelCounts as Record<string, number>)[ch]}
                            size="small"
                            style={{ fontSize: 10, backgroundColor: CHANNEL_CONFIG[ch].color }}
                        />
                    )}
                </Space>
            ),
            value: ch,
        })),
    ];

    return (
        <App>
            <div style={{ 
                minHeight: "100vh",
                background: "#f5f7fa",
                padding: "20px"
            }}>
                {/* Header */}
                <div style={{ 
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16
                }}>
                    <div>
                        <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                            Communication Center
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Manage calls, messages, and customer interactions
                        </Text>
                    </div>
                    <Space size={12}>
                        <Button
                            type="default"
                            icon={<PhoneOutlined />}
                            size="large"
                            onClick={testAfricasTalkingDevice}
                            style={{ 
                                borderRadius: 8,
                                fontWeight: 500,
                                height: 40,
                                borderColor: deviceReady ? '#52c41a' : undefined,
                                color: deviceReady ? '#52c41a' : undefined
                            }}
                        >
                            {deviceReady ? '✓ Device Ready' : 'Test Device'}
                        </Button>
                        <Button
                            type="primary"
                            icon={<PhoneFilled />}
                            size="large"
                            onClick={() => {
                                if (phoneNumbers.length > 0) {
                                    callForm.setFieldsValue({
                                        phone_number_id: phoneNumbers[0]._id
                                    });
                                }
                                setNewCallModalOpen(true);
                            }}
                            style={{ 
                                borderRadius: 8,
                                fontWeight: 500,
                                height: 40
                            }}
                        >
                            New Call
                        </Button>
                        <Button
                            type="primary"
                            icon={<CommentOutlined />}
                            size="large"
                            onClick={() => setNewWhatsAppModalOpen(true)}
                            style={{ 
                                borderRadius: 8,
                                fontWeight: 500,
                                height: 40,
                                background: "#25D366",
                                borderColor: "#25D366"
                            }}
                        >
                            New WhatsApp
                        </Button>
                        <Tooltip title="Refresh">
                            <Button
                                icon={<ReloadOutlined />}
                                size="large"
                                loading={isFetching || channelsLoading}
                                onClick={() => {
                                    queryClient.invalidateQueries({ queryKey: ["omnichannel-channels"] });
                                    if (anyConnected) {
                                        refetch();
                                    }
                                }}
                                style={{ borderRadius: 8, height: 40 }}
                            />
                        </Tooltip>
                    </Space>
                </div>

                {/* Quick Stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card 
                            style={{ borderRadius: 12, height: "100%", cursor: "pointer" }}
                            hoverable
                            onClick={() => setNewCallModalOpen(true)}
                        >
                            <Statistic
                                title="Today's Calls"
                                value={todayCalls}
                                prefix={<PhoneOutlined style={{ color: "#1890ff" }} />}
                                valueStyle={{ color: "#1890ff", fontSize: 28, fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, height: "100%" }}>
                            <Statistic
                                title="CRM Agents"
                                value={crmAgents.length}
                                prefix={<UserOutlined style={{ color: "#52c41a" }} />}
                                valueStyle={{ color: "#52c41a", fontSize: 28, fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, height: "100%" }}>
                            <Statistic
                                title="Avg Call Duration"
                                value={callsArray.length > 0 
                                    ? Math.floor(callsArray.reduce((acc: number, c: Call) => acc + (c.duration || 0), 0) / callsArray.length / 60)
                                    : 0}
                                suffix="min"
                                prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
                                valueStyle={{ color: "#faad14", fontSize: 28, fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card 
                            style={{ borderRadius: 12, height: "100%", cursor: "pointer" }}
                            hoverable
                            onClick={() => setNewWhatsAppModalOpen(true)}
                        >
                            <Statistic
                                title="Open Conversations"
                                value={statusCounts.open}
                                prefix={<MessageOutlined style={{ color: "#722ed1" }} />}
                                valueStyle={{ color: "#722ed1", fontSize: 28, fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Main Content Grid */}
                <Row gutter={[16, 16]} style={{ height: `calc(100vh - 280px)`, minHeight: 600, marginTop: activeCall ? 80 : 0 }}>
                    {/* Left: Conversation List */}
                    <Col xs={24} lg={activeCall ? 6 : 8} style={{ display: "flex", flexDirection: "column" }}>
                        <Card
                            title={
                                <Space>
                                    <MessageOutlined />
                                    <span>Messages</span>
                                    <Badge count={totalCount} size="small" />
                                </Space>
                            }
                            extra={
                                <Segmented
                                    options={channelOptions}
                                    value={activeChannel}
                                    onChange={(v) => {
                                        setActiveChannel(v as Channel);
                                        setPage(1);
                                        setSelectedConversation(null);
                                    }}
                                    size="small"
                                />
                            }
                            style={{ borderRadius: 12, flex: 1, display: "flex", flexDirection: "column" }}
                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden" } }}
                        >
                            {!anyConnected && !channelsLoading ? (
                                <div style={{ 
                                    padding: 40,
                                    textAlign: "center",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <div style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: "50%",
                                        background: "#f0f5ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 16
                                    }}>
                                        <WifiOutlined style={{ fontSize: 32, color: "#1890ff" }} />
                                    </div>
                                    <Title level={5} style={{ marginBottom: 8 }}>
                                        Connect WhatsApp
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
                                        Connect your WhatsApp via Twilio to start messaging
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => navigate("/system-setup")}
                                        size="small"
                                    >
                                        Configure Setup
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ height: "100%", overflowY: "auto" }}>
                                    <ConversationList
                                        conversations={conversations}
                                        loading={conversationsLoading}
                                        selectedId={selectedConversation?._id || null}
                                        activeStatus={activeStatus}
                                        total={totalCount}
                                        page={page}
                                        pageSize={30}
                                        search={search}
                                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                                        onStatusChange={(s) => { setActiveStatus(s); setPage(1); }}
                                        onPageChange={setPage}
                                        onSelect={handleConversationSelect}
                                        statusCounts={statusCounts}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            )}
                        </Card>
                    </Col>

                    {/* Center: Message Thread */}
                    <Col xs={24} lg={activeCall ? 10 : 10} style={{ display: "flex", flexDirection: "column" }}>
                        <Card
                            title={
                                selectedConversation ? (
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} />
                                        <span>{selectedConversation.external_contact_name || "Unknown"}</span>
                                        {selectedConversation.external_contact_phone && (
                                            <Button 
                                                size="small" 
                                                type="text" 
                                                icon={<PhoneOutlined />}
                                                onClick={() => {
                                                    // Quick call from conversation
                                                    if (phoneNumbers.length > 0 && selectedConversation.external_contact_phone) {
                                                        const phoneNumber = selectedConversation.external_contact_phone;
                                                        // Try to extract country code and phone number
                                                        let countryCode = "+254";
                                                        let localNumber = phoneNumber;
                                                        
                                                        if (phoneNumber.startsWith("+")) {
                                                            const match = phoneNumber.match(/^\+(\d{1,3})(\d+)$/);
                                                            if (match) {
                                                                countryCode = "+" + match[1];
                                                                localNumber = match[2];
                                                            }
                                                        }
                                                        
                                                        callForm.setFieldsValue({
                                                            phone_number_id: phoneNumbers[0]._id,
                                                            country_code: countryCode,
                                                            phone_number: localNumber,
                                                            entity_type: selectedConversation.customer_id ? "customer" : undefined,
                                                            customer_id: selectedConversation.customer_id,
                                                        });
                                                        setNewCallModalOpen(true);
                                                    } else {
                                                        message.warning("No phone numbers available");
                                                    }
                                                }}
                                            />
                                        )}
                                    </Space>
                                ) : (
                                    <span>Conversation</span>
                                )
                            }
                            extra={
                                selectedConversation && (
                                    <Space>
                                        <Button 
                                            size="small" 
                                            icon={<PhoneFilled />}
                                            onClick={() => {
                                                if (phoneNumbers.length > 0 && selectedConversation.external_contact_phone) {
                                                    const phoneNumber = selectedConversation.external_contact_phone;
                                                    // Try to extract country code and phone number
                                                    let countryCode = "+254";
                                                    let localNumber = phoneNumber;
                                                    
                                                    if (phoneNumber.startsWith("+")) {
                                                        const match = phoneNumber.match(/^\+(\d{1,3})(\d+)$/);
                                                        if (match) {
                                                            countryCode = "+" + match[1];
                                                            localNumber = match[2];
                                                        }
                                                    }
                                                    
                                                    callForm.setFieldsValue({
                                                        phone_number_id: phoneNumbers[0]._id,
                                                        country_code: countryCode,
                                                        phone_number: localNumber,
                                                        entity_type: selectedConversation.customer_id ? "customer" : undefined,
                                                        customer_id: selectedConversation.customer_id,
                                                    });
                                                    setNewCallModalOpen(true);
                                                } else {
                                                    message.warning("No phone number available");
                                                }
                                            }}
                                        >
                                            Call
                                        </Button>
                                    </Space>
                                )
                            }
                            style={{ borderRadius: 12, flex: 1, display: "flex", flexDirection: "column" }}
                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden" } }}
                        >
                            {selectedConversation ? (
                                <MessageThread
                                    conversation={selectedConversation}
                                    shopId={shopId}
                                    onMessageSent={handleMessageSent}
                                    onConversationUpdate={handleConversationUpdate}
                                    primaryColor={primaryColor}
                                />
                            ) : (
                                <div style={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#bfbfbf"
                                }}>
                                    <div style={{ textAlign: "center" }}>
                                        <MessageOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                        <div>Select a conversation to start messaging</div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </Col>

                    {/* Right: Call Center Panel */}
                    <Col xs={24} lg={6} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Active Agents */}
                        <Card
                            title={
                                <Space size={8}>
                                    <UserOutlined />
                                    <span>CRM Agents</span>
                                </Space>
                            }
                            size="small"
                            style={{ borderRadius: 12 }}
                            styles={{ body: { padding: "12px" } }}
                        >
                            {crmAgents.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={crmAgents.slice(0, 5)}
                                    renderItem={(agent: Agent) => (
                                        <List.Item style={{ padding: "8px 0", border: "none" }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar 
                                                        size={32} 
                                                        src={agent.thumbnail}
                                                        icon={!agent.thumbnail && <UserOutlined />}
                                                    />
                                                }
                                                title={
                                                    <Text style={{ fontSize: 12, fontWeight: 500 }}>
                                                        {agent.fullname || "Unknown"}
                                                    </Text>
                                                }
                                                description={
                                                    <Space size={8}>
                                                        <Tag 
                                                            color="blue"
                                                            style={{ fontSize: 10, margin: 0 }}
                                                        >
                                                            {agent.role_type || "Agent"}
                                                        </Tag>
                                                        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
                                                            {agent.email}
                                                        </Text>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <Empty description="No CRM agents found" style={{ padding: "20px 0" }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Card>

                        {/* Recent Calls */}
                        <Card
                            title={
                                <Space size={8}>
                                    <PhoneOutlined />
                                    <span>Recent Calls</span>
                                </Space>
                            }
                            size="small"
                            style={{ borderRadius: 12, flex: 1 }}
                            styles={{ body: { padding: "12px", overflowY: "auto", maxHeight: 300 } }}
                        >
                            {callsArray.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={callsArray.slice(0, 5)}
                                    renderItem={(call: Call) => (
                                        <List.Item 
                                            style={{ padding: "8px 0", border: "none", cursor: "pointer" }}
                                            onClick={() => {
                                                // Quick callback
                                                if (phoneNumbers.length > 0 && call.to_number) {
                                                    const phoneNumber = call.to_number;
                                                    // Try to extract country code and phone number
                                                    let countryCode = "+254";
                                                    let localNumber = phoneNumber;
                                                    
                                                    if (phoneNumber.startsWith("+")) {
                                                        const match = phoneNumber.match(/^\+(\d{1,3})(\d+)$/);
                                                        if (match) {
                                                            countryCode = "+" + match[1];
                                                            localNumber = match[2];
                                                        }
                                                    }
                                                    
                                                    callForm.setFieldsValue({
                                                        phone_number_id: phoneNumbers[0]._id,
                                                        country_code: countryCode,
                                                        phone_number: localNumber,
                                                    });
                                                    setNewCallModalOpen(true);
                                                }
                                            }}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar 
                                                        size={32} 
                                                        style={{ 
                                                            background: call.status === "completed" ? "#52c41a" : "#ff4d4f" 
                                                        }}
                                                        icon={<PhoneOutlined />}
                                                    />
                                                }
                                                title={
                                                    <Text style={{ fontSize: 12, fontWeight: 500 }}>
                                                        {call.to_number || "Unknown"}
                                                    </Text>
                                                }
                                                description={
                                                    <Space size={8}>
                                                        <Tag 
                                                            color={call.status === "completed" ? "success" : "error"}
                                                            style={{ fontSize: 10, margin: 0 }}
                                                        >
                                                            {call.status}
                                                        </Tag>
                                                        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
                                                            {call.duration}s
                                                        </Text>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <Empty description="No recent calls" style={{ padding: "20px 0" }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Card>

                        {/* Top Performers */}
                        {agentStatus?.agent_statuses?.length > 0 && (
                            <Card
                                title={
                                    <Space size={8}>
                                        <TrophyOutlined />
                                        <span>Top Performers</span>
                                    </Space>
                                }
                                size="small"
                                style={{ borderRadius: 12 }}
                                styles={{ body: { padding: "12px" } }}
                            >
                                <List
                                    size="small"
                                    dataSource={agentStatus.agent_statuses
                                        .sort((a: AgentStatus, b: AgentStatus) => b.total_calls_today - a.total_calls_today)
                                        .slice(0, 3)}
                                    renderItem={(agent: AgentStatus, index: number) => (
                                        <List.Item style={{ padding: "6px 0", border: "none" }}>
                                            <Space size={12} style={{ width: "100%" }}>
                                                <div style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    background: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : "#cd7f32",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    color: "#fff"
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                                                        {agent.agent_name || "Unknown"}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
                                                        {agent.total_calls_today} calls
                                                    </Text>
                                                </div>
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            </Card>
                        )}
                    </Col>
                </Row>

                {/* New Call Modal */}
                <Modal
                    title={
                        <Space>
                            <PhoneFilled style={{ color: '#52c41a' }} />
                            <span>Make a New Call</span>
                        </Space>
                    }
                    open={newCallModalOpen}
                    onCancel={() => {
                        setNewCallModalOpen(false);
                        callForm.resetFields();
                    }}
                    footer={null}
                    width={600}
                >
                    {!phoneNumbers.length ? (
                        <Alert
                            type="warning"
                            message="No Phone Numbers Available"
                            description="Please add an AfricasTalking account in System Setup to make calls."
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    ) : (
                        <Alert
                            type="info"
                            message="Airtime Required"
                            description="Ensure your AfricasTalking account has sufficient airtime/credit to make calls."
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    <Form
                        form={callForm}
                        layout="vertical"
                        onFinish={handleMakeCall}
                    >
                        <Form.Item
                            label="From Phone Number"
                            name="phone_number_id"
                            rules={[{ required: true, message: "Please select a phone number" }]}
                        >
                            <Select
                                placeholder="Select phone number"
                                disabled={!phoneNumbers.length}
                                options={phoneNumbers
                                    .filter((pn: PhoneNumber) => pn.capabilities?.voice)
                                    .map((pn: PhoneNumber) => ({
                                    label: `${pn.voice_phone_number} (${pn.friendly_name || pn.username || 'AfricasTalking'})`,
                                    value: pn._id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            label="To Phone Number"
                            required
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item
                                    name="country_code"
                                    noStyle
                                    initialValue="+254"
                                >
                                    <Select
                                        style={{ width: 120 }}
                                        showSearch
                                        optionFilterProp="label"
                                        options={[
                                            { label: "+254 (Kenya)", value: "+254" },
                                            { label: "+256 (Uganda)", value: "+256" },
                                            { label: "+255 (Tanzania)", value: "+255" },
                                            { label: "+257 (Burundi)", value: "+257" },
                                            { label: "+250 (Rwanda)", value: "+250" },
                                            { label: "+258 (Mozambique)", value: "+258" },
                                            { label: "+260 (Zambia)", value: "+260" },
                                            { label: "+263 (Zimbabwe)", value: "+263" },
                                            { label: "+27 (South Africa)", value: "+27" },
                                            { label: "+234 (Nigeria)", value: "+234" },
                                            { label: "+233 (Ghana)", value: "+233" },
                                            { label: "+1 (USA/Canada)", value: "+1" },
                                            { label: "+44 (UK)", value: "+44" },
                                            { label: "+91 (India)", value: "+91" },
                                            { label: "+86 (China)", value: "+86" },
                                            { label: "+49 (Germany)", value: "+49" },
                                            { label: "+33 (France)", value: "+33" },
                                            { label: "+81 (Japan)", value: "+81" },
                                            { label: "+61 (Australia)", value: "+61" },
                                            { label: "+55 (Brazil)", value: "+55" },
                                        ]}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="phone_number"
                                    noStyle
                                    rules={[{ required: true, message: "Please enter phone number" }]}
                                    style={{ flex: 1 }}
                                >
                                    <Input
                                        placeholder="7XXXXXXXX"
                                        size="large"
                                    />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>

                        {/* Dial Pad */}
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[8, 8]} style={{ textAlign: 'center' }}>
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((num) => (
                                    <Col span={8} key={num}>
                                        <Button
                                            size="large"
                                            onClick={() => {
                                                const currentValue = callForm.getFieldValue('phone_number') || '';
                                                callForm.setFieldsValue({
                                                    phone_number: currentValue + num
                                                });
                                            }}
                                            style={{
                                                width: '100%',
                                                height: 50,
                                                fontSize: 20,
                                                fontWeight: 500
                                            }}
                                        >
                                            {num}
                                        </Button>
                                    </Col>
                                ))}
                                <Col span={8}>
                                    <Button
                                        danger
                                        size="large"
                                        onClick={() => {
                                            const currentValue = callForm.getFieldValue('phone_number') || '';
                                            callForm.setFieldsValue({
                                                phone_number: currentValue.slice(0, -1)
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            height: 50,
                                            fontSize: 20
                                        }}
                                    >
                                        ⌫
                                    </Button>
                                </Col>
                                <Col span={8}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={() => callForm.submit()}
                                        style={{
                                            width: '100%',
                                            height: 50,
                                            fontSize: 16,
                                            fontWeight: 600
                                        }}
                                    >
                                        Call
                                    </Button>
                                </Col>
                            </Row>
                        </Card>

                        <Form.Item
                            label="Associate With"
                            name="entity_type"
                        >
                            <Select
                                placeholder="Optional: Associate with customer or lead"
                                allowClear
                                options={[
                                    { label: "Customer", value: "customer" },
                                    { label: "Lead", value: "lead" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Record Call"
                            name="record"
                            valuePropName="checked"
                            initialValue={true}
                        >
                            <Select
                                options={[
                                    { label: "Yes", value: true },
                                    { label: "No", value: false },
                                ]}
                            />
                        </Form.Item>
                    </Form>
                </Modal>

                {/* New WhatsApp Message Modal */}
                <Modal
                    title={
                        <Space>
                            <WhatsAppIconComponent />
                            <span>Send WhatsApp Message</span>
                        </Space>
                    }
                    open={newWhatsAppModalOpen}
                    onCancel={() => {
                        setNewWhatsAppModalOpen(false);
                        whatsappForm.resetFields();
                    }}
                    onOk={() => whatsappForm.submit()}
                    okText="Send Message"
                    width={500}
                >
                    {!anyConnected ? (
                        <Alert
                            type="warning"
                            message="WhatsApp Not Connected"
                            description="Please connect your WhatsApp channel in System Setup to send messages."
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    ) : null}
                    <Form
                        form={whatsappForm}
                        layout="vertical"
                        onFinish={handleSendWhatsApp}
                    >
                        <Form.Item
                            label="Select Conversation"
                            name="conversation_id"
                            rules={[{ required: true, message: "Please select a conversation" }]}
                        >
                            <Select
                                placeholder="Select a conversation"
                                disabled={!anyConnected}
                                showSearch
                                optionFilterProp="children"
                                options={conversations.map((conv: Conversation) => ({
                                    label: `${conv.external_contact_name} (${conv.external_contact_phone || conv.external_contact_id})`,
                                    value: conv._id,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Message"
                            name="message"
                            rules={[{ required: true, message: "Please enter your message" }]}
                        >
                            <TextArea
                                placeholder="Type your WhatsApp message here..."
                                autoSize={{ minRows: 4, maxRows: 8 }}
                            />
                        </Form.Item>
                        <Alert
                            message="24-hour Window"
                            description="If the conversation window is closed, your message will be sent as a template."
                            type="info"
                            showIcon
                            style={{ marginTop: 8 }}
                        />
                    </Form>
                </Modal>

                {/* Incoming Call Modal */}
                <Modal
                    title={
                        <Space size={12}>
                            <PhoneFilled style={{ color: "#52c41a", fontSize: 24 }} />
                            <span>Incoming Call</span>
                        </Space>
                    }
                    open={!!incomingCall}
                    onCancel={() => {
                        if (incomingCall) {
                            setIncomingCall(null);
                            setIsWebSocketCall(false);
                        }
                    }}
                    footer={[
                        <Button key="reject" danger onClick={() => {
                            if (incomingCall) {
                                setIncomingCall(null);
                            }
                        }}>
                            Reject
                        </Button>,
                        <Button key="accept" type="primary" onClick={() => {
                            if (incomingCall) {
                                // Handle polling-based incoming call
                                setIncomingCall(null);
                                setIsWebSocketCall(false);
                            }
                        }}>
                            Accept
                        </Button>,
                    ]}
                    width={450}
                    centered
                    closable={false}
                    maskClosable={false}
                    style={{ textAlign: "center" }}
                >
                    <div style={{ textAlign: "center", padding: "30px 20px" }}>
                        <div style={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                        }} className="pulse-animation">
                            <PhoneFilled style={{ fontSize: 40, color: "#fff" }} />
                        </div>
                        <Title level={3} style={{ marginBottom: 8, color: "#262626" }}>
                            {incomingCall?.from_number || "Unknown Caller"}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16, display: "block", marginBottom: 32 }}>
                            Incoming call...
                        </Text>
                        <Row gutter={16} justify="center">
                            <Col>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<PhoneFilled />}
                                    onClick={async () => {
                                        console.log('📞 Accept clicked - isWebSocketCall:', isWebSocketCall, 'incomingCall:', incomingCall);
                                        if (incomingCall) {
                                            if (isWebSocketCall) {
                                                // WebSocket-based call - track callback
                                                console.log('📞 Accepting WebSocket-based call - tracking callback');
                                                
                                                // Record callback attempt
                                                try {
                                                    await fetch('http://localhost:3002/api/crm/twilio/voice/callbacks', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                                            'companycode': 'RPOS-000002',
                                                        },
                                                        body: JSON.stringify({
                                                            original_call_sid: incomingCall.call_sid,
                                                            from_number: incomingCall.from_number,
                                                            to_number: incomingCall.to_number,
                                                            agent_id: userId,
                                                            shop_id: shopId,
                                                            callback_status: 'initiated',
                                                            callback_time: new Date().toISOString(),
                                                        }),
                                                    });
                                                    console.log('📞 Callback tracked successfully');
                                                    message.success('Callback tracked. Please call back the customer.');
                                                } catch (error) {
                                                    console.error('📞 Error tracking callback:', error);
                                                    message.warning('Incoming call acknowledged. Please call back manually.');
                                                }
                                                
                                                setIncomingCall(null);
                                                setIsWebSocketCall(false);
                                            } else {
                                                // Polling-based call - use API
                                                await answerCall(incomingCall._id);
                                                setIncomingCall(null);
                                                setIsWebSocketCall(false);
                                            }
                                        }
                                    }}
                                    style={{ 
                                        borderRadius: 50, 
                                        width: 72, 
                                        height: 72,
                                        background: "#52c41a",
                                        borderColor: "#52c41a",
                                        fontSize: 20
                                    }}
                                />
                                <div style={{ marginTop: 8, fontSize: 12, color: "#52c41a", fontWeight: 500 }}>
                                    Answer
                                </div>
                            </Col>
                            <Col>
                                <Button
                                    danger
                                    size="large"
                                    icon={<PhoneOutlined />}
                                    onClick={async () => {
                                        if (incomingCall) {
                                            if (isWebSocketCall) {
                                                // WebSocket-based call - just close modal
                                                console.log('📞 Rejecting WebSocket-based call:', incomingCall.from_number);
                                                setIncomingCall(null);
                                                setIsWebSocketCall(false);
                                            } else {
                                                // Polling-based call - use API
                                                await rejectCall(incomingCall._id);
                                                setIncomingCall(null);
                                                setIsWebSocketCall(false);
                                            }
                                        }
                                    }}
                                    style={{ 
                                        borderRadius: 50, 
                                        width: 72, 
                                        height: 72,
                                        fontSize: 20
                                    }}
                                />
                                <div style={{ marginTop: 8, fontSize: 12, color: "#ff4d4f", fontWeight: 500 }}>
                                    Decline
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Modal>

                {/* Active Call Banner */}
                {activeCall && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
                        color: "#fff",
                        padding: "16px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        zIndex: 1000,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}>
                        <Space size={16}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }} className="pulse-animation">
                                <PhoneFilled style={{ fontSize: 24 }} />
                            </div>
                            <div>
                                <Text style={{ color: "#fff", fontSize: 16, fontWeight: 600, display: "block" }}>
                                    {activeCall.from_number || "Unknown Caller"}
                                </Text>
                                <Space size={8}>
                                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                                        {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
                                    </Text>
                                    <Tag color="rgba(255,255,255,0.3)" style={{ 
                                        color: "#fff", 
                                        border: "none",
                                        fontSize: 11,
                                        margin: 0
                                    }}>
                                        Active Call
                                    </Tag>
                                </Space>
                            </div>
                        </Space>
                        <Space size={12}>
                            <Button
                                size="large"
                                icon={isMuted ? <VideoCameraOutlined /> : <CommentOutlined />}
                                onClick={() => setIsMuted(!isMuted)}
                                style={{ 
                                    background: "rgba(255,255,255,0.2)", 
                                    color: "#fff", 
                                    border: "none",
                                    borderRadius: 8,
                                    height: 40,
                                    width: 40
                                }}
                            />
                            <Button
                                size="large"
                                onClick={() => setIsOnHold(!isOnHold)}
                                style={{ 
                                    background: "rgba(255,255,255,0.2)", 
                                    color: "#fff", 
                                    border: "none",
                                    borderRadius: 8,
                                    height: 40,
                                    width: 40
                                }}
                            >
                                {isOnHold ? "▶" : "⏸"}
                            </Button>
                            <Button
                                size="large"
                                onClick={() => setShowCallPanel(!showCallPanel)}
                                style={{ 
                                    background: "rgba(255,255,255,0.2)", 
                                    color: "#fff", 
                                    border: "none",
                                    borderRadius: 8,
                                    height: 40
                                }}
                            >
                                {showCallPanel ? "Hide Panel" : "Call Notes"}
                            </Button>
                            <Button
                                danger
                                size="large"
                                icon={<PhoneOutlined />}
                                onClick={async () => {
                                    if (activeCall) {
                                        await endCall(activeCall._id);
                                        setActiveCall(null);
                                        setCallTimer(0);
                                        setShowCallPanel(false);
                                    }
                                }}
                                style={{ 
                                    background: "#ff4d4f", 
                                    color: "#fff", 
                                    border: "none",
                                    borderRadius: 8,
                                    height: 40,
                                    fontWeight: 500
                                }}
                            >
                                End Call
                            </Button>
                        </Space>
                    </div>
                )}

                {/* Call Notes Panel */}
                {activeCall && showCallPanel && (
                    <div style={{
                        position: "fixed",
                        top: 80,
                        right: 24,
                        width: 350,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        zIndex: 999,
                        maxHeight: "calc(100vh - 120px)",
                        overflow: "hidden"
                    }}>
                        <div style={{
                            padding: "16px",
                            borderBottom: "1px solid #f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}>
                            <Space>
                                <FileOutlined style={{ color: "#1890ff" }} />
                                <Text strong style={{ fontSize: 14 }}>Call Notes</Text>
                            </Space>
                            <Button 
                                type="text" 
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => setShowCallPanel(false)}
                            />
                        </div>
                        <div style={{ padding: "16px" }}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                                    Caller: {activeCall.from_number || "Unknown"}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Duration: {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
                                </Text>
                            </div>
                            <TextArea
                                placeholder="Take notes during the call..."
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                autoSize={{ minRows: 6, maxRows: 12 }}
                                style={{ marginBottom: 12 }}
                            />
                            <Space size={8} style={{ width: "100%" }}>
                                <Button 
                                    size="small" 
                                    block
                                    onClick={() => {
                                        // Save notes logic here
                                        message.success("Notes saved");
                                    }}
                                >
                                    Save Notes
                                </Button>
                                <Button 
                                    size="small"
                                    onClick={() => setCallNotes("")}
                                >
                                    Clear
                                </Button>
                            </Space>
                        </div>
                    </div>
                )}

                {/* Call Interface Modal */}
                <CallInterfaceModal
                    open={callInterfaceOpen}
                    onClose={handleCallInterfaceClose}
                    phoneNumber={currentCallInfo?.phoneNumber || ""}
                    contactName={currentCallInfo?.contactName}
                    customerId={currentCallInfo?.customerId}
                    leadId={currentCallInfo?.leadId}
                    twilioToken={currentCallInfo?.twilioToken}
                    conferenceName={currentCallInfo?.conferenceName}
                    onEndCall={handleCallInterfaceEnd}
                    onMuteToggle={handleCallMute}
                    onHoldToggle={handleCallHold}
                    onSpeakerToggle={handleCallSpeaker}
                />
            </div>
        </App>
    );
};

export default OmnichannelInboxPage;
