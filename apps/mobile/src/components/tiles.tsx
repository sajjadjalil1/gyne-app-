import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { T } from "./text";
import { useTheme } from "@/hooks/use-theme";

/** Big picture buttons: one emoji, two or three words, a 44px+ target. */
export function Tile({ emoji, label, on, onPress, danger, wide, style }: { emoji: string; label: string; on?: boolean; onPress?: () => void; danger?: boolean; wide?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const bg = on ? (danger ? t.crit : t.lav) : danger ? t.roseSoft : t.glassStrong;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={({ pressed }) => [s.tile, wide && s.wide, { backgroundColor: bg, borderColor: on ? "transparent" : danger ? t.rose : t.glassLine, opacity: pressed ? 0.8 : 1 }, style]}>
      <T style={{ fontSize: 28, textAlign: "center", lineHeight: 34 }}>{emoji}</T>
      <T kind="label" color={on ? t.white : t.fg} style={{ textAlign: "center", fontSize: 13, lineHeight: 17 }}>{label}</T>
    </Pressable>
  );
}
export function TileGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return <View style={[s.grid, { gap: cols === 4 ? 8 : 10 }]}>{children}</View>;
}
export const tileWidth = (cols: 2 | 3 | 4): ViewStyle => ({ width: cols === 4 ? "23%" : cols === 3 ? "31%" : "48%" });

/** Progress dots and "2 من 4". */
export function Steps({ step, total }: { step: number; total: number }) {
  const t = useTheme();
  return (
    <View style={s.steps}>
      <T kind="label">{step} من {total}</T>
      <View style={{ flexDirection: "row", gap: 5 }}>{Array.from({ length: total }, (_, i) => <View key={i} style={{ width: i < step ? 22 : 12, height: 6, borderRadius: 3, backgroundColor: i < step ? t.lav : t.lavSoft }} />)}</View>
    </View>
  );
}

/** A status pill: "✓ أخذتيها" / "هسه" / "تم ✓". */
export function Status({ text, tone = "ok" }: { text: string; tone?: "ok" | "now" | "later" | "warn" | "crit" }) {
  const t = useTheme();
  const map = { ok: { bg: t.ok + "26", fg: t.ok }, now: { bg: t.lav, fg: t.white }, later: { bg: t.glass, fg: t.muted }, warn: { bg: t.warn + "33", fg: "#9a6b12" }, crit: { bg: t.crit + "22", fg: t.crit } }[tone];
  return <View style={[s.status, { backgroundColor: map.bg }]}><T kind="label" color={map.fg} style={{ fontSize: 12 }}>{text}</T></View>;
}

const s = StyleSheet.create({
  tile: { width: "23%", minHeight: 84, borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", gap: 4 },
  wide: { width: "48%" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  steps: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  status: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: "flex-start" },
});
