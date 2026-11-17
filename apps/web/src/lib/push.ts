import { prisma } from "@gyne/db";

/**
 * Push notifications to the patient's phone through Expo's push service (it hands them to Apple and Google).
 * Lock-screen text stays generic ("عندچ رسالة من العيادة") unless the patient chose detailed notifications,
 * because a phone on a table can be read by anyone. Sending never throws: a failed push must not break the
 * reply the nurse just wrote, which is already saved and visible in the app.
 */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100; // Expo accepts at most 100 messages per request

export type PushKind = "message" | "appointment";
export type PushData = { kind: PushKind; id?: string };
export type ExpoMessage = { to: string; title: string; body: string; data: PushData; sound: "default"; priority: "high"; channelId: string };
type Ticket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

export const isExpoToken = (t: string) => /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/.test(t);

const GENERIC: Record<PushKind, string> = {
  message: "عندچ رسالة جديدة من العيادة. اضغطي حتى تقريها.",
  appointment: "تفاصيل موعدچ تغيّرت. اضغطي حتى تشوفيها.",
};

/** The text that shows on the lock screen. Detailed only if she asked for it, and never longer than 120 letters. */
export function pushText(kind: PushKind, detailed: boolean, detail?: string | null): { title: string; body: string } {
  const title = "عيادتي 💜";
  if (!detailed || !detail) return { title, body: GENERIC[kind] };
  const clean = detail.replace(/\s+/g, " ").trim();
  return { title, body: clean.length > 120 ? `${clean.slice(0, 117)}…` : clean };
}

export function buildMessages(tokens: string[], text: { title: string; body: string }, data: PushData): ExpoMessage[] {
  return tokens.filter(isExpoToken).map((to) => ({ to, ...text, data, sound: "default", priority: "high", channelId: "messages" }));
}

/** Tokens whose ticket says the app was uninstalled or the token is no longer valid. */
export function deadTokens(messages: ExpoMessage[], tickets: Ticket[]): string[] {
  return tickets.flatMap((t, i) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" && messages[i] ? [messages[i].to] : []));
}

/** Sends to Expo in chunks; returns the tokens to forget. Timeouts and gateway errors are logged, not thrown. */
export async function sendExpo(messages: ExpoMessage[]): Promise<{ sent: number; dead: string[] }> {
  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          // Optional: with "enhanced push security" on in the Expo account, only this server can send.
          ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) { console.error(`push failed: HTTP ${res.status}`); continue; }
      const out = (await res.json().catch(() => ({}))) as { data?: Ticket[] };
      const tickets = Array.isArray(out.data) ? out.data : [];
      sent += tickets.filter((t) => t.status === "ok").length;
      dead.push(...deadTokens(chunk, tickets));
    } catch (e) {
      console.error(`push failed: ${(e as Error).name}`);
    }
  }
  return { sent, dead };
}

/** Notify one patient on every phone she is signed in on. Returns how many phones Expo accepted. */
export async function notifyPatient(patientId: string, kind: PushKind, detail?: string | null, id?: string): Promise<number> {
  try {
    const p = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { userId: true, detailedNotifications: true } });
    if (!p?.userId) return 0;
    const rows = await prisma.pushToken.findMany({ where: { userId: p.userId }, select: { token: true } });
    if (!rows.length) return 0;
    const messages = buildMessages(rows.map((r) => r.token), pushText(kind, p.detailedNotifications, detail), { kind, id });
    const { sent, dead } = await sendExpo(messages);
    if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    return sent;
  } catch (e) {
    console.error(`push failed: ${(e as Error).message}`);
    return 0;
  }
}
