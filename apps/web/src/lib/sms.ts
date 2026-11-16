/**
 * SMS / WhatsApp gateway. In development the message is logged.
 * Plug a provider here (Twilio, Vonage, a local Iraqi gateway, or WhatsApp Business API).
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    // Pilot only: OTP_DELIVERY=log prints the message to the server log so the first
    // deployment can be tried before a gateway exists. Remove the variable once a gateway is set.
    if (process.env.OTP_DELIVERY === "log") {
      console.warn(`[otp] ${phone}: ${text}  (OTP_DELIVERY=log is for the pilot only; set SMS_WEBHOOK_URL and remove it)`);
      return;
    }
    // Never print a login code into production logs: fail loudly instead.
    if (process.env.NODE_ENV === "production") throw new Error("SMS_WEBHOOK_URL is not set");
    console.log(`[sms:dev] ${phone}: ${text}`);
    return;
  }
  const send = () => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN ?? ""}` },
    body: JSON.stringify({ to: phone, text }),
    // A stuck gateway must not hold the patient's login screen: give up after 10 seconds.
    signal: AbortSignal.timeout(10_000),
  });
  // One retry after a short pause for network errors and gateway 5xx/429; a 4xx means the request itself is wrong.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await send();
      if (r.ok) return;
      console.error(`sms failed: HTTP ${r.status} (attempt ${attempt})`);
      if (r.status < 500 && r.status !== 429) return;
    } catch (e) {
      console.error(`sms failed: ${(e as Error).name} (attempt ${attempt})`);
    }
    if (attempt === 1) await new Promise((res) => setTimeout(res, 1_500));
  }
}
