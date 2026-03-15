// lib/agent/state.ts

import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// ─── Enums (spiegeln die Postgres-Enums aus der DB) ──────────────────────────

export type DamageCategory =
  | "plumbing"       // Sanitär / Wasserschaden
  | "electrical"     // Elektro
  | "heating"        // Heizung
  | "structural"     // Bausubstanz / Mauerwerk
  | "appliance"      // Haushaltsgeräte
  | "pest_control"   // Schädlinge
  | "other";         // Sonstiges

export type PriorityLevel =
  | "low"            // Kann warten (> 2 Wochen)
  | "medium"         // Bald erledigen (< 1 Woche)
  | "high"           // Dringend (< 48h)
  | "urgent";        // Notfall — sofort

export type DamageReportStatus =
  | "received"           // Eingang bestätigt, Agent noch nicht gestartet
  | "in_progress"        // Agent läuft
  | "waiting_for_human"  // HITL: warte auf Genehmigung
  | "craftsman_booked"   // Handwerker gebucht
  | "resolved"           // Abgeschlossen
  | "rejected";          // Vom Property Manager abgelehnt

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export type AgentRunStatus =
  | "running"
  | "waiting_for_human"
  | "completed"
  | "failed";

export type NotificationChannel =
  | "email"
  | "whatsapp"
  | "in_app";

// ─── Sub-Typen für strukturierte Daten im State ───────────────────────────────

/** Ein einzelner Schritt im Agent-Trace (wird in agent_runs.steps_taken gespeichert) */
export interface AgentStep {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: string;         // ISO 8601
  durationMs: number;
}

/** Kontext aus dem ERP-Mock — was der Agent über Property und Mieter weiss */
export interface ErpContext {
  propertyId: string;
  propertyAddress: string;
  propertyUnit: string | null;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantChannel: NotificationChannel;  // bevorzugter Kanal für Rückkanal
  contractStart: string | null;        // ISO date
  contractEnd: string | null;          // ISO date
  additionalData: Record<string, unknown>;
}

/** Ausgewählter Handwerker aus der craftsmen-Tabelle */
export interface SelectedCraftsman {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  specializations: string[];
  hourlyRateChf: number | null;
}

// ─── Haupt-State des LangGraph Agenten ───────────────────────────────────────

/**
 * AgentState ist der zentrale State, der durch alle Nodes des Graphen
 * durchgereicht und schrittweise angereichert wird.
 *
 * Naming-Konvention:
 * - null  = "noch nicht verarbeitet / Tool hat noch nicht gelaufen"
 * - Wert  = "dieses Tool hat sein Ergebnis gesetzt"
 */
export const AgentStateAnnotation = Annotation.Root({

  // ── Eingabe (wird beim Start gesetzt, danach read-only) ──────────────────

  /** UUID des damage_reports-Eintrags — Einstiegspunkt für alle Tools */
  reportId: Annotation<string>,

  /** UUID des laufenden agent_runs-Eintrags — für Logging-Updates */
  agentRunId: Annotation<string>,

  // ── LangGraph Message History (für ReAct-Loop falls benötigt) ────────────

  messages: Annotation<BaseMessage[], BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // ── Tool-Ergebnisse (werden sequenziell befüllt) ─────────────────────────

  /** classify_damage_report → Schadenskategorie */
  category: Annotation<DamageCategory | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** classify_damage_report → Prioritätsstufe */
  priority: Annotation<PriorityLevel | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** classify_damage_report → Kurze Zusammenfassung des Schadens (für Logging) */
  damageSummary: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** check_erp_mock → Angereicherter Kontext aus ERP + Properties + Tenant */
  erpContext: Annotation<ErpContext | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** find_craftsman → Ausgewählter Handwerker */
  selectedCraftsman: Annotation<SelectedCraftsman | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** estimate_cost → Geschätzte Kosten in CHF */
  estimatedCostChf: Annotation<number | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** estimate_cost → Begründung der Kostenschätzung (für HITL-Anzeige) */
  costEstimationReason: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── HITL (Human-in-the-Loop) ─────────────────────────────────────────────

  /** true wenn estimatedCostChf > 500 CHF — steuert die conditional edge */
  approvalRequired: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  /** UUID des approval_requests-Eintrags (wird von request_human_approval gesetzt) */
  approvalRequestId: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** Wird nach Resumption vom API-Handler in den State injiziert */
  approvalStatus: Annotation<ApprovalStatus | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** Optionale Notiz des Property Managers bei Approve/Reject */
  approvalNotes: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── Aktionen (werden von den letzten Tools gesetzt) ───────────────────────

  /** book_craftsman → UUID des erstellten bookings-Eintrags */
  bookingId: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** send_notification → UUID des erstellten notifications-Eintrags */
  notificationId: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── Agent-Laufzeit-Metadata ───────────────────────────────────────────────

  /** Vollständiger Trace aller Tool-Aufrufe — wird in agent_runs.steps_taken gespeichert */
  steps: Annotation<AgentStep[], AgentStep[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),

  /** Aktueller Status des Agent-Runs — spiegelt agent_runs.status */
  status: Annotation<AgentRunStatus>({
    reducer: (_, next) => next,
    default: () => "running",
  }),

  /** Gesetzt wenn status === "failed" */
  errorMessage: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

// ─── Exportierter State-Typ (für Typisierung in graph.ts und Tools) ──────────

export type AgentState = typeof AgentStateAnnotation.State;

// ─── Hilfskonstante: HITL-Schwellenwert ───────────────────────────────────────

/** Kosten in CHF ab der eine Human-Genehmigung benötigt wird */
export const APPROVAL_THRESHOLD_CHF = 500;