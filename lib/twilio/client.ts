import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID und TWILIO_AUTH_TOKEN müssen gesetzt sein");
  }

  _client = twilio(accountSid, authToken);
  return _client;
}

export function getTwilioFrom() {
  const number = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!number) throw new Error("TWILIO_WHATSAPP_NUMBER muss gesetzt sein");
  return `whatsapp:${number}`;
}
