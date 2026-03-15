# Database Schema

## Purpose

This document describes the database schema for the Immopossible autonomous property management system. All tables are hosted in Supabase (PostgreSQL 17) with Row Level Security (RLS) enabled.

## Entity Relationship Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   profiles  │────<│ tenants_properties│>────│  properties │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                                            │
       │                                            │
       ▼                                            ▼
┌─────────────────┐                         ┌─────────────┐
│  damage_reports │<────────────────────────│  craftsmen  │
└─────────────────┘                         └─────────────┘
       │
       ├──────────────────┬──────────────────┬─────────────────┐
       ▼                  ▼                  ▼                 ▼
┌─────────────┐    ┌─────────────────┐  ┌──────────┐   ┌──────────────┐
│  bookings   │    │ approval_requests│  │agent_runs│   │notifications │
└─────────────┘    └─────────────────┘  └──────────┘   └──────────────┘
```

## Enums

| Enum | Values |
|------|--------|
| `user_role` | `admin`, `property_manager`, `tenant` |
| `report_status` | `received`, `triaging`, `waiting_for_approval`, `approved`, `rejected`, `booking_craftsman`, `booked`, `in_progress`, `completed`, `cancelled` |
| `priority_level` | `low`, `medium`, `high`, `critical` |
| `damage_category` | `plumbing`, `electrical`, `heating`, `structural`, `appliance`, `pest_control`, `locksmith`, `roofing`, `general_maintenance`, `other` |
| `intake_channel` | `web_form`, `email`, `whatsapp` |
| `approval_status` | `pending`, `approved`, `rejected`, `expired` |
| `agent_run_status` | `running`, `waiting_for_human`, `completed`, `failed` |
| `booking_status` | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| `notification_channel` | `email`, `whatsapp`, `in_app` |

## Tables

### `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on signup.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK, FK → auth.users) | User ID from Supabase Auth |
| `email` | TEXT | User's email |
| `full_name` | TEXT | Display name |
| `phone` | TEXT | Phone number (for WhatsApp) |
| `role` | user_role | User's role in the system |
| `avatar_url` | TEXT | Profile picture URL |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `properties`
Real estate objects (Liegenschaften).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Property ID |
| `name` | TEXT | Property name |
| `address` | TEXT | Street address |
| `city` | TEXT | City |
| `postal_code` | TEXT | Postal code |
| `country` | TEXT | Country code (default: 'CH') |
| `property_manager_id` | UUID (FK → profiles) | Assigned manager |
| `erp_property_id` | TEXT | External ERP reference |
| `metadata` | JSONB | Additional property data |

### `tenants_properties`
Junction table linking tenants to properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Assignment ID |
| `tenant_id` | UUID (FK → profiles) | Tenant user |
| `property_id` | UUID (FK → properties) | Property |
| `unit_number` | TEXT | Unit/apartment number |
| `lease_start` | DATE | Lease start date |
| `lease_end` | DATE | Lease end date |
| `is_active` | BOOLEAN | Currently active lease |

### `damage_reports`
Core table — one row per incoming damage report.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Report ID |
| `tenant_id` | UUID (FK → profiles) | Reporting tenant |
| `property_id` | UUID (FK → properties) | Affected property |
| `title` | TEXT | Short description |
| `description` | TEXT | Full description |
| `location_in_property` | TEXT | Where in the property |
| `channel` | intake_channel | How report was submitted |
| `status` | report_status | Current status |
| `priority` | priority_level | Assigned priority |
| `damage_category` | damage_category | Type of damage |
| `estimated_cost_chf` | DECIMAL | Estimated repair cost |
| `image_urls` | TEXT[] | Attached images |
| `raw_input_payload` | JSONB | Original email/WhatsApp data |
| `sender_identifier` | TEXT | Email or phone of sender |

### `craftsmen`
Vendor/craftsman registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Craftsman ID |
| `company_name` | TEXT | Company name |
| `contact_name` | TEXT | Contact person |
| `email` | TEXT | Email address |
| `phone` | TEXT | Phone number |
| `specializations` | damage_category[] | Areas of expertise |
| `hourly_rate_chf` | DECIMAL | Hourly rate |
| `is_active` | BOOLEAN | Currently available |
| `notes` | TEXT | Internal notes |

### `bookings`
Craftsman appointments linked to damage reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Booking ID |
| `damage_report_id` | UUID (FK) | Related report |
| `craftsman_id` | UUID (FK) | Assigned craftsman |
| `scheduled_date` | DATE | Appointment date |
| `scheduled_time_start` | TIME | Start time |
| `scheduled_time_end` | TIME | End time |
| `status` | booking_status | Booking status |
| `notes` | TEXT | Notes for craftsman |
| `actual_cost_chf` | DECIMAL | Final cost |

### `approval_requests`
Human-in-the-loop trigger table (Realtime enabled).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Request ID |
| `damage_report_id` | UUID (FK) | Related report |
| `agent_run_id` | UUID (FK) | Agent run that created this |
| `requested_action` | TEXT | What approval is for |
| `estimated_cost_chf` | DECIMAL | Cost requiring approval |
| `context` | JSONB | Additional context |
| `status` | approval_status | Approval status |
| `decided_by` | UUID (FK → profiles) | Who decided |
| `decided_at` | TIMESTAMPTZ | When decided |
| `decision_notes` | TEXT | Approval/rejection notes |
| `expires_at` | TIMESTAMPTZ | Auto-expire time |

### `agent_runs`
Observability table for AI agent executions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Run ID |
| `damage_report_id` | UUID (FK) | Triggering report |
| `status` | agent_run_status | Current status |
| `steps_taken` | JSONB | Array of steps executed |
| `output_summary` | TEXT | Final summary |
| `error_message` | TEXT | Error if failed |
| `tokens_used` | INTEGER | LLM tokens consumed |
| `duration_ms` | INTEGER | Total runtime |
| `checkpoint_data` | JSONB | For resuming paused runs |
| `started_at` | TIMESTAMPTZ | Start time |
| `completed_at` | TIMESTAMPTZ | End time |

### `notifications`
Outbound message log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Notification ID |
| `damage_report_id` | UUID (FK) | Related report |
| `recipient_id` | UUID (FK → profiles) | Recipient user |
| `recipient_identifier` | TEXT | Email or phone |
| `channel` | notification_channel | Delivery channel |
| `subject` | TEXT | Email subject |
| `body` | TEXT | Message content |
| `sent_at` | TIMESTAMPTZ | When sent |
| `delivered_at` | TIMESTAMPTZ | When delivered |
| `failed_at` | TIMESTAMPTZ | When failed |
| `error_message` | TEXT | Error details |
| `external_id` | TEXT | Resend/Twilio message ID |

### `erp_mock_data`
Simulated ERP data for PoC.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Record ID |
| `entity_type` | TEXT | Type: 'property', 'contract', etc. |
| `external_id` | TEXT | External ERP ID |
| `data` | JSONB | Mock ERP data |

## RLS Overview

All tables have RLS enabled. Access patterns:

| Table | Tenant Access | Staff Access |
|-------|--------------|--------------|
| `profiles` | Own profile only | All profiles |
| `properties` | Read all | Full CRUD |
| `tenants_properties` | Own assignments | Full CRUD |
| `craftsmen` | Active only | Full CRUD |
| `damage_reports` | Own reports | All reports |
| `bookings` | Own report bookings | Full CRUD |
| `approval_requests` | — | Full CRUD |
| `agent_runs` | — | Full CRUD |
| `notifications` | Own notifications | All notifications |
| `erp_mock_data` | — | Full CRUD |

## Custom Access Token Hook

The `custom_access_token_hook` function adds the user's role to the JWT claims:

```sql
-- JWT will contain: { "user_role": "admin" | "property_manager" | "tenant" }
```

This must be registered in Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook.

## Key Decisions

1. **UUIDs everywhere**: All primary keys are UUIDs for distributed ID generation
2. **JSONB for flexibility**: Metadata, steps, context stored as JSONB for schema flexibility
3. **Enum types**: Used for all status/type fields to enforce valid values
4. **GIN index on specializations**: Enables fast craftsman lookup by damage category
5. **Partial indexes**: `WHERE status = 'pending'` on approval_requests for fast pending queries

## Setup Checklist

After running the migration:

1. [ ] Register `custom_access_token_hook` in Supabase Dashboard
2. [ ] Enable Realtime for: `approval_requests`, `agent_runs`, `notifications`
3. [ ] Run seed data
4. [ ] Create storage bucket `damage-report-images` for file uploads
