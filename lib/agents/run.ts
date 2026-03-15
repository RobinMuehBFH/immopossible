// lib/agent/run.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { createGraph } from "@/lib/agent/graph";
import {
  AgentState,
  AgentRunStatus,
  AgentStep,
} from "@/lib/agent/state";

// ─── Typen für den Rückgabewert ───────────────────────────────────────────────

export interface AgentRunResult {
  agentRunId: string;
  status: AgentRunStatus;
  outputSummary: string | null;
  bookingId: string | null;
  approvalRequestId: string | null;
}

// ─── Einstiegspunkt ───────────────────────────────────────────────────────────

/**
 * Startet einen neuen Agent-Run für einen bestehenden damage_report.
 * Wird von POST /api/agent/trigger aufgerufen.
 */
export async function runDamageReportAgent(
  reportId: string
): Promise<AgentRunResult> {
  const startedAt = Date.now();

  // 1. agent_runs Zeile erstellen — Status: running
  const { data: agentRun, error: insertError } = await adminSupabase
    .from("agent_runs")
    .insert({
      report_id: reportId,
      status: "running",
      started_at: new Date().toISOString(),
      steps_taken: [],
    })
    .select("id")
    .single();

  if (insertError || !agentRun) {
    console.error("[Agent] Konnte agent_run nicht erstellen:", insertError);
    throw new Error(`agent_runs INSERT fehlgeschlagen: ${insertError?.message}`);
  }

  const agentRunId = agentRun.id;
  console.log(`[Agent] Run gestartet — agentRunId=${agentRunId}, reportId=${reportId}`);

  // 2. damage_reports Status auf in_progress setzen
  await adminSupabase
    .from("damage_reports")
    .update({ status: "in_progress" })
    .eq("id", reportId);

  // 3. Graph ausführen
  try {
    const graph = createGraph();

    const initialState: Partial<AgentState> = {
      reportId,
      agentRunId,
    };

    const finalState = await graph.invoke(initialState, {
      configurable: {
        thread_id: agentRunId, // LangGraph Checkpoint-Key
      },
    });

    const durationMs = Date.now() - startedAt;

    // 4a. Erfolg — agent_run abschliessen
    const outputSummary = buildOutputSummary(finalState);

    await adminSupabase
      .from("agent_runs")
      .update({
        status: finalState.status,           // 'completed' oder 'waiting_for_human'
        steps_taken: finalState.steps,
        output_summary: outputSummary,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRunId);

    console.log(
      `[Agent] Run beendet — status=${finalState.status}, duration=${durationMs}ms`
    );

    return {
      agentRunId,
      status: finalState.status,
      outputSummary,
      bookingId: finalState.bookingId ?? null,
      approvalRequestId: finalState.approvalRequestId ?? null,
    };

  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[Agent] Run fehlgeschlagen — agentRunId=${agentRunId}:`, error);

    // 4b. Fehler — agent_run als failed markieren
    await adminSupabase
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: errorMessage,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRunId);

    // damage_report zurück auf received setzen damit es erneut versucht werden kann
    await adminSupabase
      .from("damage_reports")
      .update({ status: "received" })
      .eq("id", reportId);

    throw error; // Nach oben weitergeben damit /api/agent/trigger einen 500 zurückgibt
  }
}

// ─── HITL Resumption ──────────────────────────────────────────────────────────

/**
 * Resumt einen pausierten Agent-Run nach einer Approve/Reject-Entscheidung.
 * Wird von POST /api/approvals/[id]/decide aufgerufen.
 */
export async function resumeDamageReportAgent(
  agentRunId: string,
  approvalStatus: "approved" | "rejected",
  approvalNotes: string | null
): Promise<AgentRunResult> {
  const startedAt = Date.now();

  console.log(
    `[Agent] Run resumiert — agentRunId=${agentRunId}, decision=${approvalStatus}`
  );

  // agent_run zurück auf running setzen
  await adminSupabase
    .from("agent_runs")
    .update({ status: "running" })
    .eq("id", agentRunId);

  try {
    const graph = createGraph();

    // State mit Approval-Entscheidung injizieren und Graph fortsetzen
    const resumeState: Partial<AgentState> = {
      approvalStatus,
      approvalNotes,
    };

    const finalState = await graph.invoke(resumeState, {
      configurable: {
        thread_id: agentRunId, // selber Key → LangGraph lädt den Checkpoint
      },
    });

    const durationMs = Date.now() - startedAt;
    const outputSummary = buildOutputSummary(finalState);

    await adminSupabase
      .from("agent_runs")
      .update({
        status: finalState.status,
        steps_taken: finalState.steps,
        output_summary: outputSummary,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRunId);

    console.log(
      `[Agent] Resume beendet — status=${finalState.status}, duration=${durationMs}ms`
    );

    return {
      agentRunId,
      status: finalState.status,
      outputSummary,
      bookingId: finalState.bookingId ?? null,
      approvalRequestId: finalState.approvalRequestId ?? null,
    };

  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[Agent] Resume fehlgeschlagen — agentRunId=${agentRunId}:`, error);

    await adminSupabase
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: errorMessage,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRunId);

    throw error;
  }
}

// ─── Hilfsfunktion ────────────────────────────────────────────────────────────

/**
 * Erstellt eine lesbare Zusammenfassung des Agent-Runs für das Dashboard.
 */
function buildOutputSummary(state: AgentState): string {
  const parts: string[] = [];

  if (state.category)        parts.push(`Kategorie: ${state.category}`);
  if (state.priority)        parts.push(`Priorität: ${state.priority}`);
  if (state.estimatedCostChf !== null)
                             parts.push(`Kostenschätzung: CHF ${state.estimatedCostChf}`);
  if (state.selectedCraftsman)
                             parts.push(`Handwerker: ${state.selectedCraftsman.name}`);
  if (state.bookingId)       parts.push(`Buchung erstellt: ${state.bookingId}`);
  if (state.approvalStatus)  parts.push(`Genehmigung: ${state.approvalStatus}`);

  return parts.length > 0
    ? parts.join(" | ")
    : "Agent-Run abgeschlossen ohne Details";
}