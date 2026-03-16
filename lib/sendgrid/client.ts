import sgMail from "@sendgrid/mail";

let _initialized = false;

export function getSgMailClient() {
  if (_initialized) return sgMail;

  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY muss gesetzt sein");

  sgMail.setApiKey(key);
  _initialized = true;
  return sgMail;
}

export function getSgFrom(): { email: string; name: string } {
  const email = process.env.SENDGRID_FROM_EMAIL;
  if (!email) throw new Error("SENDGRID_FROM_EMAIL muss gesetzt sein");
  return { email, name: process.env.SENDGRID_FROM_NAME ?? "ImmoPossible" };
}
