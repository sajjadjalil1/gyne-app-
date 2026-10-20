import { useEffect } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { fmtDate, fmtTime, weekdayName, daysLabel, BP_TEXT } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { Ring } from "@/components/ring";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Sos } from "@/components/sos";
import { Status } from "@/components/tiles";
import { Listen } from "@/components/listen";
import { useHome, type Home } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";
import { d } from "@/lib/api";
import { saveClinic } from "@/lib/clinic-cache";
import { ensurePermission, syncReminders } from "@/lib/reminders";

function greeting() { const h = new Date().getHours(); return h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء الخير"; }

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, loading, error, reload } = useHome();
  useEffect(() => { if (!data) return; saveClinic(data); (async () => { if (data.meds.length || data.contraception?.pill) { if (await ensurePermission()) syncReminders(data); } })(); }, [data]);
  const today = startOfDay(new Date());

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.lav} />}>
      <Row>
        <View><T kind="small">{data ? `${greeting()} ${data.patient.firstName} 💜` : "مرحباً"}</T><T kind="title">{fmtDate(today, { weekday: true, year: false })}</T></View>
        <Pressable onPress={() => router.push("/(tabs)/messages")} style={[s.round, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]} accessibilityLabel="الرسائل">
          <Icon name="bell" size={20} color={t.fg} />
          {!!data?.unreadMessages && <View style={[s.badge, { backgroundColor: t.crit }]} />}
        </Pressable>
      </Row>
      {error && <Glass><T color={t.crit}>{error}</T></Glass>}
      {data && <Banner data={data} />}
      {data?.mode === "pregnancy" && data.pregnancy && <PregnancyHome data={data} />}
      {data && data.mode !== "pregnancy" && <CycleHome data={data} />}
      {data && <Sos />}
    </Screen>
  );
}

/** Only when something needs action; nothing on a normal day. */
function Banner({ data }: { data: Home }) {
  const t = useTheme();
  const router = useRouter();
  if (data.bp && data.bp.level !== "ok" && differenceInCalendarDays(new Date(), d(data.bp.at)!) <= 1) {
    const sev = data.bp.level === "severe";
    const txt = BP_TEXT[data.bp.level].advice;
    return (
      <Glass style={{ backgroundColor: sev ? t.critSoft : t.warnSoft, borderColor: sev ? t.crit : t.warn, gap: 6 }}>
        <Row><T kind="title" color={sev ? t.crit : "#9a6b12"}>⚠️ الضغط {BP_TEXT[data.bp.level].word} · {data.bp.systolic}/{data.bp.diastolic}</T><Listen text={txt} compact /></Row>
        <T kind="small" color={t.fg}>{txt}</T>
        {sev && <Pressable onPress={() => router.push("/emergency")}><T kind="label" color={t.crit}>افتحي زر المساعدة ←</T></Pressable>}
      </Glass>
    );
  }
  if (data.danger && !data.danger.handled && differenceInCalendarDays(new Date(), d(data.danger.at)!) === 0) {
    return <Glass style={{ backgroundColor: t.okSoft, borderColor: t.ok }}><T kind="small" color={t.fg}>✓ العيادة وصلها تنبيهچ. إذا ما اتصلوا بيچ خلال ساعة، اتصلي إنتِ.</T></Glass>;
  }
  return null;
}

function PregnancyHome({ data }: { data: Home }) {
  const t = useTheme();
  const router = useRouter();
  const p = data.pregnancy!;
  const appt = data.nextAppointments[0];
  const tasks = useTasks(data);
  const done = tasks.filter((x) => x.done).length;
  return (
    <>
      <Glass style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.push("/week")} accessibilityLabel="شوفي هالأسبوع">
            <Ring size={168} outer={p.ga.totalDays / 280} inner={(p.ga.days + 1) / 7}>
              <T kind="title" style={{ textAlign: "center", fontSize: 20, lineHeight: 26 }}>{p.monthLabel}</T>
              <T kind="small" style={{ textAlign: "center" }}>الأسبوع {p.ga.weeks}</T>
            </Ring>
          </Pressable>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[s.soft, { backgroundColor: t.lavSoft }]}>
              <T kind="big" color={t.lavDeep} style={{ textAlign: "right", fontSize: 34, lineHeight: 40 }}>{p.daysLeft} <T kind="label" color={t.lavDeep}>يوم</T></T>
              <T kind="small">باقي على الولادة</T>
            </View>
            <GlassPress onPress={() => router.push("/week")} style={{ padding: 10, gap: 2 }}>
              <T style={{ fontSize: 26, textAlign: "right", lineHeight: 30 }}>{p.baby.emoji}</T>
              <T kind="label">طفلچ بحجم {p.baby.label}</T>
              <T kind="small" color={t.lavDeep}>شوفي هالأسبوع ←</T>
            </GlassPress>
          </View>
        </View>
      </Glass>

      {appt ? (
        <GlassPress onPress={() => router.push("/(tabs)/appointments")} style={{ backgroundColor: t.lav, borderColor: "transparent", gap: 4 }}>
          <Row><T kind="label" color={t.white}>موعدچ الجاي</T><T kind="label" color={t.white}>بعد {daysLabel(differenceInCalendarDays(d(appt.startsAt)!, new Date()))}</T></Row>
          <T kind="title" color={t.white}>{weekdayName(d(appt.startsAt)!)} {fmtDate(d(appt.startsAt)!, { year: false })} · {fmtTime(d(appt.startsAt)!)}</T>
          {appt.prep && <View style={[s.prep, { backgroundColor: "rgba(255,255,255,0.22)" }]}><T kind="small" color={t.white}>🍽️ {appt.prep}</T></View>}
        </GlassPress>
      ) : (
        <Glass><T kind="small">ماكو موعد قادم بعد. العيادة تحدد الموعد الجاي وتشوفينه هنا.</T></Glass>
      )}

      <Glass style={{ gap: 8 }}>
        <Row><T kind="title">شغلات اليوم</T><T kind="label">{done} من {tasks.length}</T></Row>
        {tasks.map((x) => (
          <Pressable key={x.key} onPress={x.go} style={[s.task, { borderColor: t.glassLine }]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <T style={{ fontSize: 22 }}>{x.emoji}</T>
              <T style={{ flex: 1 }}>{x.label}</T>
            </View>
            <Status text={x.status} tone={x.done ? "ok" : x.urgent ? "warn" : "now"} />
          </Pressable>
        ))}
      </Glass>
    </>
  );
}

function useTasks(data: Home) {
  const router = useRouter();
  const out: { key: string; emoji: string; label: string; status: string; done: boolean; urgent?: boolean; go: () => void }[] = [];
  for (const m of data.meds) {
    const pending = m.doses.find((x) => !x.status);
    const takenAll = m.doses.length > 0 && m.doses.every((x) => x.status === "TAKEN" || x.status === "LATE");
    out.push({ key: m.id, emoji: m.emoji, label: m.label, status: takenAll ? "✓ أخذتيها" : pending ? (new Date(pending.dueAt) <= new Date() ? "هسه" : fmtTime(new Date(pending.dueAt))) : "✓", done: takenAll, go: () => router.push("/meds") });
  }
  if (data.mode === "pregnancy") {
    const bp = data.bp;
    const again = !!bp && bp.level !== "ok" && bp.today;
    out.push({ key: "bp", emoji: "🩺", label: again ? "قيسي الضغط مرة ثانية" : "قيسي الضغط", status: bp?.today && !again ? `✓ ${bp.systolic}/${bp.diastolic}` : "هسه", done: !!bp?.today && !again, urgent: again, go: () => router.push({ pathname: "/(tabs)/daily", params: { step: "bp" } }) });
    if (data.pregnancy && data.pregnancy.ga.weeks >= 28) out.push({ key: "kicks", emoji: "👶", label: "عدّي حركات الطفل", status: data.kicks?.today ? `✓ ${data.kicks.count}` : "اليوم", done: !!data.kicks?.today, go: () => router.push({ pathname: "/(tabs)/daily", params: { step: "kicks" } }) });
  }
  return out;
}

function CycleHome({ data }: { data: Home }) {
  const t = useTheme();
  const router = useRouter();
  const today = startOfDay(new Date());
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 2));
  const c = data.cycle;
  const next = d(c?.nextPeriod);
  const fw = c?.fertileWindow;
  const inFertile = fw && today >= d(fw.from)! && today <= d(fw.to)!;
  const pill = data.contraception?.pill;
  const appt = data.nextAppointments[0];
  return (
    <>
      <View style={s.week}>
        {week.map((day) => {
          const on = differenceInCalendarDays(day, today) === 0;
          const bleed = next && differenceInCalendarDays(day, next) >= 0 && differenceInCalendarDays(day, next) < (c?.periodLength ?? 5);
          const fertile = fw && day >= d(fw.from)! && day <= d(fw.to)!;
          return (
            <View key={day.toISOString()} style={[s.day, { backgroundColor: on ? t.lav : bleed ? t.roseSoft : fertile ? t.okSoft : t.glassStrong, borderColor: t.glassLine }]}>
              <T kind="label" color={on ? t.white : t.muted} style={{ textAlign: "center", fontSize: 12 }}>{on ? "اليوم" : weekdayName(day).replace("ال", "")}</T>
              <T kind="title" color={on ? t.white : t.fg} style={{ textAlign: "center" }}>{day.getDate()}</T>
            </View>
          );
        })}
      </View>
      <Glass style={{ alignItems: "center", gap: 8 }}>
        <Ring size={190} outer={c?.dayOfCycle ? c.dayOfCycle / c.cycleLength : 0} inner={c?.daysToOvulation != null ? 1 - Math.max(0, c.daysToOvulation) / c.cycleLength : undefined}>
          <T kind="small">اليوم</T>
          <T kind="big">{c?.dayOfCycle ?? "؟"}</T>
          <T kind="small">من دورتچ</T>
        </Ring>
        {inFertile ? <View style={[s.soft, { backgroundColor: t.okSoft, alignSelf: "stretch" }]}><T kind="small" color={t.fg} style={{ textAlign: "center" }}>🌱 هسه بالأيام اللي ممكن يصير بيها حمل</T></View> : c?.lastPeriodStart ? null : <T kind="small">سجّلي أول يوم دورة من «يومي» حتى نحسب لچ</T>}
        <View style={{ flexDirection: "row", gap: 8, alignSelf: "stretch" }}>
          <View style={[s.soft, { flex: 1, backgroundColor: t.glass }]}><T kind="small">الدورة الجاية</T><T kind="title">{c?.daysToNextPeriod != null ? `بعد ${daysLabel(Math.max(0, c.daysToNextPeriod))} 🩸` : "—"}</T></View>
          <View style={[s.soft, { flex: 1, backgroundColor: t.glass }]}><T kind="small">آخر دورة</T><T kind="title">{c?.lastPeriodStart ? fmtDate(d(c.lastPeriodStart)!, { year: false }) : "—"}</T></View>
        </View>
      </Glass>
      {pill && (
        <GlassPress onPress={() => router.push("/pill")} style={{ gap: 4 }}>
          <Row><T kind="title">💊 حبوب منع الحمل</T>{pill.takenToday ? <Status text="✓ أخذت حبة اليوم" /> : pill.inFree ? <Status text="أسبوع بدون حبوب" tone="later" /> : <Status text="بعد" tone="now" />}</Row>
          <T kind="small">{pill.inFree ? `الباكيت الجاي ${fmtDate(d(pill.nextPackAt)!, { year: false })}` : `حبة اليوم: رقم ${pill.pillNumber} · كل يوم الساعة ${pill.pillTime}`}</T>
        </GlassPress>
      )}
      <GlassPress onPress={() => router.push("/(tabs)/daily")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[s.ic, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 24 }}>📝</T></View>
        <View style={{ flex: 1 }}><T kind="title">{data.todayLog ? "سجّلتي يومچ ✓" : "سجّلي يومچ"}</T><T kind="small">{data.todayLog ? "تگدرين تغيّرين" : "3 أسئلة بس، تاخذ دقيقة"}</T></View>
        <View style={[s.go, { backgroundColor: t.lav }]}><T kind="label" color={t.white}>{data.todayLog ? "غيّري" : "يلا"}</T></View>
      </GlassPress>
      {appt && (
        <GlassPress onPress={() => router.push("/(tabs)/appointments")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[s.ic, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 24 }}>📅</T></View>
          <View style={{ flex: 1 }}><T kind="title">{appt.reason ?? "موعد بالعيادة"}</T><T kind="small">{weekdayName(d(appt.startsAt)!)} {fmtDate(d(appt.startsAt)!, { year: false })} · {fmtTime(d(appt.startsAt)!)}</T></View>
          <Status text={`بعد ${daysLabel(differenceInCalendarDays(d(appt.startsAt)!, new Date()))}`} tone="later" />
        </GlassPress>
      )}
    </>
  );
}

const s = StyleSheet.create({
  round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: 5 },
  soft: { padding: 10, borderRadius: 16, gap: 2 },
  prep: { padding: 8, borderRadius: 12, marginTop: 4 },
  task: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  week: { flexDirection: "row", gap: 5 },
  day: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 7, alignItems: "center", gap: 2 },
  ic: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  go: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
});
