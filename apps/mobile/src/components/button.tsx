import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { Fonts, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Button({ title, onPress, busy, ghost, danger, disabled, big, style }: { title: string; onPress?: () => void; busy?: boolean; ghost?: boolean; danger?: boolean; disabled?: boolean; big?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const bg = ghost ? t.glassStrong : danger ? t.crit : t.lav;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" style={({ pressed }) => [s.btn, big && s.big, { backgroundColor: bg, borderColor: ghost ? t.glassLine : "transparent", opacity: pressed || disabled ? 0.7 : 1 }, style]}>
      {busy ? <ActivityIndicator color={ghost ? t.fg : t.white} /> : <Text style={[s.txt, big && { fontSize: 17 }, { color: ghost ? t.fg : t.white }]}>{title}</Text>}
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, minHeight: 48 },
  big: { paddingVertical: 16, minHeight: 56 },
  txt: { fontFamily: Fonts.semibold, fontSize: 15 },
});
