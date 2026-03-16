// lib/agent/tools/send-notification.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, AgentStep } from "@/lib/agents/state";
import { sendWhatsApp } from "@/lib/twilio/send-whatsapp";
import { sendEmail } from "@/lib/sendgrid/send-email";

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

// ─── HTML-Vorlage für E-Mail-Benachrichtigung ─────────────────────────────────

function buildTenantEmailHtml(state: AgentState, scheduledAt: string): string {
  const craftsman = state.selectedCraftsman!;
  const erp = state.erpContext!;
  const date = new Date(scheduledAt).toLocaleString("de-CH", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const firstName = erp.tenantName.split(" ")[0];
  const approvalNote = state.approvalRequired && state.approvalStatus === "approved"
    ? `<p style="color:#4A5568;margin:0 0 8px;">✅ Der Einsatz wurde von der Liegenschaftsverwaltung genehmigt.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7fafc;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#4FD1C5,#667EEA);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">ImmoPossible</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Ihr Schadensbericht wurde bearbeitet</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#2D3748;font-size:16px;margin:0 0 16px;">Guten Tag ${firstName}</p>
      <p style="color:#4A5568;margin:0 0 24px;line-height:1.6;">
        Ihr Schaden wurde analysiert und ein Handwerker wurde gebucht.
      </p>
      <div style="background:#F7FAFC;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#A0AEC0;font-size:12px;font-weight:700;text-transform:uppercase;padding:6px 0 2px;">Schaden</td></tr>
          <tr><td style="color:#2D3748;font-size:15px;padding-bottom:14px;">${state.damageSummary ?? "–"}</td></tr>
          <tr><td style="color:#A0AEC0;font-size:12px;font-weight:700;text-transform:uppercase;padding:6px 0 2px;">Handwerker</td></tr>
          <tr><td style="color:#2D3748;font-size:15px;padding-bottom:14px;">${craftsman.name}${craftsman.company ? ` (${craftsman.company})` : ""}</td></tr>
          <tr><td style="color:#A0AEC0;font-size:12px;font-weight:700;text-transform:uppercase;padding:6px 0 2px;">Termin</td></tr>
          <tr><td style="color:#2D3748;font-size:15px;padding-bottom:14px;">${date}</td></tr>
          <tr><td style="color:#A0AEC0;font-size:12px;font-weight:700;text-transform:uppercase;padding:6px 0 2px;">Geschätzte Kosten</td></tr>
          <tr><td style="color:#2D3748;font-size:15px;">CHF ${state.estimatedCostChf}</td></tr>
        </table>
      </div>
      ${approvalNote}
      <p style="color:#A0AEC0;font-size:13px;margin:0;line-height:1.6;">
        Bei Fragen wenden Sie sich an Ihre Liegenschaftsverwaltung.
      </p>
    </div>
    <div style="background:#F7FAFC;padding:20px 32px;text-align:center;">
      <p style="color:#A0AEC0;font-size:12px;margin:0;">Mit freundlichen Grüssen · ImmoPossible Liegenschaftsverwaltung</p>
    </div>
  </div>
</body>
</html>`;
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

  // Identifier je nach Kanal (Telefon für WhatsApp, E-Mail für email)
  const recipientIdentifier =
    state.erpContext.tenantChannel === "email"
      ? state.erpContext.tenantEmail
      : state.erpContext.tenantPhone ?? null;

  // 1. Mieter-Notification in DB schreiben
  const { data: tenantNotification, error: tenantError } = await adminSupabase
    .from("notifications")
    .insert({
      damage_report_id: state.reportId,
      recipient_id: state.erpContext.tenantId,
      recipient_identifier: recipientIdentifier,
      channel: state.erpContext.tenantChannel,
      body: tenantMessage,
    })
    .select("id")
    .single();

  if (tenantError || !tenantNotification) {
    throw new Error(`notifications INSERT (tenant) fehlgeschlagen: ${tenantError?.message}`);
  }

  // 2. WhatsApp senden wenn Kanal = whatsapp und Telefonnummer vorhanden
  if (state.erpContext.tenantChannel === "whatsapp" && state.erpContext.tenantPhone) {
    try {
      const result = await sendWhatsApp(state.erpContext.tenantPhone, tenantMessage);

      await adminSupabase
        .from("notifications")
        .update({
          sent_at: new Date().toISOString(),
          external_id: result.sid,
        })
        .eq("id", tenantNotification.id);

      console.log(`[send-notification] WhatsApp gesendet → ${state.erpContext.tenantPhone} | SID: ${result.sid}`);
    } catch (twilioError) {
      const errMsg = twilioError instanceof Error ? twilioError.message : String(twilioError);
      console.error(`[send-notification] WhatsApp fehlgeschlagen: ${errMsg}`);

      await adminSupabase
        .from("notifications")
        .update({
          failed_at: new Date().toISOString(),
          error_message: errMsg,
        })
        .eq("id", tenantNotification.id);
      // Nicht werfen — Buchung ist bereits erfolgt, Notification ist nicht-kritisch
    }
  }

  // 3. E-Mail senden wenn Kanal = email und Adresse vorhanden
  if (state.erpContext.tenantChannel === "email" && state.erpContext.tenantEmail) {
    try {
      const html = buildTenantEmailHtml(state, scheduledDisplay);
      const result = await sendEmail(
        state.erpContext.tenantEmail,
        "Ihr Schaden wurde bearbeitet – Handwerker gebucht",
        html
      );

      await adminSupabase
        .from("notifications")
        .update({
          sent_at: new Date().toISOString(),
          external_id: result.messageId,
        })
        .eq("id", tenantNotification.id);

      console.log(`[send-notification] E-Mail gesendet → ${state.erpContext.tenantEmail} | ID: ${result.messageId}`);
    } catch (emailError) {
      const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
      console.error(`[send-notification] E-Mail fehlgeschlagen: ${errMsg}`);

      await adminSupabase
        .from("notifications")
        .update({ failed_at: new Date().toISOString(), error_message: errMsg })
        .eq("id", tenantNotification.id);
    }
  }

  // 5. Property Manager In-App Notification schreiben
  await adminSupabase
    .from("notifications")
    .insert({
      damage_report_id: state.reportId,
      channel: "in_app",
      body: managerMessage,
    });

  // 6. Schritt loggen
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