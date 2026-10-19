import { StyleSheet, View, type ViewProps, Pressable, type PressableProps } from "react-native";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Glass({ style, strong = true, ...rest }: ViewProps & { strong?: boolean }) {
  const t = useTheme();
  return <View {...rest} style={[s.card, { backgroundColor: strong ? t.glassStrong : t.glass, borderColor: t.glassLine }, style]} />;
}
export function GlassPress({ style, ...rest }: PressableProps) {
  const t = useTheme();
  return <Pressable {...rest} style={(st) => [s.card, { backgroundColor: t.glassStrong, borderColor: t.glassLine, opacity: st.pressed ? 0.8 : 1 }, typeof style === "function" ? style(st) : style]} />;
}
const s = StyleSheet.create({
  card: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.lg, shadowColor: "#6a50a0", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
});
