import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { relTime } from "@gyne/core";
import { Background } from "@/components/background";
import { T } from "@/components/text";
import { api, d } from "@/lib/api";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

type Msg = { id: string; fromPatient: boolean; body: string; createdAt: string };

export default function Messages() {
  const t = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const load = useCallback(() => api<{ messages: Msg[] }>("/api/messages").then((r) => setMsgs(r.messages)).catch(() => {}), []);
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);
  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try { await api("/api/messages", { method: "POST", json: { body: text.trim() } }); setText(""); await load(); } finally { setBusy(false); }
  }
  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.head}><T kind="h1">الرسائل</T><T kind="small">تصل رسالتك للممرضة أولاً، والطبيب عند الحاجة. للطوارئ اتصلي بالعيادة مباشرة.</T></View>
          <ScrollView ref={scroll} contentContainerStyle={s.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {msgs.map((m) => (
              <View key={m.id} style={[s.bubble, { backgroundColor: m.fromPatient ? t.lav : t.glassStrong, borderColor: t.glassLine, alignSelf: m.fromPatient ? "flex-start" : "flex-end" }]}>
                <T color={m.fromPatient ? t.white : t.fg}>{m.body}</T>
                <T kind="small" color={m.fromPatient ? t.white : t.faint} style={{ fontSize: 10 }}>{relTime(d(m.createdAt)!)}</T>
              </View>
            ))}
            {msgs.length === 0 && <T kind="small" style={{ textAlign: "center", marginTop: 40 }}>لا رسائل بعد. اكتبي سؤالك أدناه.</T>}
          </ScrollView>
          <View style={[s.composer, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}>
            <TextInput value={text} onChangeText={setText} placeholder="اكتبي رسالتك…" placeholderTextColor={t.faint} style={[s.input, { color: t.fg }]} multiline maxLength={1000} />
            <Pressable onPress={send} disabled={busy || !text.trim()} style={[s.send, { backgroundColor: t.lav, opacity: busy || !text.trim() ? 0.5 : 1 }]}><T color={t.white} style={{ textAlign: "center" }}>↑</T></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  head: { padding: 16, gap: 2 },
  list: { padding: 16, gap: 8, paddingBottom: 8 },
  bubble: { maxWidth: "82%", borderRadius: 18, borderWidth: 1, padding: 12, gap: 4 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, margin: 16, marginBottom: 96, padding: 8, borderRadius: 24, borderWidth: 1 },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 120, textAlign: "right" },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
