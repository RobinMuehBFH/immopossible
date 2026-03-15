# Authentication & Authorization

## Overview

The application uses Supabase Auth with cookie-based sessions (SSR pattern) for authentication. User roles are embedded in the JWT via a custom access token hook, enabling role-based access control at both the application and database (RLS) level.

## User Roles

| Role | Description | Landing Page |
|------|-------------|--------------|
| `admin` | System administrator | `/dashboard` |
| `property_manager` | Manages properties and damage reports | `/dashboard` |
| `tenant` | Submits and views their own damage reports | `/portal` |

## Auth Flow

### Sign Up (Property Managers / Admins)

1. User navigates to `/signup`
2. Fills email/password form
3. Server action `signUp()` creates account with `user_role = property_manager` in metadata
4. Confirmation email sent (if email verification enabled in Supabase)
5. User confirms email and is redirected to `/login`

### Sign Up (Tenants)

Tenants are created by property managers via invite. Self-registration is disabled for tenants.

### Login

1. User navigates to `/login`
2. Two options:
   - **Email/Password**: Server action `signIn()` authenticates user
   - **Google OAuth**: Redirects to Supabase Auth → Google → `/auth/callback`
3. On success, session cookie is set
4. User is redirected based on role:
   - `tenant` → `/portal`
   - `admin` / `property_manager` → `/dashboard`

### Logout

1. User clicks logout in navigation header
2. Server action `signOut()` clears session
3. User is redirected to `/login`

## JWT Custom Claims

The database includes a `custom_access_token_hook` function that adds the `user_role` claim to the JWT:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims JSONB;
    user_role public.user_role;
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = (event->>'user_id')::UUID;

    claims := event->'claims';
    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    ELSE
        claims := jsonb_set(claims, '{user_role}', '"tenant"');
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;
```

> **Important**: This hook must be registered manually in Supabase Dashboard:
> Authentication → Hooks → Custom Access Token Hook

## Supabase Clients

Three client configurations for different contexts:

### Browser Client (`lib/supabase/client.ts`)

- Uses `createBrowserClient` from `@supabase/ssr`
- For client-side React components
- Uses anon key (respects RLS)

```typescript
import { createBrowserClient } from '@supabase/ssr';
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (`lib/supabase/server.ts`)

- Uses `createServerClient` from `@supabase/ssr`
- For Server Components, API routes, Server Actions
- Manages session via cookies
- Uses anon key (respects RLS)

### Admin Client (`lib/supabase/admin.ts`)

- Uses service role key
- Bypasses RLS entirely
- For: LangGraph agent, webhooks, background jobs
- **Never expose to client**

## Middleware

The `middleware.ts` handles:

1. **Session Refresh**: Updates session cookie on every request
2. **Route Protection**: Redirects unauthenticated users to `/login`
3. **Role-Based Redirects**: Ensures users land on appropriate pages

### Protected Routes

| Route Pattern | Requirements |
|---------------|--------------|
| `/dashboard/*` | Authenticated + role `admin` or `property_manager` |
| `/portal/*` | Authenticated + role `tenant` |
| `/login`, `/signup` | Public (redirect to home if authenticated) |
| `/auth/callback` | Public |

## RLS Integration

Row Level Security policies use `auth.uid()` and the JWT `user_role` claim:

```sql
-- Example: Tenants can only see their own reports
CREATE POLICY "Tenants can view own reports" ON public.damage_reports
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'user_role' = 'tenant' AND tenant_id = auth.uid())
        OR auth.jwt() ->> 'user_role' IN ('admin', 'property_manager')
    );
```

## Key Files

| File | Purpose |
|------|---------|
| [lib/supabase/client.ts](../lib/supabase/client.ts) | Browser Supabase client |
| [lib/supabase/server.ts](../lib/supabase/server.ts) | Server Supabase client |
| [lib/supabase/admin.ts](../lib/supabase/admin.ts) | Admin Supabase client (bypasses RLS) |
| [lib/types/database.types.ts](../lib/types/database.types.ts) | TypeScript types for DB |
| [middleware.ts](../middleware.ts) | Session refresh + route protection |
| [app/(auth)/actions.ts](../app/(auth)/actions.ts) | Server actions for auth |
| [app/(auth)/login/page.tsx](../app/(auth)/login/page.tsx) | Login page |
| [app/(auth)/signup/page.tsx](../app/(auth)/signup/page.tsx) | Signup page |
| [app/auth/callback/route.ts](../app/auth/callback/route.ts) | OAuth callback handler |

## Manual Setup Steps

1. **Enable Email/Password Auth** in Supabase Dashboard (Authentication → Providers)
2. **Enable Google OAuth** (Authentication → Providers → Google)
3. **Register JWT Hook** (Authentication → Hooks → Custom Access Token Hook)
   - Schema: `public`
   - Function: `custom_access_token_hook`
4. **Configure Redirect URLs** (Authentication → URL Configuration):
   - Site URL: `http://localhost:3000` (dev) or production URL
   - Redirect URLs: `http://localhost:3000/auth/callback`

## Known Limitations

- Email verification is optional and not enforced by default
- Password reset flow not yet implemented
- MFA not implemented (out of scope for PoC)
- Tenant invite flow (Phase 5) will add email-based invitations
