import { Pressable, StyleSheet, Text, View } from "react-native";
import { Fonts, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Chip({ label, emoji, on, onPress }: { label: string; emoji?: string; on?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, { backgroundColor: on ? t.lav : t.glassStrong, borderColor: on ? "transparent" : t.glassLine, opacity: pressed ? 0.8 : 1 }]}>
      {emoji && <Text style={s.emoji}>{emoji}</Text>}
      <Text style={[s.label, { color: on ? t.white : t.fg }]}>{label}</Text>
    </Pressable>
  );
}
export function ChipRow({ children }: { children: React.ReactNode }) { return <View style={s.row}>{children}</View>; }
const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1 },
  emoji: { fontSize: 14 },
  label: { fontFamily: Fonts.medium, fontSize: 12.5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
});
