// app/api/webhooks/twilio/route.ts
//
// Konversationeller WhatsApp-Webhook.
// Führt den Mieter in 4 Schritten durch eine Schadensmeldung:
//
//   Mieter → initiale Beschreibung
//   App    → "Wo genau befindet sich der Schaden?"
//   Mieter → Ort
//   App    → "Seit wann besteht das Problem?"
//   Mieter → Zeitraum
//   App    → "Wie dringend? 1–4"
//   Mieter → Dringlichkeit
//   App    → Bestätigung + Schadensbericht erstellt

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { adminSupabase } from "@/lib/supabase/admin";

// ─── Schritte der Konversation ────────────────────────────────────────────────

type ConversationStep = "awaiting_location" | "awaiting_duration" | "awaiting_urgency";

interface SessionData {
  description: string;
  location?: string;
  duration?: string;
}

// ─── TwiML Antwort ────────────────────────────────────────────────────────────

function twiml(message: string): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

// ─── Priorität aus 1–4 ableiten ──────────────────────────────────────────────

function parsePriority(text: string): "low" | "medium" | "high" | "urgent" | null {
  const n = parseInt(text.trim());
  if (isNaN(n) || n < 1 || n > 4) return null;
  return (["low", "medium", "high", "urgent"] as const)[n - 1];
}

// ─── POST /api/webhooks/twilio ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const body = Object.fromEntries(formData.entries()) as Record<string, string>;

  const from: string = body.From ?? "";
  const messageText: string = (body.Body ?? "").trim();

  console.log(`[twilio-webhook] ${from}: "${messageText}"`);

  // Signatur-Verifikation (nur wenn TWILIO_WEBHOOK_URL gesetzt)
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  if (webhookUrl) {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN ?? "",
      signature,
      webhookUrl,
      body
    );
    if (!isValid) return new NextResponse("Forbidden", { status: 403 });
  }

  const phoneNumber = from.replace("whatsapp:", "");
  if (!phoneNumber) return twiml("Fehler: Absendernummer unbekannt.");

  // ── Mieter anhand Telefonnummer identifizieren ─────────────────────────────
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone", phoneNumber)
    .eq("role", "tenant")
    .maybeSingle();

  if (!profile) {
    return twiml(
      "Ihre Nummer ist nicht registriert. Bitte melden Sie sich im Portal an und hinterlegen Sie Ihre Handynummer unter Profil."
    );
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Sie";

  // ── Property ermitteln ────────────────────────────────────────────────────
  const { data: tenantProperty } = await adminSupabase
    .from("tenants_properties")
    .select("property_id")
    .eq("tenant_id", profile.id)
    .maybeSingle();

  if (!tenantProperty) {
    return twiml("Ihrem Konto ist keine Liegenschaft zugeordnet. Bitte kontaktieren Sie Ihre Verwaltung.");
  }

  // ── Bestehende Session laden ───────────────────────────────────────────────
  const { data: session } = await adminSupabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  // ══════════════════════════════════════════════════════════════════════════
  // SCHRITT 1 — Erste Nachricht: Schadensbeschreibung
  // ══════════════════════════════════════════════════════════════════════════
  if (!session) {
    await adminSupabase.from("whatsapp_sessions").insert({
      phone_number: phoneNumber,
      tenant_id: profile.id,
      property_id: tenantProperty.property_id,
      step: "awaiting_location" as ConversationStep,
      collected_data: { description: messageText } satisfies SessionData,
    });

    return twiml(
      `Danke ${firstName}! Ich habe Ihre Meldung notiert.\n\n` +
      `📍 *Wo genau* befindet sich der Schaden? (z.B. Badezimmer, Küche, Keller)`
    );
  }

  const data = session.collected_data as SessionData;

  // ══════════════════════════════════════════════════════════════════════════
  // SCHRITT 2 — Ort empfangen
  // ══════════════════════════════════════════════════════════════════════════
  if (session.step === "awaiting_location") {
    await adminSupabase
      .from("whatsapp_sessions")
      .update({
        step: "awaiting_duration" as ConversationStep,
        collected_data: { ...data, location: messageText } satisfies SessionData,
      })
      .eq("phone_number", phoneNumber);

    return twiml(
      `Verstanden — *${messageText}*.\n\n` +
      `🗓 *Seit wann* besteht das Problem? (z.B. seit gestern, seit einer Woche)`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCHRITT 3 — Zeitraum empfangen
  // ══════════════════════════════════════════════════════════════════════════
  if (session.step === "awaiting_duration") {
    await adminSupabase
      .from("whatsapp_sessions")
      .update({
        step: "awaiting_urgency" as ConversationStep,
        collected_data: { ...data, duration: messageText } satisfies SessionData,
      })
      .eq("phone_number", phoneNumber);

    return twiml(
      `Notiert — seit *${messageText}*.\n\n` +
      `🚨 Wie *dringend* ist das Problem?\n\n` +
      `1️⃣ Kann warten (> 2 Wochen)\n` +
      `2️⃣ Bald erledigen (< 1 Woche)\n` +
      `3️⃣ Dringend (< 48h)\n` +
      `4️⃣ Notfall – sofort!\n\n` +
      `Bitte antworten Sie mit 1, 2, 3 oder 4.`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCHRITT 4 — Dringlichkeit empfangen → Schadensbericht erstellen
  // ══════════════════════════════════════════════════════════════════════════
  if (session.step === "awaiting_urgency") {
    const priority = parsePriority(messageText);

    if (!priority) {
      return twiml("Bitte antworten Sie mit einer Zahl zwischen 1 und 4.");
    }

    // Vollständige Beschreibung zusammenbauen
    const fullDescription = [
      data.description,
      data.location ? `Ort: ${data.location}` : null,
      data.duration ? `Besteht seit: ${data.duration}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Schadensbericht erstellen
    const { error: reportError } = await adminSupabase
      .from("damage_reports")
      .insert({
        title: data.description.slice(0, 100),
        description: fullDescription,
        location_in_property: data.location ?? null,
        priority,
        status: "received",
        channel: "whatsapp",
        property_id: session.property_id,
        tenant_id: session.tenant_id,
      });

    // Session löschen
    await adminSupabase
      .from("whatsapp_sessions")
      .delete()
      .eq("phone_number", phoneNumber);

    if (reportError) {
      console.error("[twilio-webhook] damage_report INSERT fehlgeschlagen:", reportError);
      return twiml("Ihre Meldung konnte leider nicht gespeichert werden. Bitte versuchen Sie es erneut.");
    }

    const urgencyLabels: Record<string, string> = {
      low: "Kann warten",
      medium: "Bald erledigen",
      high: "Dringend",
      urgent: "🚨 Notfall",
    };

    return twiml(
      `✅ Ihre Schadensmeldung wurde erfolgreich registriert!\n\n` +
      `📋 *Schaden:* ${data.description}\n` +
      `📍 *Ort:* ${data.location ?? "–"}\n` +
      `🗓 *Seit:* ${data.duration ?? "–"}\n` +
      `🚨 *Dringlichkeit:* ${urgencyLabels[priority]}\n\n` +
      `Wir werden uns so schnell wie möglich darum kümmern und Sie hier via WhatsApp informieren.`
    );
  }

  return twiml("Etwas ist schiefgelaufen. Bitte starten Sie neu mit einer neuen Nachricht.");
}
