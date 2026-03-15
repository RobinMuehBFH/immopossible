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

        // 1. Login via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })

        if (error || !data.user || !data.session) {
          console.error("Supabase auth error:", error?.message)
          return null
        }

        // 2. Load profile data from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, email")
          .eq("id", data.user.id)
          .single()

        const role: UserRole = (profile?.role as UserRole) || "tenant"

        // 3. Return user object with Supabase tokens
        return {
          id: data.user.id,
          email: profile?.email || data.user.email,
          name: profile?.full_name || data.user.email,
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
      // On login: store user data + Supabase tokens in JWT
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role || "tenant"
        token.supabaseAccessToken = user.supabaseAccessToken
        token.supabaseRefreshToken = user.supabaseRefreshToken
      }

      // On session update: reload role (e.g. after role change)
      if (trigger === "update") {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", token.id)
          .single()

        token.role = (profile?.role as UserRole) || "tenant"
        if (profile?.full_name) {
          token.name = profile.full_name
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
