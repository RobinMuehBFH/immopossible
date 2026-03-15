# Auth-System Integration: NextAuth.js + Supabase (Next.js App Router)

Du bist ein erfahrener Full-Stack-Entwickler. Deine Aufgabe ist es, ein vollständiges Authentifizierungs-System in ein **bestehendes** Next.js App Router Projekt zu integrieren. Das System verwendet **NextAuth.js v5 (Auth.js)** kombiniert mit **Supabase** als Datenbank und Auth-Provider.

> **WICHTIG**: Dieses System wird in eine **laufende Applikation** integriert. Bestehende Dateien (z.B. `layout.tsx`, `package.json`) dürfen nicht überschrieben werden — nur ergänzt. Prüfe immer zuerst, was bereits existiert.

---

## Voraussetzungen

- Next.js 15+ mit App Router (bereits vorhanden)
- Supabase-Projekt existiert (URL + Keys vorhanden)
- Supabase MCP Server ist verbunden (für SQL-Ausführung)

---

## Übersicht der Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  useSession() ──► SessionProvider (AuthProvider)            │
│       │                                                     │
│       ▼                                                     │
│  createAuthenticatedBrowserClient(supabaseAccessToken)      │
│       │                                                     │
│       ▼                                                     │
│  Supabase RLS (auth.uid() = user_id)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     SERVER                                   │
│                                                             │
│  middleware.ts ──► getToken() ──► Route Protection           │
│                                                             │
│  auth() ──► Session in Server Components                     │
│       │                                                     │
│       ▼                                                     │
│  Guards: requireAuth(), requireAdmin(), etc.                │
│       │                                                     │
│       ▼                                                     │
│  createAuthenticatedSupabaseClient(token)  ──► RLS          │
│  createAdminSupabaseClient()               ──► Bypass RLS   │
└─────────────────────────────────────────────────────────────┘
```

**Kern-Prinzip**: NextAuth.js verwaltet die Session (JWT). Beim Login wird der Supabase Access Token im JWT gespeichert. Dieser Token wird für alle authentifizierten Supabase-Anfragen verwendet, sodass RLS-Policies greifen.

---

## Schritt 1: Dependencies installieren

Füge folgende Packages zum bestehenden Projekt hinzu (NICHT `package.json` überschreiben):

```bash
npm install next-auth@beta @supabase/supabase-js @supabase/ssr
```

Exakte Versionen als Referenz:
- `next-auth`: `^5.0.0-beta.30`
- `@supabase/supabase-js`: `^2.97.0`
- `@supabase/ssr`: `^0.8.0`

---

## Schritt 2: Environment Variables

Füge diese Variablen zu `.env.local` hinzu (NICHT bestehende überschreiben):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
AUTH_SECRET=mindestens-32-zeichen-langer-zufaelliger-string
```

> `AUTH_SECRET` generieren: `openssl rand -base64 32`

---

## Schritt 3: Supabase `profiles` Tabelle erstellen

Führe dieses SQL über den Supabase MCP Server aus. Die `profiles`-Tabelle erweitert Supabase's eingebaute `auth.users` mit App-spezifischen Daten.

```sql
-- ======================================
-- PROFILES TABELLE
-- Erweitert auth.users mit App-Daten
-- ======================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hinweis: Passe die `role` CHECK-Constraint an deine App an.
-- Beispiel mit mehr Rollen: CHECK (role IN ('user', 'moderator', 'admin'))

-- RLS aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User kann eigenes Profil lesen
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- User kann eigenes Profil updaten
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins können alle Profile lesen (optional)
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### RLS-Pattern für andere Tabellen

Wenn du weitere Tabellen erstellst, die User-Daten enthalten, verwende dieses Pattern:

```sql
-- Beispiel: Eine Tabelle die dem User gehört
CREATE TABLE IF NOT EXISTS public.user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... weitere Felder
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Items
CREATE POLICY "user_items_select_own" ON public.user_items
  FOR SELECT USING (auth.uid() = user_id);

-- User kann nur eigene Items erstellen
CREATE POLICY "user_items_insert_own" ON public.user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User kann nur eigene Items updaten
CREATE POLICY "user_items_update_own" ON public.user_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Rollen-basierte Policy (z.B. Admin sieht alles)
CREATE POLICY "user_items_select_admin" ON public.user_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Schritt 4: TypeScript Types

### `types/next-auth.d.ts` (NEU erstellen)

```typescript
import "next-auth"
import "next-auth/jwt"

// Passe UserRole an deine App an
export type UserRole = "user" | "admin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: UserRole
    }
    supabaseAccessToken?: string
  }

  interface User {
    id: string
    email?: string | null
    role?: UserRole
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}
```

### `types/database.ts` (NEU erstellen oder erweitern)

> Tipp: Generiere die vollständigen Types mit `npx supabase gen types typescript --project-id dein-projekt-id > types/database.ts`. Falls das nicht möglich ist, erstelle mindestens folgendes Minimal-Interface:

```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          role: string
          theme_preference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string
          theme_preference?: string | null
        }
        Update: {
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string
          theme_preference?: string | null
        }
      }
    }
  }
}
```

---

## Schritt 5: Supabase Client Utilities

### `lib/supabase/client.ts` (NEU erstellen)

Browser-seitige Supabase Clients.

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Standard Browser Client (für öffentliche/unauthentifizierte Anfragen)
 * RLS Policies müssen korrekt konfiguriert sein
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Authentifizierter Browser Client (für User-Anfragen mit RLS)
 * Verwendet den Supabase Access Token aus der NextAuth Session
 *
 * Usage in Client Components:
 *   const { data: session } = useSession()
 *   const supabase = createAuthenticatedBrowserClient(session.supabaseAccessToken!)
 */
export function createAuthenticatedBrowserClient(supabaseAccessToken: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### `lib/supabase/server.ts` (NEU erstellen)

Server-seitige Supabase Clients.

```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Standard Server Client (für öffentliche Anfragen)
 * ACHTUNG: Ohne Auth-Token ist auth.uid() NULL!
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Authentifizierter Server Client (für User-Anfragen mit RLS)
 * Dies ist die BEST PRACTICE für User-spezifische Daten!
 *
 * Usage in Server Components / Server Actions:
 *   const session = await auth()
 *   const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken!)
 */
export function createAuthenticatedSupabaseClient(supabaseAccessToken: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Admin Client (umgeht RLS komplett!)
 * NUR für serverseitige Admin-Operationen: User erstellen, Batch-Ops, etc.
 * NIEMALS im Client verwenden!
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

---

## Schritt 6: NextAuth Konfiguration

### `lib/auth/config.ts` (NEU erstellen)

Dies ist das Herzstück: NextAuth mit Supabase Credentials Provider.

```typescript
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"
import type { UserRole } from "@/types/next-auth"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // 1. Login über Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })

        if (error || !data.user || !data.session) {
          console.error("Supabase auth error:", error?.message)
          return null
        }

        // 2. Profil-Daten aus profiles-Tabelle laden (nicht aus auth.users!)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, first_name, last_name, email")
          .eq("id", data.user.id)
          .single()

        const role: UserRole = (profile?.role as UserRole) || "user"
        const displayName = profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || data.user.email

        // 3. User-Objekt mit Supabase Tokens zurückgeben
        return {
          id: data.user.id,
          email: profile?.email || data.user.email,
          name: displayName,
          role,
          supabaseAccessToken: data.session.access_token,
          supabaseRefreshToken: data.session.refresh_token,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Bei Login: User-Daten + Supabase Tokens ins JWT speichern
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role || "user"
        token.supabaseAccessToken = user.supabaseAccessToken
        token.supabaseRefreshToken = user.supabaseRefreshToken
      }

      // Bei Session-Update: Rolle neu laden (z.B. nach Rollenänderung)
      if (trigger === "update") {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("id", token.id)
          .single()

        token.role = (profile?.role as UserRole) || "user"
        if (profile?.first_name && profile?.last_name) {
          token.name = `${profile.first_name} ${profile.last_name}`
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.role = token.role as UserRole
        session.supabaseAccessToken = token.supabaseAccessToken as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}

import NextAuth from "next-auth"

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)
```

### `lib/auth/guards.ts` (NEU erstellen)

Server-seitige Guard-Funktionen für rollenbasierte Zugriffskontrolle.

```typescript
import { auth } from './config'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/next-auth'

/**
 * Erfordert authentifizierten User.
 * Redirect zu /login wenn nicht eingeloggt.
 *
 * Usage in Server Components:
 *   const session = await requireAuth()
 *   // session ist garantiert vorhanden
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  return session
}

/**
 * Erfordert Admin-Rolle.
 * Redirect zu /dashboard wenn nicht berechtigt.
 *
 * Passe diese Funktion an deine Rollen an.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.role !== 'admin') {
    redirect('/dashboard?error=unauthorized')
  }
  return session
}

/**
 * Gibt die User-Rolle zurück ohne Redirect (für bedingte Anzeige).
 */
export async function getUserRole(): Promise<UserRole | null> {
  const session = await auth()
  return session?.user?.role || null
}

/**
 * Prüft ob User Admin ist (ohne Redirect).
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === 'admin'
}
```

---

## Schritt 7: NextAuth API Route

### `app/api/auth/[...nextauth]/route.ts` (NEU erstellen)

```typescript
import { handlers } from "@/lib/auth/config"

export const { GET, POST } = handlers
```

---

## Schritt 8: Middleware (Route Protection)

### `middleware.ts` (NEU erstellen im Projekt-Root)

> **WICHTIG**: Falls bereits eine `middleware.ts` existiert, MERGE den Auth-Code hinein. Next.js erlaubt nur EINE Middleware-Datei.

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  })

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/register")

  // Eingeloggte User von Auth-Seiten wegleiten
  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // Nicht eingeloggte User zum Login redirecten
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sicherheitscheck: Supabase Token muss vorhanden sein
  if (!token.supabaseAccessToken) {
    const signoutUrl = new URL("/api/auth/signout", request.url)
    signoutUrl.searchParams.set("callbackUrl", "/login?relogin=true")
    return NextResponse.redirect(signoutUrl)
  }

  return NextResponse.next()
}

// Passe die Matcher an deine geschützten Routen an!
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profil/:path*",
    "/login",
    "/register",
    // Füge weitere geschützte Routen hinzu
  ],
}
```

---

## Schritt 9: AuthProvider (Client-Side Session)

### `components/providers/AuthProvider.tsx` (NEU erstellen)

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'

interface Props {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}
```

### Integration in `app/layout.tsx` (BESTEHEND ergänzen!)

**NICHT** die gesamte Datei überschreiben! Ergänze nur den AuthProvider:

```typescript
// Import hinzufügen:
import { AuthProvider } from "@/components/providers/AuthProvider"

// Im return JSX: AuthProvider um {children} wrappen
// Beispiel:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>
          {/* ... bestehende Provider und children ... */}
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## Schritt 10: Login-Seite

### `app/(auth)/login/page.tsx` (NEU erstellen)

> Falls du eine andere Route-Struktur verwendest (z.B. `app/login/page.tsx`), passe den Pfad an. Die `(auth)` Route Group ist optional.

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const isRelogin = searchParams.get('relogin') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Login fehlgeschlagen. Prüfe deine Anmeldedaten.')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div>
      <h1>Login</h1>

      {isRelogin && (
        <div>Bitte melde dich erneut an (Sicherheitsupdate).</div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Wird angemeldet...' : 'Anmelden'}
        </button>
      </form>

      <p>
        Noch kein Konto? <Link href="/register">Registrieren</Link>
      </p>
    </div>
  )
}
```

---

## Schritt 11: Registrierungs-Seite

### `app/(auth)/register/actions.ts` (NEU erstellen)

Server Action für User-Registrierung. Verwendet den Admin-Client um E-Mail-Bestätigung zu umgehen (für Entwicklung).

```typescript
'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error: string | null }> {

  // Admin Client für User-Erstellung (umgeht E-Mail-Bestätigung)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // User in Supabase Auth erstellen
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Direkt bestätigt (für Produktion: false + E-Mail-Flow)
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Profil in profiles-Tabelle erstellen
  if (data.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        theme_preference: 'light',
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }
  }

  return { success: true, error: null }
}
```

### `app/(auth)/register/page.tsx` (NEU erstellen)

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { registerUser } from './actions'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      setLoading(false)
      return
    }

    const result = await registerUser(email, password, firstName.trim(), lastName.trim())

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div>
        <h2>Registrierung erfolgreich!</h2>
        <p>Du kannst dich jetzt anmelden.</p>
        <Link href="/login">Zum Login</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Registrieren</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Vorname" value={firstName}
          onChange={(e) => setFirstName(e.target.value)} required />
        <input type="text" placeholder="Nachname" value={lastName}
          onChange={(e) => setLastName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <input type="password" placeholder="Passwort bestätigen" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} required />

        {error && <div>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Wird registriert...' : 'Registrieren'}
        </button>
      </form>
      <p>Bereits ein Konto? <Link href="/login">Anmelden</Link></p>
    </div>
  )
}
```

---

## Schritt 12: Dashboard Layout (geschützt)

### `app/(dashboard)/layout.tsx` (NEU erstellen oder BESTEHEND ergänzen)

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      {/* Dein Dashboard Layout (Navbar, Sidebar, etc.) */}
      <main>{children}</main>
    </div>
  )
}
```

---

## Verwendungs-Patterns

### Pattern 1: Server Component mit Auth Guard

```typescript
// app/(dashboard)/admin/page.tsx
import { requireAdmin } from '@/lib/auth/guards'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const session = await requireAdmin() // Redirect wenn nicht Admin

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken!)
  const { data } = await supabase.from('profiles').select('*')

  return <div>{/* ... */}</div>
}
```

### Pattern 2: Client Component mit Session

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'

export function UserProfile() {
  const { data: session } = useSession()

  const loadData = async () => {
    if (!session?.supabaseAccessToken) return

    const supabase = createAuthenticatedBrowserClient(session.supabaseAccessToken)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // ...
  }

  return <div>{session?.user?.name}</div>
}
```

### Pattern 3: Server Action mit Auth

```typescript
'use server'

import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session?.supabaseAccessToken) throw new Error('Not authenticated')

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  await supabase
    .from('profiles')
    .update({ first_name: formData.get('firstName') as string })
    .eq('id', session.user.id)
}
```

### Pattern 4: Bedingte Anzeige nach Rolle

```typescript
// Server Component
import { getUserRole } from '@/lib/auth/guards'

export default async function Page() {
  const role = await getUserRole()

  return (
    <div>
      <h1>Dashboard</h1>
      {role === 'admin' && <AdminPanel />}
    </div>
  )
}
```

### Pattern 5: Logout

```typescript
'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/login' })}>
      Abmelden
    </button>
  )
}
```

---

## Datei-Übersicht (was erstellt werden muss)

```
projekt/
├── .env.local                          # Environment Variables (ergänzen)
├── middleware.ts                        # Route Protection (neu oder merge)
├── types/
│   ├── next-auth.d.ts                  # NextAuth Type Augmentation
│   └── database.ts                     # Supabase Database Types
├── lib/
│   ├── auth/
│   │   ├── config.ts                   # NextAuth Konfiguration (Herzstück)
│   │   └── guards.ts                   # Server-seitige Auth Guards
│   └── supabase/
│       ├── client.ts                   # Browser Supabase Clients
│       └── server.ts                   # Server Supabase Clients
├── components/
│   └── providers/
│       └── AuthProvider.tsx            # NextAuth SessionProvider Wrapper
├── app/
│   ├── layout.tsx                      # AuthProvider einbinden (BESTEHEND ergänzen!)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts            # NextAuth API Handler
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                # Login Seite
│   │   └── register/
│   │       ├── page.tsx                # Registrierungs-Seite
│   │       └── actions.ts             # Server Action für Registrierung
│   └── (dashboard)/
│       └── layout.tsx                  # Geschütztes Layout (neu oder ergänzen)
└── supabase/
    └── migrations/
        └── 001_create_profiles.sql     # Profiles Tabelle + RLS
```

---

## Checkliste nach Integration

- [ ] `npm install next-auth@beta @supabase/supabase-js @supabase/ssr` ausgeführt
- [ ] `.env.local` mit allen 4 Variablen konfiguriert
- [ ] SQL Migration für `profiles` Tabelle ausgeführt (via Supabase MCP)
- [ ] `types/next-auth.d.ts` erstellt
- [ ] `lib/supabase/client.ts` und `lib/supabase/server.ts` erstellt
- [ ] `lib/auth/config.ts` und `lib/auth/guards.ts` erstellt
- [ ] `app/api/auth/[...nextauth]/route.ts` erstellt
- [ ] `components/providers/AuthProvider.tsx` erstellt
- [ ] `AuthProvider` in `app/layout.tsx` eingebunden
- [ ] `middleware.ts` erstellt/erweitert mit korrekten Matcher-Patterns
- [ ] Login und Register Seiten erstellt
- [ ] Dashboard Layout mit Auth-Check erstellt
- [ ] RLS Policies auf `profiles` Tabelle aktiv
- [ ] Test: Registrierung → Login → Dashboard → Logout funktioniert
