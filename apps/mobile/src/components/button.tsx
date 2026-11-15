import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./icon";
import { Fonts, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Button({ title, icon, onPress, busy, ghost, danger, disabled, big, style }: { title: string; icon?: IconName; onPress?: () => void; busy?: boolean; ghost?: boolean; danger?: boolean; disabled?: boolean; big?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const bg = ghost ? t.glassStrong : danger ? t.crit : t.lav;
  const fg = ghost ? t.fg : t.white;
  // A "✓" typed into a title is drawn as a real check icon: the Arabic font has no tick and shows "√".
  const ticked = title.includes("✓");
  const label = title.replace("✓", "").trim();
  const glyph: IconName | undefined = icon ?? (ticked ? "tick" : undefined);
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" style={({ pressed }) => [s.btn, big && s.big, { backgroundColor: bg, borderColor: ghost ? t.glassLine : "transparent", opacity: pressed || disabled ? 0.7 : 1 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={s.row}>
          {glyph && <Icon name={glyph} size={big ? 22 : 18} color={fg} stroke={2} />}
          <Text style={[s.txt, big && { fontSize: 17 }, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, minHeight: 48 },
  big: { paddingVertical: 16, minHeight: 56 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  txt: { fontFamily: Fonts.semibold, fontSize: 15 },
});
