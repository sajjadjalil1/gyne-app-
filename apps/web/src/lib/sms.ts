/**
 * SMS / WhatsApp gateway. In development the message is logged.
 * Plug a provider here (Twilio, Vonage, a local Iraqi gateway, or WhatsApp Business API).
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    // Never print a login code into production logs: fail loudly instead.
    if (process.env.NODE_ENV === "production") throw new Error("SMS_WEBHOOK_URL is not set");
    console.log(`[sms:dev] ${phone}: ${text}`);
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN ?? ""}` },
    body: JSON.stringify({ to: phone, text }),
  }).then((r) => { if (!r.ok) console.error("sms failed: HTTP", r.status); }, (e) => console.error("sms failed:", (e as Error).message));
}
