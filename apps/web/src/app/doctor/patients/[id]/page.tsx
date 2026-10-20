import { notFound } from "next/navigation";
import { prisma } from "@gyne/db";
import { subDays } from "date-fns";
import { requireStaffPage } from "@/lib/staff";
import { Shell } from "@/components/shell";
import { Avatar } from "@/components/severity";
import { deriveAlerts } from "@/lib/alerts";
import { adherence, ageYears, antenatalSchedule, DANGER_LABEL, fmtDate, fmtTime, formatGA, formularyItem, gaOnDate, methodLabel, pillState, predictCycle, TIMING_LABEL, APPT_TYPE_LABEL, FLOW_LABEL, relTime, type PackType, type RxLike } from "@gyne/core";
import { ReplyForm } from "./reply-form";
import { RxForm } from "./rx-form";
import { addPrescription, handleDanger, replyToPatient, reviewPrescription, setAppointmentPrep, stopPrescription } from "./actions";

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
      prescriptions: { orderBy: { createdAt: "asc" } },
      doseEvents: { where: { dueAt: { gte: subDays(now, 31) } } },
      dangerReports: { where: { createdAt: { gte: subDays(now, 14) } }, orderBy: { createdAt: "desc" } },
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
  const gaWeeksOn = (d: Date) => (preg ? gaOnDate(preg.eddFinal, d).weeks : null);
  const doseEvents = p.doseEvents.map((e) => ({ prescriptionId: e.prescriptionId, dueAt: e.dueAt, status: e.status }));
  const rxRows = p.prescriptions.filter((r) => r.active).map((r) => {
    const rx = r as unknown as RxLike;
    return { r, f: formularyItem(r.drug), week: adherence(rx, doseEvents, 7, now, gaWeeksOn, p.wakeTime, p.sleepTime, p.ramadanMode), month: adherence(rx, doseEvents, 30, now, gaWeeksOn, p.wakeTime, p.sleepTime, p.ramadanMode), reasons: p.doseEvents.filter((e) => e.prescriptionId === r.id && e.status === "SKIPPED" && e.reason).map((e) => e.reason).slice(-3) };
  });
  const pillC = p.contraceptions.find((c) => !c.endedAt && c.packType && c.packStartedAt);
  const pill = pillC ? pillState(pillC.packType as PackType, pillC.packStartedAt as Date, now) : null;
  const openDanger = p.dangerReports.filter((r) => !r.handledAt);
  const nextAppt = p.appointments.find((a) => a.status === "SCHEDULED" && a.startsAt >= now);
  const dotClass: Record<string, string> = { full: "bg-ok", part: "bg-warn", none: "bg-crit", na: "bg-faint/40" };

  type Ev = { at: Date; tone: string; title: string; detail?: string };
  const events: Ev[] = [
    ...p.readings.filter((r) => r.kind === "BP").map((r) => ({ at: r.takenAt, tone: (r.systolic ?? 0) >= 140 || (r.diastolic ?? 0) >= 90 ? "bg-crit" : "bg-ok", title: `ضغط منزلي ${r.systolic}/${r.diastolic}` })),
    ...p.readings.filter((r) => r.kind !== "BP").map((r) => ({ at: r.takenAt, tone: "bg-info", title: r.kind === "KICKS" ? `حركات الجنين ${r.value}` : r.kind === "WEIGHT" ? `الوزن ${r.value} كغ` : `سكر ${r.value}` })),
    ...p.appointments.map((a) => ({ at: a.startsAt, tone: a.status === "COMPLETED" ? "bg-lav" : a.status === "NO_SHOW" ? "bg-faint" : "bg-lav-soft", title: `${APPT_TYPE_LABEL[a.type]}${a.status === "SCHEDULED" ? " (قادم)" : a.status === "NO_SHOW" ? " (غياب)" : ""}`, detail: a.notes ?? a.reason ?? undefined })),
    ...p.messages.filter((m) => !m.auto).map((m) => ({ at: m.createdAt, tone: m.fromPatient ? "bg-rose" : "bg-info", title: m.fromPatient ? (m.urgent ? "رسالة عاجلة من المريضة" : "رسالة من المريضة") : "رد العيادة", detail: m.body })),
    ...p.dangerReports.map((r) => ({ at: r.createdAt, tone: "bg-crit", title: `علامة خطر: ${r.signs.split(",").map((k) => DANGER_LABEL[k] ?? (k === "message" ? "كلمة خطر في رسالة" : k)).join("، ")}`, detail: r.action === "ER" ? "وُجّهت إلى الطوارئ" : r.action === "CALL" ? "طُلب منها الاتصال" : undefined })),
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
            {openDanger.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {openDanger.map((r) => (
                  <form key={r.id} action={handleDanger} className="rounded-2xl p-3 text-sm border border-crit/40 bg-crit/10 flex items-center gap-3">
                    <input type="hidden" name="patientId" value={p.id} /><input type="hidden" name="id" value={r.id} />
                    <span className="flex-1"><b>🆘 {r.signs.split(",").map((k) => DANGER_LABEL[k] ?? (k === "message" ? "كلمة خطر في رسالة" : k)).join("، ")}</b> · {relTime(r.createdAt, now)} · {r.action === "ER" ? "وُجّهت إلى الطوارئ" : r.action === "CALL" ? "طُلب منها الاتصال بالعيادة" : "من التسجيل اليومي"}</span>
                    <button className="btn text-xs py-1.5">تواصلتُ معها</button>
                  </form>
                ))}
              </div>
            )}
            {alerts.filter((a) => a.kind !== "DANGER").length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {alerts.filter((a) => a.kind !== "DANGER").map((a, i) => <div key={i} className={`rounded-2xl p-3 text-sm border ${a.severity === "CRITICAL" ? "border-crit/40 bg-crit/10" : a.severity === "WARNING" ? "border-warn/40 bg-warn/10" : "border-info/40 bg-info/10"}`}><b>{a.title}</b> · {a.detail}</div>)}
              </div>
            )}
          </section>

          <section className="glass-lg p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="font-semibold">الأدوية والالتزام</h2><RxForm patientId={p.id} pregnant={!!preg} action={addPrescription} /></div>
            <div className="mt-3 flex flex-col gap-2">
              {rxRows.length === 0 && <p className="text-sm text-faint">لا أدوية موصوفة. المريضة لا ترى تذكيرات حتى تضيفي دواءً هنا.</p>}
              {rxRows.map(({ r, f, week, month, reasons }) => (
                <div key={r.id} className={`glass p-3 text-sm flex flex-wrap items-center gap-3 ${r.source === "SELF" && !r.reviewedAt ? "border-warn/50" : ""}`}>
                  <span className="text-lg">{f.emoji}</span>
                  <span className="min-w-[180px] flex-1">
                    <b>{r.label}</b>{r.strength && <span className="text-muted"> {r.strength}</span>}{r.criticality === "HIGH" && <span className="tag bg-crit ms-2">مهم</span>}{r.source === "SELF" && <span className="tag bg-warn ms-2">{r.reviewedAt ? "أضافته بنفسها" : "غير مُراجَع"}</span>}
                    <br /><span className="text-muted">{r.dose} · {r.timesPerDay > 1 ? `${r.timesPerDay} مرات` : "مرة"} · {TIMING_LABEL[r.timing]}{r.times ? ` (${r.times})` : ""}{r.startWeek || r.stopWeek ? ` · أسبوع ${r.startWeek ?? "؟"} إلى ${r.stopWeek ?? "الولادة"}` : ""}{r.indication ? ` · ${r.indication}` : ""}</span>
                    {reasons.length > 0 && <span className="block text-xs text-warn">أسباب التخطّي: {reasons.join("، ")}</span>}
                  </span>
                  <span className="flex items-center gap-1" title="آخر 7 أيام">{week.dots.map((d, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${dotClass[d]}`} />)}</span>
                  <span className="num text-xs text-muted w-20 text-center">{month.pct == null ? "—" : `${month.pct}% / 30 يوماً`}</span>
                  <span className="flex gap-1">
                    {r.source === "SELF" && !r.reviewedAt && <form action={reviewPrescription}><input type="hidden" name="patientId" value={p.id} /><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost text-xs py-1">راجعتُه</button></form>}
                    <form action={stopPrescription}><input type="hidden" name="patientId" value={p.id} /><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost text-xs py-1">إيقاف</button></form>
                  </span>
                </div>
              ))}
              {pillC && pill && <div className="glass p-3 text-sm"><b>حبوب منع الحمل</b> · {pillC.brand} · {pill.inFree ? "أسبوع بدون حبوب" : `حبة اليوم رقم ${pill.pillNumber}`} · آخر 7 أيام: <span className="inline-flex gap-1 align-middle">{Array.from({ length: 7 }, (_, i) => { const day = subDays(now, 6 - i); const ok = p.doseEvents.some((e) => e.contraceptionId === pillC.id && Math.abs(e.dueAt.getTime() - day.getTime()) < 36 * 3600_000 && e.dueAt.toDateString() === day.toDateString()); return <span key={i} className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-ok" : "bg-crit"}`} />; })}</span></div>}
            </div>
            {nextAppt && (
              <form action={setAppointmentPrep} className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end text-sm">
                <input type="hidden" name="patientId" value={p.id} /><input type="hidden" name="id" value={nextAppt.id} />
                <label className="flex flex-col gap-1">قبل الموعد القادم ({fmtDate(nextAppt.startsAt, { year: false })}) تفعل:<input name="prep" defaultValue={nextAppt.prep ?? ""} placeholder="تعالي صايمة من الساعة 10 بالليل" /></label>
                <label className="flex flex-col gap-1">المكان<input name="place" defaultValue={nextAppt.place ?? ""} placeholder="عيادة د. سجاد، المنصور" /></label>
                <button className="btn btn-ghost">حفظ</button>
                {nextAppt.confirmed != null && <span className={`text-xs ${nextAppt.confirmed ? "text-ok" : "text-warn"}`}>{nextAppt.confirmed ? "أكّدت الحضور ✓" : "تريد تغيير الموعد"}</span>}
              </form>
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
            {[...p.messages].filter((m) => !(m.auto && !m.fromPatient)).reverse().map((m) => <div key={m.id} className={`rounded-2xl p-3 text-sm ${m.fromPatient ? (m.urgent ? "bg-crit/15 border border-crit/40" : "bg-rose-soft") : "bg-lav-soft"}`}>{m.urgent && <span className="tag bg-crit mb-1">عاجل</span>}{m.body}<div className="text-[10px] text-faint mt-1">{m.authorName ? `${m.authorName} · ` : ""}{relTime(m.createdAt, now)}</div></div>)}
            {p.messages.length === 0 && <p className="text-faint text-sm">لا رسائل بعد.</p>}
          </div>
          <ReplyForm patientId={p.id} action={replyToPatient} />
        </aside>
      </div>
    </Shell>
  );
}
