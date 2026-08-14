/**
 * AFRICA'S TALKING VOICE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Manages Africa's Talking Voice SDK for WebRTC calling.
 * Handles device initialization, call management, and event handling.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Africa's Talking Voice SDK types (similar to Twilio)
export interface AfricasTalkingConnection {
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

export interface AfricasTalkingVoiceConfig {
    token: string;
    clientName: string;
    phoneNumber: string;
}

export interface CallOptions {
    to: string;
    from?: string;
}

export class AfricasTalkingVoiceManager {
    private client: any = null;
    private activeConnection: AfricasTalkingConnection | null = null;
    private isInitialized = false;
    private incomingCallHandler: ((connection: AfricasTalkingConnection) => void) | null = null;

    /**
     * Initialize the Africa's Talking client with capability token
     */
    async initialize(config: AfricasTalkingVoiceConfig): Promise<void> {
        try {
            console.log('[AfricasTalking] Initializing client with config:', {
                clientName: config.clientName,
                phoneNumber: config.phoneNumber,
            });

            // Load Africa's Talking client SDK from CDN
            if (typeof (window as any).AfricasTalking === 'undefined') {
                await this.loadScript('https://unpkg.com/africastalking-client@1.0.6/build/africastalking.js');
            }

            const AfricasTalking = (window as any).AfricasTalking;
            
            // Initialize client with token
            this.client = new AfricasTalking.Client(config.token);
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.isInitialized = true;
            console.log('[AfricasTalking] Client initialized successfully');
        } catch (error) {
            console.error('[AfricasTalking] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Load external script dynamically
     * Using CDN to avoid module caching issues with WebRTC
     */
    private loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if ((window as any).AfricasTalking) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Set up event handlers for the client
     */
    private setupEventHandlers(): void {
        if (!this.client) return;

        this.client.on('ready', () => {
            console.log('[AfricasTalking] Client is ready');
        });

        this.client.on('notready', () => {
            console.log('[AfricasTalking] Client is not ready');
        });

        this.client.on('incomingcall', (params: any) => {
            console.log('[AfricasTalking] Incoming call:', params);
            if (this.incomingCallHandler) {
                this.incomingCallHandler(params);
            }
        });

        this.client.on('callaccepted', () => {
            console.log('[AfricasTalking] Call accepted');
        });

        this.client.on('hangup', (params: any) => {
            console.log('[AfricasTalking] Call ended:', params);
            this.activeConnection = null;
        });

        this.client.on('offline', () => {
            console.log('[AfricasTalking] Token expired');
            this.isInitialized = false;
        });
    }

    /**
     * Make an outbound call
     */
    async makeCall(options: CallOptions): Promise<AfricasTalkingConnection> {
        if (!this.client || !this.isInitialized) {
            throw new Error('Africa\'s Talking client not initialized');
        }

        try {
            console.log('[AfricasTalking] Making call to:', options.to);
            
            // Africa's Talking client call method
            const connection = await this.client.call({
                to: options.to,
                from: options.from,
            });
            
            this.activeConnection = connection;
            console.log('[AfricasTalking] Call initiated');
            
            return connection;
        } catch (error) {
            console.error('[AfricasTalking] Error making call:', error);
            throw error;
        }
    }

    /**
     * End the current call
     */
    endCall(): void {
        if (this.activeConnection) {
            this.activeConnection.disconnect();
            this.activeConnection = null;
            console.log('[AfricasTalking] Call ended');
        }
    }

    /**
     * Set the incoming call handler
     */
    setIncomingCallHandler(handler: (connection: AfricasTalkingConnection) => void): void {
        this.incomingCallHandler = handler;
    }

    /**
     * Check if the client is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.client !== null;
    }

    /**
     * Get the client instance
     */
    getClient(): any {
        return this.client;
    }

    /**
     * Get the active connection
     */
    getActiveConnection(): AfricasTalkingConnection | null {
        return this.activeConnection;
    }

    /**
     * Destroy the client
     */
    destroy(): void {
        if (this.client) {
            this.endCall();
            this.client = null;
            this.isInitialized = false;
            console.log('[AfricasTalking] Client destroyed');
        }
    }
}

// Singleton instance
let voiceManagerInstance: AfricasTalkingVoiceManager | null = null;

/**
 * Get the singleton voice manager instance
 */
export function getAfricasTalkingVoiceManager(): AfricasTalkingVoiceManager {
    if (!voiceManagerInstance) {
        voiceManagerInstance = new AfricasTalkingVoiceManager();
    }
    return voiceManagerInstance;
}
