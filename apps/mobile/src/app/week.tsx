import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { fmtDate, DANGER_PREGNANCY } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Listen } from "@/components/listen";
import { Sos } from "@/components/sos";
import { d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

const NORMAL: Record<1 | 2 | 3, string[]> = {
  1: ["غثيان وتعب، خاصة الصبح", "تبولين أكثر", "صدرچ يوجع شوية", "مزاجچ يتغير بسرعة"],
  2: ["الغثيان يخف وتحسين بطاقة", "تبدين تحسين بحركة الطفل من الشهر الخامس", "حرقة معدة بعد الأكل", "ألم خفيف بالظهر وأسفل البطن مع الحركة"],
  3: ["الطفل يتحرك كل يوم، وتعرفين وقته", "ضيق نفس خفيف لأن الرحم كبر", "ورم خفيف بالرجلين آخر النهار يروح بالنوم", "شدّات خفيفة بالبطن تروح بالراحة"],
};

/** "This week": baby size, what's normal, what's not, and the due date behind one tap. */
export default function Week() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useHome();
  const p = data?.pregnancy;
  if (!p) return <Screen tabbed={false}><Glass><T>هذه الصفحة للحمل.</T></Glass></Screen>;
  const normal = NORMAL[p.trimester];
  const speakText = `${p.monthLabel}، الأسبوع ${p.ga.weeks}. طفلچ بحجم ${p.baby.label}. باقي ${p.daysLeft} يوم على الولادة.`;
  return (
    <Screen tabbed={false}>
      <Row><Pressable onPress={() => router.back()} style={[s.back, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="back" size={18} color={t.fg} /></Pressable><T kind="h1">هالأسبوع</T><Listen text={speakText} compact /></Row>
      <Glass style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
        <T style={{ fontSize: 72, textAlign: "center", lineHeight: 84 }}>{p.baby.emoji}</T>
        <T kind="h1" style={{ textAlign: "center" }}>طفلچ بحجم {p.baby.label}</T>
        <T style={{ textAlign: "center" }} color={t.muted}>{p.monthLabel} · الأسبوع {p.ga.weeks} واليوم {p.ga.days + 1}</T>
        <View style={[s.pill, { backgroundColor: t.lavSoft }]}><T kind="label" color={t.lavDeep}>باقي {p.daysLeft} يوم · موعد الولادة المتوقع {fmtDate(d(p.edd)!, { year: false })}</T></View>
      </Glass>
      <Glass style={{ gap: 6 }}>
        <T kind="title">عادي هالفترة</T>
        {normal.map((x) => <T key={x}>🙂 {x}</T>)}
      </Glass>
      <Glass style={{ gap: 6, borderColor: t.rose }}>
        <T kind="title" color={t.crit}>مو عادي: اتصلي أو روحي للطوارئ</T>
        {DANGER_PREGNANCY.map((x) => <T key={x.key}>{x.emoji} {x.label}</T>)}
        {p.ga.weeks >= 28 && <T kind="small">من الأسبوع 28: إذا حسيتي الطفل هادي، استلقي على جنبچ وعدّي الحركات. أقل من 10 بساعتين، اتصلي.</T>}
      </Glass>
      <Sos />
    </Screen>
  );
}
const s = StyleSheet.create({ back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" }, pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginTop: 6 } });
