import { Pressable, StyleSheet } from "react-native";
import { T } from "./text";
import { Icon } from "./icon";
import { speak } from "@/lib/speak";
import { useTheme } from "@/hooks/use-theme";

/** «🔊 اسمعي»: reads the text aloud. Sits next to every instruction. */
export function Listen({ text, label = "اسمعي", compact }: { text: string; label?: string; compact?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => speak(text)} accessibilityRole="button" accessibilityLabel={`اسمعي: ${text}`} style={({ pressed }) => [s.btn, { backgroundColor: t.glassStrong, borderColor: t.glassLine, opacity: pressed ? 0.7 : 1 }, compact && s.compact]}>
      <Icon name="sound" size={16} color={t.lavDeep} />
      {!compact && <T kind="label" color={t.lavDeep}>{label}</T>}
    </Pressable>
  );
}
const s = StyleSheet.create({ btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1 }, compact: { width: 34, height: 34, padding: 0, justifyContent: "center" } });
