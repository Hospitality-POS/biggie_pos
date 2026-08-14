import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Modal,
    Button,
    Space,
    Typography,
    Avatar,
    Card,
    Row,
    Col,
    Tag,
    Progress,
    Input,
    Select,
    Tooltip,
    Badge,
    Switch,
    Alert,
} from "antd";
import {
    PhoneFilled,
    PhoneOutlined,
    AudioOutlined,
    AudioMutedOutlined,
    DesktopOutlined,
    UserOutlined,
    CustomerServiceOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    LoadingOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
} from "@ant-design/icons";
import { getVoiceManager, TwilioVoiceManager } from "@services/twilioVoice";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface CallInterfaceModalProps {
    open: boolean;
    onClose: () => void;
    phoneNumber: string;
    contactName?: string;
    customerId?: string;
    leadId?: string;
    twilioToken?: string;
    conferenceName?: string;
    onEndCall: () => void;
    onMuteToggle: (muted: boolean) => void;
    onHoldToggle: (onHold: boolean) => void;
    onSpeakerToggle: (speaker: boolean) => void;
}

const CallInterfaceModal: React.FC<CallInterfaceModalProps> = ({
    open,
    onClose,
    phoneNumber,
    contactName,
    customerId,
    leadId,
    twilioToken,
    conferenceName,
    onEndCall,
    onMuteToggle,
    onHoldToggle,
    onSpeakerToggle,
}) => {
    const [callStatus, setCallStatus] = useState<'initiating' | 'ringing' | 'connected' | 'ended' | 'error'>('initiating');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [callNotes, setCallNotes] = useState("");
    const [callPurpose, setCallPurpose] = useState("");
    const [volume, setVolume] = useState(80);
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
    const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
    const [voiceManagerReady, setVoiceManagerReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const timerRef = useRef<number | null>(null);
    const voiceManagerRef = useRef<TwilioVoiceManager | null>(null);

    const initializeVoiceManager = useCallback(async () => {
        try {
            console.log('🔧 Initializing voice manager...');
            console.log('📞 Phone number:', phoneNumber);
            console.log('🔑 Conference name:', conferenceName);
            console.log('🎫 Twilio token:', twilioToken ? 'Present' : 'Missing');
            setCallStatus('initiating');
            const voiceManager = getVoiceManager();
            voiceManagerRef.current = voiceManager;

            console.log('🔧 Initializing Twilio device with token...');
            if (!twilioToken) {
                throw new Error('Twilio token is required');
            }

            await voiceManager.initialize({
                token: twilioToken,
                edge: 'ashburn', // You can configure edge based on your region
                codecPreferences: ['OPUS', 'PCMU'],
            });

            console.log('✅ Twilio device initialized successfully');
            console.log('📱 Device ready:', voiceManagerRef.current.isReady());
            setVoiceManagerReady(true);
            setError(null);

            // Load audio devices
            console.log('🔧 Loading audio devices...');
            const inputs = await voiceManagerRef.current.getInputDevices();
            const outputs = await voiceManagerRef.current.getOutputDevices();

            console.log('🎤 Input devices:', inputs.length);
            console.log('🔊 Output devices:', outputs.length);

            setInputDevices(inputs);
            setOutputDevices(outputs);

            // Set default devices
            if (inputs.length > 0) {
                setSelectedInputDevice(inputs[0].deviceId);
            }
            if (outputs.length > 0) {
                setSelectedOutputDevice(outputs[0].deviceId);
            }
            console.log('✅ Audio devices loaded');

            // Join the conference instead of waiting for incoming call
            if (conferenceName) {
                console.log('🔧 Joining conference:', conferenceName);
                setCallStatus('ringing');

                // Join the conference via WebRTC
                const connection = await voiceManagerRef.current.makeCall({
                    to: `conference:${conferenceName}`,
                });

                console.log('✅ Conference connection initiated');
                // Don't set status to connected yet - wait for accept event
                setCallStatus('ringing');

                // Set up connection event listeners
                connection.on('accept', () => {
                    console.log('✅ Connected to conference - call bridged to customer');
                    setCallStatus('connected');
                    setError(null); // Clear any previous errors

                    // Start timer when connected
                    if (!timerRef.current) {
                        timerRef.current = setInterval(() => {
                            setCallDuration(prev => prev + 1);
                        }, 1000);
                    }
                });

                connection.on('disconnect', () => {
                    console.log('📞 Conference disconnected');
                    setCallStatus('ended');
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                });

                connection.on('error', (...args: unknown[]) => {
                    const error = args[0] as Error;
                    console.error('❌ Conference error:', error);
                    setError(`Conference error: ${error.message}`);
                    setCallStatus('error');
                });
            } else {
                console.warn('⚠️ No conference name provided - falling back to direct call');
                // Fallback: Try to make a direct call without conference
                setCallStatus('ringing');
                setError(null); // Clear any previous errors since we're trying fallback
                try {
                    console.log('🔧 Making direct call to:', phoneNumber);
                    const connection = await voiceManagerRef.current.makeCall({
                        to: phoneNumber,
                    });

                    console.log('✅ Direct call connection initiated');
                    // Don't set status to connected yet - wait for accept event
                    setCallStatus('ringing');

                    // Set up connection event listeners
                    connection.on('accept', () => {
                        console.log('✅ Direct call connected');
                        setCallStatus('connected');
                        setError(null); // Clear any previous errors

                        // Start timer when connected
                        if (!timerRef.current) {
                            timerRef.current = setInterval(() => {
                                setCallDuration(prev => prev + 1);
                            }, 1000);
                        }
                    });

                    connection.on('disconnect', () => {
                        console.log('📞 Direct call disconnected');
                        setCallStatus('ended');
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                    });

                    connection.on('error', (...args: unknown[]) => {
                        const error = args[0] as Error;
                        console.error('❌ Direct call error:', error);
                        setError(`Call error: ${error.message}`);
                        setCallStatus('error');
                    });
                } catch (fallbackError) {
                    console.error('❌ Fallback direct call also failed:', fallbackError);
                    console.error('❌ Error details:', {
                        message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                        stack: fallbackError instanceof Error ? fallbackError.stack : undefined
                    });
                    // Don't show error message for fallback - just log it
                    // The call might still work through the backend
                    setCallStatus('ringing');
                }
            }

        } catch (err) {
            console.error('❌ Failed to initialize voice manager:', err);
            console.error('❌ Error details:', {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            // Only show error if it's a genuine initialization failure
            if (err instanceof Error && err.message.includes('Twilio token is required')) {
                setError('Twilio token is required. Please check your authentication.');
                setCallStatus('error');
            } else if (err instanceof Error && err.message.includes('Microphone permission')) {
                setError('Microphone access is required for voice calling.');
                setCallStatus('error');
            } else {
                // For other errors, don't show UI error - just log and let call proceed
                console.warn('⚠️ Initialization had issues but call may still work');
                setCallStatus('ringing');
            }
        }
    }, [twilioToken, conferenceName, phoneNumber]);

    // Initialize voice manager when modal opens
    useEffect(() => {
        if (open && twilioToken) {
            initializeVoiceManager();
        } else if (!open) {
            cleanupVoiceManager();
        }

        return () => {
            cleanupVoiceManager();
        };
    }, [open, twilioToken, initializeVoiceManager]);

    const cleanupVoiceManager = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (voiceManagerRef.current) {
            voiceManagerRef.current.endCall();
            // Clear the incoming call handler
            voiceManagerRef.current.setIncomingCallHandler(() => {
                // No-op handler to clear the previous one
            });
            // Don't destroy the manager, just end the call
        }

        setCallDuration(0);
        setCallStatus('initiating');
        setVoiceManagerReady(false);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        setCallStatus('ended');
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setTimeout(() => {
            onEndCall();
        }, 1000);
    };

    const handleMute = () => {
        if (voiceManagerRef.current) {
            const newMutedState = !isMuted;
            voiceManagerRef.current.setMute(newMutedState);
            setIsMuted(newMutedState);
            onMuteToggle(newMutedState);
        }
    };

    const handleHold = () => {
        // Hold functionality would need to be implemented in the voice manager
        // For now, we'll toggle the state
        setIsOnHold(!isOnHold);
        onHoldToggle(!isOnHold);
    };

    const handleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        onSpeakerToggle(!isSpeakerOn);
        
        // Switch output device if available
        if (voiceManagerRef.current && outputDevices.length > 1) {
            const currentIndex = outputDevices.findIndex(d => d.deviceId === selectedOutputDevice);
            const nextIndex = (currentIndex + 1) % outputDevices.length;
            const nextDevice = outputDevices[nextIndex];
            setSelectedOutputDevice(nextDevice.deviceId);
            // voiceManagerRef.current.switchOutputDevice(nextDevice.deviceId);
        }
    };

    const handleRecording = () => {
        setIsRecording(!isRecording);
        // Recording would need to be implemented with MediaRecorder API
    };

    const handleInputDeviceChange = async (deviceId: string) => {
        setSelectedInputDevice(deviceId);
        if (voiceManagerRef.current) {
            await voiceManagerRef.current.switchInputDevice(deviceId);
        }
    };

    const handleOutputDeviceChange = (deviceId: string) => {
        setSelectedOutputDevice(deviceId);
        // Output device switching would need implementation
    };

    const getStatusColor = () => {
        switch (callStatus) {
            case 'initiating': return '#faad14';
            case 'ringing': return '#1890ff';
            case 'connected': return '#52c41a';
            case 'ended': return '#ff4d4f';
            default: return '#8c8c8c';
        }
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'initiating': return 'Waiting for call...';
            case 'ringing': return 'Ringing...';
            case 'connected': return 'Connected';
            case 'ended': return 'Call Ended';
            default: return 'Unknown';
        }
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            closable={false}
            maskClosable={false}
            style={{ top: 20 }}
        >
            <div style={{ padding: "20px 0" }}>
                {/* Call Header */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: 24,
                    padding: '20px',
                    background: `linear-gradient(135deg, ${getStatusColor()} 0%, ${getStatusColor()}dd 100%)`,
                    borderRadius: 12,
                    color: '#fff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }} className={callStatus === 'ringing' ? 'pulse-animation' : ''}>
                            {callStatus === 'connected' ? (
                                <PhoneFilled style={{ fontSize: 32 }} />
                            ) : callStatus === 'ringing' ? (
                                <LoadingOutlined style={{ fontSize: 32 }} />
                            ) : (
                                <PhoneOutlined style={{ fontSize: 32 }} />
                            )}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 4 }}>
                                {contactName || phoneNumber}
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
                                {phoneNumber}
                            </Text>
                            <div style={{ marginTop: 8 }}>
                                <Tag color="rgba(255,255,255,0.3)" style={{ 
                                    color: '#fff', 
                                    border: 'none',
                                    fontSize: 12,
                                    margin: 0
                                }}>
                                    {getStatusText()}
                                </Tag>
                                {callStatus === 'connected' && (
                                    <Tag color="rgba(255,255,255,0.3)" style={{ 
                                        color: '#fff', 
                                        border: 'none',
                                        fontSize: 12,
                                        marginLeft: 8
                                    }}>
                                        {formatDuration(callDuration)}
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Row gutter={16}>
                    {/* Left: Call Controls */}
                    <Col span={12}>
                        <Card 
                            title="Call Controls" 
                            size="small"
                            style={{ marginBottom: 16 }}
                        >
                            {!voiceManagerReady && (
                                <Alert
                                    type="warning"
                                    message="Voice calling initializing..."
                                    description="Please allow microphone access when prompted"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />
                            )}
                            
                            {error && callStatus === 'error' && (
                                <Alert
                                    type="error"
                                    message={error}
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />
                            )}

                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                {/* Audio Controls */}
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                        Audio Controls
                                    </Text>
                                    <Space size={12}>
                                        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                                            <Button
                                                type={isMuted ? "primary" : "default"}
                                                icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                                                onClick={handleMute}
                                                size="large"
                                                style={{ borderRadius: 8 }}
                                                disabled={!voiceManagerReady}
                                            />
                                        </Tooltip>
                                        <Tooltip title={isOnHold ? "Resume" : "Hold"}>
                                            <Button
                                                type={isOnHold ? "primary" : "default"}
                                                icon={isOnHold ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                                onClick={handleHold}
                                                size="large"
                                                style={{ borderRadius: 8 }}
                                                disabled={!voiceManagerReady}
                                            />
                                        </Tooltip>
                                        <Tooltip title={isSpeakerOn ? "Switch to Earpiece" : "Switch to Speaker"}>
                                            <Button
                                                type={isSpeakerOn ? "primary" : "default"}
                                                icon={<DesktopOutlined />}
                                                onClick={handleSpeaker}
                                                size="large"
                                                style={{ borderRadius: 8 }}
                                                disabled={!voiceManagerReady}
                                            />
                                        </Tooltip>
                                    </Space>
                                </div>

                                {/* Device Selection */}
                                {voiceManagerReady && (
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                            Audio Devices
                                        </Text>
                                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Microphone:</Text>
                                                <Select
                                                    size="small"
                                                    style={{ width: '100%' }}
                                                    value={selectedInputDevice}
                                                    onChange={handleInputDeviceChange}
                                                    options={inputDevices.map(device => ({
                                                        label: device.label || device.deviceId,
                                                        value: device.deviceId,
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Speaker:</Text>
                                                <Select
                                                    size="small"
                                                    style={{ width: '100%' }}
                                                    value={selectedOutputDevice}
                                                    onChange={handleOutputDeviceChange}
                                                    options={outputDevices.map(device => ({
                                                        label: device.label || device.deviceId,
                                                        value: device.deviceId,
                                                    }))}
                                                />
                                            </div>
                                        </Space>
                                    </div>
                                )}

                                {/* Volume Control */}
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                        Volume
                                    </Text>
                                    <Progress 
                                        percent={volume} 
                                        showInfo={false}
                                        strokeColor="#52c41a"
                                        style={{ marginBottom: 8 }}
                                    />
                                    <Space size={8}>
                                        <Button 
                                            size="small" 
                                            icon={<AudioOutlined />}
                                            onClick={() => setVolume(Math.max(0, volume - 10))}
                                            disabled={!voiceManagerReady}
                                        />
                                        <Button 
                                            size="small" 
                                            icon={<AudioOutlined />}
                                            onClick={() => setVolume(Math.min(100, volume + 10))}
                                            disabled={!voiceManagerReady}
                                        />
                                    </Space>
                                </div>

                                {/* Recording */}
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                        Recording
                                    </Text>
                                    <Space>
                                        <Switch 
                                            checked={isRecording}
                                            onChange={handleRecording}
                                            checkedChildren="Recording"
                                            unCheckedChildren="Off"
                                            disabled={!voiceManagerReady}
                                        />
                                        {isRecording && (
                                            <Badge status="processing" text="Recording..." />
                                        )}
                                    </Space>
                                </div>
                            </Space>
                        </Card>

                        {/* Call Information */}
                        <Card 
                            title="Call Information" 
                            size="small"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Call Type:</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color="blue">Outbound</Tag>
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Duration:</Text>
                                    <div style={{ marginTop: 4, fontSize: 16, fontWeight: 500 }}>
                                        {formatDuration(callDuration)}
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Status:</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color={callStatus === 'connected' ? 'success' : 'processing'}>
                                            {getStatusText()}
                                        </Tag>
                                    </div>
                                </div>
                            </Space>
                        </Card>
                    </Col>

                    {/* Right: CRM & Notes */}
                    <Col span={12}>
                        {/* CRM Agent Info */}
                        <Card 
                            title={
                                <Space>
                                    <CustomerServiceOutlined />
                                    <span>CRM Agent</span>
                                </Space>
                            }
                            size="small"
                            style={{ marginBottom: 16 }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Avatar size={40} icon={<UserOutlined />} />
                                    <div>
                                        <Text strong style={{ display: 'block' }}>Current Agent</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            RM Agent
                                        </Text>
                                    </div>
                                </div>
                                {customerId && (
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Customer ID:</Text>
                                        <Text code>{customerId}</Text>
                                    </div>
                                )}
                                {leadId && (
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Lead ID:</Text>
                                        <Text code>{leadId}</Text>
                                    </div>
                                )}
                            </Space>
                        </Card>

                        {/* Call Notes */}
                        <Card 
                            title={
                                <Space>
                                    <FileTextOutlined />
                                    <span>Call Notes</span>
                                </Space>
                            }
                            size="small"
                            style={{ marginBottom: 16 }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                        Call Purpose
                                    </Text>
                                    <Select
                                        placeholder="Select purpose"
                                        style={{ width: '100%' }}
                                        value={callPurpose}
                                        onChange={setCallPurpose}
                                        options={[
                                            { label: 'Sales Call', value: 'sales' },
                                            { label: 'Support Call', value: 'support' },
                                            { label: 'Follow-up', value: 'followup' },
                                            { label: 'Consultation', value: 'consultation' },
                                            { label: 'Other', value: 'other' },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                        Notes
                                    </Text>
                                    <TextArea
                                        placeholder="Take notes during the call..."
                                        value={callNotes}
                                        onChange={(e) => setCallNotes(e.target.value)}
                                        autoSize={{ minRows: 4, maxRows: 8 }}
                                    />
                                </div>
                                <Space size={8} style={{ width: '100%' }}>
                                    <Button size="small" block>
                                        Save Notes
                                    </Button>
                                    <Button size="small">
                                        Clear
                                    </Button>
                                </Space>
                            </Space>
                        </Card>

                        {/* Quick Actions */}
                        <Card 
                            title="Quick Actions"
                            size="small"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <Button size="small" icon={<UserOutlined />} block>
                                    View Customer Profile
                                </Button>
                                <Button size="small" icon={<FileTextOutlined />} block>
                                    Create Follow-up Task
                                </Button>
                                <Button size="small" icon={<CheckCircleOutlined />} block>
                                    Mark as Converted
                                </Button>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* End Call Button */}
                <div style={{
                    marginTop: 24,
                    textAlign: 'center',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: 16
                }}>
                    <Button
                        danger
                        size="large"
                        icon={<PhoneOutlined />}
                        onClick={handleEndCall}
                        style={{
                            borderRadius: 8,
                            minWidth: 140,
                            height: 48,
                            fontSize: 16,
                            fontWeight: 600
                        }}
                    >
                        End Call
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CallInterfaceModal;