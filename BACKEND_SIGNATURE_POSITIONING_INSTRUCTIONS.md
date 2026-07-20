# Backend Signature Positioning Instructions

## Overview
The E-Signature feature requires specific backend API endpoints and data structures to support smooth signature positioning and dragging. These instructions ensure the frontend dragging functionality works correctly and that signature positions persist across sessions.

## Critical: Position Persistence Across Sessions

**Problem:** When users drag a signature to a position, close the preview modal, and reopen it, the signature returns to the original position instead of staying where it was dragged.

**Solution:** The backend must ensure signature positions are:
1. **Immediately persisted** to the database when updated
2. **Always returned** in document/signature queries
3. **Never reset** to default values on any operation

## Required API Endpoints

### 1. Update Signature Field Position (CRITICAL FOR PERSISTENCE)
**Endpoint:** `PUT /documents/:documentId/signing/fields/:fieldId`

**Request Body:**
```json
{
  "position": {
    "x": 150,
    "y": 200,
    "page": 1,
    "width": 200,
    "height": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "signature": {
    "_id": "signature_field_id",
    "position": {
      "x": 150,
      "y": 200,
      "page": 1,
      "width": 200,
      "height": 50
    }
  }
}
```

**Critical Implementation Requirements:**
- **IMMEDIATELY UPDATE** the signature field position in the database
- **DO NOT** reset position to default values under any circumstances
- **ALWAYS RETURN** the updated position in the response
- **DO NOT** trigger document refetch that might overwrite the position
- The `x` and `y` coordinates are relative to the document page (top-left is 0,0)
- This endpoint is called every time the user finishes dragging the signature

### 2. Get Signing Status (CRITICAL FOR POSITION LOADING)
**Endpoint:** `GET /documents/:documentId/signing/status`

**Response:**
```json
{
  "is_complete": false,
  "workflow": {
    "workflow_type": "self_sign",
    "signers": [
      {
        "user_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "order": 1,
        "status": "pending"
      }
    ],
    "current_signer_index": 0
  },
  "signatures": [
    {
      "_id": "signature_field_id",
      "signer_name": "John Doe",
      "position": {
        "x": 150,
        "y": 200,
        "page": 1,
        "width": 200,
        "height": 50
      },
      "status": "pending",
      "signature_image_url": null,
      "signature_type": null,
      "locked": false
    }
  ]
}
```

**Critical Implementation Requirements:**
- **ALWAYS INCLUDE** the full signature array with CURRENT positions from database
- **NEVER RETURN** default/placeholder positions - always use saved positions
- Ensure `position` object contains `x`, `y`, and `page` properties
- This endpoint is called when the preview modal is opened
- **CRITICAL:** The position values must match what was last saved via the update endpoint
- This endpoint should NOT be called automatically/periodically by the backend

### 3. Submit Signature
**Endpoint:** `POST /documents/:documentId/signing/submit`

**Request Body:**
```json
{
  "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "signature_type": "draw",
  "position": {
    "x": 150,
    "y": 200,
    "page": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signature submitted successfully"
}
```

**Important Notes:**
- Save the signature image and position to the database
- The position should be the final position where the user dragged the signature
- Return success confirmation

**Signature Types:**
The `signature_type` field can be one of:
- `"draw"` - User drew signature with mouse/touch
- `"type"` - User typed full name, rendered as signature
- `"initials"` - User's initials auto-generated from name, rendered as signature
- `"upload"` - User uploaded an image file

**Initials Handling:**
- The frontend auto-generates initials from the signer's name (e.g., "Michael Karanja" → "MK")
- User can edit the initials if needed (up to 4 characters)
- Initials are rendered to canvas on the frontend and sent as base64 PNG image
- Backend treats initials the same as other signature images — no special processing needed
- Store `signature_type: "initials"` in the database for tracking
- When embedding in PDF, use the same positioning logic as other signature types

## Database Schema Requirements

### Signature Field Collection
```javascript
{
  _id: ObjectId,
  document_id: ObjectId,
  signer_name: String,
  position: {
    x: Number,      // X coordinate (pixels from left) - MUST BE PERSISTED
    y: Number,      // Y coordinate (pixels from top) - MUST BE PERSISTED
    page: Number,   // Page number (1-indexed) - MUST BE PERSISTED
    width: Number,  // Optional: field width
    height: Number  // Optional: field height
  },
  status: String,  // "pending" | "signed"
  signature_image_url: String,  // Optional: base64 or URL
  signature_type: String,  // "draw" | "type" | "upload"
  locked: Boolean,  // Whether position is locked
  created_at: Date,
  updated_at: Date
}
```

**Critical Database Operations:**

1. **Position Update Operation:**
```javascript
// When updating signature position
db.signature_fields.updateOne(
  { _id: fieldId },
  { 
    $set: { 
      "position.x": newX,
      "position.y": newY,
      "position.page": page,
      "updated_at": new Date()
    }
  }
)
```

2. **Position Read Operation:**
```javascript
// When fetching signature for display
db.signature_fields.findOne(
  { _id: fieldId },
  { projection: { position: 1, status: 1, signer_name: 1 } }
)
// MUST return the exact position values from database
// DO NOT recalculate or modify position values
```

3. **Position Initialization:**
```javascript
// When creating a new signature field
// Set initial position to user's dragged position, NOT default
db.signature_fields.insertOne({
  position: {
    x: userDraggedX || 100,  // Use user's position if provided
    y: userDraggedY || 100,  // Use user's position if provided
    page: 1
  }
})
```

## Key Backend Behaviors

### 1. Position Updates (CRITICAL FOR SESSION PERSISTENCE)
- **IMMEDIATELY PERSIST** position updates to database when received
- **DO NOT** automatically reset positions to default values
- **DO NOT** recalculate positions based on document dimensions
- **DO** preserve exact x/y coordinates sent from frontend
- **DO** validate coordinates are within reasonable bounds (0-5000 pixels)
- **CRITICAL:** Position must survive database queries, cache invalidations, and session restarts

### 2. Query Response Structure (CRITICAL FOR POSITION LOADING)
- Always return the complete `position` object with `x`, `y`, and `page`
- Ensure position values are numbers, not strings
- Include all signature fields in the response, not just pending ones
- **CRITICAL:** Return the EXACT position values stored in database, not calculated defaults
- **CRITICAL:** When modal reopens, the position must match what was last saved

### 3. Caching Considerations
- Avoid aggressive caching that might return stale position data
- If using cache, invalidate it when position is updated
- Consider using short TTL (5-10 seconds) for signing status
- **CRITICAL:** Cache must not return default positions instead of saved positions

### 4. Error Handling
- Return clear error messages for invalid position values
- Validate that x and y are positive numbers
- Validate that page is a positive integer (>= 1)

### 5. Session Persistence (NEW - CRITICAL FOR YOUR ISSUE)
**Problem:** Signature positions reset when preview modal is closed and reopened

**Root Causes to Check:**
1. Database is not actually updating the position values
2. API is returning default positions instead of saved positions
3. Cache is returning old/default position data
4. Document refetch is overwriting signature positions
5. Position values are being recalculated instead of using saved values

**Required Backend Behavior:**
```javascript
// When user drags signature and releases mouse:
// 1. Frontend calls PUT /documents/:id/signing/fields/:fieldId with new position
// 2. Backend MUST immediately update database with new x,y values
// 3. Backend MUST return the updated position in response
// 4. Backend MUST NOT invalidate document cache that might reset positions

// When user closes and reopens preview modal:
// 1. Frontend calls GET /documents/:id/signing/status
// 2. Backend MUST return signature with exact saved position from database
// 3. Backend MUST NOT return default/placeholder positions
// 4. Backend MUST NOT recalculate positions based on document properties
```

## Testing Checklist

- [ ] Update signature position endpoint accepts x, y, page coordinates
- [ ] Position updates persist in database correctly
- [ ] Get signing status returns current positions accurately
- [ ] Submit signature saves final position correctly
- [ ] Positions are not reset by backend operations
- [ ] Coordinate system is consistent (0,0 at top-left)
- [ ] Multiple signature fields can have different positions
- [ ] Position updates work for both PDF and image documents
- [ ] **CRITICAL:** Position persists when preview modal is closed and reopened
- [ ] **CRITICAL:** Database query returns exact saved position, not default
- [ ] **CRITICAL:** Position survives cache invalidation
- [ ] **CRITICAL:** Position values are never recalculated by backend

## Common Issues to Avoid

1. **Position Reset**: Never reset signature positions to default values on any backend operation
2. **Coordinate Mismatch**: Ensure backend and frontend use the same coordinate system
3. **Missing Position Data**: Always include position object in API responses
4. **Type Mismatches**: Ensure position values are returned as numbers, not strings
5. **Over-aggressive Caching**: Don't cache position data longer than necessary
6. **Modal Reopening Issue**: When preview modal reopens, backend must return saved positions, not defaults

## Troubleshooting: Signature Position Resets on Modal Reopen

**Symptom:** User drags signature to position, closes preview modal, reopens modal, signature is back at original position.

**Backend Debugging Steps:**

1. **Check Database Update:**
```javascript
// After position update call, verify database was actually updated
db.signature_fields.findOne({ _id: fieldId })
// Check if position.x and position.y match the values sent in update request
```

2. **Check API Response:**
```javascript
// Verify the update endpoint returns the new position
// Response should contain: { signature: { position: { x: 150, y: 200, page: 1 } } }
```

3. **Check Get Status Response:**
```javascript
// When modal reopens, check what the status endpoint returns
// It MUST return the saved position, not a default
// Response should contain: { signatures: [{ position: { x: 150, y: 200, page: 1 } }] }
```

4. **Check Cache:**
```javascript
// If using cache, verify it's being invalidated on position update
// Check cache key: signing-status:{documentId}
// Ensure cache returns fresh data after position update
```

5. **Check Document Refetch:**
```javascript
// If document is being refetched, ensure it doesn't overwrite signature positions
// Document query should not recalculate or reset signature positions
```

**Common Backend Bugs:**

1. **Database Not Updating:**
   - Update query fails silently
   - Update query updates wrong field
   - Transaction rollback not handled

2. **API Returning Defaults:**
   - Status endpoint returns hardcoded default positions
   - Status endpoint calculates positions instead of using saved values
   - Status endpoint doesn't query database for positions

3. **Cache Issues:**
   - Cache not invalidated on position update
   - Cache has long TTL and returns stale data
   - Cache key doesn't include document ID

4. **Document Overwrite:**
   - Document refetch resets signature positions
   - Document update overwrites signature positions
   - Workflow initialization resets positions

## Frontend-Backend Contract

The frontend expects:
- Position coordinates to be in pixels relative to the document page
- Position updates to persist immediately
- No automatic position resets from the backend
- Consistent coordinate system across all operations

The backend should:
- Accept and store exact position values from frontend
- Return current positions in all relevant API responses
- Never modify positions without explicit frontend request
- Validate but don't "correct" position values

## PDF Generation and Signature Positioning (CRITICAL)

**Problem:** When signatures are dragged to positions (especially bottom of document with scroll), the generated PDF shows signatures centered or in wrong positions instead of where they were dragged.

**Solution:** Backend PDF generation MUST use exact position coordinates from database, never recalculate or center them.

### PDF Generation Requirements

1. **Use Exact Database Coordinates:**
```javascript
// When generating PDF with signatures
const signature = await db.signature_fields.findOne({ _id: fieldId });

// MUST use exact x, y coordinates from database
const positionX = signature.position.x;  // Use exact value, don't recalculate
const positionY = signature.position.y;  // Use exact value, don't recalculate
const page = signature.position.page;    // Use exact page number

// Place signature at exact coordinates
pdf.addImage(signatureImage, 'PNG', positionX, positionY, width, height);
```

2. **DO NOT Recalculate Positions:**
```javascript
// WRONG - Do NOT recalculate based on document dimensions
const positionX = documentWidth * 0.5;  // ❌ Centers signature
const positionY = documentHeight * 0.5; // ❌ Centers signature

// WRONG - Do NOT adjust for scroll position
const positionY = savedY - scrollOffset; // ❌ Incorrect adjustment

// CORRECT - Use exact saved coordinates
const positionX = signature.position.x;  // ✅ Use exact value
const positionY = signature.position.y;  // ✅ Use exact value
```

3. **Handle Multi-Page Documents:**
```javascript
// For multi-page PDFs, use the page number from database
const pageNumber = signature.position.page; // 1-indexed

// Add signature to the correct page
pdf.setPage(pageNumber);
pdf.addImage(signatureImage, 'PNG', signature.position.x, signature.position.y, width, height);
```

4. **Coordinate System Consistency:**
```javascript
// Ensure PDF library uses same coordinate system as frontend
// Frontend: (0,0) at top-left, x increases right, y increases down
// Backend PDF library must match this system

// If PDF library uses different origin, convert coordinates
// Example: if PDF library uses bottom-left origin
const pdfY = pdfPageHeight - signature.position.y - signatureHeight;
```

### PDF Library Implementation Examples

**Using jsPDF:**
```javascript
const { jsPDF } = require('jspdf');
const doc = new jsPDF();

// Get signature from database
const signature = await db.signature_fields.findOne({ _id: fieldId });

// Use exact coordinates from database
doc.setPage(signature.position.page);
doc.addImage(signatureImage, 'PNG', signature.position.x, signature.position.y, 200, 50);
```

**Using PDFKit:**
```javascript
const PDFDocument = require('pdfkit');
const doc = new PDFDocument();

// Get signature from database
const signature = await db.signature_fields.findOne({ _id: fieldId });

// Use exact coordinates from database
doc.image(signatureImage, signature.position.x, signature.position.y, { width: 200, height: 50 });
```

**Using Puppeteer:**
```javascript
// When using HTML-to-PDF conversion
// Ensure the HTML template uses exact position values
const html = `
  <div style="position: absolute; left: ${signature.position.x}px; top: ${signature.position.y}px;">
    <img src="${signatureImage}" />
  </div>
`;
```

### Common PDF Generation Bugs

1. **Centering Issue:**
   - Backend calculates center position instead of using saved coordinates
   - Signature appears in middle of page regardless of drag position

2. **Scroll Offset Issue:**
   - Backend adjusts position based on scroll position
   - Signature appears in wrong location when document has scroll

3. **Page Number Issue:**
   - Backend ignores page number and places on first page
   - Multi-page signatures appear on wrong page

4. **Coordinate System Mismatch:**
   - PDF library uses different coordinate origin (bottom-left vs top-left)
   - Signature appears flipped or in wrong position

5. **Unit Conversion Issue:**
   - Backend converts pixels to inches/points incorrectly
   - Signature appears in wrong position due to conversion errors

### PDF Generation Testing Checklist

- [ ] PDF generation uses exact x, y coordinates from database
- [ ] PDF generation does not recalculate or center positions
- [ ] PDF generation handles multi-page documents correctly
- [ ] PDF generation uses correct coordinate system (top-left origin)
- [ ] PDF generation handles unit conversions correctly (pixels to PDF units)
- [ ] Signatures at bottom of scrollable documents appear in correct position
- [ ] Signatures at top of documents appear in correct position
- [ ] Signatures at edges of documents appear in correct position
- [ ] Multiple signatures on same page appear in correct relative positions
- [ ] Signature positions match exactly what user dragged in preview
