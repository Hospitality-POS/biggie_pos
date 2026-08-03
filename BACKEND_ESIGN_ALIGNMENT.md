# Backend Alignment: E-Sign API

Generated from the frontend implementation in `src/pages/ESign/ESignPage.tsx`.

---

## Data Models

### SignatureField (stored inside `Document.signatures[]`)

```json
{
  "_id": "string",
  "signer_name": "string",
  "position": {
    "x": "number",        // pixel offset from left of rendered container
    "y": "number",        // pixel offset from top of rendered container
    "page": "number",     // 1-indexed page number
    "width": "number",    // optional – signature box width
    "height": "number",   // optional – signature box height
    "containerWidth": "number",   // optional – width of the preview container when position was saved
    "containerHeight": "number"   // optional – height of the preview container when position was saved
  },
  "status": "pending | signed",
  "signature_image_url": "string | null",
  "signature_type": "draw | type | upload | stamp",  // NEW: 'stamp' must be accepted
  "locked": "boolean"
}
```

### Document (top-level)

```json
{
  "_id": "string",
  "name": "string",
  "attachments": [
    { "file_url": "string", "file_name": "string", "file_type": "string" }
  ],
  "signing_workflow": {
    "workflow_type": "self_sign | send_for_signing",
    "signers": [{ "user_id": "string", "name": "string", "email": "string", "order": "number" }],
    "current_signer_index": "number",
    "expires_at": "ISO8601 string | null",
    "message": "string | null"
  },
  "signatures": [ /* SignatureField[] */ ],
  "status": "draft | pending_signature | partially_signed | signed | declined"
}
```

---

## API Endpoints

### 1. `GET /documents/:id`
Returns the full Document object including all `signatures[]` with saved positions.

**CRITICAL – position must be returned exactly as saved, without any normalisation.** The frontend seeds its local position cache on page load directly from `signatures[].position.x` and `signatures[].position.y`. If the backend transforms coordinates the signature will jump on refresh.

**Response:**
```json
{
  "_id": "...",
  "name": "...",
  "signatures": [ /* full SignatureField[] with position */ ],
  "status": "...",
  ...
}
```

---

### 2. `GET /documents/:id/signing/file`
Streams the raw document file (PDF or image) with correct `Content-Type` header.

Used two ways by the frontend:
- **Blob download** – `axiosInstance.get(..., { responseType: "blob" })` – must return binary body.
- **Direct iframe / img src** – the URL is passed directly to `<iframe src>` or `<Image src>`, so it must work with standard browser auth (cookie or query-param token).

**Response headers required:**
```
Content-Type: application/pdf  (or image/png, image/jpeg, etc.)
Content-Disposition: inline; filename="document.pdf"
```

---

### 3. `POST /documents/:id/signing/fields`
Add a new signature field to a document.

**Request body:**
```json
{
  "signer_name": "string",
  "position": {
    "x": "number",
    "y": "number",
    "page": "number"
  }
}
```

**Response:**
Return the updated Document object (or at minimum the new SignatureField with its `_id`).

---

### 4. `PUT /documents/:id/signing/fields/:fieldId`
Update an existing signature field. Used for two purposes:

#### 4a. Drag/reposition
**Request body:**
```json
{
  "position": {
    "x": "number",
    "y": "number",
    "page": "number",
    "containerWidth": "number",   // optional, for scaling
    "containerHeight": "number"   // optional, for scaling
  }
}
```

#### 4b. Lock/unlock
**Request body:**
```json
{
  "locked": true,
  "position": { "x": "number", "y": "number", "page": "number" }
}
```

**CRITICAL – save `x` and `y` verbatim.** Do **not** re-scale or normalise coordinates on the backend. The frontend already provides pixel-accurate values relative to the rendered container. Scaling logic should live only in the frontend if needed.

**Response:**
```json
{ "signature": { /* updated SignatureField */ } }
```
or
```json
{ "document": { /* full updated Document */ } }
```
The frontend handles both shapes. Returning the full `document` is preferred as it keeps state in sync.

---

### 5. `DELETE /documents/:id/signing/fields/:fieldId`
Delete a signature field.

**Response:** `200 OK` with any body.

---

### 6. `POST /documents/:id/signing/submit`
Submit a completed signature for a field.

**Request body:**
```json
{
  "signature_data": "data:image/png;base64,...",
  "signature_type": "draw | type | upload | stamp",
  "position": {
    "x": "number",
    "y": "number",
    "page": "number",
    "width": 200,
    "height": 50,
    "containerWidth": "number",
    "containerHeight": "number"
  }
}
```

**NEW:** `signature_type` can now be `"stamp"`. The `signature_data` is a base64 data-URI of the stamp image. Handle it the same as `"upload"` — store the image, generate a URL, set `signature_image_url` on the field.

**Response:** Updated Document or success message.

---

### 7. `POST /documents/:id/signing/initiate`
Start a signing workflow.

**Request body:**
```json
{
  "workflow_type": "self_sign | send_for_signing",
  "signers": [{ "user_id": "string", "name": "string", "email": "string", "order": 1 }],
  "expires_at": "ISO8601 | null",
  "message": "string | null"
}
```

---

### 8. `POST /documents/:id/signing/decline`
**Request body:**
```json
{ "reason": "string | null" }
```

---

### 9. `POST /documents/:id/signing/clear`
Clears all submitted signatures. Resets `signatures[].status` to `"pending"` and removes `signature_image_url`.

---

### 10. `GET /documents/:id/signing/preview`
Returns preview data. Frontend expects:
```json
{
  "pages": ["url1", "url2", ...],   // array of per-page image URLs (for PDF → image conversion)
  "url": "string"                   // fallback single URL
}
```

---

### 11. `GET /documents/:id/signing/download`
Returns the signed PDF as a binary blob.
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="signed-document-{id}.pdf"
```

---

## ⚠️ CRITICAL: Coordinate Conversion When Embedding in PDF

**This is the root cause of stamps/signatures appearing at the wrong position in downloaded PDFs.**

### The Problem

The frontend saves positions in **browser/HTML coordinate space**:
- Origin `(0, 0)` is at the **top-left** of the page image
- Y increases **downward**
- Units are **pixels** relative to the rendered preview container

PDF coordinate space is the **opposite**:
- Origin `(0, 0)` is at the **bottom-left** of the page
- Y increases **upward**
- Units are **points** (1 pt = 1/72 inch), not pixels

If you use the frontend `y` value directly in the PDF, an element placed near the **bottom** of the browser preview will appear near the **top** of the PDF — which is exactly the reported bug.

---

### The Fix — Coordinate Conversion Formula

When embedding a signature/stamp image into the PDF page, apply this conversion:

```js
// Values from the frontend position object:
const { x, y, width = 200, height = 50, containerWidth, containerHeight } = position;

// Get the actual PDF page dimensions (in points) using your PDF library:
const pdfPageWidth  = page.getWidth();   // e.g. 595.28 for A4
const pdfPageHeight = page.getHeight();  // e.g. 841.89 for A4

// Scale factors — convert browser pixels → PDF points
const scaleX = pdfPageWidth  / containerWidth;
const scaleY = pdfPageHeight / containerHeight;

// Convert X (same direction, just scale)
const pdfX = x * scaleX;

// Convert Y (INVERT — PDF Y=0 is at the bottom)
// Also subtract the element height so the TOP-LEFT anchor in the browser
// maps to the BOTTOM-LEFT anchor required by PDF libs (e.g. pdf-lib, pdfkit)
const pdfY = pdfPageHeight - (y * scaleY) - (height * scaleY);

// Scale the element dimensions too
const pdfWidth  = width  * scaleX;
const pdfHeight = height * scaleY;
```

---

### Per Signature Type

#### `draw` / `upload` / `stamp` — image embed
```js
page.drawImage(signatureImage, {
  x:      pdfX,
  y:      pdfY,
  width:  pdfWidth,
  height: pdfHeight,
});
```

#### `type` — text embed
For typed signatures the text baseline must be anchored correctly. Use the **bottom-left** origin that PDF text drawing expects:

```js
const fontSize = pdfHeight * 0.6;  // fill ~60% of the box height

page.drawText(signerName, {
  x:    pdfX,
  y:    pdfY + (pdfHeight * 0.1),  // small bottom padding inside the box
  size: fontSize,
  font: italicFont,                // use an italic/cursive font for legibility
  color: rgb(0, 0, 0),
});
```
> **Common mistake:** drawing text at `pdfY` with no offset causes the text to sit on the very bottom edge of the box and appear clipped or shifted upward relative to where the user placed it.

---

### Fallback when `containerWidth`/`containerHeight` are missing

Some older fields may not have `containerWidth`/`containerHeight`. Use safe defaults:

```js
const containerWidth  = position.containerWidth  || 800;   // typical preview width
const containerHeight = position.containerHeight || 1131;  // A4 at 96dpi ≈ 1131px
```

---

## Summary of Changes Needed

| # | What | Why |
|---|------|-----|
| 1 | Accept `signature_type: "stamp"` in `POST .../submit` | New stamp upload tab added to frontend |
| 2 | `GET /documents/:id` must return `signatures[].position` with `x`, `y`, `page` verbatim | Position persistence on refresh |
| 3 | `PUT .../fields/:fieldId` must save `x`/`y` without normalisation and return updated field/document | Drag position accuracy |
| 4 | `GET /documents/:id/signing/file` must be accessible as a direct browser URL (for iframe) | PDF preview fallback uses `<iframe src>` |
| 5 | `PUT .../fields/:fieldId` must accept and persist `locked: boolean` | Lock/unlock feature |
