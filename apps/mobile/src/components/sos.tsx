import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "./icon";
import { T } from "./text";
import { useTheme } from "@/hooks/use-theme";

/** The red button. Same words everywhere; opens the danger-sign screen. */
export function Sos({ compact }: { compact?: boolean }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/emergency")} accessibilityRole="button" accessibilityLabel="عندي مشكلة هسه" style={({ pressed }) => [s.btn, compact && s.compact, { backgroundColor: t.crit, opacity: pressed ? 0.85 : 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="alert" size={compact ? 16 : 20} color={t.white} stroke={2.2} /><T kind="title" color={t.white} style={{ fontSize: compact ? 14 : 17 }}>عندي مشكلة هسه</T></View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 999, alignItems: "center", shadowColor: "#d8556b", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  compact: { paddingVertical: 10, paddingHorizontal: 14 },
});
