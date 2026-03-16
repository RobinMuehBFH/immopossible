// lib/agent/tools/request-approval.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, AgentStep } from "@/lib/agents/state";

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function requestApprovalNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  if (!state.estimatedCostChf || !state.erpContext || !state.selectedCraftsman) {
    throw new Error(
      "[request-approval] estimatedCostChf / erpContext / selectedCraftsman fehlen im State"
    );
  }

  // 1. approval_requests Zeile schreiben
  const requestedAction = `Handwerker ${state.selectedCraftsman.name} (${state.selectedCraftsman.company ?? "kein Unternehmen"}) beauftragen für: ${state.damageSummary ?? state.category}`;

  const { data: approvalRequest, error } = await adminSupabase
    .from("approval_requests")
    .insert({
      agent_run_id: state.agentRunId,
      damage_report_id: state.reportId,
      status: "pending",
      estimated_cost_chf: state.estimatedCostChf,
      requested_action: requestedAction,
      context: {
        craftsmanId: state.selectedCraftsman.id,
        craftsmanName: state.selectedCraftsman.name,
        costEstimationReason: state.costEstimationReason,
        damageSummary: state.damageSummary,
        damageCategory: state.category,
        damagePriority: state.priority,
      },
    })
    .select("id")
    .single();

  if (error || !approvalRequest) {
    throw new Error(`approval_requests INSERT fehlgeschlagen: ${error?.message}`);
  }

  const approvalRequestId = approvalRequest.id;

  // 2. damage_report Status auf waiting_for_human setzen
  await adminSupabase
    .from("damage_reports")
    .update({ status: "waiting_for_approval" })
    .eq("id", state.reportId);

  // 3. agent_run Status auf waiting_for_human setzen
  //    (run.ts überschreibt das am Ende — aber für Realtime-Dashboard jetzt sofort)
  await adminSupabase
    .from("agent_runs")
    .update({
      status: "waiting_for_human",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      steps_taken: state.steps as any,
    })
    .eq("id", state.agentRunId);

  // 4. Schritt loggen
  const step: AgentStep = {
    tool: "request_human_approval",
    input: {
      estimatedCostChf: state.estimatedCostChf,
      craftsmanId: state.selectedCraftsman.id,
    },
    output: {
      approvalRequestId,
      status: "pending",
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[request-approval] approval_request erstellt: ${approvalRequestId} — Graph beendet, wartet auf Manager`
  );

  // 5. State zurückgeben — Graph endet hier (routeAfterApproval → END wenn approvalStatus null)
  //    Supabase Realtime pusht die neue approval_requests Zeile ans Dashboard
  //    POST /api/approvals/[id]/decide rekonstruiert den State aus der DB und bucht direkt
  return {
    approvalRequestId,
    status: "waiting_for_human",
    steps: [step],
  };
}