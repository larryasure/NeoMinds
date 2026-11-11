# NeoMinds Live API Reference

Backend HTTP API for the NeoMinds Live community event registration platform.

- **Version:** 1.0.0
- **Base URL (local):** `http://localhost:3000`
- **Interactive docs:** `GET /docs` (Swagger UI)
- **OpenAPI spec:** `GET /openapi.json` (also stored at [`docs/openapi.json`](./openapi.json))
- **Content type:** `application/json` (except CSV export)

---

## Table of contents

1. [Authentication](#1-authentication)
2. [Conventions](#2-conventions)
3. [Endpoints](#3-endpoints)
   - [Health](#31-health)
   - [Registration (self-service)](#32-registration-self-service)
   - [Events](#33-events)
   - [Admin](#34-admin)
   - [Feedback](#35-feedback)
4. [Schemas](#4-schemas)
5. [Enums](#5-enums)
6. [Status code summary](#6-status-code-summary)
7. [Endpoint index](#7-endpoint-index)

---

## 1. Authentication

### 1.1 Admin JWT (Bearer)

Used on all admin and protected event-mutation routes.

1. `POST /admin/login` with `{ email, password }`
2. Response includes `token` (JWT HS256, **expires in 15 minutes**)
3. Send on subsequent requests:

```http
Authorization: Bearer <token>
```

| Failure                           | Status | Message                                            |
| --------------------------------- | ------ | -------------------------------------------------- |
| No/invalid `Authorization` header | 401    | `Authentication required`                          |
| Expired/garbage token             | 401    | `Invalid or expired token`                         |
| Role not allowed for route        | 403    | `You don't have permission to perform this action` |

**Roles**

| Role          | Capabilities                                               |
| ------------- | ---------------------------------------------------------- |
| `SUPER_ADMIN` | Everything ADMIN can do **plus** `POST /admin/admins`      |
| `ADMIN`       | Event CRUD, registration list/detail/export, feedback read |

There is **no refresh token** — re-login after expiry.

### 1.2 Manage token (X-Manage-Token)

Used for registration self-service (update/cancel). Obtained **once** from `POST /user/event` in the `manageToken` field. Only a SHA-256 hash is stored server-side; **there is no recovery endpoint**.

```http
X-Manage-Token: <token from registration response>
```

| Failure        | Status | Message                  |
| -------------- | ------ | ------------------------ |
| Header missing | 401    | `Manage token required`  |
| Unknown token  | 404    | `Registration not found` |

`GET /user/event/:manageToken` puts the same token in the path instead of a header.

### 1.3 Public

No authentication: `GET /health`, event reads, `POST /user/event`, registration GET-by-token, `POST /admin/login`, `POST /feedback`.

### 1.4 Ordering note

On protected routes, **authentication runs before body/query validation**. Example: `POST /events` with an invalid body and no token returns **401**, not 400.

---

## 2. Conventions

### Dates

All timestamps are **ISO-8601 UTC** strings (e.g. `2026-11-15T14:00:00.000Z`).

Event status is **computed**, not stored:

| Condition                   | `status`   |
| --------------------------- | ---------- |
| `now < startTime`           | `upcoming` |
| `startTime ≤ now < endTime` | `live`     |
| `now ≥ endTime`             | `ended`    |

### IDs

Resource ids are UUID v4 strings.

### Error envelopes

**Validation failure (Zod):**

```json
{
	"message": "Invalid request",
	"errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

`field` is a dot-joined path (e.g. `event.startTime`).

**Controller / middleware errors:**

```json
{ "message": "A registration with this email already exists for this event" }
```

**Unknown route:** `404 { "message": "Not found" }`

**Unhandled server error:** `500 { "message": "Internal server error" }` (production) or the error message in development.

### Body required

Endpoints that validate a JSON body require the body to be present. A missing body yields `400 Invalid request` (`expected object, received undefined`). Unknown keys are stripped by Zod.

### Pagination (admin registration list)

Query params: `page` (default 1), `limit` (default 20, max 100). Response: `{ items, total, page, limit }`.

---

## 3. Endpoints

### 3.1 Health

#### `GET /health`

Liveness check. **Auth:** public.

**200**

```json
{ "status": "ok" }
```

---

### 3.2 Registration (self-service)

#### `POST /user/event`

Register for an event without creating an account. Returns the manage token **exactly once**.

**Auth:** public

**Body**

| Field     | Type   | Required | Constraints                             |
| --------- | ------ | -------- | --------------------------------------- |
| `name`    | string | yes      | min 2 chars                             |
| `email`   | string | yes      | valid email                             |
| `phone`   | string | no       | 7–20 chars; stored as `null` if omitted |
| `eventId` | uuid   | yes      | must exist; event must not be ended     |

**201**

```json
{
	"registration": {
		"id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
		"name": "Jane Doe",
		"email": "jane@example.com",
		"phone": "+2348012345678",
		"status": "ACTIVE",
		"eventId": "3f1a8c2e-1b4d-4e6a-9c0f-2d3e4f5a6b7c",
		"createdAt": "2026-11-07T12:00:00.000Z"
	},
	"manageToken": "R7vK2mQ9pLxN4wYb1cJ6hF0sD3gU8tA5nE2iO7zXqM="
}
```

**Errors**

| Status | Message                                                         |
| ------ | --------------------------------------------------------------- |
| 400    | Validation envelope, or `Registration is closed for this event` |
| 404    | `Event not found`                                               |
| 409    | `A registration with this email already exists for this event`  |

Duplicate rule: one **ACTIVE** registration per `(email, eventId)`. Cancelled registrations do not block re-registration.

---

#### `GET /user/event/{manageToken}`

View registration + event by manage token.

**Auth:** possession of token (path param)  
**Path:** `manageToken` — string, min 32 chars

**200** (also returned when `status` is `CANCELLED`)

```json
{
	"id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
	"name": "Jane Doe",
	"email": "jane@example.com",
	"phone": "+2348012345678",
	"status": "ACTIVE",
	"createdAt": "2026-11-07T12:00:00.000Z",
	"updatedAt": "2026-11-07T12:00:00.000Z",
	"event": {
		"id": "3f1a8c2e-1b4d-4e6a-9c0f-2d3e4f5a6b7c",
		"title": "NeoMinds Live #12",
		"startTime": "2026-11-15T14:00:00.000Z",
		"endTime": "2026-11-15T16:00:00.000Z",
		"imageUrl": "https://example.com/banner.jpg",
		"eventLink": "https://youtube.com/watch?v=abc123",
		"replayUrl": null,
		"status": "upcoming"
	}
}
```

**Errors:** `400` (token &lt; 32 chars), `404 Registration not found`

---

#### `PATCH /user/event`

Update registration fields.

**Auth:** `X-Manage-Token` header (required)

**Body** (at least one field; all optional)

| Field   | Type   | Constraints                                           |
| ------- | ------ | ----------------------------------------------------- |
| `name`  | string | min 2                                                 |
| `email` | string | valid email; re-checks ACTIVE duplicate on same event |
| `phone` | string | 7–20 chars                                            |

**200**

```json
{
	"id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
	"name": "Jane Updated",
	"email": "jane@example.com",
	"phone": "+2348111111111",
	"status": "ACTIVE",
	"updatedAt": "2026-11-07T13:00:00.000Z"
}
```

**Errors**

| Status | Message                                                        |
| ------ | -------------------------------------------------------------- |
| 400    | Validation envelope, or `No fields to update`                  |
| 401    | `Manage token required`                                        |
| 404    | `Registration not found`                                       |
| 409    | `A registration with this email already exists for this event` |

---

#### `DELETE /user/event`

Cancel registration (soft-delete → `CANCELLED`). Idempotent.

**Auth:** `X-Manage-Token` header (required)  
**Body:** none

| Status  | Body                                                                    |
| ------- | ----------------------------------------------------------------------- |
| **204** | empty — first successful cancel                                         |
| **200** | `{ "message": "Registration is already cancelled" }` — subsequent calls |
| 401     | `Manage token required`                                                 |
| 404     | `Registration not found`                                                |

After cancel, the same email may register again for the same event.

---

### 3.3 Events

#### `GET /events`

List all events (`startTime` ascending), each with computed `status`.

**Auth:** public  
**200:** `Event[]` (empty array if none)

---

#### `GET /events/latest`

Earliest event with `endTime ≥ now` (upcoming or live).

**Auth:** public

| Status | Body                                 |
| ------ | ------------------------------------ |
| 200    | `Event`                              |
| 404    | `{ "message": "No upcoming event" }` |

---

#### `GET /events/previous`

Ended events for the replay section (`endTime < now`, `endTime` descending).

**Auth:** public

| Query   | Type    | Default | Constraints |
| ------- | ------- | ------- | ----------- |
| `limit` | integer | 10      | 1–50        |

**200:** `Event[]` (may be empty)  
**400:** invalid `limit`

---

#### `GET /events/{id}`

**Auth:** public  
**Path:** `id` (uuid)

| Status | Body                                   |
| ------ | -------------------------------------- |
| 200    | `Event`                                |
| 400    | Validation envelope                    |
| 404    | `{ "message": "Event doesn't exist" }` |

---

#### `POST /events`

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)

**Body**

| Field       | Type                   | Required | Constraints      |
| ----------- | ---------------------- | -------- | ---------------- |
| `title`     | string                 | yes      | min 2            |
| `startTime` | ISO datetime w/ offset | yes      | before `endTime` |
| `endTime`   | ISO datetime w/ offset | yes      |                  |
| `eventLink` | URL                    | yes      | unique           |
| `imageUrl`  | URL                    | yes      |                  |
| `replayUrl` | URL                    | no       | for ended/replay |

| Status    | Message                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| **201**   | Full `Event` with `status`                                                         |
| 400       | Validation envelope, or `Invalid event times`                                      |
| 401 / 403 | Auth / role                                                                        |
| 409       | `Event already exists or conflicts with another` (same `eventLink` or `startTime`) |

---

#### `PATCH /events`

Partial update. Only provided fields are written. `replayUrl: null` clears it; omit to leave unchanged. Effective start/end must remain ordered (uses existing values for omitted time fields).

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)

**Body:** `id` (uuid, required) + any of `title`, `startTime`, `endTime`, `eventLink`, `imageUrl`, `replayUrl` (nullable)

| Status    | Body                               |
| --------- | ---------------------------------- |
| **200**   | Updated `Event`                    |
| 400       | Validation / `Invalid event times` |
| 401 / 403 | Auth / role                        |
| 404       | `Event doesn't exist`              |

---

#### `DELETE /events`

Hard-delete. **The id is in the JSON body**, not the path.

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)

```json
{ "id": "3f1a8c2e-1b4d-4e6a-9c0f-2d3e4f5a6b7c" }
```

| Status                | Body                                  |
| --------------------- | ------------------------------------- |
| **204**               | empty                                 |
| 400 / 401 / 403 / 404 | as above; 404 → `Event doesn't exist` |

---

### 3.4 Admin

#### `POST /admin/login`

**Auth:** public

**Body**

| Field      | Type           | Required |
| ---------- | -------------- | -------- |
| `email`    | valid email    | yes      |
| `password` | string (min 1) | yes      |

**200**

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"admin": {
		"id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
		"name": "Super Admin",
		"email": "admin@neominds.live",
		"role": "SUPER_ADMIN"
	}
}
```

| Status | Message                                                               |
| ------ | --------------------------------------------------------------------- |
| 400    | Validation envelope                                                   |
| 401    | `Invalid email or password` (same for unknown email and bad password) |

---

#### `POST /admin/admins`

Create a **normal admin**. **SUPER_ADMIN only.**

**Auth:** Bearer, role `SUPER_ADMIN` (ADMIN → 403)

**Body**

| Field      | Type        | Required             | Constraints                                 |
| ---------- | ----------- | -------------------- | ------------------------------------------- |
| `name`     | string      | yes                  | min 2                                       |
| `email`    | valid email | yes                  | unique                                      |
| `password` | string      | yes                  | min 8; bcrypt cost 12                       |
| `role`     | `"ADMIN"`   | no (default `ADMIN`) | any other value (incl. `SUPER_ADMIN`) → 400 |

**201**

```json
{
	"id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
	"name": "Ops Admin",
	"email": "ops@neominds.live",
	"role": "ADMIN"
}
```

Password hash is never returned.

| Status    | Message                                   |
| --------- | ----------------------------------------- |
| 400       | Validation (weak password, bad role, …)   |
| 401 / 403 | Auth / not SUPER_ADMIN                    |
| 409       | `An admin with this email already exists` |

---

#### `GET /admin/registrations`

Paginated, filterable list. `manageTokenHash` is never included.

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)

| Query     | Type                    | Default | Constraints                                              |
| --------- | ----------------------- | ------- | -------------------------------------------------------- |
| `page`    | integer                 | 1       | ≥ 1                                                      |
| `limit`   | integer                 | 20      | 1–100                                                    |
| `status`  | `ACTIVE` \| `CANCELLED` | —       |                                                          |
| `eventId` | uuid                    | —       |                                                          |
| `q`       | string                  | —       | 1–200 chars; case-insensitive match on **name OR email** |

**200**

```json
{
	"items": [
		{
			"id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
			"name": "Jane Doe",
			"email": "jane@example.com",
			"phone": "+2348012345678",
			"status": "ACTIVE",
			"eventId": "3f1a8c2e-1b4d-4e6a-9c0f-2d3e4f5a6b7c",
			"createdAt": "2026-11-07T12:00:00.000Z",
			"updatedAt": "2026-11-07T12:00:00.000Z",
			"event": {
				"id": "3f1a8c2e-1b4d-4e6a-9c0f-2d3e4f5a6b7c",
				"title": "NeoMinds Live #12",
				"startTime": "2026-11-15T14:00:00.000Z",
				"endTime": "2026-11-15T16:00:00.000Z"
			}
		}
	],
	"total": 1,
	"page": 1,
	"limit": 20
}
```

Ordered by `createdAt` descending. **Errors:** 400 / 401 / 403.

---

#### `GET /admin/registrations/export`

CSV download of matching registrations. Same filters as the list endpoint; **`page`/`limit` are accepted but ignored** (export is unpaginated).

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)

**200**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="registrations.csv"`
- CRLF line endings

**Columns:**  
`id,name,email,phone,status,eventId,eventTitle,eventStartTime,eventEndTime,createdAt,updatedAt`

**Errors:** 400 / 401 / 403

---

#### `GET /admin/registrations/{id}`

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)  
**Path:** `id` (uuid)

**200** — registration (minus `manageTokenHash`) + nested `event` (full row, **no** computed `status`) + `feedback[]`.

**Errors:** 400 / 401 / 403 / `404 Registration not found`

---

### 3.5 Feedback

#### `POST /feedback`

**Auth:** public

**Body** — all fields required

| Field                | Type    | Constraints                            |
| -------------------- | ------- | -------------------------------------- |
| `eventId`            | uuid    | must exist                             |
| `registrationId`     | uuid    | must exist **and belong to** `eventId` |
| `rating`             | integer | 1–5                                    |
| `conversationValue`  | enum    | see [Enums](#5-enums)                  |
| `usefulPart`         | string  | 1–2000                                 |
| `futureImprovements` | string  | 1–2000                                 |
| `recommendedTopics`  | string  | 1–2000                                 |
| `attendance`         | enum    | see [Enums](#5-enums)                  |
| `volunteer`          | enum    | `YES` \| `NO`                          |

**201**

```json
{ "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a" }
```

| Status | Message                                                          |
| ------ | ---------------------------------------------------------------- |
| 400    | Validation envelope                                              |
| 404    | `Event not found` **or** `Registration not found for this event` |
| 409    | `Feedback already submitted` (one per registration+event)        |

---

#### `GET /feedback/{eventId}`

**Auth:** Bearer (`SUPER_ADMIN` or `ADMIN`)  
**Path:** `eventId` (uuid)

**200:** `Feedback[]` newest first. Unknown-but-valid uuid → **`[]`** (not 404).  
**Errors:** 400 / 401 / 403

---

## 4. Schemas

### Event

| Field                     | Type                            | Notes                                                         |
| ------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `id`                      | uuid                            |                                                               |
| `title`                   | string                          |                                                               |
| `startTime` / `endTime`   | date-time                       |                                                               |
| `imageUrl`                | uri                             |                                                               |
| `eventLink`               | uri                             | unique live/YouTube link                                      |
| `replayUrl` \| null       | uri                             | recording link                                                |
| `createdAt` / `updatedAt` | date-time                       |                                                               |
| `status`                  | `upcoming` \| `live` \| `ended` | computed (absent on admin registration detail's nested event) |

### Registration

| Field                     | Type                    | Notes                |
| ------------------------- | ----------------------- | -------------------- |
| `id`                      | uuid                    |                      |
| `name`                    | string                  |                      |
| `email`                   | string                  |                      |
| `phone` \| null           | string                  | optional at creation |
| `status`                  | `ACTIVE` \| `CANCELLED` |                      |
| `eventId`                 | uuid                    |                      |
| `createdAt` / `updatedAt` | date-time               |                      |

Never exposed: `manageTokenHash`.

### Feedback

| Field                                                   | Type    |
| ------------------------------------------------------- | ------- |
| `id`                                                    | uuid    |
| `rating`                                                | int 1–5 |
| `conversationValue`                                     | enum    |
| `usefulPart`, `futureImprovements`, `recommendedTopics` | string  |
| `attendance`, `volunteer`                               | enum    |
| `eventId`, `registrationId`                             | uuid    |

No timestamp fields on this model.

### Admin (public)

| Field   | Type                     |
| ------- | ------------------------ |
| `id`    | uuid                     |
| `name`  | string                   |
| `email` | string                   |
| `role`  | `SUPER_ADMIN` \| `ADMIN` |

---

## 5. Enums

| Enum                    | Values                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `RegistrationStatus`    | `ACTIVE`, `CANCELLED`                                                                        |
| `AdminRole`             | `SUPER_ADMIN`, `ADMIN`                                                                       |
| `EventStatus`           | `upcoming`, `live`, `ended`                                                                  |
| `ConversationValueEnum` | `VERY_VALUABLE`, `VALUABLE`, `SOMEWHAT_VALUABLE`, `NOT_VERY_VALUABLE`, `NOT_VALUABLE_AT_ALL` |
| `AttendanceEnum`        | `DEFINITELY`, `PROBABLY`, `NOT_SURE`, `PROBABLY_NOT`                                         |
| `VolunteerEnum`         | `YES`, `NO`                                                                                  |

---

## 6. Status code summary

| Status | Typical messages                                                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 200    | Success; `Registration is already cancelled`                                                                                                  |
| 201    | Created (registration, event, admin, feedback)                                                                                                |
| 204    | Cancelled registration; deleted event (empty body)                                                                                            |
| 400    | `Invalid request` + `errors[]`; `Invalid event times`; `No fields to update`; `Registration is closed for this event`                         |
| 401    | `Authentication required`; `Invalid or expired token`; `Manage token required`; `Invalid email or password`                                   |
| 403    | `You don't have permission to perform this action`                                                                                            |
| 404    | `Not found`; `Registration not found`; `Event doesn't exist`; `Event not found`; `No upcoming event`; `Registration not found for this event` |
| 409    | Duplicate registration/event/admin/feedback; `Resource already exists` (unique race)                                                          |
| 500    | `Internal server error` (or error detail in development)                                                                                      |

---

## 7. Endpoint index

| Method | Path                          | Auth                                    |
| ------ | ----------------------------- | --------------------------------------- |
| GET    | `/health`                     | public                                  |
| GET    | `/user/event/{manageToken}`   | public (token in path)                  |
| POST   | `/user/event`                 | public                                  |
| PATCH  | `/user/event`                 | `X-Manage-Token`                        |
| DELETE | `/user/event`                 | `X-Manage-Token`                        |
| GET    | `/events`                     | public                                  |
| GET    | `/events/latest`              | public                                  |
| GET    | `/events/previous`            | public                                  |
| GET    | `/events/{id}`                | public                                  |
| POST   | `/events`                     | Bearer: SUPER_ADMIN, ADMIN              |
| PATCH  | `/events`                     | Bearer: SUPER_ADMIN, ADMIN              |
| DELETE | `/events`                     | Bearer: SUPER_ADMIN, ADMIN (id in body) |
| POST   | `/admin/login`                | public                                  |
| POST   | `/admin/admins`               | Bearer: **SUPER_ADMIN only**            |
| GET    | `/admin/registrations`        | Bearer: SUPER_ADMIN, ADMIN              |
| GET    | `/admin/registrations/export` | Bearer: SUPER_ADMIN, ADMIN              |
| GET    | `/admin/registrations/{id}`   | Bearer: SUPER_ADMIN, ADMIN              |
| POST   | `/feedback`                   | public                                  |
| GET    | `/feedback/{eventId}`         | Bearer: SUPER_ADMIN, ADMIN              |

---

## Known caveats

1. **Manage token is shown once** — no recovery; store client-side securely.
2. **JWT lifetime is 15 minutes** — clients must re-login.
3. **`DELETE /events` takes id in the body** (unlike path-id GET/PATCH patterns).
4. **Body-parser errors** (malformed JSON, payload &gt; 100kb) are not mapped to 400/413 by the app error handler and currently surface as 500 in production.
5. **`GET /feedback/:eventId` returns `[]`** for unknown uuids; **`GET /events/latest` returns 404** when nothing is upcoming — intentional asymmetry.
6. On protected routes, **401/403 come before 400** (auth before validation).
