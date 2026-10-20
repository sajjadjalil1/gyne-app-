import { useState } from "react";
import { Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { differenceInCalendarDays } from "date-fns";
import { fmtDate, fmtTime, weekdayName, daysLabel, APPT_PLAIN } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { T } from "@/components/text";
import { Icon, type IconName } from "@/components/icon";
import { Listen } from "@/components/listen";
import { Status } from "@/components/tiles";
import { Button } from "@/components/button";
import { api, d } from "@/lib/api";
import { useHome, type Appt, type PlanItem } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

/** Every appointment answers: when, where, what will happen, what to do before. Then "راح تجين؟". */
export default function Appointments() {
  const t = useTheme();
  const router = useRouter();
  const { data, reload } = useHome();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return <Screen><Glass><T>لحظة…</T></Glass></Screen>;
  const next = data.nextAppointments[0];
  const preg = data.pregnancy;
  const phone = data.clinic.phone;

  async function confirm(a: Appt, coming: boolean) {
    setBusy(true);
    try { await api(`/api/appointments/${a.id}/confirm`, { method: "POST", json: { coming } }); await reload(); } finally { setBusy(false); }
  }
  const speakAppt = (a: Appt) => `موعدچ ${weekdayName(d(a.startsAt)!)} ${fmtDate(d(a.startsAt)!, { year: false })} الساعة ${fmtTime(d(a.startsAt)!)}. ${a.reason ?? ""}. ${a.prep ? `قبل الموعد: ${a.prep}` : ""}`;

  return (
    <Screen>
      <Row><T kind="h1">مواعيدي</T>{preg && <Status text={`${preg.monthLabel} · الأسبوع ${preg.ga.weeks}`} tone="later" />}</Row>

      {next ? (
        <Glass style={{ gap: 10 }}>
          <Row><T kind="label" color={t.lavDeep}>موعدچ الجاي · بعد {daysLabel(differenceInCalendarDays(d(next.startsAt)!, new Date()))}</T><Listen text={speakAppt(next)} compact /></Row>
          <T kind="h1" style={{ fontSize: 22 }}>{weekdayName(d(next.startsAt)!)} {fmtDate(d(next.startsAt)!, { year: false })}</T>
          <T kind="small">الساعة {fmtTime(d(next.startsAt)!)}{next.place ? ` · ${next.place}` : data.clinic.address ? ` · ${data.clinic.name}` : ""}</T>
          <View style={{ gap: 4 }}>
            <T kind="label">شنو راح يصير</T>
            {(next.reason ?? APPT_PLAIN[next.type] ?? "مراجعة").split("·").map((x, i) => <T key={i}>• {x.trim()}</T>)}
          </View>
          {next.prep && (
            <View style={[s.prep, { backgroundColor: t.warnSoft }]}><T kind="label">قبل الموعد</T>{next.prep.split(/[.؛]\s*/).filter(Boolean).map((x, i) => <T key={i}>{i === 0 ? "🍽️" : "🪪"} {x.trim()}</T>)}</View>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {phone && <Act icon="phone" label="اتصلي" onPress={() => Linking.openURL(`tel:${phone}`)} />}
            {(data.clinic.mapsUrl) && <Act icon="pin" label="الموقع" onPress={() => Linking.openURL(data.clinic.mapsUrl!)} />}
            <Act icon="bell" label="ذكّريني" onPress={() => router.push("/settings")} />
          </View>
          <T kind="label">راح تجين؟</T>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title={next.confirmed === true ? "ايه، جاية ✓" : "ايه، جاية"} onPress={() => confirm(next, true)} busy={busy} ghost={next.confirmed === false} style={{ flex: 1 }} />
            <Button title="أريد أغيّر الموعد" ghost onPress={() => confirm(next, false)} busy={busy} style={{ flex: 1 }} />
          </View>
          {next.confirmed === false && <T kind="small" color={t.warn}>وصلت العيادة، راح يتصلون بيچ لتغيير الموعد.</T>}
        </Glass>
      ) : (
        <Glass><T>ماكو موعد قادم. {phone ? "اتصلي بالعيادة أو راسليها لحجز موعد." : "راسلي العيادة لحجز موعد."}</T>{phone && <Button title="📞 اتصلي بالعيادة" ghost onPress={() => Linking.openURL(`tel:${phone}`)} />}</Glass>
      )}
      {data.nextAppointments.slice(1).map((a) => (
        <Glass key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}><T kind="title">{a.reason ?? APPT_PLAIN[a.type]}</T><T kind="small">{weekdayName(d(a.startsAt)!)} {fmtDate(d(a.startsAt)!, { year: false })} · {fmtTime(d(a.startsAt)!)}</T></View>
          <Status text={`بعد ${daysLabel(differenceInCalendarDays(d(a.startsAt)!, new Date()))}`} tone="later" />
        </Glass>
      ))}

      {preg && (
        <Glass style={{ gap: 6 }}>
          <T kind="title">خطة حملچ</T>
          {preg.plan.filter((x) => x.status !== "past").slice(0, open === "plan" ? 99 : 4).map((x) => <PlanRow key={x.key} x={x} open={open === x.key} onPress={() => setOpen(open === x.key ? null : x.key)} />)}
          <Pressable onPress={() => setOpen(open === "plan" ? null : "plan")}><T kind="label" color={t.lavDeep}>{open === "plan" ? "أقل" : "شوفي كل الخطة"}</T></Pressable>
        </Glass>
      )}

      {!preg && (
        <GlassPress onPress={() => router.push("/calendar")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="calendar" size={24} color={t.lavDeep} /><View style={{ flex: 1 }}><T kind="title">تقويمي</T><T kind="small">الدورة، الأيام المتوقعة، وشنو سجّلتي</T></View><Icon name="next" size={18} color={t.faint} />
        </GlassPress>
      )}

      {data.pastVisits.map((v, i) => (
        <Glass key={v.id} style={{ gap: 8 }}>
          <Row><T kind="label">{i === 0 ? "آخر زيارة" : "زيارة"} · {fmtDate(d(v.startsAt)!, { year: false })}</T>
            <Pressable onPress={() => Share.share({ message: `زيارة ${fmtDate(d(v.startsAt)!)}: ${[v.fetalHr ? `نبض الطفل ${v.fetalHr}` : null, v.weightKg ? `الوزن ${v.weightKg} كغم` : null, v.scanNote ? `السونار: ${v.scanNote}` : null].filter(Boolean).join("، ")} 💜` })} style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Icon name="share" size={16} color={t.lavDeep} /><T kind="label" color={t.lavDeep}>شاركي ويا زوجچ</T></Pressable>
          </Row>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {v.fetalHr != null && <Stat big={`❤️ ${v.fetalHr}`} label="نبض الطفل" />}
            {v.weightKg != null && <Stat big={`${v.weightKg} كغم`} label="وزنچ" />}
            {v.scanNote && <Stat big={v.scanNote} label="السونار" />}
          </View>
          {!v.fetalHr && !v.weightKg && !v.scanNote && v.notes && <T kind="small">{v.notes}</T>}
        </Glass>
      ))}
    </Screen>
  );
}

function PlanRow({ x, open, onPress }: { x: PlanItem; open: boolean; onPress: () => void }) {
  const t = useTheme();
  const tone = x.status === "done" ? "ok" : x.status === "now" ? "warn" : "later";
  const text = x.status === "done" ? "تم ✓" : x.status === "now" ? "لازم تسويه هالأسبوع" : `جاي بـ${x.month}`;
  return (
    <Pressable onPress={onPress} style={[s.plan, { borderColor: t.glassLine }]}>
      <Row><T style={{ flex: 1 }}>{x.title}</T><Status text={text} tone={tone} /></Row>
      {open && <View style={{ gap: 4, marginTop: 4 }}><T kind="small">{x.what}</T>{x.prep && <T kind="small" color={t.fg}>قبلها: {x.prep}</T>}<Listen text={`${x.title}. ${x.what}. ${x.prep ?? ""}`} /></View>}
      {!open && !!x.what && <T kind="small" color={t.lavDeep}>شنو هذا؟</T>}
    </Pressable>
  );
}
function Act({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return <Pressable onPress={onPress} style={[s.act, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name={icon} size={18} color={t.lavDeep} /><T kind="label">{label}</T></Pressable>;
}
function Stat({ big, label }: { big: string; label: string }) {
  const t = useTheme();
  return <View style={[s.stat, { backgroundColor: t.glass }]}><T kind="title" style={{ textAlign: "center" }}>{big}</T><T kind="small" style={{ textAlign: "center" }}>{label}</T></View>;
}
const s = StyleSheet.create({
  prep: { padding: 10, borderRadius: 14, gap: 2 },
  act: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  plan: { paddingVertical: 8, borderBottomWidth: 1, gap: 2 },
  stat: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
});
