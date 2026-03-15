// lib/agent/tools/update-status.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, AgentStep } from "@/lib/agent/state";

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function updateStatusNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  // Finalen Report-Status aus dem State ableiten
  const finalStatus = deriveFinalStatus(state);

  // 1. damage_report auf finalen Status setzen
  await adminSupabase
    .from("damage_reports")
    .update({
      status: finalStatus,
      resolved_at: finalStatus === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", state.reportId);

  // 2. Schritt loggen
  const step: AgentStep = {
    tool: "update_report_status",
    input: {
      reportId: state.reportId,
      previousStatus: "craftsman_booked",
    },
    output: {
      finalStatus,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[update-status] reportId=${state.reportId} → status=${finalStatus}`
  );

  // 3. Agent-Run als completed markieren
  return {
    status: "completed",
    steps: [step],
  };
}

// ─── Hilfsfunktion ────────────────────────────────────────────────────────────

function deriveFinalStatus(state: AgentState): string {
  // Abgelehnt vom Property Manager
  if (state.approvalRequired && state.approvalStatus === "rejected") {
    return "rejected";
  }

  // Handwerker gebucht — Normal- und Approval-Flow
  if (state.bookingId) {
    return "craftsman_booked";
  }

  // Fallback (sollte nie erreicht werden)
  return "resolved";
}