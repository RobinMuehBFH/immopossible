import { getSgMailClient, getSgFrom } from "./client";

export interface EmailResult {
  messageId: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  const client = getSgMailClient();
  const from = getSgFrom();

  const [response] = await client.send({
    to,
    from,
    subject,
    html,
    // Plain-text fallback: strip HTML tags
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  });

  const messageId =
    (response.headers["x-message-id"] as string) ?? "sent";

  console.log(`[sendgrid] E-Mail → ${to} | Subject: ${subject} | ID: ${messageId}`);
  return { messageId };
}
