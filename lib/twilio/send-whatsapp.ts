import { twilioClient, TWILIO_WHATSAPP_FROM } from "./client";

export interface WhatsAppResult {
  sid: string;
  status: string;
}

/**
 * Sendet eine WhatsApp-Nachricht via Twilio.
 * @param to Telefonnummer des Empfängers, z.B. "+41791234567"
 * @param body Nachrichtentext
 */
export async function sendWhatsApp(
  to: string,
  body: string
): Promise<WhatsAppResult> {
  // Twilio erwartet das Format "whatsapp:+41791234567"
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const message = await twilioClient.messages.create({
    from: TWILIO_WHATSAPP_FROM,
    to: toFormatted,
    body,
  });

  console.log(`[twilio] WhatsApp gesendet → ${to} | SID: ${message.sid} | Status: ${message.status}`);

  return { sid: message.sid, status: message.status };
}
