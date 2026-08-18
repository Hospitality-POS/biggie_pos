import { Device } from '@twilio/voice-sdk';
import { message } from 'antd';

// Twilio Voice SDK doesn't export proper types for Connection
// We define a minimal interface for the connection object
export interface TwilioConnection {
    accept: () => void;
    disconnect: () => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    status: () => string;
    parameters?: {
        From?: string;
        To?: string;
        CallSid?: string;
        [key: string]: string | undefined;
    };
}

export interface TwilioVoiceConfig {
    token: string;
    edge?: string;
    codecPreferences?: string[];
}

export interface CallOptions {
    to: string;
    from?: string;
    callerId?: string;
}

export class TwilioVoiceManager {
    private device: Device | null = null;
    private activeConnection: TwilioConnection | null = null;
    private isInitialized = false;
    private audioContext: AudioContext | null = null;
    private localStream: MediaStream | null = null;
    private incomingCallHandler: ((connection: TwilioConnection) => void) | null = null;

    /**
     * Initialize the Twilio Device with access token
     */
    async initialize(config: TwilioVoiceConfig): Promise<void> {
        try {
            // Check for microphone permissions
            await this.requestMicrophonePermission();

            // Initialize the device
            this.device = new Device(config.token, {
                edge: config.edge,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                codecPreferences: config.codecPreferences as any, // Twilio SDK requires specific codec values but doesn't provide proper types
                // Add network debugging
                debug: true,
            });

            // Set up device event listeners
            this.setupDeviceListeners();

            // Register the device
            await this.device.register();
            
            this.isInitialized = true;
            console.log('Twilio Voice SDK initialized successfully');
            
            // Check device state after initialization
            setTimeout(() => {
                if (this.device) {
                    console.log('🔍 Device state check after initialization:');
                    console.log('🔍 Device state:', (this.device as any).state);
                    console.log('🔍 Is ready:', this.isReady());
                    console.log('🔍 Device identity:', (this.device as any).identity);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize Twilio Voice SDK:', error);
            message.error('Failed to initialize voice calling');
            throw error;
        }
    }

    /**
     * Request microphone permissions
     */
    private async requestMicrophonePermission(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the test stream immediately
            stream.getTracks().forEach(track => track.stop());
            console.log('Microphone permission granted');
        } catch (error) {
            console.error('Microphone permission denied:', error);
            message.error('Microphone access is required for voice calling');
            throw new Error('Microphone permission denied');
        }
    }

    /**
     * Set up device event listeners
     */
    private setupDeviceListeners(): void {
        if (!this.device) return;

        this.device.on('registered', () => {
            console.log('✅ Device registered successfully');
            console.log('✅ Device ready:', this.isReady);
            // Try to get device identity for debugging
            try {
                console.log('🔍 Device identity:', (this.device as any).identity);
            } catch (e) {
                console.log('🔍 Could not get device identity');
            }
        });

        this.device.on('error', (...args: unknown[]) => {
            const error = args[0] as Error;
            console.error('❌ Device error:', error);
            console.error('❌ Error details:', error.message, error);
            message.error(`Voice calling error: ${error.message}`);
        });

        this.device.on('unregistered', () => {
            console.log('⚠️ Device unregistered');
        });

        this.device.on('offline', (device: any) => {
            console.log('⚠️ Device went offline');
            console.log('⚠️ Device state:', device.state);
        });

        this.device.on('ready', (device: any) => {
            console.log('✅✅✅ Device is READY for calls ✅✅✅');
            console.log('✅ Device state:', device.state);
            console.log('✅ Device region:', (this.device as any).region);
            console.log('✅ Device edge:', (this.device as any).edge);
            console.log('✅ Device can now receive incoming calls');
        });

        // Log all device events for debugging
        const allEvents = ['registered', 'unregistered', 'error', 'offline', 'ready', 'incoming', 'cancel', 'disconnect', 'connect', 'invite'];
        allEvents.forEach(eventName => {
            this.device.on(eventName as any, (...args: unknown[]) => {
                console.log(`🔔 Device event: ${eventName}`, args);
                if (eventName === 'invite') {
                    console.log('📞📞📞 INVITE RECEIVED - This is the incoming call signal! 📞📞📞');
                }
            });
        });

        this.device.on('incoming', (connection: TwilioConnection) => {
            console.log('📞📞📞 INCOMING CALL EVENT FIRED! 📞📞📞');
            console.log('📞 Connection:', connection);
            console.log('📞 Connection parameters:', connection.parameters);
            console.log('📞 Connection status:', connection.status());
            this.handleIncomingCall(connection);
        });
    }

    /**
     * Handle incoming call
     */
    private handleIncomingCall(connection: TwilioConnection): void {
        console.log('Incoming call received:', connection);
        // Call the custom handler if set
        if (this.incomingCallHandler) {
            this.incomingCallHandler(connection);
        } else {
            // Auto-answer for now, but could show UI for user to accept/reject
            connection.accept();
            this.setupConnectionListeners(connection);
            this.activeConnection = connection;
        }
    }

    /**
     * Set custom incoming call handler
     */
    setIncomingCallHandler(handler: (connection: TwilioConnection) => void): void {
        this.incomingCallHandler = handler;
    }

    /**
     * Get the device instance
     */
    getDevice(): Device | null {
        return this.device;
    }

    /**
     * Make an outbound call or join a conference
     * Used for conference-based calling approach
     */
    async makeCall(options: CallOptions): Promise<TwilioConnection> {
        if (!this.device || !this.isInitialized) {
            throw new Error('Twilio Voice SDK not initialized');
        }

        try {
            // Twilio Voice SDK v2 format - only include defined parameters
            const params: Record<string, string> = {
                To: options.to,
            };

            if (options.from) {
                params.From = options.from;
            }
            if (options.callerId) {
                params.CallerId = options.callerId;
            }

            console.log('Making call with params:', params);
            const connection = await this.device.connect({ params });
            this.setupConnectionListeners(connection);
            this.activeConnection = connection;

            return connection;
        } catch (error) {
            console.error('Failed to make call:', error);
            // Don't show error message - let the frontend handle error display
            // The call might still work through the backend
            throw error;
        }
    }

    /**
     * Set up connection event listeners
     */
    private setupConnectionListeners(connection: TwilioConnection): void {
        connection.on('accept', () => {
            console.log('Call accepted');
            this.setupAudioStreams();
        });

        connection.on('disconnect', () => {
            console.log('Call disconnected');
            this.cleanupAudioStreams();
            this.activeConnection = null;
        });

        connection.on('error', (...args: unknown[]) => {
            const error = args[0] as Error;
            console.error('Connection error:', error);
            message.error(`Call error: ${error.message}`);
        });

        connection.on('ringing', () => {
            console.log('Call is ringing');
        });
    }

    /**
     * Set up audio streams for the call
     */
    private async setupAudioStreams(): Promise<void> {
        try {
            // Get local audio stream (microphone)
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context for audio processing
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            
            console.log('Audio streams set up successfully');
        } catch (error) {
            console.error('Failed to set up audio streams:', error);
            message.error('Failed to set up audio');
        }
    }

    /**
     * Clean up audio streams
     */
    private cleanupAudioStreams(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Mute/unmute the microphone
     */
    setMute(muted: boolean): void {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }

    /**
     * Get current mute state
     */
    isMuted(): boolean {
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
            return !this.localStream.getAudioTracks()[0].enabled;
        }
        return false;
    }

    /**
     * End the current call
     */
    async endCall(): Promise<void> {
        if (this.activeConnection) {
            this.activeConnection.disconnect();
        }
        this.cleanupAudioStreams();
    }

    /**
     * Get available audio input devices
     */
    async getInputDevices(): Promise<MediaDeviceInfo[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'audioinput');
    }

    /**
     * Get available audio output devices
     */
    async getOutputDevices(): Promise<MediaDeviceInfo[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'audiooutput');
    }

    /**
     * Switch audio input device
     */
    async switchInputDevice(deviceId: string): Promise<void> {
        if (this.localStream) {
            // Stop current tracks
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Get new stream with selected device
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } }
        });

        // If there's an active connection, we'd need to update its audio tracks
        // This would require more complex handling with the Twilio SDK
    }

    /**
     * Destroy the device and cleanup
     */
    destroy(): void {
        this.cleanupAudioStreams();
        
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
        
        this.isInitialized = false;
    }

    /**
     * Check if device is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.device !== null;
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): string {
        if (!this.activeConnection) return 'idle';
        // Map Twilio connection states to our status
        const status = this.activeConnection.status();
        switch (status) {
            case 'pending': return 'initiating';
            case 'ringing': return 'ringing';
            case 'open': return 'connected';
            case 'closed': return 'ended';
            default: return status;
        }
    }
}

// Singleton instance
let voiceManagerInstance: TwilioVoiceManager | null = null;

export const getVoiceManager = (): TwilioVoiceManager => {
    if (!voiceManagerInstance) {
        voiceManagerInstance = new TwilioVoiceManager();
    }
    return voiceManagerInstance;
};

export const destroyVoiceManager = (): void => {
    if (voiceManagerInstance) {
        voiceManagerInstance.destroy();
        voiceManagerInstance = null;
    }
};