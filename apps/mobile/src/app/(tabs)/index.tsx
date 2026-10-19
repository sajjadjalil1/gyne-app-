import { RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { fmtDate, fmtTime, weekdayName, APPT_TYPE_LABEL, daysLabel } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { Ring } from "@/components/ring";
import { T } from "@/components/text";
import { useHome } from "@/lib/use-home";
import { useSession } from "@/lib/session";
import { useTheme } from "@/hooks/use-theme";
import { d } from "@/lib/api";

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useSession();
  const { data, loading, error, reload } = useHome();
  const today = startOfDay(new Date());
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - today.getDay()));

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.lav} />}>
      <Row>
        <View><T kind="small">{data ? `صباح الخير ${data.patient.firstName}` : "مرحباً"}</T><T kind="title">{fmtDate(today, { weekday: true })}</T></View>
        <GlassPress onPress={signOut} style={s.round}><T kind="small">خروج</T></GlassPress>
      </Row>

      <View style={s.week}>
        {week.map((day) => {
          const on = differenceInCalendarDays(day, today) === 0;
          const bleed = data?.cycle?.nextPeriod && Math.abs(differenceInCalendarDays(day, d(data.cycle.nextPeriod)!)) < (data.cycle.periodLength ?? 5) && differenceInCalendarDays(day, d(data.cycle.nextPeriod)!) >= 0;
          const fertile = data?.cycle?.fertileWindow && day >= d(data.cycle.fertileWindow.from)! && day <= d(data.cycle.fertileWindow.to)!;
          return (
            <View key={day.toISOString()} style={[s.day, { backgroundColor: on ? t.lav : t.glassStrong, borderColor: t.glassLine }]}>
              <T kind="label" color={on ? t.white : t.muted} style={{ textAlign: "center", fontSize: 10 }}>{weekdayName(day).replace("ال", "")}</T>
              <T kind="title" color={on ? t.white : t.fg} style={{ textAlign: "center" }}>{day.getDate()}</T>
              <View style={[s.dot, { backgroundColor: bleed ? t.rose : fertile ? t.ok : "transparent" }]} />
            </View>
          );
        })}
      </View>

      {error && <Glass><T color={t.crit}>{error}</T></Glass>}

      {data?.pregnancy && (
        <Glass style={{ alignItems: "center", gap: 8 }}>
          <Ring outer={data.pregnancy.ga.totalDays / 280} inner={(data.pregnancy.ga.totalDays % 7) / 7}>
            <View style={[s.ic, { backgroundColor: t.lav }]}><T kind="title" color={t.white} style={{ textAlign: "center" }}>♥</T></View>
            <T kind="small">الأسبوع</T>
            <T kind="num">{data.pregnancy.ga.weeks}<T kind="small"> +{data.pregnancy.ga.days}</T></T>
            <T kind="small">بقي {daysLabel(data.pregnancy.daysLeft)}</T>
          </Ring>
          <T kind="small">موعد الولادة المتوقع {fmtDate(d(data.pregnancy.edd)!)}</T>
          {data.pregnancy.upcoming[0] && <T kind="label" color={t.lavDeep}>القادم: {data.pregnancy.upcoming[0].title}</T>}
        </Glass>
      )}

      {data?.cycle && (
        <Glass style={{ alignItems: "center", gap: 6 }}>
          <Ring outer={(data.cycle.dayOfCycle ?? 0) / data.cycle.cycleLength} inner={data.cycle.daysToOvulation != null ? 1 - Math.max(0, data.cycle.daysToOvulation) / data.cycle.cycleLength : undefined}>
            <View style={[s.ic, { backgroundColor: t.lav }]}><T kind="title" color={t.white} style={{ textAlign: "center" }}>💧</T></View>
            {data.cycle.daysToOvulation != null && data.cycle.daysToOvulation >= 0 ? (
              <><T kind="small">التبويض بعد</T><T kind="num">{daysLabel(data.cycle.daysToOvulation)}</T></>
            ) : data.cycle.daysToNextPeriod != null ? (
              <><T kind="small">الدورة بعد</T><T kind="num">{daysLabel(Math.max(0, data.cycle.daysToNextPeriod))}</T></>
            ) : (
              <><T kind="small">سجّلي أول دورة</T></>
            )}
          </Ring>
          <T kind="small">اليوم {data.cycle.dayOfCycle ?? "؟"} من دورة طولها {data.cycle.cycleLength} يوماً</T>
        </Glass>
      )}

      <T kind="h1" style={{ textAlign: "center", marginTop: 4 }}>كيف تشعرين اليوم؟</T>
      <View style={s.moods}>
        {[{ e: "😌", k: "calm" }, { e: "🙂", k: "happy" }, { e: "💜", k: "loving" }, { e: "😴", k: "sleepy" }, { e: "😣", k: "pain" }].map((m) => (
          <GlassPress key={m.k} onPress={() => router.push({ pathname: "/(tabs)/log", params: { mood: m.k } })} style={s.mood}><T style={{ fontSize: 22, textAlign: "center" }}>{m.e}</T></GlassPress>
        ))}
      </View>

      {data?.nextAppointments[0] && (
        <GlassPress onPress={() => router.push("/(tabs)/appointments")} style={{ backgroundColor: t.lav, borderColor: "transparent" }}>
          <T kind="label" color={t.white}>موعد قادم</T>
          <T kind="title" color={t.white}>{fmtDate(d(data.nextAppointments[0].startsAt)!, { weekday: true, year: false })} · {fmtTime(d(data.nextAppointments[0].startsAt)!)}</T>
          <T kind="small" color={t.white}>{APPT_TYPE_LABEL[data.nextAppointments[0].type]}{data.nextAppointments[0].reason ? ` · ${data.nextAppointments[0].reason}` : ""}</T>
        </GlassPress>
      )}

      {data?.contraception && data.contraception.method !== "NONE" && (
        <Glass>
          <Row><T kind="title">{data.contraception.label}</T>{data.contraception.expiresAt && <T kind="label" color={t.warn}>تنتهي {fmtDate(d(data.contraception.expiresAt)!)}</T>}</Row>
          <T kind="small">{data.contraception.brand ?? ""} منذ {fmtDate(d(data.contraception.startedAt)!)}</T>
        </Glass>
      )}

      {data?.pregnancy && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <GlassPress onPress={() => router.push({ pathname: "/(tabs)/log", params: { tab: "bp" } })} style={{ flex: 1 }}>
            <T kind="label">ضغط الدم</T>
            {data.bp.length ? <T kind="title">{data.bp[data.bp.length - 1].systolic}/{data.bp[data.bp.length - 1].diastolic}</T> : <T kind="title">سجّلي</T>}
            <T kind="small">{data.bp.length ? fmtDate(d(data.bp[data.bp.length - 1].at)!, { year: false }) : "لا قراءة بعد"}</T>
          </GlassPress>
          <GlassPress onPress={() => router.push({ pathname: "/(tabs)/log", params: { tab: "kicks" } })} style={{ flex: 1 }}>
            <T kind="label">حركات الجنين</T>
            <T kind="title">{data.kicks?.count ?? "—"}</T>
            <T kind="small">{data.kicks ? fmtDate(d(data.kicks.at)!, { year: false }) : "ابدئي العدّ"}</T>
          </GlassPress>
        </View>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  round: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  week: { flexDirection: "row", gap: 5 },
  day: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 6, alignItems: "center", gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  ic: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  moods: { flexDirection: "row", justifyContent: "center", gap: 10 },
  mood: { width: 52, height: 52, borderRadius: 26, padding: 0, alignItems: "center", justifyContent: "center" },
});
