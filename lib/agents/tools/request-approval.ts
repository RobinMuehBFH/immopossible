// lib/agent/tools/request-approval.ts

import { interrupt } from "@langchain/langgraph";
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
    `[request-approval] approval_request erstellt: ${approvalRequestId} — Agent pausiert`
  );

  // 5. ⚡ LangGraph Interrupt — Agent pausiert hier
  //    Supabase Realtime pusht die neue approval_requests Zeile ans Dashboard
  //    POST /api/approvals/[id]/decide resumt den Agent später
  interrupt({
    reason: "human_approval_required",
    approvalRequestId,
    estimatedCostChf: state.estimatedCostChf,
    message: `Genehmigung erforderlich: CHF ${state.estimatedCostChf} für ${state.selectedCraftsman.name}`,
  });

  // Dieser Code wird erst nach dem Resume erreicht
  return {
    approvalRequestId,
    status: "waiting_for_human",
    steps: [step],
  };
}