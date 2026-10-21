/**
 * Web preview with made-up patients (EXPO_PUBLIC_DEMO=1): answers the app's API calls in the browser,
 * so the preview never touches the live server or real patient data. Fixtures come from the seed database.
 */
import fixtures from "./demo/fixtures.json";

export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1";
export const DEMO_CODE = "123456";
export const DEMO_PHONES = [
  { phone: "07801234567", label: "حامل" },
  { phone: "07805555555", label: "دورة شهرية" },
  { phone: "07806666666", label: "حبوب منع الحمل" },
];

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Persona = { me: Json; logs: Json; messages: Json };

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DAY = 86_400_000;
const shiftDays = (() => {
  const captured = Date.parse((fixtures as Record<string, Persona>)["07801234567"].me.today);
  const now = new Date();
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - captured) / DAY);
})();
/** Moves every timestamp so the made-up patient's "today" is the viewer's today. */
function shift(v: Json): Json {
  if (typeof v === "string") return ISO.test(v) ? new Date(Date.parse(v) + shiftDays * DAY).toISOString() : v;
  if (Array.isArray(v)) return v.map(shift);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shift(x)]));
  return v;
}

const TOKEN_PREFIX = "demo:";
const state = new Map<string, Persona>();
function persona(phone: string): Persona {
  let p = state.get(phone);
  if (!p) { p = shift((fixtures as Record<string, Persona>)[phone]) as Persona; state.set(phone, p); }
  return p;
}
const norm = (phone: string) => { const d = phone.replace(/\D/g, ""); return d.startsWith("964") ? `0${d.slice(3)}` : d.startsWith("0") ? d : `0${d}`; };
function current(): Persona | null {
  const t = globalThis.localStorage?.getItem("gyne.token");
  return t?.startsWith(TOKEN_PREFIX) ? persona(t.slice(TOKEN_PREFIX.length)) : null;
}
class DemoError extends Error { constructor(public status: number, message: string) { super(message); } }
const bpLevel = (s: number, d: number) => (s >= 160 || d >= 110 ? "severe" : s >= 140 || d >= 90 ? "high" : "ok");
const DANGER_WORDS = /نزيف|نزف|دم|ماي|ماء|صداع|زغللة|حركة|تقلص|طلق|حرارة/;

export async function demoApi(path: string, init: RequestInit & { json?: unknown }): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 250));
  const method = (init.method ?? "GET").toUpperCase();
  const body = (init.json ?? {}) as Json;
  const route = path.split("?")[0];

  if (route === "/api/auth/otp/request") {
    if (!(norm(body.phone) in fixtures)) throw new DemoError(404, `هذي نسخة تجريبية. جرّبي واحد من الأرقام: ${DEMO_PHONES.map((p) => p.phone).join("، ")}`);
    return { ok: true, devCode: DEMO_CODE };
  }
  if (route === "/api/auth/otp/verify") {
    const phone = norm(body.phone);
    if (body.code !== DEMO_CODE) throw new DemoError(400, "الرمز غلط");
    const p = persona(phone);
    return { token: TOKEN_PREFIX + phone, user: { id: p.me.patient.id, name: p.me.patient.name, role: "PATIENT", patientId: p.me.patient.id } };
  }
  if (route === "/api/auth/logout") return { ok: true };

  const p = current();
  if (!p) throw new DemoError(401, "سجّلي دخول");
  const me = p.me;
  const now = new Date().toISOString();

  switch (`${method} ${route}`) {
    case "GET /api/me": return me;
    case "GET /api/logs": return p.logs;
    case "GET /api/messages": return p.messages;
    case "PUT /api/logs": {
      me.todayLog = { feeling: body.mood ?? null, symptoms: body.symptoms ?? [], bleeding: !!body.bleeding, flow: body.flow ?? null };
      p.logs.logs = [...p.logs.logs.filter((l: Json) => !l.date.startsWith(body.date)), { id: `demo-${now}`, date: `${body.date}T00:00:00.000Z`, bleeding: !!body.bleeding, flow: body.flow ?? null, pain: body.pain ?? null, mood: body.mood ?? null, symptoms: body.symptoms ?? null, note: body.note ?? null, createdAt: now }];
      return { dangers: [] };
    }
    case "POST /api/readings": {
      if (body.kind === "BP") me.bp = { at: now, systolic: body.systolic, diastolic: body.diastolic, level: bpLevel(body.systolic, body.diastolic), today: true };
      if (body.kind === "KICKS") me.kicks = { at: now, count: body.value, today: true };
      return { ok: true };
    }
    case "POST /api/messages": {
      const escalate = DANGER_WORDS.test(body.body ?? "");
      p.messages.messages.push({ id: `demo-${now}`, fromPatient: true, body: body.body, authorName: null, auto: false, urgent: escalate, readAt: null, createdAt: now });
      p.messages.messages.push({ id: `demo-r-${now}`, fromPatient: false, body: "وصلت رسالتچ للعيادة 💜 نرد عليچ بأقرب وقت. (هذا رد تلقائي بالنسخة التجريبية)", authorName: null, auto: true, urgent: false, readAt: null, createdAt: now });
      return { urgent: escalate, escalate, bpHigh: me.bp?.level !== "ok" && !!me.bp };
    }
    case "POST /api/meds/dose": {
      const med = me.meds.find((m: Json) => m.id === body.prescriptionId);
      const dose = med?.doses.find((x: Json) => x.dueAt === body.dueAt);
      if (dose) { dose.status = body.status; dose.loggedAt = now; }
      return { ok: true };
    }
    case "POST /api/pill": {
      const pill = me.contraception?.pill;
      if (body.op === "taken" && pill) { pill.takenToday = true; pill.last7[pill.last7.length - 1] = true; return { ok: true }; }
      if (body.op === "missed") return { text: (body.count === "one" ? me.clinic.missedPillOne : me.clinic.missedPillTwo) ?? (body.count === "one" ? "خذي الحبة المنسية هسه، وكملي باقي الحبوب بوقتها." : "خذي آخر حبة نسيتيها هسه، واستعملي واقي ٧ أيام، وراسلي العيادة."), fromClinic: !!me.clinic.missedPillOne };
      return { ok: true };
    }
    case "PATCH /api/profile": Object.assign(me.patient, body); return { ok: true };
    case "POST /api/danger": me.danger = { at: now, signs: body.signs ?? [], handled: false }; return { ok: true };
  }
  throw new DemoError(404, "غير متوفر بالنسخة التجريبية");
}
