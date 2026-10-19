import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "@/components/background";
import { T } from "@/components/text";
import { useTheme } from "@/hooks/use-theme";

export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Background>
      <SafeAreaView style={s.safe}>
        <View style={s.hero}>
          <Image source={require("@/assets/images/welcome.jpg")} style={s.illus} resizeMode="cover" />
          <T kind="h1" style={{ textAlign: "center", marginTop: 16 }}>تابعي دورتك بهدوء ووضوح</T>
          <T kind="small" style={{ textAlign: "center", maxWidth: 260 }}>سجّلي جسمك ومزاجك وتدفّقك، وطبيبك يرى ما يهمّه فقط.</T>
        </View>
        <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [s.go, { backgroundColor: t.lav, borderColor: t.lavSoft, opacity: pressed ? 0.85 : 1 }]} accessibilityLabel="ابدئي">
          <T kind="title" color={t.white} style={{ textAlign: "center" }}>‹‹‹</T>
        </Pressable>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, padding: 24, alignItems: "center", justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  illus: { width: 240, height: 300, borderRadius: 28 },
  go: { width: 68, height: 68, borderRadius: 34, borderWidth: 6, alignItems: "center", justifyContent: "center", marginBottom: 12 },
});
