# Hospital Equipment Inventory — API Reference

Complete endpoint reference for the NestJS backend. **44 endpoints** across 10 modules.

| Item | Value |
|------|-------|
| **Base URL** | `http://localhost:3000` (configurable via `PORT`) |
| **Swagger UI** | `GET /api/docs` |
| **Static uploads** | `GET /uploads/*` |
| **Global prefix** | None |

---

## Authentication & Authorization

### Headers

| Route type | Requirement |
|------------|-------------|
| Protected routes | `Authorization: Bearer <accessToken>` |
| `POST /auth/login` | None (public) |
| `GET /health` | None (public) |
| `POST /auth/refresh` | Refresh token in JSON body — **no Bearer header** |
| `POST /auth/logout` | Bearer access token |

### Roles

`ADMINISTRATOR` · `BIOMEDICAL_ENGINEER` · `DEPARTMENT_USER` · `STORE_OFFICER`

### Global guards

- **JwtAuthGuard** — all routes except `@Public()`
- **RolesGuard** — enforced when `@Roles(...)` is present
- **DepartmentScopeGuard** — routes with `:departmentId` param (scoped roles only)
- **ThrottlerGuard** — 100 req / 60s (configurable)

### Default admin (seeded on first boot)

| Field | Default |
|-------|---------|
| Username | `admin` |
| Password | Value of `DEFAULT_ADMIN_PASSWORD` in `.env` |

---

## Response Format

### Success (JSON)

```json
{
  "data": { },
  "meta": { }
}
```

Paginated lists include:

```json
{
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

### Error

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-07-13T12:00:00.000Z",
  "path": "/equipment"
}
```

### Validation rules

- Unknown body/query fields are **rejected** (`forbidNonWhitelisted: true`)
- Types are coerced where possible (`transform: true`)

---

## Enums

### Role

`ADMINISTRATOR` | `BIOMEDICAL_ENGINEER` | `DEPARTMENT_USER` | `STORE_OFFICER`

### EquipmentStatus

`PENDING_INSTALLATION` | `WORKING` | `UNDER_REPAIR` | `CONDEMNED` | `DECOMMISSIONED`

### MaintenanceType

`PREVENTIVE` | `CORRECTIVE` | `CALIBRATION`

### MaintenanceStatus

`SCHEDULED` | `IN_PROGRESS` | `COMPLETED` | `OVERDUE`

---

## Shared Query Parameters

Used by paginated list endpoints (`GET /users`, `/departments`, `/equipment`, etc.):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number (min 1) |
| `limit` | number | `10` | Items per page (1–100) |
| `sort` | string | `-createdAt` | Sort field; prefix `-` for descending |
| `search` | string | — | Free-text search |

---

## 1. Health

### `GET /health`

**Auth:** Public  
**Body:** None

**Response (`data`):**

```json
{
  "status": "ok",
  "service": "hospital-equipment-inventory-sys",
  "timestamp": "2026-07-13T15:00:00.000Z"
}
```

---

## 2. Auth

### `POST /auth/login`

**Auth:** Public · **Throttle:** 5/min

**Request body:**

```json
{
  "username": "admin",
  "password": "ChangeMe123!"
}
```

| Field | Type | Required |
|-------|------|----------|
| `username` | string | Yes |
| `password` | string | Yes |

**Response (`data`):**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@hos",
    "fullName": "System Administrator",
    "role": "ADMINISTRATOR",
    "departments": []
  }
}
```

---

### `POST /auth/refresh`

**Auth:** Public (refresh token validated from body) · **Throttle:** 10/min

**Request body:**

```json
{
  "refreshToken": "eyJ..."
}
```

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

**Response (`data`):**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### `POST /auth/logout`

**Auth:** Bearer token · **Roles:** Any authenticated user  
**Body:** None  
**Status:** `204 No Content`

---

## 3. Users

All routes require Bearer token.

### `POST /users`

**Roles:** `ADMINISTRATOR`

**Request body:**

```json
{
  "username": "jdoe",
  "email": "jdoe@hospital.local",
  "password": "StrongP@ssw0rd",
  "fullName": "Jane Doe",
  "role": "BIOMEDICAL_ENGINEER",
  "departments": ["507f1f77bcf86cd799439011"],
  "isActive": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | Yes | 3–30 chars |
| `email` | string | Yes | Valid email |
| `password` | string | Yes | 8–72 chars |
| `fullName` | string | Yes | 2–100 chars |
| `role` | Role | Yes | Enum |
| `departments` | string[] | No | Unique MongoDB IDs |
| `isActive` | boolean | No | Default `true` |

---

### `GET /users`

**Roles:** `ADMINISTRATOR`  
**Query:** Pagination (see shared params)

---

### `GET /users/me`

**Roles:** Any authenticated user  
**Response:** Current user profile (password excluded)

---

### `PATCH /users/me/password`

**Roles:** Any authenticated user

**Request body:**

```json
{
  "currentPassword": "ChangeMe123!",
  "newPassword": "NewStrongP@ss1"
}
```

| Field | Type | Required |
|-------|------|----------|
| `currentPassword` | string | Yes |
| `newPassword` | string | Yes (8–72 chars) |

---

### `GET /users/:id`

**Roles:** `ADMINISTRATOR`  
**Path params:** `id` — MongoDB ObjectId

---

### `PATCH /users/:id`

**Roles:** `ADMINISTRATOR`  
**Path params:** `id`

**Request body** (all fields optional):

```json
{
  "username": "jdoe2",
  "email": "jdoe2@hospital.local",
  "fullName": "Jane Doe Updated",
  "role": "DEPARTMENT_USER",
  "departments": ["507f1f77bcf86cd799439011"],
  "isActive": true
}
```

---

### `PATCH /users/:id/status`

**Roles:** `ADMINISTRATOR`

**Request body:**

```json
{
  "isActive": false
}
```

| Field | Type | Required |
|-------|------|----------|
| `isActive` | boolean | Yes |

---

### `PATCH /users/:id/password`

**Roles:** `ADMINISTRATOR`

**Request body:**

```json
{
  "newPassword": "ResetP@ssw0rd1"
}
```

| Field | Type | Required |
|-------|------|----------|
| `newPassword` | string | Yes (8–72 chars) |

---

## 4. Departments

All routes require Bearer token.

### `POST /departments`

**Roles:** `ADMINISTRATOR`

**Request body:**

```json
{
  "name": "Emergency",
  "code": "EMR",
  "location": "Block A, Ground Floor",
  "isActive": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 2–100 chars |
| `code` | string | Yes | 2–10 chars (stored upper-case) |
| `location` | string | No | Max 150 chars |
| `isActive` | boolean | No | Default `true` |

---

### `GET /departments`

**Roles:** Any authenticated user  
**Query:** Pagination

---

### `GET /departments/active`

**Roles:** Any authenticated user  
**Response:** Array of active departments

---

### `GET /departments/:id`

**Roles:** Any authenticated user  
**Path params:** `id`

---

### `PATCH /departments/:id`

**Roles:** `ADMINISTRATOR`  
**Body:** Partial of create DTO (all fields optional)

---

### `DELETE /departments/:id`

**Roles:** `ADMINISTRATOR`  
**Status:** `204 No Content` (soft delete)

---

## 5. Equipment

All routes require Bearer token. List endpoints are department-scoped for `DEPARTMENT_USER` and `BIOMEDICAL_ENGINEER`.

### `POST /equipment`

**Roles:** `ADMINISTRATOR`, `STORE_OFFICER`, `BIOMEDICAL_ENGINEER`

**Request body:**

```json
{
  "assetNumber": "ICU-00042",
  "name": "Patient Monitor",
  "category": "Monitoring",
  "manufacturer": "Philips",
  "model": "IntelliVue MX450",
  "serialNumber": "SN-00012345",
  "department": "507f1f77bcf86cd799439011",
  "roomLocation": "Room 4, ICU",
  "supplier": "MedSupplies Ltd",
  "purchaseDate": "2025-01-15",
  "warrantyStartDate": "2025-01-15",
  "warrantyEndDate": "2027-01-15",
  "cost": 12500,
  "status": "PENDING_INSTALLATION",
  "pmFrequencyDays": 90,
  "calibrationFrequencyDays": 365
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `assetNumber` | string | No | Auto-generated if omitted |
| `name` | string | Yes | 2–150 chars |
| `category` | string | Yes | 2–100 chars |
| `manufacturer` | string | Yes | Max 100 chars |
| `model` | string | No | Max 100 chars |
| `serialNumber` | string | Yes | Max 100 chars |
| `department` | string | Yes | MongoDB ID |
| `roomLocation` | string | No | Max 150 chars |
| `supplier` | string | No | Max 150 chars |
| `purchaseDate` | string | No | ISO date |
| `warrantyStartDate` | string | No | ISO date |
| `warrantyEndDate` | string | No | ISO date |
| `cost` | number | No | Min 0 |
| `status` | EquipmentStatus | No | Default `PENDING_INSTALLATION` |
| `pmFrequencyDays` | number | No | Default 90 |
| `calibrationFrequencyDays` | number | No | Default 365 |

---

### `GET /equipment`

**Roles:** Any authenticated user (department-scoped)

**Query params** (pagination + filters):

| Param | Type | Description |
|-------|------|-------------|
| `page`, `limit`, `sort`, `search` | — | Pagination |
| `department` | string | MongoDB ID |
| `status` | EquipmentStatus | Filter by status |
| `category` | string | Case-insensitive match |

---

### `GET /equipment/department/:departmentId`

**Roles:** Any authenticated user  
**Path params:** `departmentId` — department scope guard applies

---

### `GET /equipment/status/:status`

**Roles:** Any authenticated user  
**Path params:** `status` — EquipmentStatus enum value

---

### `GET /equipment/:id`

**Roles:** Any authenticated user  
**Path params:** `id`

---

### `PATCH /equipment/:id`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`  
**Body:** Partial of create DTO (all fields optional)

---

### `DELETE /equipment/:id`

**Roles:** `ADMINISTRATOR`  
**Status:** `204 No Content` (soft delete)

---

### `POST /equipment/:id/photos`

**Roles:** `ADMINISTRATOR`, `STORE_OFFICER`, `BIOMEDICAL_ENGINEER`  
**Content-Type:** `multipart/form-data`

| Field | Type | Max | Allowed MIME |
|-------|------|-----|--------------|
| `photos` | file[] | 10 files | JPEG, PNG, WebP |

Max file size: `UPLOAD_MAX_FILE_SIZE_MB` (default 10 MB)

---

### `POST /equipment/:id/manual`

**Roles:** `ADMINISTRATOR`, `STORE_OFFICER`, `BIOMEDICAL_ENGINEER`  
**Content-Type:** `multipart/form-data`

| Field | Type | Max | Allowed MIME |
|-------|------|-----|--------------|
| `manual` | file | 1 file | JPEG, PNG, WebP, PDF |

---

### `POST /equipment/:id/qr-code/regenerate`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`  
**Response:** Equipment document with updated `qrCodeUrl`

---

### `GET /equipment/:id/qr-code`

**Roles:** Any authenticated user

**Response (`data`):**

```json
{
  "qrCodeUrl": "/uploads/qr-codes/e8fea4d2-1b6e-41ff-9e5e-841819ac4121.png"
}
```

---

## 6. Receiving

Store receiving workflow. All routes require Bearer token.

### `POST /receiving/register`

**Roles:** `ADMINISTRATOR`, `STORE_OFFICER`

Same body as `POST /equipment` **except `status` is not accepted** — always set to `PENDING_INSTALLATION`.

**Request body:**

```json
{
  "name": "Infusion Pump",
  "category": "Infusion",
  "manufacturer": "B Braun",
  "serialNumber": "SN-INF-98765",
  "department": "507f1f77bcf86cd799439011",
  "supplier": "Hospital Supplies Co",
  "purchaseDate": "2026-03-01",
  "cost": 3200
}
```

---

### `PATCH /receiving/:equipmentId/confirm-installation`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`

**Request body:**

```json
{
  "installationDate": "2026-03-10",
  "note": "Installed and tested successfully"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `installationDate` | string | No | ISO date; defaults to now |
| `note` | string | No | Max 500 chars |

---

### `PATCH /receiving/:equipmentId/status`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`

**Request body:**

```json
{
  "toStatus": "UNDER_REPAIR",
  "note": "Intermittent alarm fault reported"
}
```

| Field | Type | Required |
|-------|------|----------|
| `toStatus` | EquipmentStatus | Yes |
| `note` | string | No (max 500) |

---

### `GET /receiving/:equipmentId/history`

**Roles:** Any authenticated user  
**Query:** Pagination

---

## 7. Maintenance

All routes require Bearer token. List/schedule endpoints are department-scoped for scoped roles.

### `POST /maintenance`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`

**Request body (preventive):**

```json
{
  "equipment": "507f1f77bcf86cd799439011",
  "type": "PREVENTIVE",
  "scheduledDate": "2026-04-01",
  "engineer": "507f1f77bcf86cd799439012",
  "spareParts": [
    { "partName": "Filter Kit", "quantity": 2, "cost": 85 }
  ],
  "serviceReport": "Scheduled PM visit"
}
```

**Request body (corrective — no scheduledDate required):**

```json
{
  "equipment": "507f1f77bcf86cd799439011",
  "type": "CORRECTIVE",
  "serviceReport": "Emergency repair — power supply replaced",
  "spareParts": [
    { "partName": "PSU Module", "quantity": 1, "cost": 450 }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `equipment` | string | Yes | MongoDB ID |
| `type` | MaintenanceType | Yes | Enum |
| `scheduledDate` | string | Conditional | Required for PREVENTIVE/CALIBRATION |
| `performedDate` | string | No | ISO date |
| `engineer` | string | No | MongoDB ID |
| `spareParts` | array | No | Max 50 items |
| `serviceReport` | string | No | Max 2000 chars |

**SparePartUsed object:**

| Field | Type | Required |
|-------|------|----------|
| `partName` | string | Yes |
| `quantity` | number | Yes (min 1) |
| `cost` | number | Yes (min 0) |

---

### `GET /maintenance`

**Query params** (pagination + filters):

| Param | Type | Description |
|-------|------|-------------|
| `page`, `limit`, `sort`, `search` | — | Pagination |
| `equipment` | string | MongoDB ID |
| `engineer` | string | MongoDB ID |
| `type` | MaintenanceType | Filter |
| `status` | MaintenanceStatus | Filter |
| `from` | string | ISO date — scheduledDate >= |
| `to` | string | ISO date — scheduledDate <= |

---

### `GET /maintenance/schedule`

**Roles:** Any authenticated user  
Defaults to `SCHEDULED` + `OVERDUE` when no `status` filter is provided.

---

### `GET /maintenance/equipment/:equipmentId/history`

**Path params:** `equipmentId`

---

### `GET /maintenance/:id`

**Path params:** `id`

---

### `PATCH /maintenance/:id`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`  
**Body:** Partial of create DTO

---

### `PATCH /maintenance/:id/complete`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`

**Request body:**

```json
{
  "performedDate": "2026-04-01",
  "serviceReport": "PM completed — all checks passed",
  "spareParts": [
    { "partName": "Filter Kit", "quantity": 2, "cost": 85 }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `performedDate` | string | No | ISO date; defaults to now |
| `serviceReport` | string | No | Max 2000 chars |
| `spareParts` | array | No | Max 50 items |

---

### `POST /maintenance/:id/photos`

**Roles:** `ADMINISTRATOR`, `BIOMEDICAL_ENGINEER`  
**Content-Type:** `multipart/form-data`

| Field | Type | Max | Allowed MIME |
|-------|------|-----|--------------|
| `photos` | file[] | 10 files | JPEG, PNG, WebP |

---

### `DELETE /maintenance/:id`

**Roles:** `ADMINISTRATOR`  
**Status:** `204 No Content` (soft delete)

---

## 8. Notifications

All routes require Bearer token. Scoped to the current user.

### `GET /notifications`

**Query params** (pagination + filter):

| Param | Type | Description |
|-------|------|-------------|
| `page`, `limit`, `sort`, `search` | — | Pagination |
| `unreadOnly` | boolean | Filter unread only |

---

### `GET /notifications/unread-count`

**Response (`data`):**

```json
{
  "count": 3
}
```

---

### `PATCH /notifications/:id/read`

**Path params:** `id` — own notifications only

---

### `PATCH /notifications/read-all`

**Response (`data`):**

```json
{
  "updated": 5
}
```

---

## 9. Dashboard

### `GET /dashboard/summary`

**Roles:** Any authenticated user (department-scoped for scoped roles)

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `department` | string | Optional MongoDB ID to restrict summary |

**Response (`data`):**

```json
{
  "totalEquipment": 120,
  "working": 95,
  "underRepair": 8,
  "condemned": 3,
  "pendingInstallation": 10,
  "decommissioned": 4,
  "pmDueThisMonth": 12,
  "receivedToday": 2,
  "byDepartment": [
    { "departmentId": "...", "departmentName": "ICU", "count": 25 }
  ]
}
```

---

## 10. Reports

**Roles:** `ADMINISTRATOR` only (class-level guard)  
All endpoints return **binary file downloads** — not the JSON envelope.

**Shared query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `department` | string | — | MongoDB ID |
| `status` | EquipmentStatus | — | Filter |
| `engineer` | string | — | MongoDB ID |
| `from` | string | — | ISO date (inclusive) |
| `to` | string | — | ISO date (inclusive) |
| `format` | `excel` \| `pdf` | `excel` | Output format |

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/reports/inventory` | Full inventory report |
| `GET` | `/reports/department-inventory` | Inventory grouped by department |
| `GET` | `/reports/condemned` | Condemned equipment report |
| `GET` | `/reports/pm` | Preventive maintenance report |
| `GET` | `/reports/breakdown` | Equipment breakdown report |
| `GET` | `/reports/engineer-work` | Engineer workload report |

**Response headers:**

- Excel: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `Content-Type: application/pdf`
- Both: `Content-Disposition: attachment; filename="..."`

---

## Endpoint Summary

| Module | Count |
|--------|-------|
| Health | 1 |
| Auth | 3 |
| Users | 8 |
| Departments | 6 |
| Equipment | 12 |
| Receiving | 4 |
| Maintenance | 9 |
| Notifications | 4 |
| Dashboard | 1 |
| Reports | 6 |
| **Total** | **44** |

---

## Postman Collection

Import these files from the `postman/` folder:

| File | Purpose |
|------|---------|
| `Hospital-Equipment-Inventory-API.postman_collection.json` | Full collection with auth, examples, and auto-save tests |
| `Local.postman_environment.json` | Local dev environment variables |

**Quick start:**

1. Import both files into Postman.
2. Select the **Local** environment.
3. Run **Auth → Login (Admin)**.
4. Run **Setup → Get Active Departments** to populate `departmentId`.
5. Test any endpoint in the collection.

Regenerate the collection after API changes:

```bash
node scripts/generate-postman-collection.js
```
