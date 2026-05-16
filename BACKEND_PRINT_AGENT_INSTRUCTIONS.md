# Backend Print Agent Integration Instructions

## Overview

The frontend has been updated to use a category→printer mapping architecture. Print agents connect with `shop_id` + `companycode`, and the frontend assigns each connected agent to specific main categories. When printing, the frontend groups cart items by `main_category_id` and sends print jobs to the corresponding agent.

---

## Required Backend Changes

### 1. GET `/api/agents/connected?shop_id={shopId}`

**Purpose:** Return list of connected print agents for a given shop.

**Headers:**
- `companycode`: The tenant/company code (required for authentication)

**Response Format:**
```json
{
  "agents": [
    {
      "agentId": "string",   // Unique agent identifier (e.g., machine hostname or UUID)
      "shop_id": "string"    // Shop ID this agent belongs to
    }
  ],
  "count": 1
}
```

**Notes:**
- Only return agents for the shop matching the `companycode` header
- Do NOT include `main_category_id` in the response — categories are assigned on the frontend
- Return empty array if no agents connected

---

### 2. POST `/api/agents/print`

**Purpose:** Send a print job to the appropriate agent based on `main_category_id`.

**Headers:**
- `companycode`: The tenant/company code (required for authentication)

**Request Body:**
```json
{
  "shop_id": "string",           // Required — current shop's _id
  "main_category_id": "string",  // Required — MainCategory ObjectId (router key)
  "order_no": "string",          // Optional — shown in logs for debugging
  "content_type": "string",      // Optional — "food_order" | "receipt" | "test" (default: "food_order")
  "cut_paper": true,             // Optional — whether to cut paper after print (default: true)
  "priority": "string",          // Optional — "normal" | "urgent" (default: "normal")
  "lines": [                     // Required — array of print line objects
    {
      "type": "header|item|total|divider|footer",
      "text": "string",
      "qty": 1,                  // Optional — only for type "item"
      "price": "string"          // Optional — only for type "item"
    }
  ]
}
```

**Routing Logic:**
1. Validate `shop_id` and `companycode` match
2. Find the connected agent for this shop
3. **Important:** The backend should route the print job based on `main_category_id`. Since the frontend assigns categories to agents, the backend can either:
   - Store category→agent mappings on the backend, OR
   - Forward the job to all connected agents for this shop and let the agent filter by `main_category_id`, OR
   - Accept an additional optional `agentId` field in the payload for explicit routing

**Recommended Approach:** Accept optional `agentId` in payload for explicit routing:
```json
{
  "shop_id": "string",
  "main_category_id": "string",
  "agentId": "string",           // Optional — if provided, route directly to this agent
  ...
}
```

If `agentId` is provided, route directly to that agent. If not provided, use backend-stored category→agent mappings.

**Response Format (Success):**
```json
{
  "message": "Print job sent successfully",
  "jobId": "string",      // Unique job identifier for tracking
  "agentsSent": 1         // Number of agents that received the job
}
```

**Response Format (No Agent):**
```json
{
  "message": "No agent available for this category",
  "jobId": "string",
  "agentsSent": 0
}
```

**Response Format (Error):**
```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` — Print job sent (check `agentsSent` for actual delivery)
- `400` — Missing required fields or invalid data
- `401` — Invalid or missing `companycode`
- `500` — Server error

---

## 3. Optional: POST `/api/agents/register` (for future agent registration)

If you want agents to register themselves with the backend:

**Request Body:**
```json
{
  "agentId": "string",
  "shop_id": "string"
}
```

**Headers:**
- `companycode`: Required

**Response:**
```json
{
  "success": true,
  "message": "Agent registered"
}
```

---

## Agent Protocol (for Agent Implementation)

### Agent Connection Flow

1. Agent reads `shop_id` and `companycode` from its config
2. Agent connects to backend and maintains a persistent connection (WebSocket or keep-alive polling)
3. Backend tracks which agents are online per shop

### Receiving Print Jobs

When backend sends a print job to an agent, the payload should include:

```json
{
  "jobId": "string",
  "main_category_id": "string",
  "order_no": "string",
  "content_type": "string",
  "cut_paper": true,
  "lines": [
    { "type": "header", "text": "ORDER #123" },
    { "type": "item", "text": "Burger", "qty": 2, "price": "KES 800.00" },
    { "type": "divider", "text": "" },
    { "type": "footer", "text": "Table 5" }
  ]
}
```

### Agent Response

Agent should acknowledge receipt:

```json
{
  "jobId": "string",
  "status": "received|printed|failed",
  "message": "string (optional)"
}
```

---

## Summary Checklist

- [ ] Update `GET /api/agents/connected` to return agents without `main_category_id`
- [ ] Update `POST /api/agents/print` to accept optional `agentId` for explicit routing
- [ ] Ensure both endpoints validate `companycode` header
- [ ] Implement routing logic based on `main_category_id` or `agentId`
- [ ] Return `agentsSent` count in print response
- [ ] Ensure print failures don't cause 500 errors (return 200 with `agentsSent: 0`)
- [ ] Update agent protocol to match the new payload structure

---

## Frontend-Backend Contract

| Frontend Action | Backend Expectation |
|----------------|---------------------|
| Call `GET /api/agents/connected` with `shop_id` and `companycode` | Return list of connected agents (no category info) |
| Assign category to agent in localStorage | No backend action needed (or store via future API) |
| Call `POST /api/agents/print` with `main_category_id` and optional `agentId` | Route to correct agent based on mapping or explicit `agentId` |
| Print failure (no agent online) | Return 200 with `agentsSent: 0` (not 500 error) |
| Invalid `companycode` | Return 401 |

---

## Example Flow

1. **Agent Connects:**
   - Agent starts with config: `shop_id="shop123"`, `companycode="ABC"`
   - Agent registers with backend
   - Backend tracks agent as online

2. **Frontend Loads:**
   - Calls `GET /api/agents/connected?shop_id=shop123` with header `companycode: ABC`
   - Receives: `{"agents": [{"agentId": "machine1", "shop_id": "shop123"}], "count": 1}`

3. **Admin Assigns Category:**
   - In PrinterSettings UI, admin assigns `main_category_id="507f1f77bcf86cd799439011"` to agent `machine1`
   - Mapping stored in localStorage (or future backend API)

4. **Order Placed:**
   - Cart items grouped by `main_category_id`
   - For category `507f1f77bcf86cd799439011`, frontend finds assigned agent `machine1`
   - Frontend sends:
     ```json
     POST /api/agents/print
     {
       "shop_id": "shop123",
       "main_category_id": "507f1f77bcf86cd799439011",
       "agentId": "machine1",  // explicit routing
       "lines": [...]
     }
     ```
   - Backend routes to agent `machine1`
   - Agent prints and acknowledges
