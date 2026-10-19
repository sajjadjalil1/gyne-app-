import { notFound } from "next/navigation";
import { prisma } from "@gyne/db";
import { subDays } from "date-fns";
import { requireStaffPage } from "@/lib/staff";
import { Shell } from "@/components/shell";
import { Avatar } from "@/components/severity";
import { deriveAlerts } from "@/lib/alerts";
import { ageYears, antenatalSchedule, fmtDate, fmtTime, formatGA, gaOnDate, methodLabel, predictCycle, APPT_TYPE_LABEL, FLOW_LABEL, relTime } from "@gyne/core";
import { ReplyForm } from "./reply-form";
import { replyToPatient } from "./actions";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const now = new Date();
  const p = await prisma.patient.findFirst({
    where: { id, clinicId: user.clinicId },
    include: {
      readings: { orderBy: { takenAt: "desc" }, take: 40 },
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
      contraceptions: { orderBy: { startedAt: "desc" } },
      pregnancies: { orderBy: { createdAt: "desc" } },
      cycleLogs: { where: { date: { gte: subDays(now, 200) } }, orderBy: { date: "asc" } },
      appointments: { orderBy: { startsAt: "desc" }, take: 20 },
      alerts: { where: { resolvedAt: null } },
    },
  });
  if (!p) notFound();
  await prisma.message.updateMany({ where: { patientId: p.id, fromPatient: true, readAt: null }, data: { readAt: now } });

  const alerts = deriveAlerts({ ...p, messages: p.messages }, now);
  const preg = p.pregnancies.find((x) => x.active);
  const ga = preg ? gaOnDate(preg.eddFinal, now) : null;
  const schedule = preg ? antenatalSchedule(preg.eddFinal, { rhNegative: preg.rhNegative }) : [];
  const contra = p.contraceptions.find((c) => !c.endedAt);
  const cycle = predictCycle(p.cycleLogs, { cycleLength: p.cycleLengthAvg, periodLength: p.periodLengthAvg }, now);

  type Ev = { at: Date; tone: string; title: string; detail?: string };
  const events: Ev[] = [
    ...p.readings.filter((r) => r.kind === "BP").map((r) => ({ at: r.takenAt, tone: (r.systolic ?? 0) >= 140 || (r.diastolic ?? 0) >= 90 ? "bg-crit" : "bg-ok", title: `ضغط منزلي ${r.systolic}/${r.diastolic}` })),
    ...p.readings.filter((r) => r.kind !== "BP").map((r) => ({ at: r.takenAt, tone: "bg-info", title: r.kind === "KICKS" ? `حركات الجنين ${r.value}` : r.kind === "WEIGHT" ? `الوزن ${r.value} كغ` : `سكر ${r.value}` })),
    ...p.appointments.map((a) => ({ at: a.startsAt, tone: a.status === "COMPLETED" ? "bg-lav" : a.status === "NO_SHOW" ? "bg-faint" : "bg-lav-soft", title: `${APPT_TYPE_LABEL[a.type]}${a.status === "SCHEDULED" ? " (قادم)" : a.status === "NO_SHOW" ? " (غياب)" : ""}`, detail: a.notes ?? a.reason ?? undefined })),
    ...p.messages.map((m) => ({ at: m.createdAt, tone: m.fromPatient ? "bg-rose" : "bg-info", title: m.fromPatient ? "رسالة من المريضة" : "رد العيادة", detail: m.body })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);

  return (
    <Shell user={user} clinic={user.clinic} active="patients">
      <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <section className="glass-lg p-5">
            <div className="flex items-start gap-3">
              <Avatar name={p.name} tone={preg ? "bg-lav" : "bg-rose"} size="w-14 h-14 text-xl" />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold">{p.name}</h1>
                <div className="text-sm text-muted flex flex-wrap gap-x-3"><span className="num">{ageYears(p.birthDate, now)} سنة</span><span>G{p.gravida} P{p.para}{p.abortions ? `+${p.abortions}` : ""}</span>{p.bloodGroup && <span>فصيلة {p.bloodGroup}</span>}<span className="num" dir="ltr">{p.phone}</span></div>
              </div>
            </div>
            {alerts.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {alerts.map((a, i) => <div key={i} className={`rounded-2xl p-3 text-sm border ${a.severity === "CRITICAL" ? "border-crit/40 bg-crit/10" : a.severity === "WARNING" ? "border-warn/40 bg-warn/10" : "border-info/40 bg-info/10"}`}><b>{a.title}</b> · {a.detail}</div>)}
              </div>
            )}
          </section>

          {preg && ga && (
            <section className="glass-lg p-5">
              <div className="flex items-baseline justify-between"><h2 className="font-semibold">الحمل الحالي</h2><span className="text-sm text-muted">موعد الولادة <b className="text-fg num">{fmtDate(preg.eddFinal)}</b> ({preg.datingMethod === "ULTRASOUND" ? "بالسونار" : "بآخر دورة"})</span></div>
              <div className="mt-3 text-3xl font-semibold num">{formatGA(ga)} <span className="text-sm text-muted font-normal">أسبوعاً، بقي {280 - ga.totalDays} يوماً</span></div>
              <div className="mt-3 h-2.5 rounded-full bg-lav-soft overflow-hidden"><div className="h-full bg-lav rounded-full" style={{ width: `${Math.min(100, (ga.totalDays / 280) * 100)}%` }} /></div>
              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                {schedule.map((s) => {
                  const past = s.to < now, open = s.from <= now && s.to >= now;
                  return <div key={s.key} className={`glass p-2.5 text-sm flex justify-between gap-2 ${past ? "opacity-60" : ""}`}><span>{s.title}</span><span className={`text-xs num whitespace-nowrap ${open ? "text-warn font-semibold" : "text-faint"}`}>{s.fromWeek === s.toWeek ? `أسبوع ${s.fromWeek}` : `${s.fromWeek} إلى ${s.toWeek}`}</span></div>;
                })}
              </div>
            </section>
          )}

          {!preg && (
            <section className="glass-lg p-5 grid sm:grid-cols-2 gap-4">
              <div>
                <h2 className="font-semibold">الدورة</h2>
                <p className="text-sm text-muted mt-1">متوسط الدورة <b className="text-fg num">{cycle.cycleLength}</b> يوماً، النزف <b className="text-fg num">{cycle.periodLength}</b> أيام.</p>
                {cycle.lastPeriodStart && <p className="text-sm text-muted">آخر دورة {fmtDate(cycle.lastPeriodStart)}، المتوقعة {cycle.nextPeriod && fmtDate(cycle.nextPeriod)}.</p>}
                <div className="flex flex-wrap gap-1 mt-2">{p.cycleLogs.filter((l) => l.bleeding).slice(-14).map((l) => <span key={l.id} className="chip num text-[11px]">{fmtDate(l.date, { year: false })} {l.flow ? FLOW_LABEL[l.flow] : ""}</span>)}</div>
              </div>
              <div>
                <h2 className="font-semibold">منع الحمل</h2>
                {contra && contra.method !== "NONE" ? (
                  <p className="text-sm text-muted mt-1">{methodLabel(contra.method)}{contra.brand ? ` (${contra.brand})` : ""} منذ {fmtDate(contra.startedAt)}.{contra.expiresAt && <> تنتهي <b className="text-fg num">{fmtDate(contra.expiresAt)}</b>.</>}</p>
                ) : <p className="text-sm text-muted mt-1">بلا وسيلة مسجّلة.</p>}
              </div>
            </section>
          )}

          <section className="glass-lg p-5">
            <h2 className="font-semibold mb-3">الخط الزمني</h2>
            <ol className="flex flex-col">
              {events.map((e, i) => (
                <li key={i} className="grid grid-cols-[88px_14px_1fr] gap-x-3 py-2 relative">
                  <span className="text-xs text-faint num pt-0.5">{relTime(e.at, now)}<br /><span className="text-[10px]">{fmtTime(e.at)}</span></span>
                  <span className={`w-3.5 h-3.5 rounded-full mt-1 ${e.tone}`} />
                  <span className="min-w-0"><span className="font-medium text-sm">{e.title}</span>{e.detail && <span className="block text-sm text-muted">{e.detail}</span>}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="glass-lg p-5 lg:sticky lg:top-4">
          <h2 className="font-semibold mb-3">الرسائل</h2>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {[...p.messages].reverse().map((m) => <div key={m.id} className={`rounded-2xl p-3 text-sm ${m.fromPatient ? "bg-rose-soft" : "bg-lav-soft"}`}>{m.body}<div className="text-[10px] text-faint mt-1">{relTime(m.createdAt, now)}</div></div>)}
            {p.messages.length === 0 && <p className="text-faint text-sm">لا رسائل بعد.</p>}
          </div>
          <ReplyForm patientId={p.id} action={replyToPatient} />
        </aside>
      </div>
    </Shell>
  );
}
