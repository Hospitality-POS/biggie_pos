# Multi-Tenant WhatsApp Setup Guide

This guide explains how tenants can register their WhatsApp Business numbers for sending notifications in the Base POS system.

## Overview

Base uses a **centralized Twilio account** approach for WhatsApp messaging:

- **SaaS Provider (Base)**: Manages a single Twilio account with credentials in `.env`
- **Tenants**: Register their phone numbers under the SaaS provider's Twilio account
- **Benefits**: No need for each tenant to create their own Twilio account; simplified billing and management

---

## Setup for SaaS Provider

### Step 1: Configure Twilio Credentials in .env

Add your Twilio credentials to the `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155551234  # Optional fallback sender
```

### Step 2: Enable WhatsApp in Twilio Console

1. Go to Twilio Console → Messaging → Settings → WhatsApp
2. Complete the WhatsApp Self-Signup process
3. This enables your Twilio account for WhatsApp messaging

---

## Setup for Tenants

### Step 1: Tenant Registers WhatsApp Sender via Base API

Tenants can register their phone numbers programmatically through Base:

```http
POST /users/register-whatsapp-sender
Content-Type: application/json

{
  "shop_id": "optional_shop_id",
  "phone_number": "+254712345678",
  "display_name": "My Business Name",
  "address": "123 Business Street, Nairobi, Kenya",
  "email": "contact@mybusiness.com",
  "vertical": "Retail",
  "description": "POS notifications for customers",
  "about": "We send order confirmations and updates",
  "website": "https://mybusiness.com"
}
```

**Required fields:**
- `phone_number`: The WhatsApp number to register (E.164 format, e.g., +254712345678)
- `display_name`: The business name that will appear on WhatsApp messages

**Optional fields:**
- `address`: Business address
- `email`: Contact email
- `vertical`: Business category (Retail, Healthcare, etc.)
- `description`: Business description
- `about`: About the business
- `website`: Business website

**Response:**
```json
{
  "message": "WhatsApp sender registration initiated",
  "sender_id": "whatsapp:+254712345678",
  "status": "PENDING_VERIFICATION",
  "otp_required": true
}
```

### Step 2: Complete OTP Verification

After registration, Twilio/Meta will send an OTP (One-Time Password) to the registered phone number via SMS or voice call. The tenant must:

1. Receive the OTP on their phone
2. Enter the OTP in Twilio Console to complete verification
3. Once verified, the number is ready to send WhatsApp messages

**Note:** As the SaaS provider, you may need to complete this verification in your Twilio Console on behalf of the tenant, or provide them access.

### Step 3: Tenant Configures Base System Settings

Update the tenant's system settings via API:

```http
PUT /users/update-system-setting/:id
Content-Type: application/json

{
  "phone": 254712345678,
  "notification_settings": {
    "channels": ["whatsapp"],
    "events": {
      "order_confirmation": true,
      "invoice_issued": true,
      "payment_received": true,
      "appointment_reminder": false,
      "delivery_update": false,
      "user_welcome": true
    }
  }
}
```

**Fields:**
- `phone`: The WhatsApp sender number (without + or spaces, e.g., `254712345678`)
- `notification_settings`: Which events trigger WhatsApp notifications

### Step 4: Test WhatsApp Sending

Create a new user or trigger an event to test WhatsApp notifications. The system will use the SaaS provider's Twilio credentials to send messages from the tenant's configured number.

---

## Benefits of Centralized Approach

### For the SaaS Provider (Base)
- **Simplified billing**: Single Twilio account to manage
- **Cost control**: You control the Twilio costs and can charge tenants accordingly
- **Easier management**: All WhatsApp numbers in one place
- **Faster onboarding**: Tenants don't need to create Twilio accounts

### For Tenants
- **No Twilio account needed**: They just register their number through Base
- **Own branding**: Use their own WhatsApp number for notifications
- **Simple setup**: Just provide phone number and business name
- **No compliance burden**: SaaS provider handles Twilio regulatory requirements

---

## Troubleshooting

### Error: "Twilio could not find a Channel with the specified From address"
**Cause**: The number is not enabled for WhatsApp in Twilio
**Solution**: Complete the OTP verification process in Twilio Console

### Error: "Twilio credentials not configured in .env"
**Cause**: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in .env
**Solution**: Add your Twilio credentials to the .env file

### Error: "phone_number and display_name are required"
**Cause**: Missing required fields in registration request
**Solution**: Ensure both phone_number (E.164 format) and display_name are provided

### Error: "No system settings found"
**Cause**: System settings document doesn't exist for the shop
**Solution**: Create system settings for the shop via the API

---

## API Reference

### Update System Settings
```http
PUT /users/update-system-setting/:id
```

### Get System Settings
```http
GET /users/fetch-system-setting/:shop_id
```

### Create System Settings
```http
POST /users/new-system-setting
```

---

## Security Notes

- **Never** hardcode Twilio credentials in the codebase
- Twilio credentials are stored in the .env file (server-side only)
- Each tenant's phone number is stored in their system settings document
- Credentials are isolated per tenant database
- Consider using environment variable management tools for production

---

## Future Enhancements

- [ ] Add support for Meta's WhatsApp Business API (non-Twilio)
- [ ] Add credential encryption in the database
- [ ] Add webhook support for receiving WhatsApp replies
- [ ] Add template message support for higher delivery rates
- [ ] Add message delivery status tracking
