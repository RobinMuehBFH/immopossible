// app/api/webhooks/sendgrid/route.ts
//
// Inbound E-Mail-Webhook via SendGrid Inbound Parse.
// Jede E-Mail an die konfigurierte Adresse wird als POST hierher weitergeleitet.
//
// Flow:
//   1. Absender-E-Mail aus dem "from"-Feld extrahieren
//   2. Mieter anhand E-Mail-Adresse identifizieren
//   3. Liegenschaft des Mieters laden
//   4. damage_report erstellen (channel: 'email')
//   5. Bestätigungs-E-Mail zurücksenden

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/sendgrid/send-email";

// ─── E-Mail aus "Name <email@domain.com>" extrahieren ────────────────────────

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  return raw.trim().toLowerCase();
}

// ─── HTML-Vorlagen ────────────────────────────────────────────────────────────

function confirmationHtml(firstName: string, title: string, description: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7fafc; margin:0; padding:32px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#4FD1C5,#667EEA); padding:32px 32px 24px; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:22px; font-weight:700;">ImmoPossible</h1>
      <p style="color:rgba(255,255,255,.85); margin:8px 0 0; font-size:14px;">Liegenschaftsverwaltung</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#2D3748; font-size:16px; margin:0 0 16px;">Guten Tag ${firstName}</p>
      <p style="color:#4A5568; margin:0 0 24px; line-height:1.6;">
        Ihre Schadensmeldung wurde erfolgreich registriert. Wir werden uns so schnell wie möglich darum kümmern und Sie per E-Mail informieren.
      </p>
      <div style="background:#F7FAFC; border-left:4px solid #4FD1C5; border-radius:8px; padding:16px; margin-bottom:24px;">
        <p style="color:#A0AEC0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin:0 0 6px;">Ihre Meldung</p>
        <p style="color:#2D3748; font-weight:600; margin:0 0 8px;">${escapeHtml(title)}</p>
        <p style="color:#4A5568; font-size:14px; margin:0; line-height:1.5;">${escapeHtml(description.slice(0, 300))}${description.length > 300 ? "…" : ""}</p>
      </div>
      <p style="color:#A0AEC0; font-size:13px; margin:0; line-height:1.6;">
        Bei dringenden Anliegen erreichen Sie uns direkt unter Ihrer bekannten Verwaltungsnummer.
      </p>
    </div>
    <div style="background:#F7FAFC; padding:20px 32px; text-align:center;">
      <p style="color:#A0AEC0; font-size:12px; margin:0;">Mit freundlichen Grüssen · ImmoPossible Liegenschaftsverwaltung</p>
    </div>
  </div>
</body>
</html>`;
}

function notRegisteredHtml(senderEmail: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; background:#f7fafc; margin:0; padding:32px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <h2 style="color:#2D3748; margin:0 0 16px;">E-Mail-Adresse nicht registriert</h2>
    <p style="color:#4A5568; line-height:1.6;">
      Die E-Mail-Adresse <strong>${escapeHtml(senderEmail)}</strong> ist in unserem System nicht registriert.
    </p>
    <p style="color:#4A5568; line-height:1.6;">
      Bitte melden Sie sich im Mieterportal an und hinterlegen Sie Ihre E-Mail-Adresse unter Profil.
    </p>
    <p style="color:#A0AEC0; font-size:13px; margin-top:24px;">ImmoPossible Liegenschaftsverwaltung</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── POST /api/webhooks/sendgrid ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const body = Object.fromEntries(formData.entries()) as Record<string, string>;

  const fromRaw = body.from ?? "";
  const subject = (body.subject ?? "").trim() || "Schadensmeldung";
  // Prefer plain text; fall back to HTML with tags stripped
  const textBody = (body.text ?? "").trim() || (body.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  console.log(`[sendgrid-webhook] from="${fromRaw}" subject="${subject}"`);

  const senderEmail = extractEmail(fromRaw);
  if (!senderEmail) {
    return new NextResponse("Bad Request: no from address", { status: 400 });
  }

  // ── Mieter anhand E-Mail identifizieren ────────────────────────────────────
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", senderEmail)
    .eq("role", "tenant")
    .maybeSingle();

  if (!profile) {
    console.log(`[sendgrid-webhook] Unbekannte E-Mail: ${senderEmail}`);
    // Antwort-E-Mail senden, damit der Absender Bescheid weiss
    await sendEmail(
      senderEmail,
      "Ihre Anfrage konnte nicht verarbeitet werden",
      notRegisteredHtml(senderEmail)
    ).catch((e) => console.error("[sendgrid-webhook] Fehlermail fehlgeschlagen:", e));
    // 200 zurückgeben damit SendGrid nicht erneut versucht
    return NextResponse.json({ ok: false, reason: "tenant_not_found" });
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Sie";

  // ── Liegenschaft ermitteln ─────────────────────────────────────────────────
  const { data: tenantProperty } = await adminSupabase
    .from("tenants_properties")
    .select("property_id")
    .eq("tenant_id", profile.id)
    .maybeSingle();

  if (!tenantProperty) {
    await sendEmail(
      senderEmail,
      "Ihre Anfrage konnte nicht verarbeitet werden",
      `<p>Guten Tag ${escapeHtml(firstName)},<br><br>Ihrem Konto ist noch keine Liegenschaft zugeordnet. Bitte kontaktieren Sie Ihre Verwaltung.<br><br>ImmoPossible</p>`
    ).catch(() => {});
    return NextResponse.json({ ok: false, reason: "no_property" });
  }

  // ── damage_report erstellen ────────────────────────────────────────────────
  const { error: reportError } = await adminSupabase
    .from("damage_reports")
    .insert({
      title: subject.slice(0, 100),
      description: textBody || subject,
      channel: "email",
      status: "received",
      property_id: tenantProperty.property_id,
      tenant_id: profile.id,
    });

  if (reportError) {
    console.error("[sendgrid-webhook] damage_report INSERT fehlgeschlagen:", reportError);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  console.log(`[sendgrid-webhook] ✅ Report erstellt — tenant=${profile.email} subject="${subject}"`);

  // ── Bestätigungs-E-Mail senden ─────────────────────────────────────────────
  await sendEmail(
    senderEmail,
    `Re: ${subject} – Ihre Schadensmeldung wurde registriert`,
    confirmationHtml(firstName, subject, textBody)
  ).catch((e) => console.error("[sendgrid-webhook] Bestätigungsmail fehlgeschlagen:", e));

  return NextResponse.json({ ok: true });
}
