import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/use-theme";

/** Two concentric progress rings, like the reference design. progress values 0..1. */
export function Ring({ size = 200, outer, inner, children }: { size?: number; outer: number; inner?: number; children?: React.ReactNode }) {
  const t = useTheme();
  const r1 = size / 2 - 8, r2 = size / 2 - 26;
  const c1 = 2 * Math.PI * r1, c2 = 2 * Math.PI * r2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r1} stroke={t.lavSoft} strokeWidth={12} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r1} stroke={t.lav} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${c1}`} strokeDashoffset={c1 * (1 - Math.min(1, Math.max(0, outer)))} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
        {inner != null && (
          <>
            <Circle cx={size / 2} cy={size / 2} r={r2} stroke={t.roseSoft} strokeWidth={8} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r2} stroke={t.rose} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${c2}`} strokeDashoffset={c2 * (1 - Math.min(1, Math.max(0, inner)))} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
          </>
        )}
      </Svg>
      <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}
