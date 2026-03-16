// app/api/webhooks/twilio/route.ts
//
// Empfängt eingehende WhatsApp-Nachrichten von Twilio.
// Mieter schreibt eine Nachricht → neuer Schadensbericht wird erstellt.

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { adminSupabase } from "@/lib/supabase/admin";

// ─── Twilio TwiML Antwort ─────────────────────────────────────────────────────

function twimlResponse(message: string): NextResponse {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// ─── POST /api/webhooks/twilio ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Request-Body als FormData parsen (Twilio sendet application/x-www-form-urlencoded)
  const formData = await request.formData();
  const body = Object.fromEntries(formData.entries()) as Record<string, string>;

  const from: string = body.From ?? ""; // z.B. "whatsapp:+41789675575"
  const messageBody: string = (body.Body ?? "").trim();

  console.log(`[twilio-webhook] Eingehend von ${from}: "${messageBody}"`);

  // 2. Webhook-Signatur prüfen (nur wenn TWILIO_WEBHOOK_URL gesetzt ist)
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";

  if (webhookUrl) {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const isValid = twilio.validateRequest(authToken, signature, webhookUrl, body);

    if (!isValid) {
      console.warn("[twilio-webhook] Ungültige Signatur — Request abgelehnt");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // 3. Telefonnummer normalisieren: "whatsapp:+41789675575" → "+41789675575"
  const phoneNumber = from.replace("whatsapp:", "");

  if (!phoneNumber) {
    return twimlResponse("Fehler: Absendernummer konnte nicht ermittelt werden.");
  }

  // 4. Mieter anhand der Telefonnummer in der DB suchen
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("phone", phoneNumber)
    .eq("role", "tenant")
    .maybeSingle();

  if (profileError) {
    console.error("[twilio-webhook] Profil-Abfrage fehlgeschlagen:", profileError);
    return twimlResponse("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
  }

  if (!profile) {
    console.warn(`[twilio-webhook] Keine registrierte Nummer: ${phoneNumber}`);
    return twimlResponse(
      "Ihre Nummer ist nicht mit einem Konto verknüpft. Bitte melden Sie sich im Portal an und hinterlegen Sie Ihre Nummer."
    );
  }

  // 5. Property des Mieters ermitteln
  const { data: tenantProperty } = await adminSupabase
    .from("tenants_properties")
    .select("property_id")
    .eq("tenant_id", profile.id)
    .maybeSingle();

  if (!tenantProperty) {
    return twimlResponse(
      "Ihrem Konto ist keine Liegenschaft zugeordnet. Bitte kontaktieren Sie Ihre Verwaltung."
    );
  }

  // 6. Nachricht parsen: erste Zeile = Titel, Rest = Beschreibung
  const lines = messageBody.split("\n").filter((l) => l.trim() !== "");
  const title = lines[0]?.slice(0, 100) || "Schadensmeldung via WhatsApp";
  const description =
    lines.length > 1
      ? lines.join("\n")
      : messageBody || "Keine weiteren Details angegeben.";

  // 7. Schadensbericht erstellen
  const { data: report, error: insertError } = await adminSupabase
    .from("damage_reports")
    .insert({
      title,
      description,
      status: "received",
      channel: "whatsapp",
      property_id: tenantProperty.property_id,
      tenant_id: profile.id,
    })
    .select("id")
    .single();

  if (insertError || !report) {
    console.error("[twilio-webhook] damage_report INSERT fehlgeschlagen:", insertError);
    return twimlResponse("Ihre Meldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
  }

  console.log(
    `[twilio-webhook] Schadensbericht erstellt: ${report.id} für ${profile.full_name ?? phoneNumber}`
  );

  // 8. Bestätigung an Mieter senden
  return twimlResponse(
    `✅ Danke ${profile.full_name?.split(" ")[0] ?? ""}! Ihre Schadensmeldung wurde registriert. Wir werden uns so schnell wie möglich darum kümmern und Sie über WhatsApp informieren.`
  );
}
