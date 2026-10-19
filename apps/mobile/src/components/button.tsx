import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { Fonts, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Button({ title, onPress, busy, ghost, disabled }: { title: string; onPress?: () => void; busy?: boolean; ghost?: boolean; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [s.btn, { backgroundColor: ghost ? t.glassStrong : t.lav, borderColor: ghost ? t.glassLine : "transparent", opacity: pressed || disabled ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator color={ghost ? t.fg : t.white} /> : <Text style={[s.txt, { color: ghost ? t.fg : t.white }]}>{title}</Text>}
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: Radius.pill, alignItems: "center", borderWidth: 1 },
  txt: { fontFamily: Fonts.semibold, fontSize: 15 },
});
