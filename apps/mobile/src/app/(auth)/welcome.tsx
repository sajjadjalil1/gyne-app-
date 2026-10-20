import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Glass } from "@/components/glass";
import { T } from "@/components/text";
import { useTheme } from "@/hooks/use-theme";

/** One sentence that fits pregnancy and cycle alike, a real button, and the doctor's name for trust. */
export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const doctor = process.env.EXPO_PUBLIC_DOCTOR_NAME ?? "الدكتورة";
  return (
    <Background>
      <SafeAreaView style={s.safe}>
        <View style={[s.brand, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><T kind="label" color={t.lavDeep}>💜 عيادتي</T></View>
        <View style={s.hero}>
          <View style={[s.frame, { backgroundColor: t.glass, borderColor: t.glassLine }]}>
            <Image source={require("@/assets/images/welcome.jpg")} style={s.illus} resizeMode="cover" accessibilityLabel="فتاة مرتاحة تتأمل" />
          </View>
          <T kind="h1" style={{ textAlign: "center", marginTop: 20, fontSize: 28 }}>عيادتچ بجيبچ</T>
          <T style={{ textAlign: "center", maxWidth: 300 }} color={t.muted}>مواعيدچ، حملچ أو دورتچ، وتحچين ويا العيادة</T>
        </View>
        <View style={{ width: "100%", gap: 12, maxWidth: 420, alignSelf: "center" }}>
          <Button title="ابدئي" big onPress={() => router.push("/(auth)/login")} />
          <Glass style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
            <View style={[s.doc, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 20, textAlign: "center" }}>👩‍⚕️</T></View>
            <T kind="small" style={{ flex: 1 }}><T kind="label">{doctor}</T> هي اللي طلبت منچ تنزلين التطبيق</T>
          </Glass>
        </View>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, padding: 24, alignItems: "center", justifyContent: "space-between" },
  brand: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  frame: { padding: 8, borderRadius: 32, borderWidth: 1 },
  illus: { width: 250, height: 300, borderRadius: 26 },
  doc: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
