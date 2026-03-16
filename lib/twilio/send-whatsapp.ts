import { getTwilioClient, getTwilioFrom } from "./client";

export interface WhatsAppResult {
  sid: string;
  status: string;
}

export async function sendWhatsApp(to: string, body: string): Promise<WhatsAppResult> {
  const client = getTwilioClient();
  const from = getTwilioFrom();
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const message = await client.messages.create({ from, to: toFormatted, body });

  console.log(`[twilio] WhatsApp → ${to} | SID: ${message.sid} | Status: ${message.status}`);
  return { sid: message.sid, status: message.status };
}
