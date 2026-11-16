import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { PRIVACY_POINTS } from "@gyne/core";
import { Screen } from "@/components/screen";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { api, privacyUrl } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useSession } from "@/lib/session";
import { useTheme } from "@/hooks/use-theme";

/** Shown once after the first login, and again whenever the privacy policy version changes. */
export default function Consent() {
  const t = useTheme();
  const router = useRouter();
  const { data, reload } = useHome();
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function agree() {
    if (!data) return;
    setBusy(true); setErr(null);
    try { await api("/api/consent", { method: "POST", json: { version: data.privacy.version } }); await reload(); router.replace("/(tabs)"); }
    catch (e) { setErr((e as Error).message); await reload(); }
    finally { setBusy(false); }
  }
  return (
    <Screen tabbed={false}>
      <T kind="h1">قبل ما نبدي 💜</T>
      <T kind="small">هاي معلومات صحية تخصچ. هنا شلون نتعامل وياها، بكلمات بسيطة.</T>
      {PRIVACY_POINTS.map((p) => (
        <Glass key={p.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={[s.ic, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 22, textAlign: "center" }}>{p.emoji}</T></View>
          <View style={{ flex: 1, gap: 2 }}><T kind="title">{p.title}</T><T kind="small" color={t.fg}>{p.text}</T></View>
        </Glass>
      ))}
      <Pressable onPress={() => Linking.openURL(privacyUrl())} accessibilityRole="link" style={{ alignSelf: "center", paddingVertical: 6 }}>
        <T kind="label" color={t.lavDeep}>اقري سياسة الخصوصية كاملة</T>
      </Pressable>
      {err && <Glass><T kind="small" color={t.crit}>{err}</T></Glass>}
      <Button title="موافقة، كملي ✓" big onPress={agree} busy={busy} disabled={!data} />
      <Pressable onPress={signOut} style={{ alignSelf: "center", paddingVertical: 10 }} accessibilityRole="button">
        <T kind="label" color={t.faint}>مو موافقة، طلعيني</T>
      </Pressable>
    </Screen>
  );
}
const s = StyleSheet.create({ ic: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" } });
