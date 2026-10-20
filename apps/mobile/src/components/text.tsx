import { Text, type TextProps, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Kind = "body" | "small" | "label" | "title" | "h1" | "num" | "big";
/** Minimum 13px everywhere; large-font phones scale from these. */
export function T({ kind = "body", color, style, ...rest }: TextProps & { kind?: Kind; color?: string }) {
  const t = useTheme();
  return <Text maxFontSizeMultiplier={1.4} {...rest} style={[s[kind], { color: color ?? (kind === "small" || kind === "label" ? t.muted : t.fg) }, style]} />;
}
const s = StyleSheet.create({
  body: { fontFamily: Fonts.regular, fontSize: 15.5, lineHeight: 23, textAlign: "right", writingDirection: "rtl" },
  small: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  label: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 17, textAlign: "right", writingDirection: "rtl" },
  title: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 24, textAlign: "right", writingDirection: "rtl" },
  h1: { fontFamily: Fonts.semibold, fontSize: 24, lineHeight: 32, textAlign: "right", writingDirection: "rtl" },
  num: { fontFamily: Fonts.semibold, fontSize: 28, lineHeight: 34, fontVariant: ["tabular-nums"], textAlign: "center" },
  big: { fontFamily: Fonts.bold, fontSize: 40, lineHeight: 46, fontVariant: ["tabular-nums"], textAlign: "center" },
});
