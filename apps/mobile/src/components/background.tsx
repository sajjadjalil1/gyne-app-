import { StyleSheet, View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/use-theme";

/** The pastel stage behind every screen. */
export function Background({ children, style, ...rest }: ViewProps) {
  const t = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: t.bg }, style]} {...rest}>
      <LinearGradient colors={[t.g2, t.bg]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[t.g1, "transparent"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["transparent", t.g3]} start={{ x: 0.3, y: 0.2 }} end={{ x: 1, y: 0.6 }} style={[StyleSheet.absoluteFill, { opacity: 0.7 }]} />
      <LinearGradient colors={["transparent", t.g4]} start={{ x: 0.5, y: 0.6 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}
