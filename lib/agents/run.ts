// lib/agent/run.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { createGraph } from "@/lib/agents/graph";
import {
  AgentState,
  AgentRunStatus,
  AgentStep,
  DamageCategory,
  PriorityLevel,
} from "@/lib/agents/state";
import { checkErpNode } from "@/lib/agents/tools/check-erp";
import { bookCraftsmanNode } from "@/lib/agents/tools/book-craftsman";
import { sendNotificationNode } from "@/lib/agents/tools/send-notification";
import { updateStatusNode } from "@/lib/agents/tools/update-status";

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
      damage_report_id: reportId,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps_taken: finalState.steps as any,
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
 *
 * WICHTIG: Wir verwenden KEIN LangGraph-Checkpoint-Resume, weil MemorySaver
 * nur in-memory ist und Next.js Serverless-Requests keinen gemeinsamen Speicher
 * haben. Stattdessen rekonstruieren wir den State aus der DB und rufen die
 * verbleibenden Nodes direkt auf.
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

  // 1. agent_run laden — brauchen reportId und bisherige Schritte
  const { data: agentRun, error: agentRunError } = await adminSupabase
    .from("agent_runs")
    .select("id, damage_report_id, steps_taken")
    .eq("id", agentRunId)
    .single();

  if (agentRunError || !agentRun) {
    throw new Error(`agent_run nicht gefunden: ${agentRunId}`);
  }

  const reportId = agentRun.damage_report_id;
  const existingSteps = (agentRun.steps_taken as unknown as AgentStep[]) || [];

  // 2. approval_request laden — enthält Craftsman-ID, Kosten, Kontext
  const { data: approvalRequest, error: approvalError } = await adminSupabase
    .from("approval_requests")
    .select("*")
    .eq("agent_run_id", agentRunId)
    .single();

  if (approvalError || !approvalRequest) {
    throw new Error(`approval_request für agentRunId=${agentRunId} nicht gefunden`);
  }

  const context = approvalRequest.context as {
    craftsmanId: string;
    craftsmanName: string;
    costEstimationReason: string | null;
    damageSummary: string | null;
    damageCategory: DamageCategory;
    damagePriority: PriorityLevel;
  };

  // 3. agent_run zurück auf running setzen
  await adminSupabase
    .from("agent_runs")
    .update({ status: "running" })
    .eq("id", agentRunId);

  try {
    const newSteps: AgentStep[] = [];

    // ── Abgelehnt: Report als rejected markieren, fertig ────────────────────
    if (approvalStatus === "rejected") {
      const stepStart = Date.now();

      await adminSupabase
        .from("damage_reports")
        .update({ status: "rejected" })
        .eq("id", reportId);

      newSteps.push({
        tool: "update_report_status",
        input: { reportId, decision: "rejected" },
        output: { finalStatus: "rejected" },
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - stepStart,
      });

      const durationMs = Date.now() - startedAt;
      const outputSummary = `Genehmigung abgelehnt. ${approvalNotes || ""}`.trim();

      await adminSupabase
        .from("agent_runs")
        .update({
          status: "completed",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          steps_taken: [...existingSteps, ...newSteps] as any,
          output_summary: outputSummary,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", agentRunId);

      console.log(`[Agent] Resume (rejected) beendet — agentRunId=${agentRunId}`);

      return {
        agentRunId,
        status: "completed",
        outputSummary,
        bookingId: null,
        approvalRequestId: approvalRequest.id,
      };
    }

    // ── Genehmigt: State aus DB rekonstruieren, dann buchen ─────────────────

    // 4. Handwerker aus DB laden
    const { data: craftsman, error: craftsmanError } = await adminSupabase
      .from("craftsmen")
      .select("id, contact_name, company_name, phone, email, specializations, hourly_rate_chf")
      .eq("id", context.craftsmanId)
      .single();

    if (craftsmanError || !craftsman) {
      throw new Error(`Handwerker nicht gefunden: ${context.craftsmanId}`);
    }

    // 5. ERP-Kontext neu laden (idempotente DB-Abfragen)
    const erpResult = await checkErpNode({
      reportId,
      agentRunId,
      messages: [],
      category: null, priority: null, damageSummary: null,
      erpContext: null, selectedCraftsman: null,
      estimatedCostChf: null, costEstimationReason: null,
      approvalRequired: false, approvalRequestId: null,
      approvalStatus: null, approvalNotes: null,
      bookingId: null, notificationId: null,
      steps: [], status: "running", errorMessage: null,
    } as AgentState);

    if (!erpResult.erpContext) {
      throw new Error("[resume] ERP-Kontext konnte nicht geladen werden");
    }

    // 6. State vollständig rekonstruieren
    const reconstructedState: AgentState = {
      reportId,
      agentRunId,
      messages: [],
      category: context.damageCategory,
      priority: context.damagePriority,
      damageSummary: context.damageSummary,
      erpContext: erpResult.erpContext,
      selectedCraftsman: {
        id: craftsman.id,
        name: craftsman.contact_name ?? craftsman.company_name ?? "Unbekannt",
        company: craftsman.company_name ?? null,
        phone: craftsman.phone ?? null,
        email: craftsman.email ?? null,
        specializations: (craftsman.specializations as string[]) ?? [],
        hourlyRateChf: craftsman.hourly_rate_chf ?? null,
      },
      estimatedCostChf: approvalRequest.estimated_cost_chf,
      costEstimationReason: context.costEstimationReason,
      approvalRequired: true,
      approvalRequestId: approvalRequest.id,
      approvalStatus: "approved",
      approvalNotes,
      bookingId: null,
      notificationId: null,
      steps: existingSteps,
      status: "running",
      errorMessage: null,
    };

    // 7. Verbleibende Nodes direkt aufrufen
    const bookResult = await bookCraftsmanNode(reconstructedState);
    newSteps.push(...(bookResult.steps ?? []));
    const stateAfterBook = { ...reconstructedState, ...bookResult };

    const notifyResult = await sendNotificationNode(stateAfterBook as AgentState);
    newSteps.push(...(notifyResult.steps ?? []));
    const stateAfterNotify = { ...stateAfterBook, ...notifyResult };

    const updateResult = await updateStatusNode(stateAfterNotify as AgentState);
    newSteps.push(...(updateResult.steps ?? []));

    const durationMs = Date.now() - startedAt;
    const outputSummary = buildOutputSummary({
      ...reconstructedState,
      ...bookResult,
      ...notifyResult,
      ...updateResult,
    } as AgentState);

    await adminSupabase
      .from("agent_runs")
      .update({
        status: "completed",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps_taken: [...existingSteps, ...newSteps] as any,
        output_summary: outputSummary,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRunId);

    console.log(
      `[Agent] Resume (approved) beendet — bookingId=${stateAfterBook.bookingId}, duration=${durationMs}ms`
    );

    return {
      agentRunId,
      status: "completed",
      outputSummary,
      bookingId: (stateAfterBook.bookingId as string) ?? null,
      approvalRequestId: approvalRequest.id,
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
  const categoryLabels: Record<string, string> = {
    plumbing:     "Sanitär-Problem",
    electrical:   "Elektroproblem",
    heating:      "Heizungsproblem",
    structural:   "Bauschäden",
    appliance:    "Gerätedefekt",
    pest_control: "Schädlingsbefall",
    other:        "Sonstiges Problem",
  };
  const priorityLabels: Record<string, string> = {
    low:    "niedrig",
    medium: "mittel",
    high:   "hoch",
    urgent: "dringend",
  };

  const sentences: string[] = [];

  if (state.category || state.priority) {
    const cat = state.category ? (categoryLabels[state.category] ?? state.category) : null;
    const pri = state.priority ? (priorityLabels[state.priority] ?? state.priority) : null;
    if (cat && pri) {
      sentences.push(`Der Agent hat den Schaden als ${cat} mit Priorität „${pri}" eingestuft.`);
    } else if (cat) {
      sentences.push(`Der Agent hat den Schaden als ${cat} eingestuft.`);
    }
  }

  if (state.damageSummary) {
    sentences.push(state.damageSummary);
  }

  if (state.selectedCraftsman) {
    const name = state.selectedCraftsman.name;
    const company = state.selectedCraftsman.company ? ` (${state.selectedCraftsman.company})` : "";
    const cost = state.estimatedCostChf !== null ? ` für CHF ${state.estimatedCostChf}` : "";
    sentences.push(`${name}${company} wurde als Handwerker ausgewählt${cost}.`);
  }

  if (state.bookingId) {
    sentences.push("Eine Buchungsanfrage wurde erfolgreich erstellt.");
  }

  if (state.approvalStatus === "approved") {
    sentences.push("Der Einsatz wurde durch den Manager genehmigt.");
  } else if (state.approvalStatus === "rejected") {
    sentences.push("Der Einsatz wurde durch den Manager abgelehnt.");
  } else if (state.status === "waiting_for_human") {
    sentences.push("Der Agent wartet auf die Genehmigung durch einen Manager.");
  }

  return sentences.length > 0
    ? sentences.join(" ")
    : "Agent-Run abgeschlossen.";
}