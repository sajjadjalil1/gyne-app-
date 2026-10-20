import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { relTime } from "@gyne/core";
import { Background } from "@/components/background";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Sos } from "@/components/sos";
import { api, d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

type Msg = { id: string; fromPatient: boolean; body: string; createdAt: string; auto: boolean; authorName: string | null; urgent: boolean; readAt: string | null };

/** Chat with the nurse: who answers and when is always visible, every message gets a receipt, danger words escalate. */
export default function Messages() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useHome();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [escalate, setEscalate] = useState<{ word: string; bpHigh: boolean } | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const load = useCallback(() => api<{ messages: Msg[] }>("/api/messages").then((r) => setMsgs(r.messages)).catch(() => {}), []);
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);
  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const r = await api<{ urgent: boolean; escalate: boolean; bpHigh: boolean }>("/api/messages", { method: "POST", json: { body } });
      setText("");
      if (r.escalate) setEscalate({ word: body.match(/نزيف|نزف|دم|ماي|ماء|صداع|زغللة|حركة|تقلص|طلق|حرارة/)?.[0] ?? "كلمة خطر", bpHigh: r.bpHigh });
      await load();
    } finally { setBusy(false); }
  }
  const phone = data?.clinic.phone;
  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={[s.head, { borderColor: t.glassLine }]}>
            <View style={[s.avatar, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 22 }}>👩‍⚕️</T></View>
            <View style={{ flex: 1 }}><T kind="title">{data?.clinic.name ?? "العيادة"}</T><T kind="small">الممرضة ترد · {data?.clinic.nurseHours ?? "بأوقات الدوام"}</T></View>
            {phone && <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={[s.call, { backgroundColor: t.okSoft }]} accessibilityLabel="اتصلي بالعيادة"><Icon name="phone" size={20} color={t.ok} /></Pressable>}
          </View>
          <ScrollView ref={scroll} contentContainerStyle={s.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {msgs.map((m) => m.auto && !m.fromPatient ? (
              <View key={m.id} style={[s.auto, { backgroundColor: t.glass, borderColor: t.glassLine }]}><T kind="small" style={{ fontSize: 12 }}>رد تلقائي</T><T kind="small" color={t.fg}>{m.body}</T></View>
            ) : (
              <View key={m.id} style={[s.bubble, { backgroundColor: m.fromPatient ? t.lav : t.glassStrong, borderColor: m.urgent ? t.crit : t.glassLine, alignSelf: m.fromPatient ? "flex-start" : "flex-end" }]}>
                {!m.fromPatient && m.authorName && <T kind="label" color={t.lavDeep}>{m.authorName}</T>}
                <T color={m.fromPatient ? t.white : t.fg}>{m.body}</T>
                <T kind="small" color={m.fromPatient ? "rgba(255,255,255,0.85)" : t.faint} style={{ fontSize: 11 }}>{relTime(d(m.createdAt)!)}{m.fromPatient ? (m.readAt ? " · ✓✓ شافتها الممرضة" : " · ✓") : ""}</T>
              </View>
            ))}
            {escalate && (
              <View style={[s.esc, { backgroundColor: t.critSoft, borderColor: t.crit }]}>
                <T kind="title" color={t.crit}>🛑 كتبتي «{escalate.word}»{escalate.bpHigh ? " وضغطچ آخر مرة كان عالي" : ""}</T>
                <T color={t.fg}>إذا الأعراض قوية لا تنتظرين الرد. خبّرنا الدكتورة.</T>
                <Sos compact />
                {phone && <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={[s.callBtn, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="phone" size={18} color={t.fg} /><T kind="label">اتصلي بالعيادة</T></Pressable>}
              </View>
            )}
            {msgs.length === 0 && <T kind="small" style={{ textAlign: "center", marginTop: 40 }}>الممرضة تقرا رسالتچ وترد عليچ. إذا الأمر مستعجل اضغطي الزر الأحمر.</T>}
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}><Pressable onPress={() => router.push("/emergency")}><T kind="label" color={t.crit} style={{ textAlign: "center" }}>مستعجل؟ 🆘 عندي مشكلة هسه</T></Pressable></View>
          <View style={[s.composer, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}>
            <TextInput value={text} onChangeText={setText} placeholder="اكتبي رسالتچ…" placeholderTextColor={t.faint} style={[s.input, { color: t.fg }]} multiline maxLength={1000} />
            <Pressable onPress={send} disabled={busy || !text.trim()} style={[s.send, { backgroundColor: t.lav, opacity: busy || !text.trim() ? 0.5 : 1 }]} accessibilityLabel="إرسال"><Icon name="share" size={20} color={t.white} /></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  call: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 8, paddingBottom: 8 },
  bubble: { maxWidth: "84%", borderRadius: 18, borderWidth: 1, padding: 12, gap: 3 },
  auto: { alignSelf: "center", maxWidth: "92%", borderRadius: 14, borderWidth: 1, padding: 10, gap: 2 },
  esc: { borderRadius: 18, borderWidth: 1.5, padding: 12, gap: 8 },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginHorizontal: 16, marginBottom: 96, padding: 8, borderRadius: 24, borderWidth: 1 },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 15.5, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 120, textAlign: "right" },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
