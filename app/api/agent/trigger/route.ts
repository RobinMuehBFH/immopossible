// app/api/agent/trigger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runDamageReportAgent } from "@/lib/agents/run";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  // Auth check via NextAuth session
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (!role || !["property_manager", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let reportId: string;
  try {
    const body = await request.json();
    reportId = body.reportId;
  } catch {
    return NextResponse.json({ error: "Ungültiger Request Body" }, { status: 400 });
  }

  if (!reportId) {
    return NextResponse.json({ error: "reportId fehlt" }, { status: 400 });
  }

  // Use the Supabase access token from the NextAuth session
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken!);

  // Verify report exists and belongs to this manager's scope
  const { data: report, error: reportError } = await supabase
    .from("damage_reports")
    .select("id, status")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Schadenmeldung nicht gefunden" }, { status: 404 });
  }

  if (report.status === "in_progress" || report.status === "booked") {
    return NextResponse.json(
      { error: `Agent läuft bereits (status: ${report.status})` },
      { status: 409 }
    );
  }

  try {
    const result = await runDamageReportAgent(reportId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agent/trigger] Fehler:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
