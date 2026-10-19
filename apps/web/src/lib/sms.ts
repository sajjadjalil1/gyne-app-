/**
 * SMS / WhatsApp gateway. In development the message is logged.
 * Plug a provider here (Twilio, Vonage, a local Iraqi gateway, or WhatsApp Business API).
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    console.log(`[sms:dev] ${phone}: ${text}`);
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN ?? ""}` },
    body: JSON.stringify({ to: phone, text }),
  }).catch((e) => console.error("sms failed", e));
}
