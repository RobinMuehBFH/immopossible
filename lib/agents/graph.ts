// lib/agent/graph.ts

import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { AgentStateAnnotation, APPROVAL_THRESHOLD_CHF } from "@/lib/agent/state";

import { classifyNode }         from "@/lib/agent/tools/classify";
import { checkErpNode }         from "@/lib/agent/tools/check-erp";
import { findCraftsmanNode }    from "@/lib/agent/tools/find-craftsman";
import { estimateCostNode }     from "@/lib/agent/tools/estimate-cost";
import { requestApprovalNode }  from "@/lib/agent/tools/request-approval";
import { bookCraftsmanNode }    from "@/lib/agent/tools/book-craftsman";
import { sendNotificationNode } from "@/lib/agent/tools/send-notification";
import { updateStatusNode }     from "@/lib/agent/tools/update-status";

// ─── Conditional Edge: braucht es eine Genehmigung? ──────────────────────────

function routeAfterEstimate(
  state: typeof AgentStateAnnotation.State
): "request_approval" | "book_craftsman" {
  if (state.approvalRequired) {
    console.log(
      `[graph] CHF ${state.estimatedCostChf} > ${APPROVAL_THRESHOLD_CHF} → route: request_approval`
    );
    return "request_approval";
  }

  console.log(
    `[graph] CHF ${state.estimatedCostChf} ≤ ${APPROVAL_THRESHOLD_CHF} → route: book_craftsman`
  );
  return "book_craftsman";
}

// ─── Conditional Edge: wie geht es nach dem HITL weiter? ─────────────────────

function routeAfterApproval(
  state: typeof AgentStateAnnotation.State
): "book_craftsman" | "update_status" {
  if (state.approvalStatus === "approved") {
    console.log("[graph] Genehmigung erteilt → route: book_craftsman");
    return "book_craftsman";
  }

  console.log(
    `[graph] Genehmigung abgelehnt (${state.approvalStatus}) → route: update_status`
  );
  return "update_status";
}

// ─── Graph Factory ────────────────────────────────────────────────────────────

/**
 * Erstellt und kompiliert den LangGraph StateGraph.
 * MemorySaver persistiert den State in-memory — für Produktion
 * durch einen Supabase-basierten Checkpointer ersetzen.
 *
 * Wird von run.ts aufgerufen — einmal pro Agent-Run.
 */
export function createGraph() {
  const checkpointer = new MemorySaver();

  const graph = new StateGraph(AgentStateAnnotation)

    // ── Nodes registrieren ──────────────────────────────────────────────────
    .addNode("classify",          classifyNode)
    .addNode("check_erp",         checkErpNode)
    .addNode("find_craftsman",    findCraftsmanNode)
    .addNode("estimate_cost",     estimateCostNode)
    .addNode("request_approval",  requestApprovalNode)
    .addNode("book_craftsman",    bookCraftsmanNode)
    .addNode("send_notification", sendNotificationNode)
    .addNode("update_status",     updateStatusNode)

    // ── Einstieg ────────────────────────────────────────────────────────────
    .addEdge("__start__", "classify")

    // ── Linearer Flow ────────────────────────────────────────────────────────
    .addEdge("classify",       "check_erp")
    .addEdge("check_erp",      "find_craftsman")
    .addEdge("find_craftsman", "estimate_cost")

    // ── Conditional Edge: HITL oder direkt buchen ────────────────────────────
    .addConditionalEdges("estimate_cost", routeAfterEstimate, {
      request_approval: "request_approval",
      book_craftsman:   "book_craftsman",
    })

    // ── Nach HITL: approved → buchen, rejected → abschliessen ───────────────
    .addConditionalEdges("request_approval", routeAfterApproval, {
      book_craftsman: "book_craftsman",
      update_status:  "update_status",
    })

    // ── Finaler linearer Flow ────────────────────────────────────────────────
    .addEdge("book_craftsman",    "send_notification")
    .addEdge("send_notification", "update_status")
    .addEdge("update_status",     "__end__")

    .compile({ checkpointer });

  return graph;
}