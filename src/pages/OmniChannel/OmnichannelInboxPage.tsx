import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
    Button,
    Space,
    Typography,
    Badge,
    App,
    Tooltip,
    Alert,
    Tabs,
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
    Switch,
    Divider,
    Spin,
} from "antd";
import {
    PlusOutlined,
    MessageOutlined,
    ReloadOutlined,
    WifiOutlined,
    SendOutlined,
    PhoneOutlined,
    TrophyOutlined,
    UserOutlined,
    ClockCircleOutlined,
    PhoneFilled,
    VideoCameraOutlined,
    CommentOutlined,
    CloseCircleOutlined,
    FileOutlined,
    PlayCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchConversations,
    fetchWhatsappChannels,
    sendTextMessage,
} from "@services/whatsappService";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import CallInterfaceModal from "./CallInterfaceModal";
import { getAgentStatus, getCallHistory, initiateCall, getPhoneNumbers, getActiveCalls, answerCall, rejectCall, endCall, getTwilioVoiceToken, transcribeCall, updateAgentStatus, updateAgentHeartbeat, getMissedCalls, getMissedCallStats, progressMissedCall, sendTwilioWhatsAppMessage, getTwilioWhatsAppConversations, getTwilioWhatsAppMessages, getTwilioWhatsAppTemplates, createTwilioWhatsAppTemplate, deleteTwilioWhatsAppTemplate, getTwilioWhatsAppTemplateStatus } from "@services/twilio";
import { fetchAllUsersList } from "@services/users";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllLeads } from "@services/crm/leads";
import { 
    getShopId, 
    ConversationStatus,
    WhatsAppIconComponent,
    Conversation
} from "./omnichannelConstants.tsx";

const { Text, Title } = Typography;
const { TextArea } = Input;

export type Channel = "all" | "whatsapp";
export type ActiveTab = "calls" | "whatsapp";

export interface Call {
    _id: string;
    from_number?: string;
    from_formatted?: string;
    to_number?: string;
    to_formatted?: string;
    direction?: "inbound" | "outbound";
    status?: string;
    contact_name?: string;
    customer_id?: { _id: string; customer_name?: string; phone?: string | number } | null;
    agent_id?: string | { _id: string; fullname: string };
    duration?: number;
    call_duration?: number;
    recording_duration?: number;
    recording_url?: string;
    recording_status?: string;
    transcription_text?: string | null;
    transcription_status?: string;
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
    phone_number: string;
    whatsapp_phone_number?: string;
    friendly_name?: string;
    username?: string;
    is_active: boolean;
    status: "active" | "inactive" | "suspended" | "released";
    whatsapp_enabled: boolean;
    capabilities?: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
        fax: boolean;
    };
    twilio_account_id?: {
        _id: string;
        account_type: string;
        status: string;
        capabilities?: {
            voice: boolean;
            sms: boolean;
            whatsapp: boolean;
            mms: boolean;
            fax: boolean;
        };
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
    associate_with?: string; // For linking calls to customers/leads
    additional_participants?: string[]; // For adding more people to conference
}

export interface WhatsAppFormValues {
    mode: "existing" | "new";
    conversation_id?: string;
    to_number?: string;
    from_number?: string;
    messaging_service_sid?: string;
    message: string;
    use_template?: boolean;
    content_sid?: string;
    template_params?: Record<string, string>;
}

const OmnichannelInboxPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [activeTab, setActiveTab] = useState<ActiveTab>("calls");
    const activeChannel: Channel = "all";
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
    const watchedPhoneNumber = Form.useWatch('phone_number', callForm);
    const watchedCountryCode = Form.useWatch('country_code', callForm) || '+254';
    
    // Device test state
    const [deviceReady, setDeviceReady] = useState(false);
    
    // New WhatsApp message modal state
    const [newWhatsAppModalOpen, setNewWhatsAppModalOpen] = useState(false);
    const [whatsappForm] = Form.useForm();
    const [templateForm] = Form.useForm();
    
    // Incoming call state
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [callTimer, setCallTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    
    // Track if incoming call came from WebSocket (to prevent polling from clearing it)
    const [isWebSocketCall, setIsWebSocketCall] = useState(false);

    // Recording playback state
    const [selectedRecording, setSelectedRecording] = useState<Call | null>(null);
    const [recordingModalOpen, setRecordingModalOpen] = useState(false);

    // Caller context for outbound calls
    const [callerContext, setCallerContext] = useState<{ customer?: { customer_name?: string; fullname?: string; name?: string; phone?: string; phone_number?: string; email?: string; _id?: string }; lead?: { lead_name?: string; fullname?: string; name?: string; phone?: string; phone_number?: string; email?: string; _id?: string } } | null>(null);

    // Twilio WhatsApp state
    const [selectedTwilioConversation, setSelectedTwilioConversation] = useState<Conversation | null>(null);
    const [twilioWhatsAppMessage, setTwilioWhatsAppMessage] = useState("");
    const [twilioWhatsAppMediaUrl, setTwilioWhatsAppMediaUrl] = useState("");
    const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<{ _id: string; name: string; content_sid: string; variables?: string[] } | null>(null);

    // Agent availability state
    const [isAvailable, setIsAvailable] = useState(false);
    const heartbeatIntervalRef = useRef<number | null>(null);
    
    // WebSocket connection for incoming call notifications
    const wsRef = useRef<WebSocket | null>(null);
    
    // Auto-initialize Twilio device on mount
    useEffect(() => {
        const initializeDevice = async () => {
            try {
                console.log('🧪 Auto-initializing Twilio device...');
                // Don't auto-initialize - will initialize when making a call
                console.log('ℹ️ Twilio device will be initialized when making a call');
                setDeviceReady(true);
            } catch (error) {
                console.error('❌ Auto-initialization failed:', error);
            }
        };

        if (shopId && userId) {
            initializeDevice();
        }
    }, [shopId, userId]);
    
    // Cleanup heartbeat on unmount
    useEffect(() => {
        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, []);

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
                } else if (message.type === 'missed_call_assigned') {
                    console.log('🔔 Missed call assigned:', message.data);
                    
                    // Show notification with caller info
                    const contactName = message.data.contact_name || 'Unknown';
                    const contactPhone = message.data.contact_phone || 'Unknown';
                    message.info(`Missed call assigned: ${contactName} (${contactPhone})`);
                    
                    // Refresh missed calls list
                    queryClient.invalidateQueries({ queryKey: ["missed-calls"] });
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
    }, [queryClient]);
    
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
        additionalParticipants?: string[];
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

    // Twilio agent status for call readiness
    const { data: agentStatusData } = useQuery({
        queryKey: ["twilio-agent-status", shopId, userId],
        queryFn: () => getAgentStatus(shopId || "", userId || ""),
        enabled: !!shopId && !!userId,
        staleTime: 30_000,
        refetchInterval: 30_000,
    });

    // Missed calls queries
    const { data: missedCallsData } = useQuery({
        queryKey: ["missed-calls", shopId],
        queryFn: () => getMissedCalls(shopId || ""),
        enabled: !!shopId,
        staleTime: 60_000,
        refetchInterval: 30_000,
    });

    const { data: missedCallStatsData } = useQuery({
        queryKey: ["missed-call-stats", shopId],
        queryFn: () => getMissedCallStats(shopId || ""),
        enabled: !!shopId,
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    // Debug: Log agent status to check API response structure
    useEffect(() => {
        console.log('👥 Agent Status Debug:', {
            agentStatusData,
            agentCount: agentStatusData?.agent_statuses?.length,
            sampleAgent: agentStatusData?.agent_statuses?.[0]
        });
    }, [agentStatusData]);

    // Twilio call history
    const { data: callHistory } = useQuery({
        queryKey: ["twilio-call-history", shopId],
        queryFn: () => getCallHistory({ shop_id: shopId || "", limit: 100 }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    // Twilio WhatsApp conversations
    const { data: twilioWhatsAppConversationsData, isLoading: twilioWhatsAppLoading, refetch: refetchTwilioWhatsAppConversations } = useQuery({
        queryKey: ["twilio-whatsapp-conversations", shopId, activeTab],
        queryFn: () => getTwilioWhatsAppConversations(shopId || "", undefined, 1, 100),
        enabled: !!shopId && activeTab === "whatsapp",
        staleTime: 30_000,
        refetchInterval: activeTab === "whatsapp" ? 10_000 : false,
    });

    const twilioWhatsAppConversations = useMemo(() => twilioWhatsAppConversationsData?.conversations || [], [twilioWhatsAppConversationsData?.conversations]);

    // Twilio WhatsApp messages
    const { data: twilioWhatsAppMessagesData, isLoading: twilioWhatsAppMessagesLoading, refetch: refetchTwilioWhatsAppMessages } = useQuery({
        queryKey: ["twilio-whatsapp-messages", selectedTwilioConversation?._id, shopId],
        queryFn: () => getTwilioWhatsAppMessages(selectedTwilioConversation?._id || "", 1, 100),
        enabled: !!selectedTwilioConversation?._id,
        staleTime: 10_000,
        refetchInterval: selectedTwilioConversation ? 5_000 : false,
    });

    const twilioWhatsAppMessages = useMemo(() => twilioWhatsAppMessagesData?.messages || [], [twilioWhatsAppMessagesData?.messages]);

    // Twilio WhatsApp templates
    const { data: twilioWhatsAppTemplatesData, refetch: refetchTwilioWhatsAppTemplates } = useQuery({
        queryKey: ["twilio-whatsapp-templates", shopId],
        queryFn: () => getTwilioWhatsAppTemplates(shopId || ""),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    const twilioWhatsAppTemplates = useMemo(() => twilioWhatsAppTemplatesData?.templates || [], [twilioWhatsAppTemplatesData?.templates]);

    // Calculate call statistics
    const callStats = useMemo(() => {
        const calls = callHistory?.calls || [];
        const total = calls.length;
        const successful = calls.filter((call: Call) => 
            call.status === 'completed' || call.status === 'answered'
        ).length;
        const missed = calls.filter((call: Call) => 
            call.status === 'no-answer' || call.status === 'busy' || call.status === 'failed'
        ).length;
        const totalDuration = calls.reduce((sum: number, call: Call) => 
            sum + (call.duration || 0), 0
        );

        return { total, successful, missed, totalDuration };
    }, [callHistory]);

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

    // Fetch available phone numbers for calls from Twilio
    const { data: phoneNumbersData } = useQuery({
        queryKey: ["twilio-phone-numbers", shopId],
        queryFn: () => getPhoneNumbers(shopId, undefined, true),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    const phoneNumbers = Array.isArray(phoneNumbersData?.phone_numbers) ? phoneNumbersData.phone_numbers : [];
    // Account supports WhatsApp
    const phoneHasWhatsApp = (pn: PhoneNumber) =>
        pn.whatsapp_enabled ||
        (pn.twilio_account_id?.capabilities?.whatsapp && pn.is_active);
    // Number is actually a configured WhatsApp sender (can be used as from)
    const phoneHasWhatsAppSender = (pn: PhoneNumber) =>
        pn.whatsapp_enabled && pn.is_active;
    const hasTwilioWhatsApp = phoneNumbers.some((pn: PhoneNumber) => phoneHasWhatsApp(pn));
    const anyConnected = connected.whatsapp || hasTwilioWhatsApp;

    // Fetch customers for call association
    const { data: customersData } = useQuery({
        queryKey: ["customers-list", shopId],
        queryFn: () => fetchAllCustomers({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    // Fetch leads for call association
    const { data: leadsData } = useQuery({
        queryKey: ["leads-list", shopId],
        queryFn: () => fetchAllLeads({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

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

    // Caller context lookup based on phone number
    useEffect(() => {
        const fullNumber = `${watchedCountryCode}${watchedPhoneNumber}`;
        
        if (!watchedPhoneNumber || watchedPhoneNumber.length < 9) {
            setCallerContext(null);
            return;
        }

        // Search customers and leads by phone number
        const customers = (customersData?.customers || customersData || []) as { phone?: string; phone_number?: string; _id?: string }[];
        const leads = (leadsData?.leads || leadsData || []) as { phone?: string; phone_number?: string; _id?: string }[];

        const customerMatch = customers.find((c) => {
            const customerPhone = String(c.phone || c.phone_number || '').trim();
            return customerPhone.includes(watchedPhoneNumber) || customerPhone.includes(fullNumber);
        });

        const leadMatch = leads.find((l) => {
            const leadPhone = String(l.phone || l.phone_number || '').trim();
            return leadPhone.includes(watchedPhoneNumber) || leadPhone.includes(fullNumber);
        });

        if (customerMatch || leadMatch) {
            setCallerContext({
                customer: customerMatch,
                lead: leadMatch,
            });
            
            // Auto-fill associate with field
            if (customerMatch) {
                callForm.setFieldsValue({
                    entity_type: 'customer',
                    customer_id: customerMatch._id,
                    lead_id: undefined,
                });
            } else if (leadMatch) {
                callForm.setFieldsValue({
                    entity_type: 'lead',
                    customer_id: undefined,
                    lead_id: leadMatch._id,
                });
            }
        } else {
            setCallerContext(null);
        }
    }, [watchedPhoneNumber, watchedCountryCode, customersData, leadsData, callForm]);

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
        enabled: !!shopId && connected.whatsapp,
        staleTime: 5_000,
        retry: 1,
        refetchInterval: connected.whatsapp ? 5_000 : false,
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

    const handleSendTwilioWhatsApp = async () => {
        try {
            if (!selectedTwilioConversation || !selectedTwilioConversation.external_contact_phone) {
                message.warning("Please select a conversation first");
                return;
            }
            if (!twilioWhatsAppMessage.trim() && !twilioWhatsAppMediaUrl.trim()) {
                message.warning("Please enter a message or media URL");
                return;
            }

            const whatsAppPhoneNumbers = phoneNumbers.filter((pn: PhoneNumber) => phoneHasWhatsAppSender(pn));
            if (whatsAppPhoneNumbers.length === 0) {
                message.warning("No WhatsApp-enabled Twilio phone number available");
                return;
            }

            const fromNumber = whatsAppPhoneNumbers[0].phone_number;

            await sendTwilioWhatsAppMessage({
                shop_id: shopId,
                from_number: fromNumber,
                to_number: selectedTwilioConversation.external_contact_phone,
                body: twilioWhatsAppMessage,
                media_url: twilioWhatsAppMediaUrl || undefined,
            });

            setTwilioWhatsAppMessage("");
            setTwilioWhatsAppMediaUrl("");
            queryClient.invalidateQueries({ queryKey: ["twilio-whatsapp-messages", selectedTwilioConversation._id] });
            queryClient.invalidateQueries({ queryKey: ["twilio-whatsapp-conversations", shopId, activeTab] });
            message.success("WhatsApp message sent");
        } catch (error) {
            console.error('Failed to send Twilio WhatsApp message:', error);
            message.error('Failed to send WhatsApp message');
        }
    };

    const handleMakeCall = async (values: CallFormValues) => {
        try {
            const fullPhoneNumber = `${values.country_code}${values.phone_number}`;
            const currentUserId = userId || 'default_agent'; // Fallback if userId is not available

            console.log('Initiating Twilio call with userId:', currentUserId);

            // Get the selected phone number details
            const selectedPhone = phoneNumbers.find((pn: PhoneNumber) => pn._id === values.phone_number_id);
            const fromPhoneNumber = selectedPhone?.phone_number || '';

            const response = await initiateCall({
                shop_id: shopId,
                from_number: fromPhoneNumber,
                to_number: fullPhoneNumber,
                customer_id: values.entity_type === "customer" ? values.customer_id : undefined,
                lead_id: values.entity_type === "lead" ? values.lead_id : undefined,
                agent_id: currentUserId,
                record: values.record !== false,
                additional_participants: values.additional_participants,
            });

            console.log('Backend response:', response); // Debug: Check what backend returns

            message.success("Call initiated successfully");
            setNewCallModalOpen(false);

            // Generate Twilio voice token for WebRTC audio
            const token = await getTwilioVoiceToken({
                shop_id: shopId,
                agent_id: currentUserId,
                agent_identity: `agent_${currentUserId}`,
            });

            console.log('Twilio token generated:', token ? 'Success' : 'Failed');

            // Open call interface modal with conference information and token
            setCurrentCallInfo({
                phoneNumber: fullPhoneNumber,
                customerId: values.entity_type === "customer" ? values.customer_id : undefined,
                leadId: values.entity_type === "lead" ? values.lead_id : undefined,
                twilioToken: token?.token || "",
                conferenceName: response.conference_name || response.call?.conference_name || undefined,
                additionalParticipants: values.additional_participants || [],
            });
            setCallInterfaceOpen(true);

            callForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["twilio-call-history"] });
        } catch (error) {
            console.error('Failed to initiate call:', error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            message.error(axiosError.response?.data?.message || 'Failed to initiate call. Please try again.');
        }
    };

    const handleSendWhatsApp = async (values: WhatsAppFormValues) => {
        try {
            if (hasTwilioWhatsApp) {
                let fromNumber: string | undefined;
                let messagingServiceSid: string | undefined;
                let toNumber: string | undefined;

                if (values.mode === "new") {
                    toNumber = values.to_number;
                    if (values.messaging_service_sid) {
                        messagingServiceSid = values.messaging_service_sid;
                    } else if (values.from_number) {
                        fromNumber = values.from_number;
                    }
                } else {
                    if (!values.conversation_id) {
                        message.warning("Please select a conversation to send the message to");
                        return;
                    }
                    const conv = twilioWhatsAppConversations.find((c: Conversation) => c._id === values.conversation_id);
                    if (!conv || !conv.external_contact_phone) {
                        message.warning("Selected conversation has no phone number");
                        return;
                    }
                    toNumber = conv.external_contact_phone;
                    if (values.messaging_service_sid) {
                        messagingServiceSid = values.messaging_service_sid;
                    } else if (values.from_number) {
                        fromNumber = values.from_number;
                    } else {
                        const whatsAppPhoneNumbers = phoneNumbers.filter((pn: PhoneNumber) => phoneHasWhatsAppSender(pn));
                        fromNumber = whatsAppPhoneNumbers[0]?.phone_number;
                    }
                }

                if (!toNumber) {
                    message.warning("Please enter recipient phone number");
                    return;
                }
                if (!fromNumber && !messagingServiceSid) {
                    message.warning("Please select a WhatsApp-enabled number or enter a Messaging Service SID");
                    return;
                }

                await sendTwilioWhatsAppMessage({
                    shop_id: shopId,
                    from_number: fromNumber,
                    messaging_service_sid: messagingServiceSid,
                    to_number: toNumber,
                    body: values.message,
                    use_template: values.use_template,
                    content_sid: values.content_sid,
                    template_params: values.template_params,
                });

                message.success("WhatsApp message sent successfully");
                setNewWhatsAppModalOpen(false);
                whatsappForm.resetFields();
                queryClient.invalidateQueries({ queryKey: ["twilio-whatsapp-conversations", shopId, activeTab] });
                if (values.conversation_id) {
                    queryClient.invalidateQueries({ queryKey: ["twilio-whatsapp-messages", values.conversation_id] });
                }
            } else if (connected.whatsapp) {
                // Send to existing Meta conversation
                if (!values.conversation_id) {
                    message.warning("Please select a conversation to send the message to");
                    return;
                }
                await sendTextMessage({
                    conversation_id: values.conversation_id,
                    content: values.message,
                });
                message.success("WhatsApp message sent successfully");
                setNewWhatsAppModalOpen(false);
                whatsappForm.resetFields();
                queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
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

    // Agent status management
    const handleToggleAvailability = async (checked: boolean) => {
        try {
            const newStatus = checked ? 'available' : 'offline';
            await updateAgentStatus({
                shop_id: shopId,
                agent_id: userId || '',
                status: newStatus,
                capabilities: { voice: true, chat: true },
            });
            setIsAvailable(checked);
            
            if (checked) {
                // Start heartbeat
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
                heartbeatIntervalRef.current = window.setInterval(async () => {
                    try {
                        await updateAgentHeartbeat(userId || '');
                    } catch (error) {
                        console.error('Heartbeat failed:', error);
                    }
                }, 60_000); // Every minute
            } else {
                // Stop heartbeat
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }
            }
            
            message.success(`Agent status set to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update agent status:', error);
            message.error('Failed to update agent status');
        }
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
                    <Col xs={24} style={{ display: "flex", flexDirection: "column" }}>
                        <Card
                            style={{ borderRadius: 12, flex: 1, display: "flex", flexDirection: "column" }}
                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden" } }}
                        >
                            <Tabs
                                activeKey={activeTab}
                                onChange={(key) => setActiveTab(key as ActiveTab)}
                                items={[
                                    {
                                        key: 'calls',
                                        label: (
                                            <Space>
                                                <PhoneOutlined />
                                                <span>Calls</span>
                                                <Badge count={callStats.total} size="small" />
                                            </Space>
                                        ),
                                        children: (
                                            <div style={{ padding: 16 }}>
                                                {/* Call Statistics */}
                                                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                                    <Col xs={24} sm={6}>
                                                        <Card>
                                                            <Statistic
                                                                title="Total Calls"
                                                                value={callStats.total}
                                                                prefix={<PhoneOutlined style={{ color: "#1890ff" }} />}
                                                                valueStyle={{ color: "#1890ff", fontSize: 24, fontWeight: 600 }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                    <Col xs={24} sm={6}>
                                                        <Card>
                                                            <Statistic
                                                                title="Successful Calls"
                                                                value={callStats.successful}
                                                                prefix={<TrophyOutlined style={{ color: "#52c41a" }} />}
                                                                valueStyle={{ color: "#52c41a", fontSize: 24, fontWeight: 600 }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                    <Col xs={24} sm={6}>
                                                        <Card>
                                                            <Statistic
                                                                title="Missed Calls"
                                                                value={callStats.missed}
                                                                prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                                                                valueStyle={{ color: "#ff4d4f", fontSize: 24, fontWeight: 600 }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                    <Col xs={24} sm={6}>
                                                        <Card>
                                                            <Statistic
                                                                title="Pending Callbacks"
                                                                value={missedCallStatsData?.total_pending || missedCallsData?.assignments?.length || 0}
                                                                prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
                                                                valueStyle={{ color: "#faad14", fontSize: 24, fontWeight: 600 }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                </Row>

                                                {/* Agent Monitoring */}
                                                <Card title="Agent Status" style={{ marginBottom: 16 }}>
                                                    <Row gutter={[16, 16]} align="middle">
                                                        <Col xs={24} sm={12}>
                                                            <Space direction="vertical" size={4}>
                                                                <Text type="secondary">My Availability</Text>
                                                                <Switch
                                                                    checked={isAvailable}
                                                                    onChange={handleToggleAvailability}
                                                                    checkedChildren="Available"
                                                                    unCheckedChildren="Offline"
                                                                    style={{ minWidth: 90 }}
                                                                />
                                                            </Space>
                                                        </Col>
                                                        <Col xs={24} sm={12}>
                                                            <Statistic
                                                                title="Agents On Call"
                                                                value={activeCallsData?.active_calls?.length || 0}
                                                                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                                                                valueStyle={{ color: "#722ed1", fontSize: 20, fontWeight: 600 }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </Card>

                                                {/* Missed Calls Section */}
                                                <Card 
                                                    title="Missed Calls" 
                                                    style={{ marginBottom: 16 }}
                                                    extra={
                                                        <Badge 
                                                            count={missedCallsData?.assignments?.length || 0} 
                                                            size="small" 
                                                            style={{ backgroundColor: '#ff4d4f' }}
                                                        />
                                                    }
                                                >
                                                    {missedCallsData?.assignments?.length > 0 ? (
                                                        <List
                                                            dataSource={missedCallsData.assignments}
                                                            renderItem={(assignment: { _id: string; contact_name?: string; contact_phone: string; status: string; assigned_at: string }) => (
                                                                <List.Item
                                                                    actions={[
                                                                        <Button 
                                                                            type="primary" 
                                                                            size="small" 
                                                                            icon={<PhoneFilled />}
                                                                            onClick={async () => {
                                                                                // Set missed call in progress and pre-fill callback form
                                                                                await progressMissedCall(assignment._id, shopId);
                                                                                const phone = assignment.contact_phone || '';
                                                                                let countryCode = '+254';
                                                                                let localNumber = phone;
                                                                                
                                                                                if (phone.startsWith('+')) {
                                                                                    const match = phone.match(/^\+(\d{1,3})(\d+)$/);
                                                                                    if (match) {
                                                                                        countryCode = '+' + match[1];
                                                                                        localNumber = match[2];
                                                                                    }
                                                                                }
                                                                                
                                                                                callForm.setFieldsValue({
                                                                                    phone_number_id: phoneNumbers[0]?._id,
                                                                                    country_code: countryCode,
                                                                                    phone_number: localNumber,
                                                                                    record: true,
                                                                                });
                                                                                setNewCallModalOpen(true);
                                                                                queryClient.invalidateQueries({ queryKey: ["missed-calls"] });
                                                                            }}
                                                                        >
                                                                            Callback
                                                                        </Button>
                                                                    ]}
                                                                >
                                                                    <List.Item.Meta
                                                                        avatar={<Avatar icon={<PhoneOutlined />} />}
                                                                        title={
                                                                            <Space>
                                                                                <Text strong>{assignment.contact_name || 'Unknown'}</Text>
                                                                                <Text type="secondary">{assignment.contact_phone}</Text>
                                                                            </Space>
                                                                        }
                                                                        description={
                                                                            <Space>
                                                                                <Tag color="red">{assignment.status}</Tag>
                                                                                <Text type="secondary">
                                                                                    {new Date(assignment.assigned_at).toLocaleString()}
                                                                                </Text>
                                                                            </Space>
                                                                        }
                                                                    />
                                                                </List.Item>
                                                            )}
                                                        />
                                                    ) : (
                                                        <Empty description="No missed calls" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                                    )}
                                                </Card>

                                                {/* Call History List */}
                                                <Card title="Recent Calls">
                                                    <List
                                                        dataSource={callHistory?.calls?.slice(0, 10) || []}
                                                        renderItem={(call: Call) => {
                                                            const statusColor = call.status === 'completed' ? 'green' : call.status === 'no-answer' ? 'red' : 'blue';
                                                            const displayName = call.contact_name
                                                                || (typeof call.customer_id === 'object' && call.customer_id?.customer_name)
                                                                || (call.direction === 'inbound' ? call.from_formatted || call.from_number : call.to_formatted || call.to_number)
                                                                || 'Unknown';
                                                            const agentName = typeof call.agent_id === 'object'
                                                                ? call.agent_id?.fullname
                                                                : call.agent_id || '—';
                                                            const duration = call.call_duration ?? call.duration ?? call.recording_duration ?? 0;
                                                            const needsCallback = ['no-answer', 'busy', 'failed'].includes(call.status || '');
                                                            const callbackNumber = call.direction === 'inbound'
                                                                ? (call.from_formatted || call.from_number)
                                                                : (call.to_formatted || call.to_number);

                                                            const actions: React.ReactNode[] = [];
                                                            if (call.recording_url) {
                                                                actions.push(
                                                                    <Button
                                                                        key="play"
                                                                        type="primary"
                                                                        size="small"
                                                                        icon={<PlayCircleOutlined />}
                                                                        onClick={() => {
                                                                            setSelectedRecording(call);
                                                                            setRecordingModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Play
                                                                    </Button>
                                                                );
                                                            } else {
                                                                actions.push(
                                                                    <Text key="no-rec" type="secondary" style={{ fontSize: 12 }}>
                                                                        No recording
                                                                    </Text>
                                                                );
                                                            }
                                                            if (call.recording_url && call.transcription_status === 'completed' && call.transcription_text) {
                                                                actions.push(
                                                                    <Button
                                                                        key="view-transcript"
                                                                        size="small"
                                                                        onClick={() => {
                                                                            setSelectedRecording(call);
                                                                            setRecordingModalOpen(true);
                                                                        }}
                                                                    >
                                                                        View transcript
                                                                    </Button>
                                                                );
                                                            } else if (call.recording_url && call.transcription_status !== 'processing') {
                                                                actions.push(
                                                                    <Button
                                                                        key="transcribe"
                                                                        size="small"
                                                                        onClick={async () => {
                                                                            if (!call.call_sid) return;
                                                                            try {
                                                                                await transcribeCall({ call_sid: call.call_sid });
                                                                                message.success('Transcription requested');
                                                                                queryClient.invalidateQueries({ queryKey: ['twilio-call-history'] });
                                                                            } catch (error) {
                                                                                // message handled in service
                                                                            }
                                                                        }}
                                                                    >
                                                                        Transcribe
                                                                    </Button>
                                                                );
                                                            } else if (call.recording_url && call.transcription_status === 'processing') {
                                                                actions.push(<Spin key="transcribing" size="small" />);
                                                            }
                                                            if (needsCallback && callbackNumber) {
                                                                actions.push(
                                                                    <Button
                                                                        key="callback"
                                                                        type="default"
                                                                        size="small"
                                                                        icon={<PhoneFilled />}
                                                                        onClick={() => {
                                                                            const phone = callbackNumber || '';
                                                                            let countryCode = '+254';
                                                                            let localNumber = phone;
                                                                            if (phone.startsWith('+')) {
                                                                                const match = phone.match(/^\+(\d{1,3})(\d+)$/);
                                                                                if (match) {
                                                                                    countryCode = '+' + match[1];
                                                                                    localNumber = match[2];
                                                                                }
                                                                            }
                                                                            callForm.setFieldsValue({
                                                                                phone_number_id: phoneNumbers[0]?._id,
                                                                                country_code: countryCode,
                                                                                phone_number: localNumber,
                                                                                record: true,
                                                                            });
                                                                            setNewCallModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Callback
                                                                    </Button>
                                                                );
                                                            }

                                                            return (
                                                                <List.Item
                                                                    actions={actions}
                                                                >
                                                                    <List.Item.Meta
                                                                        avatar={<Avatar icon={call.direction === 'inbound' ? <PhoneFilled /> : <PhoneOutlined />} />}
                                                                        title={
                                                                            <Space>
                                                                                <Text strong>{displayName}</Text>
                                                                                <Tag color={statusColor}>{call.status}</Tag>
                                                                            </Space>
                                                                        }
                                                                        description={
                                                                            <Row gutter={[16, 4]} style={{ width: '100%' }}>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">From: </Text>
                                                                                    <Text>{call.from_formatted || call.from_number}</Text>
                                                                                </Col>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">To: </Text>
                                                                                    <Text>{call.to_formatted || call.to_number}</Text>
                                                                                </Col>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">Direction: </Text>
                                                                                    <Text style={{ textTransform: 'capitalize' }}>{call.direction}</Text>
                                                                                </Col>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">Duration: </Text>
                                                                                    <Text>{duration}s</Text>
                                                                                </Col>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">Agent: </Text>
                                                                                    <Text>{agentName}</Text>
                                                                                </Col>
                                                                                <Col xs={24} sm={12} md={8}>
                                                                                    <Text type="secondary">Date: </Text>
                                                                                    <Text>{new Date(call.createdAt || call.start_time || '').toLocaleString()}</Text>
                                                                                </Col>
                                                                            </Row>
                                                                        }
                                                                    />
                                                                </List.Item>
                                                            );
                                                        }}
                                                    />
                                                </Card>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'whatsapp',
                                        label: (
                                            <Space>
                                                <CommentOutlined />
                                                <span>WhatsApp</span>
                                                <Badge count={twilioWhatsAppConversations.length} size="small" />
                                            </Space>
                                        ),
                                        children: (
                                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <Row gutter={[16, 16]} style={{ height: '100%' }}>
                                                    {/* Left: Twilio WhatsApp Conversation List */}
                                                    <Col xs={24} lg={8} style={{ display: "flex", flexDirection: "column" }}>
                                                        <Card
                                                            title={
                                                                <Space>
                                                                    <MessageOutlined />
                                                                    <span>Conversations</span>
                                                                    <Badge count={twilioWhatsAppConversations.length} size="small" />
                                                                </Space>
                                                            }
                                                            extra={
                                                                <Space>
                                                                    <Button
                                                                        type="primary"
                                                                        icon={<FileOutlined />}
                                                                        onClick={() => setTemplatesModalOpen(true)}
                                                                        size="small"
                                                                    >
                                                                        Templates
                                                                    </Button>
                                                                    <Tooltip title="Refresh">
                                                                        <Button
                                                                            icon={<ReloadOutlined />}
                                                                            size="small"
                                                                            onClick={() => refetchTwilioWhatsAppConversations()}
                                                                            loading={twilioWhatsAppLoading}
                                                                        />
                                                                    </Tooltip>
                                                                </Space>
                                                            }
                                                            style={{ borderRadius: 12, flex: 1, display: "flex", flexDirection: "column" }}
                                                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden" } }}
                                                        >
                                                            {phoneNumbers.filter((pn: PhoneNumber) => phoneHasWhatsAppSender(pn)).length === 0 ? (
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
                                                                    <List
                                                                        loading={twilioWhatsAppLoading}
                                                                        dataSource={twilioWhatsAppConversations}
                                                                        renderItem={(conv: Conversation) => (
                                                                            <List.Item
                                                                                onClick={() => {
                                                                                    setSelectedTwilioConversation(conv);
                                                                                }}
                                                                                style={{
                                                                                    padding: '12px 16px',
                                                                                    cursor: 'pointer',
                                                                                    background: selectedTwilioConversation?._id === conv._id ? '#f0f7ff' : 'transparent',
                                                                                    borderBottom: '1px solid #f5f5f5',
                                                                                }}
                                                                            >
                                                                                <List.Item.Meta
                                                                                    avatar={<Avatar icon={<UserOutlined />} />}
                                                                                    title={
                                                                                        <Space>
                                                                                            <Text strong>{conv.external_contact_name || 'Unknown'}</Text>
                                                                                            {conv.unread_count > 0 && <Badge count={conv.unread_count} size="small" />}
                                                                                        </Space>
                                                                                    }
                                                                                    description={
                                                                                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                                                                            <Text type="secondary" style={{ fontSize: 12 }}>{conv.external_contact_phone}</Text>
                                                                                            <Text ellipsis style={{ fontSize: 12, maxWidth: 200 }}>{conv.last_message_preview}</Text>
                                                                                            {(conv.customer_id || conv.lead_id) && (
                                                                                                <Space size={4} style={{ marginTop: 4 }}>
                                                                                                    {conv.customer_id && (
                                                                                                        <Tag color="green" size="small">
                                                                                                            {(conv.customer_id as any).customer_name || 'Customer'}
                                                                                                        </Tag>
                                                                                                    )}
                                                                                                    {conv.lead_id && (
                                                                                                        <Tag color="orange" size="small">
                                                                                                            {(conv.lead_id as any).lead_name || 'Lead'}
                                                                                                        </Tag>
                                                                                                    )}
                                                                                                </Space>
                                                                                            )}
                                                                                        </Space>
                                                                                    }
                                                                                />
                                                                                <div style={{ textAlign: 'right' }}>
                                                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                                                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                                                                                    </Text>
                                                                                </div>
                                                                            </List.Item>
                                                                        )}
                                                                    />
                                                                </div>
                                                            )}
                                                        </Card>
                                                    </Col>

                                                    {/* Center: Twilio WhatsApp Message Thread */}
                                                    <Col xs={24} lg={16} style={{ display: "flex", flexDirection: "column" }}>
                                                        <Card
                                                            title={
                                                                selectedTwilioConversation ? (
                                                                    <Space>
                                                                        <Avatar size="small" icon={<UserOutlined />} />
                                                                        <span>{selectedTwilioConversation.external_contact_name || "Unknown"}</span>
                                                                        {selectedTwilioConversation.customer_id && (
                                                                            <Tag color="green" size="small">
                                                                                {(selectedTwilioConversation.customer_id as any).customer_name || 'Customer'}
                                                                            </Tag>
                                                                        )}
                                                                        {selectedTwilioConversation.lead_id && (
                                                                            <Tag color="orange" size="small">
                                                                                {(selectedTwilioConversation.lead_id as any).lead_name || 'Lead'}
                                                                            </Tag>
                                                                        )}
                                                                        {selectedTwilioConversation.external_contact_phone && (
                                                                            <Button 
                                                                                size="small" 
                                                                                type="text" 
                                                                                icon={<PhoneOutlined />}
                                                                                onClick={() => {
                                                                                    if (phoneNumbers.length > 0 && selectedTwilioConversation.external_contact_phone) {
                                                                                        const phoneNumber = selectedTwilioConversation.external_contact_phone;
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
                                                                                            entity_type: selectedTwilioConversation.customer_id ? "customer" : undefined,
                                                                                            customer_id: (selectedTwilioConversation.customer_id as any)?._id,
                                                                                            lead_id: (selectedTwilioConversation.lead_id as any)?._id,
                                                                                        });
                                                                                        setNewCallModalOpen(true);
                                                                                    } else {
                                                                                        message.warning("No phone number available");
                                                                                    }
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Space>
                                                                ) : "Conversation"
                                                            }
                                                            style={{ borderRadius: 12, flex: 1, display: "flex", flexDirection: "column" }}
                                                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden" } }}
                                                        >
                                                            {selectedTwilioConversation ? (
                                                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                                                                        <List
                                                                            loading={twilioWhatsAppMessagesLoading}
                                                                            dataSource={twilioWhatsAppMessages}
                                                                            renderItem={(msg: any) => (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                                                                                    marginBottom: 8,
                                                                                }}>
                                                                                    <div style={{
                                                                                        maxWidth: '70%',
                                                                                        padding: '8px 12px',
                                                                                        borderRadius: 12,
                                                                                        background: msg.direction === 'outbound' ? primaryColor : '#f5f5f5',
                                                                                        color: msg.direction === 'outbound' ? '#fff' : '#000',
                                                                                    }}>
                                                                                        {msg.media_url && (
                                                                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                                                                                Media
                                                                                            </a>
                                                                                        )}
                                                                                        <Text style={{ color: 'inherit' }}>{msg.content}</Text>
                                                                                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                                                                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                                                                        <Space.Compact style={{ width: '100%' }}>
                                                                            <Input
                                                                                placeholder="Type a message..."
                                                                                value={twilioWhatsAppMessage}
                                                                                onChange={(e) => setTwilioWhatsAppMessage(e.target.value)}
                                                                                onPressEnter={handleSendTwilioWhatsApp}
                                                                                style={{ flex: 1 }}
                                                                            />
                                                                            <Input
                                                                                placeholder="Media URL (optional)"
                                                                                value={twilioWhatsAppMediaUrl}
                                                                                onChange={(e) => setTwilioWhatsAppMediaUrl(e.target.value)}
                                                                                style={{ width: 180 }}
                                                                            />
                                                                            <Button
                                                                                type="primary"
                                                                                icon={<SendOutlined />}
                                                                                onClick={handleSendTwilioWhatsApp}
                                                                                loading={false}
                                                                            >
                                                                                Send
                                                                            </Button>
                                                                        </Space.Compact>
                                                                    </div>
                                                                </div>
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
                                                </Row>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
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
                            description="Please add a Twilio account in System Setup to make calls."
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    ) : null}
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
                                    label: `${pn.phone_number} (${pn.friendly_name || 'Twilio'})`,
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

                        {/* Caller Context Popup */}
                        {callerContext && (
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <UserOutlined />
                                        <span>Caller Context</span>
                                    </Space>
                                }
                                style={{ marginBottom: 16, backgroundColor: '#f0f5ff', borderColor: '#1890ff' }}
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                    {callerContext.customer && (
                                        <div>
                                            <Tag color="green">Customer</Tag>
                                            <Text strong style={{ display: 'block' }}>
                                                {callerContext.customer.customer_name || callerContext.customer.fullname || callerContext.customer.name}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Phone: {callerContext.customer.phone || callerContext.customer.phone_number}
                                            </Text>
                                            {callerContext.customer.email && (
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                                    Email: {callerContext.customer.email}
                                                </Text>
                                            )}
                                        </div>
                                    )}
                                    {callerContext.lead && (
                                        <div>
                                            <Tag color="blue">Lead</Tag>
                                            <Text strong style={{ display: 'block' }}>
                                                {callerContext.lead.lead_name || callerContext.lead.fullname || callerContext.lead.name}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Phone: {callerContext.lead.phone || callerContext.lead.phone_number}
                                            </Text>
                                            {callerContext.lead.email && (
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                                    Email: {callerContext.lead.email}
                                                </Text>
                                            )}
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        )}

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
                                onChange={(value) => {
                                    // Clear the ID field when entity type changes
                                    if (!value) {
                                        callForm.setFieldsValue({ customer_id: undefined, lead_id: undefined });
                                    }
                                }}
                                options={[
                                    { label: "Customer", value: "customer" },
                                    { label: "Lead", value: "lead" },
                                ]}
                            />
                        </Form.Item>

                        {callForm.getFieldValue('entity_type') === 'customer' && (
                            <Form.Item
                                label="Select Customer"
                                name="customer_id"
                                rules={[{ required: true, message: "Please select a customer" }]}
                            >
                                <Select
                                    placeholder="Search and select customer"
                                    showSearch
                                    optionFilterProp="label"
                                    options={customersData?.map((customer: { _id: string; fullname?: string; name?: string; phone?: string; email?: string }) => ({
                                        label: `${customer.fullname || customer.name} (${customer.phone || customer.email || 'No contact'})`,
                                        value: customer._id
                                    })) || []}
                                />
                            </Form.Item>
                        )}

                        {callForm.getFieldValue('entity_type') === 'lead' && (
                            <Form.Item
                                label="Select Lead"
                                name="lead_id"
                                rules={[{ required: true, message: "Please select a lead" }]}
                            >
                                <Select
                                    placeholder="Search and select lead"
                                    showSearch
                                    optionFilterProp="label"
                                    options={leadsData?.map((lead: { _id: string; fullname?: string; name?: string; phone?: string; email?: string }) => ({
                                        label: `${lead.fullname || lead.name} (${lead.phone || lead.email || 'No contact'})`,
                                        value: lead._id
                                    })) || []}
                                />
                            </Form.Item>
                        )}

                        <Form.Item
                            label="Add Participants (Optional)"
                            name="additional_participants"
                            tooltip="Add more people to the conference call"
                        >
                            <Select
                                mode="tags"
                                placeholder="Enter phone numbers to add to conference"
                                tokenSeparators={[',']}
                                style={{ width: '100%' }}
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
                        initialValues={{ mode: "existing" }}
                    >
                        <Form.Item
                            label="Send To"
                            name="mode"
                            rules={[{ required: true }]}
                        >
                            <Select
                                disabled={!anyConnected}
                                options={[
                                    { label: "Existing conversation", value: "existing" },
                                    { label: "New phone number", value: "new" },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prev, current) => prev.mode !== current.mode}>
                            {({ getFieldValue }) =>
                                getFieldValue("mode") === "new" ? (
                                    <>
                                        <Form.Item
                                            label="From Phone Number"
                                            name="from_number"
                                        >
                                            <Select
                                                placeholder="Select a WhatsApp-enabled number (or use messaging service)"
                                                disabled={!anyConnected}
                                                options={phoneNumbers
                                                    .filter((pn: PhoneNumber) => phoneHasWhatsAppSender(pn))
                                                    .map((pn: PhoneNumber) => ({
                                                        label: `${pn.friendly_name || pn.phone_number} (${pn.phone_number})`,
                                                        value: pn.phone_number,
                                                    }))}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label="OR Messaging Service SID"
                                            name="messaging_service_sid"
                                        >
                                            <Input
                                                placeholder="MG..."
                                                disabled={!anyConnected}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label="To Phone Number"
                                            name="to_number"
                                            rules={[{ required: true, message: "Please enter recipient phone number" }]}
                                        >
                                            <Input
                                                placeholder="e.g. +254712345678"
                                                disabled={!anyConnected}
                                            />
                                        </Form.Item>
                                    </>
                                ) : (
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
                                            options={hasTwilioWhatsApp
                                                ? twilioWhatsAppConversations.map((conv: Conversation) => ({
                                                    label: `${conv.external_contact_name} (${conv.external_contact_phone || conv.external_contact_id})`,
                                                    value: conv._id,
                                                }))
                                                : conversations.map((conv: Conversation) => ({
                                                    label: `${conv.external_contact_name} (${conv.external_contact_phone || conv.external_contact_id})`,
                                                    value: conv._id,
                                                }))}
                                        />
                                    </Form.Item>
                                )
                            }
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

                {/* WhatsApp Templates Modal */}
                <Modal
                    title={
                        <Space>
                            <FileOutlined />
                            <span>WhatsApp Templates</span>
                        </Space>
                    }
                    open={templatesModalOpen}
                    onCancel={() => setTemplatesModalOpen(false)}
                    footer={null}
                    width={600}
                >
                    <div style={{ marginBottom: 16, textAlign: "right" }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setShowTemplateForm(true)}
                            disabled={showTemplateForm}
                        >
                            Add New Template
                        </Button>
                    </div>

                    {showTemplateForm && (
                        <Card
                            title="Create New Template"
                            extra={
                                <Button
                                    type="text"
                                    icon={<CloseCircleOutlined />}
                                    onClick={() => {
                                        setShowTemplateForm(false);
                                        templateForm.resetFields();
                                    }}
                                >
                                    Cancel
                                </Button>
                            }
                            style={{ marginBottom: 16 }}
                        >
                            <Form
                                form={templateForm}
                                layout="vertical"
                                onFinish={async (values) => {
                                    try {
                                        const twilioAccountId = values.twilio_account_id || (phoneNumbers[0]?.twilio_account_id?._id || "");
                                        await createTwilioWhatsAppTemplate({
                                            shop_id: shopId,
                                            twilio_account_id: twilioAccountId,
                                            name: values.name,
                                            body: values.body,
                                            language: values.language,
                                            category: values.category,
                                            variables: values.variables ? values.variables.split(",").map((v: string) => v.trim()) : [],
                                        });
                                        refetchTwilioWhatsAppTemplates();
                                        setShowTemplateForm(false);
                                        templateForm.resetFields();
                                    } catch (error) {
                                        console.error("Failed to add template:", error);
                                    }
                                }}
                            >
                                <Form.Item
                                    label="Template Name"
                                    name="name"
                                    rules={[{ required: true, message: "Please enter template name" }]}
                                >
                                    <Input placeholder="e.g. Order Confirmation" />
                                </Form.Item>
                                <Form.Item
                                    label="Template Body"
                                    name="body"
                                    rules={[{ required: true, message: "Please enter template body" }]}
                                >
                                    <TextArea
                                        placeholder="Hello {{customer_name}}, your order {{order_id}} is confirmed."
                                        autoSize={{ minRows: 3, maxRows: 6 }}
                                    />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Language"
                                            name="language"
                                            initialValue="en"
                                        >
                                            <Input placeholder="en" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Category"
                                            name="category"
                                            initialValue="UTILITY"
                                        >
                                            <Select
                                                options={[
                                                    { label: "Marketing", value: "MARKETING" },
                                                    { label: "Utility", value: "UTILITY" },
                                                    { label: "Authentication", value: "AUTHENTICATION" },
                                                ]}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item
                                    label="Variables (comma separated)"
                                    name="variables"
                                >
                                    <Input placeholder="order_id, customer_name" />
                                </Form.Item>
                                <Form.Item
                                    label="Twilio Account"
                                    name="twilio_account_id"
                                >
                                    <Select
                                        placeholder="Select Twilio account"
                                        options={phoneNumbers
                                            .map((pn: PhoneNumber) => pn.twilio_account_id)
                                            .filter((acc, index, self) => acc && self.findIndex((a) => a?._id === acc?._id) === index)
                                            .map((acc) => ({
                                                label: `${acc?.account_type || "Account"} - ${acc?._id || ""}`,
                                                value: acc?._id,
                                            }))}
                                    />
                                </Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        Submit to Twilio
                                    </Button>
                                    <Button onClick={() => {
                                        setShowTemplateForm(false);
                                        templateForm.resetFields();
                                    }}>
                                        Cancel
                                    </Button>
                                </Space>
                            </Form>
                        </Card>
                    )}

                    <List
                        loading={!twilioWhatsAppTemplatesData}
                        grid={{ gutter: 16, column: 1 }}
                        dataSource={twilioWhatsAppTemplates}
                        locale={{ emptyText: <Empty description="No WhatsApp templates yet" /> }}
                        renderItem={(tmpl: any) => (
                            <List.Item>
                                <Card
                                    size="small"
                                    title={
                                        <Space>
                                            <Text strong>{tmpl.name}</Text>
                                            <Tag color={
                                                tmpl.status === "approved" ? "green" :
                                                tmpl.status === "rejected" ? "red" : "orange"
                                            }>
                                                {tmpl.status || "pending"}
                                            </Tag>
                                        </Space>
                                    }
                                    extra={
                                        <Space>
                                            {tmpl.status !== "approved" && (
                                                <Button
                                                    size="small"
                                                    onClick={async () => {
                                                        try {
                                                            await getTwilioWhatsAppTemplateStatus(tmpl._id);
                                                            refetchTwilioWhatsAppTemplates();
                                                            message.success("Template status refreshed");
                                                        } catch (error) {
                                                            console.error("Failed to refresh template status:", error);
                                                            message.error("Failed to refresh status");
                                                        }
                                                    }}
                                                >
                                                    Refresh Status
                                                </Button>
                                            )}
                                            <Button
                                                danger
                                                size="small"
                                                onClick={async () => {
                                                    try {
                                                        await deleteTwilioWhatsAppTemplate(tmpl._id);
                                                        refetchTwilioWhatsAppTemplates();
                                                    } catch (error) {
                                                        console.error("Failed to delete template:", error);
                                                    }
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </Space>
                                    }
                                >
                                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                                        <Text type="secondary">{tmpl.content_sid}</Text>
                                        <Text>{tmpl.body}</Text>
                                        <Space wrap>
                                            <Tag>{tmpl.language}</Tag>
                                            <Tag>{tmpl.category}</Tag>
                                            {tmpl.variables?.map((v: string) => (
                                                <Tag key={v} color="blue">{`{{${v}}}`}</Tag>
                                            ))}
                                        </Space>
                                    </Space>
                                </Card>
                            </List.Item>
                        )}
                    />
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
                    additionalParticipants={currentCallInfo?.additionalParticipants}
                    onEndCall={handleCallInterfaceEnd}
                    onMuteToggle={handleCallMute}
                    onHoldToggle={handleCallHold}
                    onSpeakerToggle={handleCallSpeaker}
                />

                {/* Recording Playback Modal */}
                <Modal
                    title="Call Recording"
                    open={recordingModalOpen}
                    onCancel={() => setRecordingModalOpen(false)}
                    footer={null}
                    width={620}
                    destroyOnClose
                >
                    {selectedRecording && (
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <audio
                                controls
                                src={selectedRecording.recording_url}
                                style={{ width: '100%' }}
                            />
                            <Button
                                type="primary"
                                href={selectedRecording.recording_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open / Download recording
                            </Button>
                            <Divider style={{ margin: '12px 0' }} />
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <div>
                                    <Text type="secondary">From: </Text>
                                    <Text strong>{selectedRecording.from_formatted || selectedRecording.from_number}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">To: </Text>
                                    <Text strong>{selectedRecording.to_formatted || selectedRecording.to_number}</Text>
                                </div>
                                {selectedRecording.contact_name && (
                                    <div>
                                        <Text type="secondary">Contact: </Text>
                                        <Text strong>{selectedRecording.contact_name}</Text>
                                    </div>
                                )}
                                <div>
                                    <Text type="secondary">Status: </Text>
                                    <Text strong>{selectedRecording.status}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">Direction: </Text>
                                    <Text strong>{selectedRecording.direction}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">Duration: </Text>
                                    <Text strong>{selectedRecording.duration || selectedRecording.recording_duration}s</Text>
                                </div>
                                <div>
                                    <Text type="secondary">Date: </Text>
                                    <Text strong>{new Date(selectedRecording.createdAt || selectedRecording.start_time || '').toLocaleString()}</Text>
                                </div>
                            </Space>
                            <Divider style={{ margin: '12px 0' }} />
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Transcription</Text>
                                {selectedRecording.transcription_status === 'completed' && selectedRecording.transcription_text ? (
                                    <div style={{ background: '#f6f6f6', padding: 12, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                                        <Text>{selectedRecording.transcription_text}</Text>
                                    </div>
                                ) : selectedRecording.transcription_status === 'processing' ? (
                                    <Space>
                                        <Spin size="small" />
                                        <Text type="secondary">Transcription in progress...</Text>
                                    </Space>
                                ) : (
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <Text type="secondary">No transcription available yet.</Text>
                                        <Button
                                            size="small"
                                            type="primary"
                                            onClick={async () => {
                                                if (!selectedRecording.call_sid) return;
                                                try {
                                                    await transcribeCall({ call_sid: selectedRecording.call_sid });
                                                    message.success('Transcription requested');
                                                    queryClient.invalidateQueries({ queryKey: ['twilio-call-history'] });
                                                    setSelectedRecording({ ...selectedRecording, transcription_status: 'processing' });
                                                } catch (error) {
                                                    // message handled in service
                                                }
                                            }}
                                        >
                                            Transcribe recording
                                        </Button>
                                    </Space>
                                )}
                            </div>
                        </Space>
                    )}
                </Modal>
            </div>
        </App>
    );
};

export default OmnichannelInboxPage;
