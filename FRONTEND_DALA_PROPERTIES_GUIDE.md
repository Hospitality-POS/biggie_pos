# Dala Properties Module — Frontend Implementation Guide

> **Base URL:** `{{API_BASE}}/properties`
> **Auth:** All endpoints require `Authorization: Bearer <token>` header.
> **Multi-tenant:** `tenant_id` and `shop_id` are injected by backend middleware — do **not** send them from frontend.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model & Hierarchy](#2-data-model--hierarchy)
3. [Property Types](#3-property-types)
4. [Properties (Core CRUD)](#4-properties-core-crud)
5. [Blocks](#5-blocks)
6. [Floors](#6-floors)
7. [Phases](#7-phases)
8. [Units](#8-units)
9. [Property Sales (Complete Suite)](#9-property-sales-complete-suite)
   - 9.1 [Sales Management](#91-sales-management)
   - 9.2 [Commission Management](#92-commission-management)
   - 9.3 [Commission Payments](#93-commission-payments)
   - 9.4 [Payment Plans](#94-payment-plans)
   - 9.5 [Enhanced Payment Processing](#95-enhanced-payment-processing)
   - 9.6 [Frontend Integration Guide](#96-frontend-integration-guide)
   - 9.7 [API Service Layer Updates](#97-api-service-layer-updates)
10. [Rental Flow (Enhanced with Payment Integration)](#10-rental-flow-enhanced-with-payment-integration)
11. [Documents & Media](#11-documents--media)
12. [Enum Reference](#12-enum-reference)
13. [UI Page Breakdown & Suggested Components](#13-ui-page-breakdown--suggested-components)
14. [Recommended State Management](#14-recommended-state-management)

---

## 1. Architecture Overview

The Dala module is a **full real-estate management system** embedded in the POS platform. It supports three property purposes:

| Purpose | Description | Flows Used |
|---------|-------------|------------|
| `sale` | Units are sold to buyers | Property → Block → Floor → Unit → Phase pricing → PropertySale |
| `rental` | Units are leased to tenants | Property → Block → Floor → Unit → PropertyTenant → Lease → RentInvoice → RentPayment |
| `mixed` | Some units sold, others rented | Both flows apply |

### Entity Hierarchy

```
PropertyType (classification)
    └── Property (the real-estate asset)
            ├── Location (geo/address)
            ├── Phase[] (pricing phases — sale properties)
            ├── Block[] (physical structures)
            │     └── Floor[]
            │           └── Unit[]
            │                 ├── UnitPhase[] (per-phase pricing)
            │                 ├── Apartment[] (embedded, if trackIndividualUnits=true)
            │                 ├── PropertySale (sale flow)
            │                 └── Lease (rental flow)
            │                       ├── RentInvoice[]
            │                       └── RentPayment[]
            └── PropertyTenant[] (occupant records for rental)
```

**Blockless properties** (e.g. land plots): set `isBlockless: true` — units attach directly to the property without blocks/floors.

---

## 2. Data Model & Hierarchy

### 2.1 Pricing Model (Sale)

All sale pricing is **per-square-metre (KES/m²)**. The resolution order for a unit's effective price:

```
UnitPhase.pricePerSqm  →  Unit.pricePerSqm  →  Property.defaultPricePerSqm
```

The `listPrice` (total price) is **auto-computed** by the backend:

```
listPrice = areaSqm × pricePerSqm
```

**Frontend should display `listPrice` but edit `pricePerSqm` and `areaSqm`.**

### 2.2 Pricing Model (Rental)

Rental pricing is also per-sqm:

```
Unit.rentPerSqm  →  Property.defaultRentPerSqm
```

Auto-computed fields:
```
monthlyRent = areaSqm × rentPerSqm
depositAmount = monthlyRent × depositMonths
```

### 2.3 Individual Apartment Tracking

When `unit.trackIndividualUnits = true`, the unit's `apartments[]` array tracks individual sub-units. Each apartment has:
- Its own `apartmentNumber`, `areaSqm`, `status`
- Optional price overrides: `pricePerSqmOverride`, `rentPerSqmOverride`
- Occupancy fields: `soldTo`, `currentOccupant`, `currentLeaseId`

The backend auto-syncs `totalUnits`, `availableUnits`, and `status` from apartment statuses on save.

---

## 3. Property Types

Property types are tenant-wide classifications (e.g. "Apartment Building", "Land", "Commercial Complex").

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/property-types` | List all types | User |
| `GET` | `/property-types/:id` | Get by ID or slug | User |
| `POST` | `/property-types` | Create type | **Admin** |
| `PUT` | `/property-types/:id` | Update type | **Admin** |
| `DELETE` | `/property-types/:id` | Delete type (blocked if properties use it) | **Admin** |
| `GET` | `/property-types/:id/properties` | List properties of this type | User |

### Create/Update Payload

```json
{
  "name": "Serviced Apartment",
  "description": "Fully furnished apartment with hotel-like services",
  "category": "residential",
  "status": "active",
  "isActive": true
}
```

**`slug`** is auto-generated from `name` (e.g. `"Serviced Apartment"` → `"serviced_apartment"`). You can override it.

### Response Shape

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Serviced Apartment",
    "slug": "serviced_apartment",
    "description": "...",
    "category": "residential",
    "status": "active",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-15T10:00:00Z"
  }
}
```

### Query Params

- `?page=1&limit=25` — Pagination
- `?sort=name` — Sort field
- `?select=name,slug` — Field selection
- `?populate=true` — Include `propertiesCount` virtual
- `?category=residential` — Filter by category
- `?status=active` — Filter by status

### Frontend Notes

- **Settings page:** Create a "Property Types" management screen under Settings
- Show property count badge next to each type (use `?populate=true`)
- Prevent delete if properties exist (backend returns error with count)
- `category` enum: `residential | commercial | industrial | agricultural | mixed_use | other`

---

## 4. Properties (Core CRUD)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/properties` | List all (paginated, filtered) |
| `GET` | `/properties/:id` | Get single (fully populated) |
| `POST` | `/properties` | Create property (with optional inline blocks, floors, phases, units) |
| `PUT` | `/properties/:id` | Update property |
| `DELETE` | `/properties/:id` | Soft-delete (guarded if units sold) |
| `GET` | `/properties/:id/inventory` | Get inventory summary stats |
| `GET` | `/properties/status/:status` | Filter by status |
| `GET` | `/properties/type/:type` | Filter by property type slug |
| `GET` | `/properties/price-range/:min/:max` | Filter by unit listPrice range |

### Create Property Payload (Full)

This is the most complex endpoint. It can create the entire hierarchy in one transaction:

```json
{
  "name": "Kilimani Heights",
  "description": "Luxury apartment complex in Kilimani",
  "propertyType": "serviced_apartment",
  "category": "residential",
  "purpose": "sale",
  "status": "available",
  "propertyManager": "userId_here",
  "developer": "ABC Developers Ltd",
  "defaultPricePerSqm": 150000,
  "currency": "KES",
  "isBlockless": false,
  "amenities": ["Swimming Pool", "Gym", "Parking"],
  "features": ["24/7 Security", "Backup Generator"],
  "launchDate": "2026-06-01",
  "expectedCompletionDate": "2028-12-31",

  "location": {
    "name": "Kilimani",
    "type": "neighbourhood",
    "address": "Off Ngong Road, Nairobi",
    "coordinates": { "lat": -1.2921, "lng": 36.8219 }
  },

  "blocks": [
    {
      "name": "Block A",
      "description": "Main residential block",
      "totalFloors": 10,
      "status": "active",
      "floors": [
        { "tempId": "f0", "name": "Ground Floor", "floorNumber": 0 },
        { "tempId": "f1", "name": "1st Floor", "floorNumber": 1 },
        { "tempId": "f2", "name": "2nd Floor", "floorNumber": 2 }
      ]
    }
  ],

  "phases": [
    {
      "name": "Phase 1 - Early Bird",
      "description": "Pre-construction pricing",
      "startDate": "2026-06-01",
      "endDate": "2026-12-31",
      "active": true,
      "priceMultiplier": 1.0,
      "sortOrder": 0
    },
    {
      "name": "Phase 2 - Construction",
      "startDate": "2027-01-01",
      "active": false,
      "priceMultiplier": 1.15,
      "sortOrder": 1
    }
  ],

  "currentPhase": "Phase 1 - Early Bird",

  "units": [
    {
      "name": "2BR Standard",
      "unitType": "two_bedroom",
      "unitNumber": "A-G01",
      "areaSqm": 85,
      "areaUnit": "sqm",
      "pricePerSqm": 150000,
      "totalUnits": 4,
      "availableUnits": 4,
      "floorTempId": "f0",
      "specifications": {
        "bedrooms": 2,
        "bathrooms": 2,
        "parkingSpaces": 1,
        "furnished": "unfurnished",
        "features": ["Balcony", "En-suite master"]
      },
      "phasePricing": [
        { "phaseName": "Phase 1 - Early Bird", "pricePerSqm": 140000 },
        { "phaseName": "Phase 2 - Construction", "pricePerSqm": 160000 }
      ]
    }
  ]
}
```

### Key Notes for Create Property Form

1. **`purpose`** is required — drives the entire UX (sale vs rental vs mixed)
2. **`propertyType`** must match an existing `PropertyType.slug`
3. **`blocks[].floors[].tempId`** — assign temporary IDs so units can reference their floor before it exists in DB
4. **`units[].floorTempId`** — references the `tempId` of the floor this unit belongs to
5. If no `phases` are provided, backend auto-creates "Phase 1" with `active: true`
6. If no `propertyManager` is provided, defaults to current logged-in user

### Rental Property Create Payload

For `purpose: "rental"` or `"mixed"`, include rental defaults:

```json
{
  "name": "Westlands Business Park",
  "propertyType": "office_complex",
  "category": "commercial",
  "purpose": "rental",
  "defaultRentPerSqm": 800,
  "defaultServiceCharge": 5000,
  "defaultDepositMonths": 2,
  "defaultRentDueDay": 5,
  "defaultUtilities": {
    "water": false,
    "electricity": true,
    "internet": true,
    "garbage": false
  }
}
```

> `defaultUtilities`: `true` = tenant pays, `false` = landlord covers.

### Response Shape (Fully Populated)

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Kilimani Heights",
    "propertyType": "serviced_apartment",
    "category": "residential",
    "purpose": "sale",
    "status": "available",
    "defaultPricePerSqm": 150000,
    "currency": "KES",
    "isBlockless": false,
    "propertyManager": { "_id": "...", "name": "John", "email": "..." },
    "location": {
      "_id": "...",
      "name": "Kilimani",
      "type": "neighbourhood",
      "coordinates": { "lat": -1.2921, "lng": 36.8219 }
    },
    "blocks": [
      {
        "_id": "blk_id",
        "name": "Block A",
        "totalFloors": 10,
        "floors": [
          { "_id": "flr_id", "name": "Ground Floor", "floorNumber": 0 }
        ]
      }
    ],
    "phases": [
      { "_id": "ph_id", "name": "Phase 1", "active": true, "priceMultiplier": 1.0 }
    ],
    "currentPhase": "ph_id",
    "units": [
      {
        "_id": "unit_id",
        "name": "2BR Standard",
        "unitType": "two_bedroom",
        "areaSqm": 85,
        "pricePerSqm": 140000,
        "listPrice": 11900000,
        "totalUnits": 4,
        "availableUnits": 4,
        "status": "available",
        "phasePricing": [
          {
            "_id": "up_id",
            "phaseId": "ph_id",
            "phaseName": "Phase 1",
            "pricePerSqm": 140000,
            "listPrice": 11900000,
            "active": true
          }
        ]
      }
    ],
    "occupancySummary": {
      "totalUnits": 0,
      "occupiedUnits": 0,
      "vacantUnits": 0,
      "occupancyRate": 0
    },
    "amenities": ["Swimming Pool", "Gym"],
    "features": ["24/7 Security"],
    "images": [],
    "documents": [],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Update Property Payload

Only send fields that changed. Supports partial updates:

```json
{
  "name": "Kilimani Heights Premium",
  "status": "selling",
  "defaultPricePerSqm": 160000,
  "amenities": ["Swimming Pool", "Gym", "Rooftop Lounge"],
  "currentPhase": "Phase 2 - Construction",
  "location": {
    "name": "Kilimani",
    "address": "Updated address"
  },
  "units": [
    {
      "_id": "existing_unit_id",
      "pricePerSqm": 165000,
      "areaSqm": 90,
      "phasePricing": [
        { "phaseName": "Phase 2 - Construction", "pricePerSqm": 165000 }
      ]
    }
  ]
}
```

### Query Params (List Properties)

| Param | Example | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `10` | Items per page |
| `sort` | `-createdAt` | Sort field (prefix `-` for desc) |
| `select` | `name,status` | Field selection |
| `status` | `available` | Filter by status |
| `propertyType` | `serviced_apartment` | Filter by type slug |
| `category` | `residential` | Filter by category |
| `purpose` | `sale` | Filter by purpose |

### Inventory Summary Response

`GET /properties/:id/inventory`

```json
{
  "success": true,
  "data": {
    "purpose": "sale",
    "totalUnits": 40,
    "availableUnits": 28,
    "soldUnits": 12,
    "occupiedUnits": 0,
    "vacantUnits": 0,
    "totalBlocks": 2,
    "totalAreaSqm": 3400,
    "unitsByType": {
      "two_bedroom": { "total": 20, "available": 14, "sold": 6, "totalAreaSqm": 1700 },
      "three_bedroom": { "total": 20, "available": 14, "sold": 6, "totalAreaSqm": 1700 }
    }
  }
}
```

For `rental`/`mixed` properties, also includes: `occupiedUnits`, `vacantUnits`, `occupancyRate`.

---

## 5. Blocks

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/properties/:propertyId/blocks` | List blocks for property |
| `GET` | `/properties/:propertyId/blocks/:blockId` | Get block with stats |
| `POST` | `/properties/:propertyId/blocks` | Create block (auto-creates floors) |
| `PUT` | `/properties/:propertyId/blocks/:blockId` | Update block |
| `DELETE` | `/properties/:propertyId/blocks/:blockId` | Delete block (blocked if units exist) |

### Create Block Payload

```json
{
  "name": "Block B",
  "description": "Secondary residential block",
  "totalFloors": 8,
  "status": "active"
}
```

**Floors are auto-created** with names: "Ground Floor", "1st Floor", "2nd Floor", etc.

### Response (with stats)

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Block A",
    "totalFloors": 10,
    "status": "active",
    "floors": [
      { "_id": "...", "name": "Ground Floor", "floorNumber": 0 },
      { "_id": "...", "name": "1st Floor", "floorNumber": 1 }
    ],
    "stats": {
      "totalFloors": 10,
      "totalUnits": 40,
      "availableUnits": 28,
      "soldUnits": 12,
      "totalAreaSqm": 3400
    }
  }
}
```

---

## 6. Floors

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/blocks/:blockId/floors` | List floors in block |
| `GET` | `/blocks/:blockId/floors/:floorId` | Get floor with unit stats |
| `POST` | `/blocks/:blockId/floors` | Add floor to block |
| `PUT` | `/blocks/:blockId/floors/:floorId` | Update floor |
| `DELETE` | `/blocks/:blockId/floors/:floorId` | Delete floor (blocked if units exist) |

### Create Floor Payload

```json
{
  "name": "Rooftop",
  "floorNumber": 11,
  "elevation": "Penthouse level",
  "status": "active"
}
```

---

## 7. Phases

Phases control **per-sqm pricing** over time. Only one phase is `active` at a time.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/properties/:propertyId/phases` | List phases with pricing stats |
| `GET` | `/properties/:propertyId/phases/:phaseId` | Get phase with avg price/sqm by unit type |
| `POST` | `/properties/:propertyId/phases` | Create phase |
| `PUT` | `/properties/:propertyId/phases/:phaseId` | Update phase |
| `DELETE` | `/properties/:propertyId/phases/:phaseId` | Delete phase (cascades UnitPhase records) |
| `PATCH` | `/properties/:propertyId/phases/:phaseId/activate` | Set as active phase |

### Create Phase Payload

```json
{
  "name": "Phase 3 - Ready to Move",
  "description": "Post-completion pricing",
  "startDate": "2028-01-01",
  "endDate": "2029-12-31",
  "active": false,
  "priceMultiplier": 1.3,
  "sortOrder": 2
}
```

### Activate Phase

`PATCH /properties/:propertyId/phases/:phaseId/activate`

This:
1. Deactivates all other phases
2. Sets this phase as `property.currentPhase`
3. Pushes this phase's `pricePerSqm` to all units that have a `UnitPhase` record for it

**Response:**

```json
{
  "success": true,
  "message": "Phase \"Phase 3\" is now active",
  "data": {
    "currentPhase": "ph_id",
    "phaseName": "Phase 3",
    "unitPricesUpdated": 40
  }
}
```

### Phases List Response (with stats)

```json
{
  "success": true,
  "count": 3,
  "currentPhase": "ph_id",
  "data": [
    {
      "_id": "...",
      "name": "Phase 1",
      "active": false,
      "priceMultiplier": 1.0,
      "stats": {
        "avgPricePerSqmByType": {
          "two_bedroom": { "avgPricePerSqm": 140000, "totalAreaSqm": 1700, "unitCount": 20 },
          "three_bedroom": { "avgPricePerSqm": 135000, "totalAreaSqm": 2400, "unitCount": 20 }
        },
        "unitPricesSet": 40
      }
    }
  ]
}
```

### Frontend Notes

- Show a **phase timeline** or tab switcher
- Highlight the current active phase with a badge
- Show a confirmation dialog before activating a phase ("This will update prices for X units")
- Display avg price/sqm breakdown per unit type in phase detail view

---

## 8. Units

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/properties/:propertyId/units` | List units for property |
| `GET` | `/properties/:propertyId/units/:unitId` | Get single unit |
| `POST` | `/properties/:propertyId/units` | Add units (single or batch) |
| `PUT` | `/properties/:propertyId/units/:unitId` | Update unit |
| `DELETE` | `/properties/:propertyId/units/:unitId` | Delete unit (blocked if sold) |
| `POST` | `/properties/:propertyId/units/:unitId/sell` | Sell a unit |
| `GET` | `/blocks/:blockId/units` | Get units grouped by floor |
| `GET` | `/floors/:floorId/units` | Get units on a specific floor |

### Add Units Payload (Batch)

```json
{
  "units": [
    {
      "name": "1BR Compact",
      "unitType": "one_bedroom",
      "unitNumber": "A-101",
      "areaSqm": 45,
      "pricePerSqm": 155000,
      "blockId": "block_id",
      "floorId": "floor_id",
      "totalUnits": 2,
      "availableUnits": 2,
      "specifications": {
        "bedrooms": 1,
        "bathrooms": 1,
        "parkingSpaces": 0,
        "furnished": "unfurnished"
      }
    },
    {
      "name": "Studio Unit",
      "unitType": "studio",
      "unitNumber": "A-102",
      "areaSqm": 30,
      "pricePerSqm": 170000,
      "blockId": "block_id",
      "floorId": "floor_id",
      "totalUnits": 1
    }
  ]
}
```

### Add Single Unit (also works)

```json
{
  "name": "3BR Penthouse",
  "unitType": "penthouse",
  "unitNumber": "A-1001",
  "areaSqm": 200,
  "pricePerSqm": 200000,
  "blockId": "block_id",
  "floorId": "floor_id",
  "totalUnits": 1,
  "trackIndividualUnits": false
}
```

### Rental Unit Fields

For rental/mixed properties, also send:

```json
{
  "rentPerSqm": 800,
  "serviceCharge": 5000,
  "depositMonths": 3,
  "rentDueDay": 5,
  "rentFrequency": "monthly",
  "utilities": {
    "water": true,
    "electricity": true,
    "internet": false,
    "garbage": true
  }
}
```

### Unit With Individual Apartments

```json
{
  "name": "2BR Standard",
  "unitType": "two_bedroom",
  "areaSqm": 85,
  "pricePerSqm": 140000,
  "blockId": "block_id",
  "floorId": "floor_id",
  "totalUnits": 4,
  "trackIndividualUnits": true,
  "apartments": [
    { "apartmentNumber": "A-G01", "areaSqm": 85, "status": "available" },
    { "apartmentNumber": "A-G02", "areaSqm": 87, "status": "available" },
    { "apartmentNumber": "A-G03", "areaSqm": 83, "status": "available" },
    { "apartmentNumber": "A-G04", "areaSqm": 86, "status": "available" }
  ]
}
```

### Sell Unit

`POST /properties/:propertyId/units/:unitId/sell`

**For simple units:**
```json
{
  "buyerName": "Jane Doe",
  "customerId": "customer_id"
}
```

**For tracked apartments:**
```json
{
  "apartmentId": "apt_subdoc_id",
  "buyerName": "Jane Doe",
  "customerId": "customer_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unit sold successfully",
  "data": {
    "unitId": "...",
    "unitType": "two_bedroom",
    "areaSqm": 85,
    "pricePerSqm": 140000,
    "listPrice": 11900000,
    "remainingUnits": 3,
    "propertyStatus": "selling"
  }
}
```

### Unit Type Enum

```
studio | one_bedroom | two_bedroom | three_bedroom | four_bedroom |
loft | luxury | penthouse | shop | office | warehouse | plot | parcel | other
```

**Apartment-like types** (require `blockId` + `floorId` unless `isBlockless`):
`studio, one_bedroom, two_bedroom, three_bedroom, loft, luxury, penthouse, shop, office`

**Plot types** (skip block/floor):
`plot, parcel`

### Unit Response Shape

```json
{
  "_id": "...",
  "name": "2BR Standard",
  "unitType": "two_bedroom",
  "unitNumber": "A-G01",
  "areaSqm": 85,
  "areaUnit": "sqm",
  "pricePerSqm": 140000,
  "listPrice": 11900000,
  "pricePerSqmFloor": 130000,
  "pricePerSqmCeiling": 160000,
  "rentPerSqm": 0,
  "monthlyRent": 0,
  "serviceCharge": 0,
  "depositMonths": 2,
  "depositAmount": 0,
  "currency": "KES",
  "totalUnits": 4,
  "availableUnits": 3,
  "status": "reserved",
  "trackIndividualUnits": true,
  "apartments": [
    { "_id": "apt1", "apartmentNumber": "A-G01", "areaSqm": 85, "status": "sold", "soldTo": "Jane Doe" },
    { "_id": "apt2", "apartmentNumber": "A-G02", "areaSqm": 87, "status": "available" }
  ],
  "specifications": {
    "bedrooms": 2,
    "bathrooms": 2,
    "parkingSpaces": 1,
    "furnished": "unfurnished",
    "features": ["Balcony"]
  },
  "blockDetails": { "_id": "...", "name": "Block A" },
  "floorDetails": { "_id": "...", "name": "1st Floor", "floorNumber": 1 },
  "phasePrices": [
    { "phaseId": "...", "pricePerSqm": 140000, "listPrice": 11900000, "areaSqmSnapshot": 85 }
  ]
}
```

---

## 9. Property Sales (Complete Suite)

> **✅ COMPLETE IMPLEMENTATION** - Full models, controllers, and routes are now available!

The property sales suite includes complete sales management with commissions, payment plans, and integrated payment processing.

### 9.1 Sales Management

**Base URL:** `/dala/sales`

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dala/sales` | List all sales (paginated, filtered) |
| `GET` | `/dala/sales/stats` | Get sales statistics |
| `GET` | `/dala/sales/:id` | Get single sale with full details |
| `POST` | `/dala/sales` | Create new sale |
| `PUT` | `/dala/sales/:id` | Update sale |
| `PUT` | `/dala/sales/:id/status` | Update sale status |
| `DELETE` | `/dala/sales/:id` | Soft delete sale |

#### Create Sale Payload

```json
{
  "property": "property_id",
  "unitTypeID": "unit_type_id",
  "apartmentId": "apartment_id", // optional for individual tracking
  "apartmentName": "A-G01",
  "quantity": 1,
  "customer": "customer_id",
  "salesAgent": "agent_id",
  "propertyManager": "manager_id",
  "salePrice": 12000000,
  "commissionPercentage": 5,
  "phaseAtSale": "Phase 1",
  "status": "reservation",
  "reservationDate": "2026-05-01",
  "reservationFee": 100000,
  "reservationFeePaid": false,
  "initialPaymentType": "booking_fee",
  "agreementDate": "2026-05-15",
  "paymentPlanType": "Installment"
}
```

#### Sale Response Shape

```json
{
  "success": true,
  "data": {
    "_id": "sale_id",
    "saleCode": "SALE-20260502-1234",
    "property": { "_id": "...", "propertyName": "Kilimani Heights" },
    "unitTypeID": { "_id": "...", "unitTypeName": "2BR Standard" },
    "customer": { "_id": "...", "name": "John Kamau", "email": "john@example.com" },
    "salesAgent": { "_id": "...", "name": "Peter Agent" },
    "propertyManager": { "_id": "...", "name": "Manager Name" },
    "salePrice": 12000000,
    "commissionPercentage": 5,
    "status": "reservation",
    "commission": {
      "_id": "commission_id",
      "amount": 600000,
      "percentage": 5,
      "status": "pending"
    },
    "paymentPlans": [],
    "activities": [],
    "notes": []
  }
}
```

### 9.2 Commission Management

**Base URL:** `/dala/commissions`

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dala/commissions` | List all commissions |
| `GET` | `/dala/commissions/stats` | Get commission statistics |
| `GET` | `/dala/commissions/:id` | Get single commission |
| `POST` | `/dala/commissions` | Create commission |
| `PUT` | `/dala/commissions/:id` | Update commission |
| `PUT` | `/dala/commissions/:id/status` | Update commission status |
| `DELETE` | `/dala/commissions/:id` | Delete commission |

#### Commission Features

- **Automatic Creation**: Commissions are auto-created when sales are made
- **Status Management**: `pending` → `partial` → `paid`
- **Virtual 'paid' Field**: Automatically calculated from commission payments
- **Withholding Tax Support**: Built-in tax calculation and tracking

#### Commission Response

```json
{
  "success": true,
  "data": {
    "_id": "commission_id",
    "sale": { "_id": "...", "saleCode": "SALE-20260502-1234" },
    "amount": 600000,
    "percentage": 5,
    "status": "pending",
    "salesAgent": { "_id": "...", "name": "Peter Agent" },
    "paid": 0, // Virtual field - calculated from payments
    "commissionPayments": []
  }
}
```

### 9.3 Commission Payments

**Base URL:** `/dala/commission-payments`

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dala/commission-payments` | List all commission payments |
| `GET` | `/dala/commission-payments/stats` | Get payment statistics |
| `GET` | `/dala/commission-payments/:id` | Get single payment |
| `POST` | `/dala/commission-payments` | Create commission payment |
| `PUT` | `/dala/commission-payments/:id` | Update payment |
| `DELETE` | `/dala/commission-payments/:id` | Delete payment |
| `POST` | `/dala/commission-payments/:id/documents` | Add document |
| `DELETE` | `/dala/commission-payments/:id/documents/:documentId` | Remove document |

#### Create Commission Payment Payload

```json
{
  "commission": "commission_id",
  "amount": 300000,
  "withholdingTax": {
    "applied": true,
    "percentage": 5
  },
  "paymentMethod": "bank transfer",
  "reference": "TRX123456",
  "description": "Partial commission payment",
  "salesAgent": "agent_id",
  "paidBy": "user_id"
}
```

#### Withholding Tax Features

- **Automatic Calculation**: 5% default withholding tax
- **Net Amount**: Automatically calculated (amount - tax)
- **Tax Tracking**: Full tax amount tracking and reporting
- **Document Support**: Upload withholding certificates

### 9.4 Payment Plans

**Base URL:** `/dala/payment-plans`

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dala/payment-plans` | List all payment plans |
| `GET` | `/dala/payment-plans/stats` | Get payment plan statistics |
| `GET` | `/dala/payment-plans/sale/:saleId` | Get payment plans for sale |
| `GET` | `/dala/payment-plans/:id` | Get single payment plan |
| `POST` | `/dala/payment-plans` | Create payment plan |
| `PUT` | `/dala/payment-plans/:id` | Update payment plan |
| `PUT` | `/dala/payment-plans/:id/status` | Update payment plan status |
| `DELETE` | `/dala/payment-plans/:id` | Delete payment plan |

#### Create Payment Plan Payload

```json
{
  "sale": "sale_id",
  "customer": "customer_id",
  "property": "property_id",
  "totalAmount": 12000000,
  "initialDeposit": 1200000,
  "paymentMethod": "bank_transfer",
  "installmentAmount": 540000,
  "installmentFrequency": "monthly",
  "startDate": "2026-06-01",
  "numberOfInstallments": 20,
  "isInitialDeposit": false
}
```

#### Payment Plan Features

- **Flexible Frequencies**: weekly, biweekly, monthly, quarterly, etc.
- **Automatic Calculations**: Outstanding balance, end dates
- **Progress Tracking**: Payment progress percentages
- **Status Management**: active, completed, defaulted, cancelled

### 9.5 Enhanced Payment Processing

**Base URL:** `/order-payments` (enhanced existing model)

The order-payments model now supports property sales, rent payments, and lease tracking:

#### New Payment Types

```javascript
// Property Sale Extensions
"Property_Sale", "Property_Reservation", "Property_Deposit", "Property_Installment"

// Rent and Lease Extensions  
"Rent_Payment", "Rent_Deposit", "Rent_Late_Fee", "Rent_Maintenance", "Rent_Utilities",
"Lease_Payment", "Lease_Deposit", "Lease_Termination_Fee"
```

#### New Reference Fields

```javascript
sale_id: ObjectId,        // Links to Sale model
lease_id: ObjectId,       // Links to Lease model  
rent_invoice_id: ObjectId // Links to RentInvoice model
```

#### Payment Processing Features

- **Automatic Status Updates**: Sale completion based on payments
- **Rent Invoice Processing**: Updates rent invoice payment status
- **Lease Payment Tracking**: Updates lease payment history
- **Payment Reversal Support**: Full rollback capabilities

### 9.6 Frontend Integration Guide

#### Sale Management UI

1. **Sales Dashboard**: Pipeline view with statistics
2. **Sale Creation Form**: Multi-step wizard with unit selection
3. **Sale Detail Page**: Complete sale information with payment progress
4. **Commission Dashboard**: Track agent commissions and payments
5. **Payment Plan Management**: Create and manage installment plans

#### Key Components

```typescript
// Sale Management Components
<SalesDashboard />
<SaleWizard />
<SaleDetail />
<CommissionTracker />
<PaymentPlanManager />
<PaymentRecorder />

// Payment Processing Integration
<PaymentForm saleId={saleId} paymentType="Property_Installment" />
<CommissionPaymentForm commissionId={commissionId} />
```

#### State Management Updates

```typescript
interface DalaStore {
  // Sales Management
  sales: Sale[];
  selectedSale: Sale | null;
  fetchSales: (filters?) => Promise<void>;
  createSale: (data) => Promise<void>;
  updateSaleStatus: (id, status) => Promise<void>;

  // Commissions
  commissions: Commission[];
  commissionPayments: CommissionPayment[];
  fetchCommissions: (filters?) => Promise<void>;
  createCommissionPayment: (data) => Promise<void>;

  // Payment Plans
  paymentPlans: PaymentPlan[];
  fetchPaymentPlans: (saleId?) => Promise<void>;
  createPaymentPlan: (data) => Promise<void>;

  // Enhanced Payments
  propertyPayments: OrderPayment[];
  fetchPropertyPayments: (saleId?) => Promise<void>;
}
```

### 9.7 API Service Layer Updates

```typescript
// services/dala-api.ts
export const dalaApi = {
  // Sales Management
  getSales: (params?) => api.get('/dala/sales', { params }),
  getSale: (id) => api.get(`/dala/sales/${id}`),
  createSale: (data) => api.post('/dala/sales', data),
  updateSale: (id, data) => api.put(`/dala/sales/${id}`, data),
  updateSaleStatus: (id, status) => api.put(`/dala/sales/${id}/status`, { status }),
  getSalesStats: (params?) => api.get('/dala/sales/stats', { params }),

  // Commissions
  getCommissions: (params?) => api.get('/dala/commissions', { params }),
  getCommission: (id) => api.get(`/dala/commissions/${id}`),
  createCommission: (data) => api.post('/dala/commissions', data),
  updateCommissionStatus: (id) => api.put(`/dala/commissions/${id}/status`),
  getCommissionStats: (params?) => api.get('/dala/commissions/stats', { params }),

  // Commission Payments
  getCommissionPayments: (params?) => api.get('/dala/commission-payments', { params }),
  createCommissionPayment: (data) => api.post('/dala/commission-payments', data),
  addCommissionPaymentDocument: (id, data) => api.post(`/dala/commission-payments/${id}/documents`, data),

  // Payment Plans
  getPaymentPlans: (params?) => api.get('/dala/payment-plans', { params }),
  getPaymentPlansBySale: (saleId) => api.get(`/dala/payment-plans/sale/${saleId}`),
  createPaymentPlan: (data) => api.post('/dala/payment-plans', data),
  updatePaymentPlanStatus: (id, status) => api.put(`/dala/payment-plans/${id}/status`, { status }),

  // Enhanced Property Payments
  getPropertyPayments: (saleId?) => api.get('/order-payments', { params: { sale_id: saleId } }),
  createPropertyPayment: (data) => api.post('/order-payments', data),
};
```

---

## 10. Rental Flow (Enhanced with Payment Integration)

> **✅ ENHANCED** - Rent and lease payments now integrate with the unified order-payments system.

The rental flow now uses the enhanced order-payments model for all rent and lease payment processing.

### PropertySale Object Shape

```json
{
  "_id": "...",
  "propertyId": "...",
  "blockId": "...",
  "floorId": "...",
  "unitId": "...",
  "apartmentId": "...",
  "apartmentNumber": "A-G01",
  "phaseId": "...",

  "buyer": {
    "name": "John Kamau",
    "email": "john@example.com",
    "phone": "+254712345678",
    "idNumber": "12345678",
    "kraPin": "A012345678B",
    "nationality": "Kenyan",
    "address": "P.O. Box 123, Nairobi",
    "customerId": "..."
  },

  "unitAreaSqm": 85,
  "pricePerSqm": 140000,
  "baseSalePrice": 11900000,
  "discountAmount": 400000,
  "discountReason": "Early bird discount",
  "additionalCharges": [
    { "label": "Legal fees", "amount": 150000 },
    { "label": "Stamp duty", "amount": 476000 }
  ],
  "agreedSalePrice": 12126000,
  "currency": "KES",

  "paymentPlanType": "installment",
  "instalments": [
    {
      "_id": "inst1",
      "label": "Booking Fee (10%)",
      "dueDate": "2026-07-01",
      "amount": 1212600,
      "percentageOfTotal": 10,
      "status": "paid",
      "paidAmount": 1212600,
      "paidDate": "2026-06-28",
      "receiptRef": "REC-001"
    },
    {
      "_id": "inst2",
      "label": "2nd Instalment (30%)",
      "dueDate": "2027-01-01",
      "amount": 3637800,
      "percentageOfTotal": 30,
      "status": "pending",
      "paidAmount": 0
    }
  ],
  "totalPaidAmount": 1212600,
  "outstandingBalance": 10913400,

  "status": "contracted",
  "reservationDate": "2026-06-25",
  "contractDate": "2026-06-30",

  "commissions": [
    {
      "recipientType": "agent",
      "recipientName": "Peter Agent",
      "basisType": "percentage",
      "basisValue": 3,
      "computedAmount": 363780,
      "status": "pending"
    }
  ],

  "documents": [
    {
      "url": "https://...",
      "fileName": "sale_agreement.pdf",
      "documentType": "sale_agreement"
    }
  ],

  "notes": "VIP client, priority completion",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Sale Status Flow

```
enquiry → offer_made → reserved → contracted → in_progress → completed
                                                            → cancelled → refunded
```

### Instalment Status Flow

```
pending → partially_paid → paid
        → overdue
        → waived
```

### Commission Status Flow

```
pending → approved → paid
                   → cancelled
```

### Frontend UI: Sale Details Page

1. **Buyer Card** — name, phone, email, ID, KRA PIN
2. **Pricing Summary** — base price, discounts, charges, agreed price
3. **Payment Progress** — progress bar (totalPaidAmount / agreedSalePrice), instalment table
4. **Instalment Table** — label, due date, amount, status badge, paid amount, receipt ref
5. **Commission Table** — recipient, type, value, computed amount, status
6. **Documents** — upload/view sale documents
7. **Status Timeline** — visual timeline from enquiry → completed

### Key Computed Fields (Auto-calculated by backend on save)

- `totalPaidAmount` = sum of all `instalments[].paidAmount`
- `outstandingBalance` = `agreedSalePrice - totalPaidAmount`
- `outstandingPct` (virtual) = percentage of outstanding balance

---

## 10. Rental Flow

> **Models exist at backend.** Controllers/routes are pending — frontend can prepare UI.

### 10.1 Property Tenants (Occupants)

The `PropertyTenant` model stores tenant/occupant records. **This is NOT the system `tenant_id`** — it represents physical occupants.

```json
{
  "_id": "...",
  "fullName": "Mary Wanjiku",
  "email": "mary@example.com",
  "phone": "+254722345678",
  "alternatePhone": "+254733456789",
  "dob": "1990-05-15",
  "nationality": "Kenyan",
  "idType": "national_id",
  "idNumber": "23456789",
  "kraPin": "B012345678C",

  "occupantType": "individual",
  "companyName": null,

  "physicalAddress": "123 Moi Avenue, Nairobi",
  "postalAddress": "P.O. Box 456",

  "emergencyContact": {
    "name": "John Wanjiku",
    "phone": "+254711111111",
    "relationship": "Spouse"
  },

  "employer": "ABC Corp",
  "employerPhone": "+254720000000",
  "monthlyIncome": 250000,
  "incomeSource": "employment",

  "creditScore": "good",
  "hasDefaulted": false,

  "status": "active",
  "totalLeasesCount": 2,
  "activeLeasesCount": 1,

  "documents": [
    { "url": "...", "fileName": "id_copy.pdf", "documentType": "national_id" }
  ]
}
```

**Occupant type:** `individual | company`
**Status:** `active | inactive | blacklisted`
**ID type:** `national_id | passport | military_id | company_reg | other`
**Credit score:** `excellent | good | fair | poor | unrated`
**Income source:** `employment | business | rental | pension | other`

### 10.2 Leases

```json
{
  "_id": "...",
  "propertyId": "...",
  "blockId": "...",
  "floorId": "...",
  "unitId": "...",
  "apartmentId": "...",
  "apartmentNumber": "B-201",
  "occupantId": "tenant_id_here",

  "leaseType": "monthly",
  "startDate": "2026-05-01",
  "endDate": "2027-04-30",
  "unitAreaSqm": 85,

  "rentAmount": 68000,
  "rentPerSqm": 800,
  "rentFrequency": "monthly",
  "currency": "KES",
  "rentDueDay": 5,

  "depositAmount": 136000,
  "depositPaid": 136000,
  "depositPaidDate": "2026-04-28",
  "depositRefunded": 0,
  "depositDeductions": 0,

  "serviceChargeAmount": 5000,
  "serviceChargeFrequency": "monthly",

  "rentEscalations": [
    {
      "effectiveDate": "2027-01-01",
      "newRentAmount": 73000,
      "escalationType": "percentage",
      "escalationValue": 7.35,
      "applied": false
    }
  ],

  "utilities": {
    "water": false,
    "electricity": true,
    "internet": true,
    "garbage": false
  },

  "status": "active",
  "signedDate": "2026-04-25",

  "documents": []
}
```

**Lease type:** `monthly | short_stay | annual | lease_to_own | commercial`
**Lease status flow:**
```
pending → active → notice → expired | terminated → vacated
```

**Computed virtuals:**
- `totalMonthlyCharge` = rentAmount + serviceChargeAmount
- `depositBalance` = depositAmount - depositPaid
- `durationMonths` = months between startDate and endDate

### 10.3 Rent Invoices

```json
{
  "_id": "...",
  "leaseId": "...",
  "occupantId": "...",
  "propertyId": "...",
  "unitId": "...",

  "invoiceNumber": "INV-2026-001234",
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "dueDate": "2026-05-05",

  "lines": [
    { "description": "Monthly Rent - May 2026", "lineType": "rent", "quantity": 1, "unitPrice": 68000, "amount": 68000, "taxRate": 0, "taxAmount": 0 },
    { "description": "Service Charge", "lineType": "service_charge", "quantity": 1, "unitPrice": 5000, "amount": 5000, "taxRate": 0, "taxAmount": 0 },
    { "description": "Water Bill", "lineType": "water", "quantity": 1, "unitPrice": 2500, "amount": 2500, "taxRate": 0, "taxAmount": 0 }
  ],

  "subtotal": 75500,
  "taxTotal": 0,
  "totalAmount": 75500,
  "paidAmount": 68000,
  "balance": 7500,
  "currency": "KES",

  "status": "partially_paid",
  "issuedDate": "2026-05-01"
}
```

**Invoice status flow:**
```
draft → issued → partially_paid → paid
                                 → overdue
                                 → waived
                                 → cancelled
```

**Line types:** `rent | service_charge | water | electricity | internet | garbage | penalty | repair | deposit | other`

**Auto-computed on save:**
- `subtotal` = sum of lines[].amount
- `taxTotal` = sum of lines[].taxAmount
- `totalAmount` = subtotal + taxTotal
- `balance` = totalAmount - paidAmount

### 10.4 Rent Payments

```json
{
  "_id": "...",
  "leaseId": "...",
  "invoiceId": "...",
  "occupantId": "...",
  "propertyId": "...",
  "unitId": "...",

  "paymentDate": "2026-05-03",
  "amount": 68000,
  "currency": "KES",

  "paymentMethod": "mpesa",
  "mpesaCode": "SBK12345XY",

  "paymentType": "rent",
  "periodCovered": "2026-05",

  "status": "confirmed",
  "receiptNumber": "RCP-2026-0045"
}
```

**Payment methods:** `cash | mpesa | bank_transfer | cheque | card | other`
**Payment types:** `rent | deposit | service_charge | penalty | advance | other`
**Payment status:** `pending | confirmed | reversed`

---

## 11. Documents & Media

### Property Documents

**Upload:** `POST /properties/:id/documents` (multipart/form-data)

```
Content-Type: multipart/form-data

files: [File1, File2, ...]
documentType: "title_deed"
```

**Document types:** `title_deed | survey_plan | building_permit | completion_certificate | valuation_report | soil_test | environmental_clearance | contract | quotation | brochure | floor_plan | site_plan | other`

**Delete:** `DELETE /properties/:id/documents/:documentId`

### Property Images

Images are stored in `property.images[]` (array of URL strings) and `property.coverImage` (single URL). Update via the property update endpoint.

### Sale Document Types

`sale_agreement | offer_letter | receipt | kyc_id | kyc_pin | transfer_docs | completion_certificate | other`

### Tenant Document Types (KYC)

`national_id | passport | kra_pin | company_cert | bank_statement | payslip | reference_letter | lease_copy | other`

### Lease Document Types

`signed_lease | amendment | notice_letter | inspection_report | other`

---

## 12. Enum Reference

### Property

| Field | Values |
|-------|--------|
| `category` | `residential`, `commercial`, `industrial`, `agricultural`, `mixed_use`, `other` |
| `purpose` | `sale`, `rental`, `mixed` |
| `status` | `pre_launch`, `available`, `selling`, `sold_out`, `reserved`, `under_construction`, `completed`, `fully_occupied`, `partially_occupied`, `vacant` |

### Unit

| Field | Values |
|-------|--------|
| `unitType` | `studio`, `one_bedroom`, `two_bedroom`, `three_bedroom`, `four_bedroom`, `loft`, `luxury`, `penthouse`, `shop`, `office`, `warehouse`, `plot`, `parcel`, `other` |
| `status` | `available`, `reserved`, `sold`, `occupied`, `vacant`, `under_construction` |
| `areaUnit` | `sqm`, `sqft` |
| `rentFrequency` | `daily`, `weekly`, `monthly`, `quarterly`, `annually` |
| `furnished` | `unfurnished`, `semi_furnished`, `fully_furnished` |

### Apartment

| Field | Values |
|-------|--------|
| `status` | `available`, `reserved`, `sold`, `occupied`, `under_construction` |

### Block / Floor

| Field | Values |
|-------|--------|
| `status` | `active`, `inactive`, `under_construction` |

### Location

| Field | Values |
|-------|--------|
| `type` | `country`, `county`, `town`, `neighbourhood`, `estate`, `other` |

### PropertySale

| Field | Values |
|-------|--------|
| `status` | `enquiry`, `offer_made`, `reserved`, `contracted`, `in_progress`, `completed`, `cancelled`, `refunded` |
| `paymentPlanType` | `cash`, `mortgage`, `installment`, `lease_to_own`, `other` |

### Lease

| Field | Values |
|-------|--------|
| `leaseType` | `monthly`, `short_stay`, `annual`, `lease_to_own`, `commercial` |
| `status` | `pending`, `active`, `notice`, `expired`, `terminated`, `vacated` |

### RentInvoice

| Field | Values |
|-------|--------|
| `status` | `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `waived`, `cancelled` |

### RentPayment

| Field | Values |
|-------|--------|
| `paymentMethod` | `cash`, `mpesa`, `bank_transfer`, `cheque`, `card`, `other` |
| `paymentType` | `rent`, `deposit`, `service_charge`, `penalty`, `advance`, `other` |
| `status` | `pending`, `confirmed`, `reversed` |

### PropertyTenant

| Field | Values |
|-------|--------|
| `status` | `active`, `inactive`, `blacklisted` |
| `occupantType` | `individual`, `company` |
| `idType` | `national_id`, `passport`, `military_id`, `company_reg`, `other` |
| `creditScore` | `excellent`, `good`, `fair`, `poor`, `unrated` |
| `incomeSource` | `employment`, `business`, `rental`, `pension`, `other` |

---

## 13. UI Page Breakdown

### 13.1 Properties List Page

- **Grid/List toggle** for property cards
- **Filter sidebar:** purpose, category, status, property type, price range
- **Property card:** cover image, name, type badge, purpose badge, status badge, location, unit count, price range
- **Quick stats bar:** total properties, total units, sold %, occupied %

### 13.2 Property Detail Page

**Tabs layout:**

| Tab | Content |
|-----|---------|
| **Overview** | Name, description, type, purpose, status, location (map pin), amenities, features, developer, manager, images gallery |
| **Structure** | Block/floor tree view or accordion. Click a floor → see units on that floor |
| **Units** | Full unit table with filters (type, status, price range). Click unit → drawer/modal with details |
| **Phases** | Phase timeline/cards. Show avg price/sqm per type. Activate phase button |
| **Sales** | (sale/mixed only) Sales table, pipeline kanban, payment progress |
| **Tenants** | (rental/mixed only) Occupant list, lease status, rent collection summary |
| **Financials** | Revenue summary, payment collection, outstanding balances |
| **Documents** | Upload/view property documents. Drag-and-drop upload area |
| **Settings** | Edit property details, manage blocks, danger zone (delete) |

### 13.3 Create Property Wizard

Multi-step form:

1. **Basic Info** — name, type (dropdown from PropertyTypes), category, purpose, description, developer
2. **Location** — address, coordinates (optional map picker)
3. **Pricing Defaults** — defaultPricePerSqm, currency, (rental: defaultRentPerSqm, depositMonths, rentDueDay, utilities)
4. **Structure** — Add blocks (name + totalFloors). If `isBlockless`, skip this step
5. **Phases** — Add pricing phases (name, dates, active flag)
6. **Units** — Add units to floors. For each: name, type, area, price/sqm, count
7. **Review & Create** — Summary of everything before submission

### 13.4 Unit Detail Drawer/Modal

- **Header:** unit name, type badge, number, status badge
- **Location:** Property → Block → Floor breadcrumb
- **Pricing:** area (sqm), price/sqm, list price. For rental: monthly rent, service charge, deposit
- **Phase Pricing Table:** phase name, price/sqm, list price, active badge
- **Inventory:** totalUnits / availableUnits progress bar
- **Apartments Table** (if `trackIndividualUnits`): number, area, status, sold/occupied info
- **Actions:** Edit, Sell, Create Lease

### 13.5 Sales Management Pages

#### Sales Dashboard
- **Pipeline View**: Kanban board with sales stages (enquiry → offer → reserved → contracted → completed)
- **Statistics Cards**: Total sales value, commission totals, conversion rates
- **Sales Agent Performance**: Individual agent rankings and commission tracking
- **Recent Sales**: Latest sales with quick actions

#### Sale Creation Wizard
Multi-step form:
1. **Property & Unit Selection** - Choose property, block, floor, unit
2. **Customer Information** - Select existing customer or create new
3. **Sales Terms** - Price, commission percentage, payment plan type
4. **Reservation Details** - Reservation fee, dates, initial payment
5. **Payment Plan Setup** - Installment schedule, amounts, frequencies
6. **Review & Create** - Complete summary before submission

#### Sale Detail Page
- **Header**: Sale code, status badge, creation date, last updated
- **Customer Card**: Name, contact info, KYC status, communication history
- **Unit Card**: Property details, unit specifications, pricing breakdown
- **Pricing Summary**: Base price, discounts, additional charges, agreed price
- **Payment Progress**: Visual progress bar with percentage completed
- **Payment Schedule**: Installment table with due dates, amounts, status badges
- **Commission Section**: Commission amount, status, payment history
- **Documents**: Upload/view sale agreements, receipts, KYC documents
- **Activity Timeline**: Complete history of sale events and communications
- **Action Buttons**: Record payment, Update status, Generate documents, Cancel sale

#### Commission Dashboard
- **Commission Summary**: Total earned, pending, paid amounts
- **Agent Performance**: Individual agent commission tracking
- **Payment History**: Commission payment records with withholding tax
- **Tax Reports**: Withholding tax summaries and certificates
- **Payment Actions**: Record commission payments, upload documents

#### Payment Plan Manager
- **Plan Overview**: Total amount, deposit, installments, frequency
- **Payment Schedule**: Calendar view of upcoming payments
- **Progress Tracking**: Completion percentage, next payment due
- **Management Actions**: Modify schedule, update status, send reminders
- **Payment History**: All recorded payments for the plan

### 13.6 Tenant Management Page

- Tenant list with search (name, phone, ID)
- Tenant detail: personal info, employment, credit score, KYC documents
- Active leases list
- Payment history
- Action: Create lease, Blacklist, Upload KYC doc

### 13.7 Lease Management Page

- Active leases table
- Lease detail: terms, rent, deposit, utilities, escalations
- Invoice history
- Payment history
- Actions: Issue invoice, Record payment, Give notice, Terminate, Renew

### 13.8 Rent Collection Dashboard

- Monthly collection summary (expected vs collected)
- Overdue invoices list
- Payment trend chart
- Occupancy rate gauge
- Quick actions: Issue bulk invoices, Send reminders

---

## 14. Recommended State Management

### Zustand Store Structure (or equivalent)

```typescript
interface DalaStore {
  // Property Types
  propertyTypes: PropertyType[];
  fetchPropertyTypes: () => Promise<void>;

  // Properties
  properties: Property[];
  selectedProperty: Property | null;
  propertyPagination: Pagination;
  fetchProperties: (filters?) => Promise<void>;
  fetchProperty: (id: string) => Promise<void>;
  createProperty: (data) => Promise<void>;
  updateProperty: (id, data) => Promise<void>;
  deleteProperty: (id) => Promise<void>;

  // Blocks
  blocks: Block[];
  fetchBlocks: (propertyId) => Promise<void>;
  createBlock: (propertyId, data) => Promise<void>;
  updateBlock: (propertyId, blockId, data) => Promise<void>;
  deleteBlock: (propertyId, blockId) => Promise<void>;

  // Floors
  floors: Floor[];
  fetchFloors: (blockId) => Promise<void>;

  // Phases
  phases: Phase[];
  fetchPhases: (propertyId) => Promise<void>;
  createPhase: (propertyId, data) => Promise<void>;
  activatePhase: (propertyId, phaseId) => Promise<void>;

  // Units
  units: Unit[];
  fetchUnits: (propertyId, filters?) => Promise<void>;
  addUnits: (propertyId, data) => Promise<void>;
  updateUnit: (propertyId, unitId, data) => Promise<void>;
  sellUnit: (propertyId, unitId, data) => Promise<void>;

  // Sales (when endpoints are ready)
  sales: PropertySale[];
  fetchSales: (propertyId) => Promise<void>;

  // Tenants (when endpoints are ready)
  tenants: PropertyTenant[];
  fetchTenants: () => Promise<void>;

  // Leases (when endpoints are ready)
  leases: Lease[];
  fetchLeases: (propertyId?) => Promise<void>;

  // Invoices & Payments (when endpoints are ready)
  invoices: RentInvoice[];
  payments: RentPayment[];
}
```

### API Service Layer

```typescript
// services/dala-api.ts
const DALA_BASE = '/properties';

export const dalaApi = {
  // Property Types
  getPropertyTypes: (params?) => api.get('/property-types', { params }),
  createPropertyType: (data) => api.post('/property-types', data),
  updatePropertyType: (id, data) => api.put(`/property-types/${id}`, data),
  deletePropertyType: (id) => api.delete(`/property-types/${id}`),

  // Properties
  getProperties: (params?) => api.get(DALA_BASE, { params }),
  getProperty: (id) => api.get(`${DALA_BASE}/${id}`),
  createProperty: (data) => api.post(DALA_BASE, data),
  updateProperty: (id, data) => api.put(`${DALA_BASE}/${id}`, data),
  deleteProperty: (id) => api.delete(`${DALA_BASE}/${id}`),
  getPropertyInventory: (id) => api.get(`${DALA_BASE}/${id}/inventory`),

  // Blocks
  getBlocks: (propId, params?) => api.get(`${DALA_BASE}/${propId}/blocks`, { params }),
  getBlock: (propId, blockId) => api.get(`${DALA_BASE}/${propId}/blocks/${blockId}`),
  createBlock: (propId, data) => api.post(`${DALA_BASE}/${propId}/blocks`, data),
  updateBlock: (propId, blockId, data) => api.put(`${DALA_BASE}/${propId}/blocks/${blockId}`, data),
  deleteBlock: (propId, blockId) => api.delete(`${DALA_BASE}/${propId}/blocks/${blockId}`),

  // Floors
  getFloors: (blockId, params?) => api.get(`/blocks/${blockId}/floors`, { params }),
  createFloor: (blockId, data) => api.post(`/blocks/${blockId}/floors`, data),
  updateFloor: (blockId, floorId, data) => api.put(`/blocks/${blockId}/floors/${floorId}`, data),
  deleteFloor: (blockId, floorId) => api.delete(`/blocks/${blockId}/floors/${floorId}`),

  // Phases
  getPhases: (propId) => api.get(`${DALA_BASE}/${propId}/phases`),
  getPhase: (propId, phaseId) => api.get(`${DALA_BASE}/${propId}/phases/${phaseId}`),
  createPhase: (propId, data) => api.post(`${DALA_BASE}/${propId}/phases`, data),
  updatePhase: (propId, phaseId, data) => api.put(`${DALA_BASE}/${propId}/phases/${phaseId}`, data),
  deletePhase: (propId, phaseId) => api.delete(`${DALA_BASE}/${propId}/phases/${phaseId}`),
  activatePhase: (propId, phaseId) => api.patch(`${DALA_BASE}/${propId}/phases/${phaseId}/activate`),

  // Units
  getUnits: (propId, params?) => api.get(`${DALA_BASE}/${propId}/units`, { params }),
  getUnit: (propId, unitId) => api.get(`${DALA_BASE}/${propId}/units/${unitId}`),
  addUnits: (propId, data) => api.post(`${DALA_BASE}/${propId}/units`, data),
  updateUnit: (propId, unitId, data) => api.put(`${DALA_BASE}/${propId}/units/${unitId}`, data),
  deleteUnit: (propId, unitId) => api.delete(`${DALA_BASE}/${propId}/units/${unitId}`),
  sellUnit: (propId, unitId, data) => api.post(`${DALA_BASE}/${propId}/units/${unitId}/sell`, data),
  getUnitsByBlock: (blockId) => api.get(`/blocks/${blockId}/units`),
  getUnitsByFloor: (floorId) => api.get(`/floors/${floorId}/units`),

  // Documents
  uploadDocuments: (propId, formData) => api.post(`${DALA_BASE}/${propId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (propId, docId) => api.delete(`${DALA_BASE}/${propId}/documents/${docId}`),
};
```

---

## Important Notes

1. **✅ COMPLETE IMPLEMENTATION** - All property sales models, controllers, and routes are fully implemented and ready for frontend integration.

2. **New API Endpoints Available:**
   - `/dala/sales/*` - Complete sales management
   - `/dala/commissions/*` - Commission tracking and payments
   - `/dala/commission-payments/*` - Commission payment processing with withholding tax
   - `/dala/payment-plans/*` - Installment payment plan management
   - `/order-payments` - Enhanced with property sales, rent, and lease payment support

3. **Enhanced Payment System:** The order-payments model now supports:
   - Property sale payments (reservations, deposits, installments)
   - Rent payments and lease payments
   - Automatic status updates across related models
   - Payment reversal and rollback capabilities

4. **Price formatting:** All prices are in KES (Kenyan Shillings). Format with comma separators: `KES 11,900,000`.

5. **Date handling:** The backend uses EAT (Africa/Nairobi, UTC+03:00). When sending date filters, use `YYYY-MM-DD` format — the backend applies the timezone offset.

6. **Pagination:** All list endpoints return:
   ```json
   {
     "pagination": {
       "total": 100,
       "page": 1,
       "pages": 10,
       "next": { "page": 2, "limit": 10 },
       "prev": null
     }
   }
   ```

7. **Error responses:** All errors follow:
   ```json
   { "success": false, "message": "Error description" }
   ```

8. **Authorization:** Property mutations (create/update/delete) require the user to be either the `propertyManager` or have `role: "admin"`. PropertyType CRUD is admin-only.

9. **Route Registration:** The new `/dala/*` routes need to be registered in `server.js`. Add:
   ```javascript
   app.use('/dala', require('./routers/dalaRoute/index'));
   ```

10. **Withholding Tax:** Commission payments support automatic 5% withholding tax calculation with document management for tax certificates.
