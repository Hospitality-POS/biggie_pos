# Twilio Voice Calling Backend Setup

## Overview
To enable real browser-based voice calling, you need to implement a backend endpoint that generates Twilio access tokens for the Voice SDK.

## Required Backend Endpoint

### POST `/api/crm/twilio/voice/token`

This endpoint should generate a Twilio access token for the Voice SDK.

**Request Body:**
```json
{
  "shop_id": "string",
  "agent_id": "string"
}
```

**Response:**
```json
{
  "token": "string",  // Twilio access token
  "identity": "string"  // Agent identity for the call
}
```

## Implementation Requirements

### 1. Twilio Account Setup
- You need a Twilio account with Voice SDK enabled
- Configure TwiML applications and SIP domains
- Set up Twilio capabilities for your account

### 2. Token Generation
Use the Twilio Node.js SDK to generate access tokens:

```javascript
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

// Generate access token
const token = new twilio.jwt.AccessToken(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { identity: agentId }
);

// Add Voice grants
const voiceGrant = new twilio.jwt.VoiceGrant({
  outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
  incomingAllow: true,
});

token.addGrant(voiceGrant);

return token.toJwt();
```

### 3. Environment Variables Required
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
```

### 4. TwiML Application Setup
- Create a TwiML Application in your Twilio console
- Configure Voice URLs to handle call events
- Set up the application to support WebRTC
- Enable "Client Edge" locations for better performance

## Current Frontend Implementation

The frontend is now ready to use real WebRTC calling with:

1. **Twilio Voice SDK v2** installed (@twilio/voice-sdk)
2. **Voice Manager Service** (`src/services/twilioVoice.ts`)
3. **Call Interface Modal** with real audio controls
4. **Microphone permissions handling**
5. **Audio device selection**
6. **Real call state management**

## What the Frontend Does Now

1. **When user clicks "New Call":**
   - Initiates call via existing API
   - Opens Call Interface Modal
   - Requests Twilio token from backend

2. **When Call Interface Modal opens:**
   - Initializes Twilio Voice SDK with token
   - Requests microphone permissions
   - Sets up WebRTC audio streams
   - Makes actual call through Twilio

3. **During Call:**
   - Real audio connection through browser
   - Mute/unmute microphone
   - Switch audio devices
   - Real call status from Twilio
   - Call timer based on actual connection

## Next Steps

1. **Implement the backend endpoint** for token generation
2. **Configure Twilio account** with proper credentials
3. **Set up TwiML application** for voice handling
4. **Test the complete flow** from browser to actual phone

## Testing

Once backend is set up, you can test:

1. Click "New Call" in the omnichannel page
2. Enter phone number with country code
3. Click "Call"
4. Allow microphone access when prompted
5. The call interface modal will show real call status
6. When connected, you can actually speak through the browser
7. The recipient will receive the call on their phone

## Troubleshooting

If calls don't work:

1. **Check Twilio credentials** in environment variables
2. **Verify TwiML application** is properly configured
3. **Check browser console** for WebRTC errors
4. **Ensure microphone permissions** are granted
5. **Verify the token endpoint** is returning valid tokens
6. **Check Twilio account** has Voice SDK enabled