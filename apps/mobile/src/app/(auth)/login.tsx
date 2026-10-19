import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "@/components/background";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

export default function Login() {
  const t = useTheme();
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function request() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ ok: boolean; devCode?: string }>("/api/auth/otp/request", { method: "POST", json: { phone } });
      if (r.devCode) setDevCode(r.devCode);
      setStep("code");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ token: string; user: { id: string; name: string; role: string; patientId: string | null } }>("/api/auth/otp/verify", { method: "POST", json: { phone, code, client: "mobile" } });
      await signIn(r.token, r.user);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
          <Glass style={s.card}>
            <View style={[s.mark, { backgroundColor: t.lav }]}><T kind="title" color={t.white} style={{ textAlign: "center" }}>ع</T></View>
            <T kind="h1">{step === "phone" ? "رقم هاتفك" : "رمز الدخول"}</T>
            <T kind="small">{step === "phone" ? "نرسل لك رمزاً بستّة أرقام برسالة نصية." : `أرسلنا الرمز إلى ${phone}`}</T>
            {step === "phone" ? (
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07801234567" placeholderTextColor={t.faint} style={[s.input, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }]} autoFocus />
            ) : (
              <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="••••••" placeholderTextColor={t.faint} style={[s.input, s.code, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }]} autoFocus />
            )}
            {devCode && <T kind="small">وضع التطوير: الرمز {devCode}</T>}
            {error && <T kind="small" color={t.crit}>{error}</T>}
            <Button title={step === "phone" ? "أرسلي الرمز" : "دخول"} onPress={step === "phone" ? request : verify} busy={busy} disabled={step === "phone" ? phone.length < 10 : code.length !== 6} />
            {step === "code" && <Button title="تغيير الرقم" ghost onPress={() => setStep("phone")} />}
          </Glass>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 20 },
  card: { gap: 12 },
  mark: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: Fonts.regular, textAlign: "left", writingDirection: "ltr" },
  code: { textAlign: "center", fontSize: 22, letterSpacing: 8 },
});
