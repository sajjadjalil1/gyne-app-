import { ScrollView, StyleSheet, View, type ViewProps, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "./background";
import { Spacing } from "@/constants/theme";

/** Scrollable screen on the pastel stage, with safe areas and room for the floating tab bar. */
export function Screen({ children, style, tabbed = true, ...rest }: Omit<ScrollViewProps, "style"> & { tabbed?: boolean; style?: ScrollViewProps["contentContainerStyle"] }) {
  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={[s.content, tabbed && { paddingBottom: 110 }, style]} keyboardShouldPersistTaps="handled" {...rest}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
export function Row({ style, ...rest }: ViewProps) { return <View {...rest} style={[s.row, style]} />; }
const s = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, maxWidth: 520, width: "100%", alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
});
