import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { T } from "@/components/text";
import { Icon, type IconName } from "@/components/icon";
import { useHome } from "@/lib/use-home";
import { api, privacyUrl, setToken } from "@/lib/api";
import { DELETE_GRACE_DAYS } from "@gyne/core";
import { useSession } from "@/lib/session";
import { useTheme } from "@/hooks/use-theme";

/** «أنا»: profile, medicines, pill, calendar, reminders, and the only place to log out. */
export default function Me() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useHome();
  const { signOut } = useSession();
  const [deleting, setDeleting] = useState(false);
  async function deleteAccount() {
    setDeleting(true);
    try { await api("/api/account/delete", { method: "POST", json: { confirm: true } }); await setToken(null); await signOut(); }
    catch (e) { setDeleting(false); Alert.alert("ما انحذف", (e as Error).message); }
  }
  /** Two steps, so a slip of the finger never deletes anything. */
  function askDelete() {
    const text = `ينقفل حسابچ هسه، وتنلغى مواعيدچ الجاية بالتطبيق، وتنمسح كل معلوماتچ نهائياً بعد ${DELETE_GRACE_DAYS} يوم. إذا رجعتي للعيادة يسجلونچ من جديد.`;
    if (Platform.OS === "web") { if (globalThis.confirm?.(`تحذفين حسابچ؟\n\n${text}`)) deleteAccount(); return; }
    Alert.alert("تحذفين حسابچ؟", text, [
      { text: "لا", style: "cancel" },
      { text: "ايه، احذفي", style: "destructive", onPress: () => Alert.alert("متأكدة؟", "ما نگدر نرجعه من التطبيق.", [{ text: "لا", style: "cancel" }, { text: "احذفي حسابي", style: "destructive", onPress: deleteAccount }]) },
    ]);
  }
  const rows: { icon: IconName; emoji?: string; label: string; sub?: string; href?: Href; onPress?: () => void }[] = [];
  if (data?.meds.length) rows.push({ icon: "pill", emoji: "💊", label: "أدويتي", sub: `${data.meds.length} ${data.meds.length === 1 ? "دواء" : "أدوية"} · ${data.weekCovered} من ${data.weekScheduled} هالأسبوع`, href: "/meds" });
  if (data?.contraception?.pill) rows.push({ icon: "pill", emoji: "💊", label: "حبوب منع الحمل", sub: data.contraception.pill.inFree ? "أسبوع بدون حبوب" : `حبة اليوم رقم ${data.contraception.pill.pillNumber}`, href: "/pill" });
  if (data?.mode !== "pregnancy") rows.push({ icon: "calendar", emoji: "📅", label: "تقويمي", sub: "الدورة والأيام المتوقعة", href: "/calendar" });
  if (data?.pregnancy) rows.push({ icon: "heart", emoji: "🤰", label: "هالأسبوع بالحمل", sub: `${data.pregnancy.monthLabel} · الأسبوع ${data.pregnancy.ga.weeks}`, href: "/week" });
  rows.push({ icon: "bell", emoji: "⏰", label: "التذكيرات", sub: "وقت الصحيان والنوم، رمضان، شنو يطلع بالتنبيه", href: "/settings" });
  if (data?.clinic.phone) rows.push({ icon: "phone", emoji: "📞", label: "اتصلي بالعيادة", sub: data.clinic.phone, onPress: () => Linking.openURL(`tel:${data.clinic.phone}`) });

  return (
    <Screen>
      <T kind="h1">أنا</T>
      <Glass style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[s.avatar, { backgroundColor: t.lav }]}><T kind="title" color={t.white} style={{ textAlign: "center", fontSize: 22 }}>{data?.patient.firstName?.slice(0, 1) ?? "؟"}</T></View>
        <View style={{ flex: 1 }}><T kind="title">{data?.patient.name ?? "…"}</T><T kind="small" style={{ writingDirection: "ltr", textAlign: "right" }}>{data?.patient.phone}</T>{data?.clinic.doctorName && <T kind="small">{data.clinic.doctorName} · {data.clinic.name}</T>}</View>
      </Glass>
      {rows.map((r) => (
        <GlassPress key={r.label} onPress={() => (r.href ? router.push(r.href) : r.onPress?.())} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <View style={[s.ic, { backgroundColor: t.lavSoft }]}><Icon name={r.icon} size={22} color={t.lavDeep} /></View>
          <View style={{ flex: 1 }}><T kind="title">{r.label}</T>{r.sub && <T kind="small">{r.sub}</T>}</View>
          <Icon name="next" size={18} color={t.faint} />
        </GlassPress>
      ))}
      <Glass style={{ gap: 6 }}>
        <T kind="label">خصوصيتچ</T>
        <T kind="small">رسائلچ وتسجيلاتچ تشوفها الدكتورة والممرضة بس. التنبيه على الشاشة يطلع «تذكير من عيادتي» ومحد يعرف شنو الدوا.</T>
        <Pressable onPress={() => Linking.openURL(privacyUrl())} accessibilityRole="link"><T kind="label" color={t.lavDeep}>سياسة الخصوصية كاملة</T></Pressable>
      </Glass>
      <Pressable onPress={() => Alert.alert("تطلعين من الحساب؟", "راح تحتاجين رمز جديد برسالة حتى ترجعين.", [{ text: "لا", style: "cancel" }, { text: "ايه، طلعيني", style: "destructive", onPress: signOut }])} style={{ alignSelf: "center", paddingVertical: 10 }}>
        <T kind="label" color={t.faint}>طلعي من الحساب</T>
      </Pressable>
      <Pressable onPress={askDelete} disabled={deleting} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 6 }}>
        <T kind="label" color={t.crit}>{deleting ? "لحظة…" : "احذفي حسابي"}</T>
      </Pressable>
      <Row style={{ justifyContent: "center" }}><T kind="small" color={t.faint}>عيادتي · النسخة 0.2</T></Row>
    </Screen>
  );
}
const s = StyleSheet.create({ avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }, ic: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" } });
