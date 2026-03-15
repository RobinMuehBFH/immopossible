// lib/agent/tools/send-notification.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, AgentStep } from "@/lib/agents/state";

// ─── Nachrichtenvorlagen ──────────────────────────────────────────────────────

function buildTenantMessage(state: AgentState, scheduledAt: string): string {
  const craftsman = state.selectedCraftsman!;
  const date = new Date(scheduledAt).toLocaleString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const approvalNote =
    state.approvalRequired && state.approvalStatus === "approved"
      ? "\nDer Einsatz wurde von der Liegenschaftsverwaltung genehmigt."
      : "";

  return `Guten Tag ${state.erpContext!.tenantName}

Ihr Schadensbericht wurde bearbeitet.

📋 Schaden: ${state.damageSummary}
🔧 Handwerker: ${craftsman.name}${craftsman.company ? ` (${craftsman.company})` : ""}
📅 Termin: ${date}
💰 Geschätzte Kosten: CHF ${state.estimatedCostChf}${approvalNote}

Bei Fragen wenden Sie sich an Ihre Liegenschaftsverwaltung.

Mit freundlichen Grüssen
Ihre Liegenschaftsverwaltung`.trim();
}

function buildManagerMessage(state: AgentState, scheduledAt: string): string {
  const craftsman = state.selectedCraftsman!;
  const erp = state.erpContext!;
  const date = new Date(scheduledAt).toLocaleString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Agent-Zusammenfassung: ${erp.propertyAddress}${erp.propertyUnit ? `, Einheit ${erp.propertyUnit}` : ""}

Schaden: ${state.damageSummary}
Kategorie: ${state.category} | Priorität: ${state.priority}
Handwerker: ${craftsman.name} — Termin: ${date}
Kosten: CHF ${state.estimatedCostChf}${state.approvalRequired ? ` (genehmigt: ${state.approvalStatus})` : ""}`.trim();
}

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function sendNotificationNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  if (!state.bookingId || !state.erpContext || !state.selectedCraftsman) {
    throw new Error(
      "[send-notification] bookingId / erpContext / selectedCraftsman fehlen im State"
    );
  }

  // Buchung laden um scheduled_date zu bekommen
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select("scheduled_date")
    .eq("id", state.bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Buchung nicht gefunden: ${state.bookingId}`);
  }

  const scheduledDisplay = booking.scheduled_date ?? new Date().toISOString();
  const tenantMessage = buildTenantMessage(state, scheduledDisplay);
  const managerMessage = buildManagerMessage(state, scheduledDisplay);

  // 1. Mieter-Notification schreiben
  const { data: tenantNotification, error: tenantError } = await adminSupabase
    .from("notifications")
    .insert({
      damage_report_id: state.reportId,
      recipient_id: state.erpContext.tenantId,
      channel: state.erpContext.tenantChannel,
      body: tenantMessage,
    })
    .select("id")
    .single();

  if (tenantError || !tenantNotification) {
    throw new Error(`notifications INSERT (tenant) fehlgeschlagen: ${tenantError?.message}`);
  }

  // 2. Property Manager In-App Notification schreiben
  await adminSupabase
    .from("notifications")
    .insert({
      damage_report_id: state.reportId,
      channel: "in_app",
      body: managerMessage,
    });

  // 3. Schritt loggen
  const step: AgentStep = {
    tool: "send_notification",
    input: {
      tenantId: state.erpContext.tenantId,
      channel: state.erpContext.tenantChannel,
      bookingId: state.bookingId,
    },
    output: {
      notificationId: tenantNotification.id,
      channel: state.erpContext.tenantChannel,
      messagePreview: tenantMessage.slice(0, 80) + "...",
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[send-notification] tenant=${state.erpContext.tenantName} via ${state.erpContext.tenantChannel} — notificationId=${tenantNotification.id}`
  );

  return {
    notificationId: tenantNotification.id,
    steps: [step],
  };
}