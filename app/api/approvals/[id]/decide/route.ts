// app/api/approvals/[id]/decide/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resumeDamageReportAgent } from "@/lib/agent/run";
import { adminSupabase } from "@/lib/supabase/admin";

// ─── Request Body Schema ──────────────────────────────────────────────────────

interface DecideRequestBody {
  decision: "approved" | "rejected";
  notes?: string;
}

// ─── POST /api/approvals/[id]/decide ─────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const approvalRequestId = params.id;

  // 1. Body parsen
  let body: DecideRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request Body" },
      { status: 400 }
    );
  }

  const { decision, notes = null } = body;

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json(
      { error: "decision muss 'approved' oder 'rejected' sein" },
      { status: 400 }
    );
  }

  // 2. approval_request laden — brauchen agent_run_id
  const { data: approvalRequest, error: fetchError } = await adminSupabase
    .from("approval_requests")
    .select("id, status, agent_run_id")
    .eq("id", approvalRequestId)
    .single();

  if (fetchError || !approvalRequest) {
    return NextResponse.json(
      { error: `approval_request nicht gefunden: ${approvalRequestId}` },
      { status: 404 }
    );
  }

  // 3. Guard: nur pending requests können entschieden werden
  if (approvalRequest.status !== "pending") {
    return NextResponse.json(
      {
        error: `approval_request ist bereits entschieden: status=${approvalRequest.status}`,
      },
      { status: 409 }
    );
  }

  // 4. approval_request aktualisieren
  const { error: updateError } = await adminSupabase
    .from("approval_requests")
    .update({
      status: decision,
      notes: notes ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalRequestId);

  if (updateError) {
    return NextResponse.json(
      { error: `approval_request UPDATE fehlgeschlagen: ${updateError.message}` },
      { status: 500 }
    );
  }

  // 5. Agent resumieren
  try {
    const result = await resumeDamageReportAgent(
      approvalRequest.agent_run_id,
      decision,
      notes ?? null
    );

    return NextResponse.json({
      success: true,
      decision,
      agentRunId: result.agentRunId,
      agentStatus: result.status,
      bookingId: result.bookingId ?? null,
    });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      `[approvals/decide] Resume fehlgeschlagen — approvalRequestId=${approvalRequestId}:`,
      error
    );

    return NextResponse.json(
      { error: `Agent Resume fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}