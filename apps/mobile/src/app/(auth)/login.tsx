import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "@/components/background";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { api } from "@/lib/api";
import { DEMO, DEMO_PHONES } from "@/lib/demo";
import { useSession } from "@/lib/session";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

const RESEND_SECONDS = 60;

/** Phone, then the 6 digits. The code autofills from the SMS where the OS allows it; a resend button appears after a minute. */
export default function Login() {
  const t = useTheme();
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const codeRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  useEffect(() => { if (left <= 0) return; const id = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(id); }, [left]);

  const pretty = (p: string) => { const d = p.replace(/\D/g, ""); const n = d.startsWith("964") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d; return `+964 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 10)}`.trim(); };

  async function request() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ ok: boolean; devCode?: string }>("/api/auth/otp/request", { method: "POST", json: { phone: phone.replace(/\s/g, "") } });
      if (r.devCode) setDevCode(r.devCode);
      setStep("code"); setLeft(RESEND_SECONDS); setCode("");
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function verify(c = code) {
    if (c.length !== 6) return;
    setBusy(true); setError(null);
    try {
      const r = await api<{ token: string; user: { id: string; name: string; role: string; patientId: string | null } }>("/api/auth/otp/verify", { method: "POST", json: { phone: phone.replace(/\s/g, ""), code: c, client: "mobile" } });
      await signIn(r.token, r.user);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length >= 10;

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
          <View style={[s.brand, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><T kind="label" color={t.lavDeep}>💜 عيادتي</T></View>
          <Glass style={s.card}>
            <View style={[s.mark, { backgroundColor: t.lav }]}><Icon name={step === "phone" ? "phone" : "chat"} size={26} color={t.white} /></View>
            {step === "phone" ? (
              <>
                <T kind="h1" style={{ textAlign: "center" }}>اكتبي رقم موبايلچ</T>
                <T kind="small" style={{ textAlign: "center" }}>راح توصلچ رسالة من <T kind="label">عيادتي</T> بيها ٦ أرقام. ما تحتاجين كلمة سر.</T>
                <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="0780 123 4567" placeholderTextColor={t.faint} style={[s.input, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }]} autoFocus accessibilityLabel="رقم الموبايل" />
                {phoneOk && <T kind="small" style={{ textAlign: "center" }} color={t.ok}>✓ {pretty(phone)}</T>}
                {DEMO && (
                  <View style={s.demo}>
                    <T kind="small" style={{ textAlign: "center" }}>نسخة تجريبية: اختاري مريضة وهمية</T>
                    <View style={s.demoRow}>
                      {DEMO_PHONES.map((p) => (
                        <Pressable key={p.phone} onPress={() => setPhone(p.phone)} style={[s.change, { backgroundColor: phone === p.phone ? t.lav : t.glassStrong, borderColor: t.glassLine }]}>
                          <T kind="label" color={phone === p.phone ? t.white : undefined}>{p.label}</T>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {error && <T kind="small" color={t.crit} style={{ textAlign: "center" }}>{error}</T>}
                <Button title="دزّي الرمز" big onPress={request} busy={busy} disabled={!phoneOk} />
              </>
            ) : (
              <>
                <T kind="h1" style={{ textAlign: "center" }}>اكتبي الرقم اللي وصلچ برسالة</T>
                <T kind="small" style={{ textAlign: "center" }}>راح توصلچ رسالة من <T kind="label">عيادتي</T> بيها ٦ أرقام. إذا ما وصلت خلال دقيقة اضغطي «رجّعي ارسلي».</T>
                <View style={[s.phoneRow, { backgroundColor: t.glass, borderColor: t.glassLine }]}>
                  <Pressable onPress={() => setStep("phone")} style={[s.change, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><T kind="label">غيّري</T></Pressable>
                  <View style={{ flex: 1 }}><T kind="label" style={{ textAlign: "left" }}>رقم موبايلچ</T><T kind="title" style={{ textAlign: "left", writingDirection: "ltr" }}>{pretty(phone)}</T></View>
                </View>
                <Pressable onPress={() => codeRef.current?.focus()} style={s.boxes} accessibilityLabel="الرمز">
                  {Array.from({ length: 6 }, (_, i) => (
                    <View key={i} style={[s.box, { backgroundColor: t.glassStrong, borderColor: code.length === i ? t.lav : t.glassLine }]}><T kind="num" style={{ fontSize: 26 }}>{code[i] ?? ""}</T></View>
                  ))}
                </Pressable>
                <TextInput ref={codeRef} value={code} onChangeText={(v) => { const c = v.replace(/\D/g, "").slice(0, 6); setCode(c); if (c.length === 6) verify(c); }} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" style={s.hidden} autoFocus caretHidden />
                {devCode && <T kind="small" style={{ textAlign: "center" }}>وضع التجربة: الرمز {devCode}</T>}
                {error && <T kind="small" color={t.crit} style={{ textAlign: "center" }}>{error}</T>}
                <Button title="دخول" big onPress={() => verify()} busy={busy} disabled={code.length !== 6} />
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
                  <T kind="small">ما وصلت؟</T>
                  {left > 0 ? <T kind="small">رجّعي ارسلي بعد {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</T> : <Pressable onPress={request}><T kind="label" color={t.lavDeep}>رجّعي ارسلي</T></Pressable>}
                </View>
                <T kind="small" style={{ textAlign: "center" }} color={t.faint}>تبقين داخلة على هذا الموبايل، ما نطلب منچ الرقم كل مرة.</T>
              </>
            )}
          </Glass>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 20, gap: 14, maxWidth: 480, width: "100%", alignSelf: "center" },
  brand: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  card: { gap: 14 },
  mark: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontFamily: Fonts.semibold, textAlign: "center", writingDirection: "ltr" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 16, borderWidth: 1 },
  change: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  demo: { gap: 8 },
  demoRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  boxes: { flexDirection: "row", justifyContent: "center", gap: 8, direction: "ltr" },
  box: { width: 46, height: 56, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
