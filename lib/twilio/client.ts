import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error("TWILIO_ACCOUNT_SID und TWILIO_AUTH_TOKEN müssen gesetzt sein");
}

export const twilioClient = twilio(accountSid, authToken);

export const TWILIO_WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
